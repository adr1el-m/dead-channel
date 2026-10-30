import { CARTRIDGES, clamp, W, H } from './games.js';
import { SWITCHBOARD } from './switchboard.js';
CARTRIDGES.push(SWITCHBOARD);
const originalGames=CARTRIDGES.slice(0,6);
import { lcdRows, segmentDigit } from './lcd.js';
import { Soundtrack } from './audio.js';

const $=id=>document.getElementById(id),canvas=$('game'),c=canvas.getContext('2d');
const music=new Soundtrack();
// The static build opts into browser-only play; the Pi keeps its USB bridge.
const publicDemo=document.documentElement.dataset.mode==='public';
function load(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
function save(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{}}
let records=load('dead-channel-records',{});if(!records||typeof records!=='object'||Array.isArray(records))records={};
// Carry over the first prototype's Ghost Flight best.
const legacy=Number(load('haunted-ghost-best',0));if(Number.isFinite(legacy))records.ghost=Math.max(Number(records.ghost)||0,legacy);
let selected=0,trial=new CARTRIDGES[0].Game(),phase='ready',time=0,lastFrame=performance.now(),scoreDirty=false,lastSave=0;
let raw={x:1800,y:1845,flap:false,click:false},connected=false,lastEvent=0,priorFlap=false,priorClick=false;
let centers=load('dead-channel-centers',{x:1800,y:1845});
if(!centers||!['x','y'].every(k=>Number.isFinite(centers[k])&&centers[k]>200&&centers[k]<3895))centers={x:1800,y:1845};
let keypadCursor=null,keypadEpoch=null;
let lcdOnline=null;
let learning=null;
let calibration=[],calibrating=false,calibrationStarted=0,menuWait=0,toastTime=0;
const keys=new Set(),touch={x:0,y:0,held:false,drag:false},motion=matchMedia('(prefers-reduced-motion: reduce)');
$('reduce').checked=load('dead-channel-reduce',motion.matches);
document.body.classList.toggle('reduced',$('reduce').checked);
$('swap-axes').checked=!!load('dead-channel-swap-axes',true);
$('invert-x').checked=!!load('dead-channel-invert-x',false);$('invert-y').checked=!!load('dead-channel-invert-y',false);
$('use-keypad').checked=!!load('dead-channel-use-keypad',true);
$('hardware-buzzer').checked=!!load('dead-channel-hardware-buzzer',true);
$('use-knob').checked=!!load('dead-channel-use-knob',true);
$('reverse-knob').checked=!!load('dead-channel-reverse-knob',false);
$('practice').checked=true;document.body.classList.add('practice');
const practice=()=>$('practice').checked;
const available=()=>connected||practice();
const meta=()=>CARTRIDGES[selected];
const best=()=>Math.max(0,Number(records[meta().id])||0);
const recovered=m=>(Number(records[m.id])||0)>=m.goal;
const pad=n=>String(Math.floor(n)).padStart(4,'0');
const index=n=>String(n+1).padStart(2,'0');

function renderCatalog(){
  $('catalog').replaceChildren();$('seal-list').replaceChildren();
  CARTRIDGES.forEach((m,i)=>{
    const btn=document.createElement('button');btn.type='button';btn.className='cartridge'+(recovered(m)?' recovered':'');btn.setAttribute('aria-pressed',String(selected===i));btn.dataset.game=m.id;
    btn.innerHTML=`<span class="cartridge-num">${index(i)}</span><span><strong>${m.title}</strong><small>${m.genre.split(' / ')[0]}</small></span><span class="cartridge-seal" aria-label="${recovered(m)?'Seal recovered':'Seal not recovered'}">${m.symbol}</span>`;
    btn.addEventListener('click',()=>selectGame(i,true));$('catalog').append(btn);
    const seal=document.createElement('span');seal.textContent=m.symbol;seal.className=recovered(m)?'recovered':'';seal.setAttribute('aria-label',`${m.title}: ${recovered(m)?'recovered':'not recovered'}`);if(i<6)$('seal-list').append(seal);
  });
  $('seal-count').textContent=`${originalGames.filter(recovered).length} / 6`;
}
function setOverlay(tag,title,copy,button,note='SPACE / ACT / CONTROLLER BUTTON'){
  $('overlay').hidden=false;$('overlay-tag').textContent=tag;$('overlay-title').textContent=title;$('overlay-copy').textContent=copy;$('start').textContent=button;$('overlay-note').textContent=note;
}
function ui(){
  $('score').textContent=meta().id==='switchboard'?`${trial.score} / 6`:pad(trial.score);$('best').textContent=meta().id==='switchboard'?`${Math.round(trial.suspicion*100)}%`:pad(best());$('score-label').textContent=meta().id==='switchboard'?'CALLERS CONNECTED':'SCORE';$('best-label').textContent=meta().id==='switchboard'?'ATTENTION':'BEST';
  $('goal-progress').style.width=`${Math.min(100,trial.score/meta().goal*100)}%`;
  $('phase').textContent={ready:'AWAITING INPUT',playing:'CHANNEL OPEN',paused:'SIGNAL HELD',dead:'TRANSMISSION LOST',won:'SEAL RECOVERED'}[phase];
  $('pause').disabled=!['playing','paused'].includes(phase);$('pause').textContent=phase==='paused'?'Resume':'Pause';
  if(meta().id==='switchboard'){$('receipt').hidden=false;$('receipt-lines').textContent=trial.receipt?.join('\n\n')||'No calls connected.\nPlease retain this copy.';if(phase==='playing')$('phase').textContent=trial.watching?'RELEASE THE BUTTON':trial.warning?'THE EYE IS OPENING':({TUNE:'TUNE THE CALL',DIAL:'DIAL THE EXTENSION',ROUTE:'CHOOSE A DESTINATION',CONNECT:'HOLD TO CONNECT',RECONNECTING:'LINE GROUNDED'}[trial.stage]);}else $('receipt').hidden=true;
  const consoleGame=meta().id==='switchboard';
  $('console-guide').hidden=!consoleGame;
  const physicalKnob=connected&&$('use-knob').checked&&Number.isFinite(raw.knob);
  $('rehearsal-controls').hidden=!consoleGame||!['playing','paused'].includes(phase)||!practice()||(physicalKnob&&!!raw.keypad?.connected&&$('use-keypad').checked&&lcdOnline===true);
  $('rehearsal-code').textContent=trial.heard?`${publicDemo?'DESK LCD':'REHEARSAL LCD'} / EXT ${trial.extension}`:'Tune to recover the extension.';
  $('manual-tuner').disabled=physicalKnob;
  if(physicalKnob)$('manual-tuner').value=String(Math.round((($('reverse-knob').checked?1-raw.knob/4095:raw.knob/4095))*1000));
  $('tuner-label').textContent=physicalKnob?'PHYSICAL KNOB CONNECTED':publicDemo?'TUNING KNOB / DRAG TO FIND THE CALL':'REHEARSAL TUNING';
  $('keypad-fallback').hidden=!!raw.keypad?.connected&&$('use-keypad').checked;
  $('station-stage').textContent=consoleGame&&phase==='playing'?`${trial.stage} / ${trial.physicalKeypadRequired&&trial.physicalKnobRequired?'LIVE CONSOLE':publicDemo?'BROWSER DEMO':'REHEARSAL'}`:'TUNE → DIAL → ROUTE → CONNECT';
  $('overlay-symbol').textContent=phase==='won'?'✦':meta().symbol;document.body.dataset.phase=phase;
}
function flushRecords(){if(scoreDirty){save('dead-channel-records',records);scoreDirty=false;lastSave=time;}}
function commitScore(){
  const old=best();if(trial.score>old){records[meta().id]=Math.floor(trial.score);scoreDirty=true;}
  if(old<meta().goal&&trial.score>=meta().goal){
    flushRecords();const all=originalGames.every(recovered);$('seal-toast').textContent=all?'ALL SIX SEALS BROKEN / THE LINE IS YOURS':`SEAL ${meta().symbol} RECOVERED`;$('seal-toast').hidden=false;toastTime=3;music.effect('seal');renderCatalog();
  }
}
function selectGame(i,reveal=false){
  commitScore();flushRecords();selected=(i+CARTRIDGES.length)%CARTRIDGES.length;trial=new (meta().Game)();phase='ready';if(meta().id==='switchboard'){trial.consoleMode=true;trial.keypadEnabled=true;}toastTime=0;$('seal-toast').hidden=true;
  music.active=false;music.select(selected%6);document.body.classList.toggle('nightshift',meta().id==='switchboard');
  $('channel').textContent=`CH. ${index(selected)}`;$('screen-caption').textContent=`${index(selected)} / ${meta().title.toUpperCase()}`;
  $('game-title').textContent=meta().title;$('game-story').textContent=meta().story;$('genre').textContent=meta().genre;
  $('objective').textContent=meta().objective;$('stick-help').textContent=meta().id==='frequency'?'Turn the physical knob to tune. Joystick works when knob control is disabled.':meta().stick;$('button-help').textContent=publicDemo&&meta().id==='switchboard'?'Use the tuning slider and keypad below the screen. Hold Space or HOLD TO CONNECT; release on red.':meta().button;$('marginalia').textContent=meta().note;
  canvas.setAttribute('aria-label',`${meta().title}. ${meta().stick}. ${meta().button}.`);
  setOverlay(`CARTRIDGE ${index(selected)} / ${meta().genre.split(' / ')[0]}`,meta().title,meta().objective,meta().id==='switchboard'?'Clock in →':'Begin ritual →',publicDemo?'KEYBOARD / TOUCH • NO HARDWARE NEEDED':undefined);renderCatalog();ui();
  if(reveal)requestAnimationFrame(()=>{const cabinet=document.querySelector('.cabinet'),rect=cabinet.getBoundingClientRect();if(rect.top<0||rect.top>innerHeight*.65)cabinet.scrollIntoView({block:'start',behavior:$('reduce').checked?'instant':'smooth'});});
}
function start(){
  if(meta().id==='switchboard'&&connected&&raw.keypad?.connected&&$('use-keypad').checked&&lcdOnline===false){setOverlay('UNO LCD NEEDS ATTENTION','The desk display is offline.','The Nano and ESP32 are connected, but the Uno LCD is not initialized. Check its four wires with Uno USB unplugged, then reconnect it.','Check display again','KEYBOARD / TOUCH REHEARSAL: DISABLE PHYSICAL KEYPAD IN SETTINGS');return;}
  if(!available()){setOverlay('NO CONTROLLER FOUND','The line is dead.','Connect the ESP32, or enable keyboard / touch practice in Controller & accessibility.','Check connection');return;}
  trial=new (meta().Game)();if(meta().id==='switchboard'){trial.consoleMode=true;trial.keypadEnabled=true;trial.physicalKeypadRequired=$('use-keypad').checked&&!!raw.keypad?.connected;trial.physicalKnobRequired=connected&&$('use-knob').checked&&Number.isFinite(raw.knob);trial.physicalLcdRequired=trial.physicalKeypadRequired&&lcdOnline===true;}phase='playing';music.active=true;$('overlay').hidden=true;ui();canvas.focus({preventScroll:true});music.effect('flap');
}
function action(){if(phase==='won')nextGame();else if(phase==='ready'||phase==='dead')start();else if(phase==='playing')trial.action();}
function pause(reason='manual'){
  if(phase!=='playing')return;phase='paused';music.active=false;
  setOverlay('TRANSMISSION INTERRUPTED',reason==='connection'?'The wire went quiet.':'Do not wander off.',reason==='connection'?'Reconnect the controller. Your game is waiting.':'The things on the other side can wait.','Resume transmission','CLICK THE STICK TO RESUME');ui();
}
function resume(){if(!available()||(trial.physicalKeypadRequired&&!raw.keypad?.connected)||(trial.physicalKnobRequired&&(!connected||!Number.isFinite(raw.knob)))||(trial.physicalLcdRequired&&lcdOnline===false))return;phase='playing';music.active=true;$('overlay').hidden=true;lastFrame=performance.now();ui();canvas.focus({preventScroll:true});}
function end(){commitScore();flushRecords();phase='dead';music.active=false;setOverlay('TRANSMISSION LOST',meta().death,`FINAL SCORE ${pad(trial.score)} / BEST ${pad(best())}\n${meta().objective}`,'Try again →','BUTTON TO RETRY / CHOOSE GAME TO LEAVE');ui();}
function nextGame(){if(meta().id==='switchboard'){selectGame(0);return;}const next=CARTRIDGES.findIndex((m,i)=>i>selected&&!recovered(m));const remaining=CARTRIDGES.findIndex(m=>!recovered(m));selectGame(next>=0?next:remaining>=0?remaining:(selected+1)%6);}
function win(){
  if(meta().id==='switchboard'){commitScore();flushRecords();phase='won';music.active=false;music.effect('seal');$('seal-toast').hidden=true;toastTime=0;save('night-shift-finished',true);document.body.classList.add('shift-finished');document.querySelector('.archive h1').innerHTML='The lines<br>are <em>quiet.</em>';document.querySelector('.archive-copy').textContent='The exchange is closed. Your last caller left something in the archive.';setOverlay('SHIFT COMPLETE / 06:00 AM','You may go home.','The rain stops. The kettle cools. A front door closes.\nA train leaves. A photograph changes. A patient sleeps.\n\nSix calls reached the right place.\nFor the first time tonight, nobody is waiting.','Clock out →','YOUR SHIFT HAS BEEN SAVED');ui();return;}
  commitScore();flushRecords();phase='won';music.active=false;music.effect('seal');
  const all=originalGames.every(recovered);$('seal-toast').hidden=true;toastTime=0;
  setOverlay(all?'THE FINAL TRANSMISSION':'RITUAL COMPLETE',all?'The line is yours.':'You made it out.',all?'Six voices freed. Six seals recovered. The thing behind the signal falls silent. You survived Dead Channel.':`${meta().title} · Seal ${meta().symbol} recovered.\n${originalGames.filter(recovered).length} of 6 seals secured. Your progress is saved.`,all?'Return to the archive →':'Next ritual →','SPACE / ACT TO CONTINUE');ui();
}
function connectionUI(){
  $('connection').textContent=publicDemo?'BROWSER DEMO / KEYBOARD + TOUCH':connected?'● CONTROLLER ONLINE':practice()?'KEYBOARD + TOUCH READY':'○ CONTROLLER OFFLINE';$('connection').className='live-label '+(connected||publicDemo?'online':'offline');
}
function axis(value,center){const n=(value-center)/(value>=center?4095-center:center);return Math.abs(n)<.14?0:Math.sign(n)*(Math.abs(n)-.14)/.86;}
function input(){
  const physicalX=connected?axis(raw.x,centers.x):0,physicalY=connected?axis(raw.y,centers.y):0;
  let x=($('swap-axes').checked?physicalY:physicalX)*($('invert-x').checked?-1:1);
  let y=($('swap-axes').checked?physicalX:physicalY)*($('invert-y').checked?-1:1);
  if(practice()){
    const kx=Number(keys.has('ArrowRight')||keys.has('KeyD'))-Number(keys.has('ArrowLeft')||keys.has('KeyA'));
    const ky=Number(keys.has('ArrowDown')||keys.has('KeyS'))-Number(keys.has('ArrowUp')||keys.has('KeyW'));
    if(kx||touch.x)x=kx||touch.x;if(ky||touch.y)y=ky||touch.y;
  }
  return {dial:connected&&$('use-knob').checked&&Number.isFinite(raw.knob)?($('reverse-knob').checked?1-raw.knob/4095:raw.knob/4095):(meta().id==='switchboard'?Number($('manual-tuner').value)/1000:undefined),x:clamp(x,-1,1),y:clamp(y,-1,1),held:(connected&&raw.flap)||(practice()&&(keys.has('Space')||touch.held))};
}
const events=publicDemo?{}:new EventSource('/events');
events.onmessage=e=>{
  let v;try{v=JSON.parse(e.data);}catch{return;}
  if(typeof v.connected!=='boolean')return;const was=connected;connected=v.connected;lastEvent=performance.now();raw=v;
  const keypad=v.keypad;
  $('keypad-status').textContent=keypad?.connected?`Nano online / key: ${keypad.key||'none'} / HANG UP: ${keypad.hangup?'pressed':'released'}`:'Nano keypad offline';
  if(keypad?.connected){
    if(keypad.epoch!==keypadEpoch){keypadCursor=null;keypadEpoch=keypad.epoch;}
    const list=keypad.events||[];
    if(keypadCursor===null)keypadCursor=Math.max(0,...list.map(event=>event.id));
    for(const event of list){if(event.id<=keypadCursor)continue;keypadCursor=event.id;if(!document.hidden&&phase==='playing'&&meta().id==='switchboard')trial.key(event.key);}
  }
  $('axis-x').textContent=connected?v.x:'—';$('axis-y').textContent=connected?v.y:'—';$('flap').textContent=connected?(v.flap?'ON':'off'):'—';$('click').textContent=connected?(v.click?'ON':'off'):'—';
  $('knob-reading').textContent=connected&&Number.isFinite(v.knob)?`Knob: ${Math.round(v.knob/4095*100)}% (${v.knob} / 4095)`:'Knob not detected';
  $('led-status').textContent=connected&&Number.isInteger(v.leds)?`LED outputs reported: ${['green','yellow','red'].filter((_,i)=>v.leds&(1<<i)).join(', ')||'off'}`:'Connect ESP32 with updated LED firmware';
  if(was!==connected){connectionUI();if(was&&!connected)pause('connection');}
  if(learning&&connected){
    const values={x:axis(raw.x,centers.x),y:axis(raw.y,centers.y)};
    const dominant=Math.abs(values.x)>Math.abs(values.y)?'x':'y';
    const strength=Math.abs(values[dominant]);
    if(learning.stage==='center'&&Math.max(Math.abs(values.x),Math.abs(values.y))<.15){learning.stage='right';$('learn-status').textContent='Move the stick RIGHT and hold it there.';}
    else if(learning.stage==='right'&&strength>.65){learning.right={axis:dominant,sign:Math.sign(values[dominant])};learning.stage='release';$('learn-status').textContent='Right recorded. Release the stick to centre.';}
    else if(learning.stage==='release'&&Math.max(Math.abs(values.x),Math.abs(values.y))<.15){learning.stage='up';$('learn-status').textContent='Now move the stick UP and hold it there.';}
    else if(learning.stage==='up'&&strength>.65){
      if(dominant===learning.right.axis){$('learn-status').textContent='That used the same axis. Return to centre, then push UP.';}
      else{
        $('swap-axes').checked=learning.right.axis==='y';
        $('invert-x').checked=learning.right.sign<0;
        $('invert-y').checked=values[dominant]>0;
        for(const id of ['swap-axes','invert-x','invert-y'])save(`dead-channel-${id}`,$(id).checked);
        $('learn-status').textContent='Directions saved for every game. Release the stick, then resume.';learning=null;menuWait=1;
      }
    }
  }
  if(calibrating&&connected){calibration.push({x:v.x,y:v.y});if(calibration.length>=40){
    const ranges=['x','y'].map(k=>Math.max(...calibration.map(p=>p[k]))-Math.min(...calibration.map(p=>p[k])));
    if(ranges.some(n=>n>180)||['x','y'].some(k=>calibration.some(p=>p[k]<200||p[k]>3895)))$('calibration').textContent='Keep the stick still and centred. Try again.';
    else {centers={x:Math.round(calibration.reduce((s,p)=>s+p.x,0)/calibration.length),y:Math.round(calibration.reduce((s,p)=>s+p.y,0)/calibration.length)};save('dead-channel-centers',centers);$('calibration').textContent=`Centre saved: ${centers.x} / ${centers.y}`;}
    calibrating=false;
  }}
  if(connected&&was&&!document.hidden&&!calibrating&&!learning){
    if(v.flap&&!priorFlap)action();
    if(v.click&&!priorClick){if(phase==='playing')pause();else if(phase==='paused')resume();}
  }
  priorFlap=!!v.flap;priorClick=!!v.click;
};
events.onerror=()=>{if(connected)pause('connection');connected=false;connectionUI();};
$('led-test').addEventListener('click',async()=>{try{const r=await fetch('/api/leds',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({test:true})});if(!r.ok)throw Error();$('led-status').textContent=connected?'Test requested: watch green, yellow, then red.':'Connect ESP32 USB to run the test.';}catch{$('led-status').textContent='LED bridge unavailable. Refresh after server restart.';}});
$('start').addEventListener('click',()=>phase==='paused'?resume():phase==='won'?nextGame():start());
$('pause').addEventListener('click',()=>phase==='paused'?resume():pause());
$('choose').addEventListener('click',()=>{selectGame(selected);$('catalog').scrollIntoView({block:'nearest',behavior:$('reduce').checked?'instant':'smooth'});});
$('practice').addEventListener('change',()=>{keys.clear();touch.x=touch.y=0;touch.held=false;document.body.classList.toggle('practice',practice());connectionUI();});
$('sound').addEventListener('click',async()=>{try{const on=await music.toggle();music.select(selected%6);$('sound').textContent=on?'Mute sound':'Enable sound';$('sound').setAttribute('aria-pressed',String(on));}catch{$('sound').textContent='Sound unavailable';}});
$('volume').value=String(clamp(Number(load('dead-channel-volume',35)),0,100));music.setVolume(Number($('volume').value)/100);
$('volume').addEventListener('input',()=>{music.setVolume(Number($('volume').value)/100);save('dead-channel-volume',Number($('volume').value));});
$('learn-stick').addEventListener('click',()=>{if(!connected){$('learn-status').textContent='Connect the ESP32 first.';return;}pause();learning={stage:'center'};$('learn-status').textContent='Release the joystick to centre. Then follow the prompts.';});
$('calibrate').addEventListener('click',()=>{if(!connected){$('calibration').textContent='Connect the controller first.';return;}pause();calibrating=true;calibration=[];calibrationStarted=performance.now();$('calibration').textContent='Release the stick. Measuring centre…';});
['use-keypad','hardware-buzzer','use-knob','reverse-knob','swap-axes','invert-x','invert-y','reduce'].forEach(id=>$(id).addEventListener('change',()=>{save(`dead-channel-${id}`,$(id).checked);document.body.classList.toggle('reduced',$('reduce').checked);}));
$('fullscreen').addEventListener('click',async()=>{
  const cabinet=document.querySelector('.cabinet');
  try{if(document.fullscreenElement)await document.exitFullscreen();else if(cabinet.requestFullscreen)await cabinet.requestFullscreen();else cabinet.scrollIntoView({behavior:'smooth',block:'start'});}catch{cabinet.scrollIntoView({block:'start'});}
});
function keyboardTarget(){return /INPUT|SUMMARY|BUTTON/.test(document.activeElement.tagName);}
document.addEventListener('keydown',e=>{
  if(e.code==='KeyP'&&!keyboardTarget()&&!e.repeat){e.preventDefault();phase==='paused'?resume():pause();return;}
  if(!practice()||keyboardTarget())return;
  if(phase==='playing'&&meta().id==='switchboard'&&!e.repeat&&(/^[0-9*#]$/.test(e.key)||e.code==='KeyH')){e.preventDefault();trial.key(e.code==='KeyH'?'hangup':e.key);return;}
  if(['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyW','KeyA','KeyS','KeyD'].includes(e.code)){e.preventDefault();keys.add(e.code);if(e.code==='Space'&&!e.repeat)action();}
});
document.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>{keys.clear();touch.x=touch.y=0;touch.held=false;touch.drag=false;pause();});
window.addEventListener('pagehide',flushRecords);
document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();touch.x=touch.y=0;touch.held=false;pause();flushRecords();if(music.enabled)music.ctx.suspend();}else if(music.enabled)music.ctx.resume().catch(()=>{});lastFrame=performance.now();});
function drag(e){const r=canvas.getBoundingClientRect();touch.x=clamp(((e.clientX-r.left)/r.width-.5)*3,-1,1);touch.y=clamp(((e.clientY-r.top)/r.height-.5)*3,-1,1);}
canvas.addEventListener('pointerdown',e=>{canvas.focus({preventScroll:true});if(!practice())return;canvas.setPointerCapture(e.pointerId);touch.drag=true;drag(e);if(selected===0)action();});
canvas.addEventListener('pointermove',e=>{if(touch.drag&&practice())drag(e);});
['pointerup','pointercancel','lostpointercapture'].forEach(name=>canvas.addEventListener(name,()=>{touch.drag=false;touch.x=touch.y=0;}));
for(const [id,k,value] of [['rehearsal-connect','held',true],['touch-left','x',-1],['touch-right','x',1],['touch-up','y',-1],['touch-down','y',1],['touch-act','held',true]]){
  const btn=$(id);btn.addEventListener('pointerdown',e=>{if(!practice())return;e.preventDefault();btn.setPointerCapture(e.pointerId);touch[k]=value;if(k==='held')action();});
  ['pointerup','pointercancel','lostpointercapture'].forEach(name=>btn.addEventListener(name,()=>{touch[k]=k==='held'?false:0;}));
}
function apparition(alpha){
  c.save();c.globalAlpha=alpha;c.translate(300,315);
  c.fillStyle='#050807';c.beginPath();c.moveTo(-110,-155);c.bezierCurveTo(-120,-230,125,-230,110,-155);c.bezierCurveTo(130,-30,70,130,0,170);c.bezierCurveTo(-70,130,-130,-30,-110,-155);c.fill();
  c.strokeStyle='#4c5a3c';c.lineWidth=1;c.beginPath();c.moveTo(-90,-140);c.bezierCurveTo(-120,-10,-60,90,0,170);c.bezierCurveTo(60,90,120,-10,90,-140);c.stroke();
  [-1,1].forEach(s=>{c.fillStyle='#86927a';c.beginPath();c.ellipse(s*49,-60,32,9,s*.15,0,Math.PI*2);c.fill();c.fillStyle='#090d09';c.fillRect(s*49-3,-72,6,25);});
  c.fillStyle='#2c3325';c.beginPath();c.ellipse(0,55,22,63,0,0,Math.PI*2);c.fill();c.fillStyle='#b1b191';for(let i=0;i<6;i++){c.fillRect(-17+i*6,6,3,14+i%2*7);c.fillRect(-15+i*6,94,3,10);}
  for(let i=0;i<8;i++){c.strokeStyle='#3d493124';c.beginPath();c.moveTo((i-4)*23,-170);c.lineTo((i-4)*37,-260);c.lineTo((i-4)*50,-320);c.stroke();}c.restore();
}
let uiClock=0;
function frame(now){
  const dt=Math.min((now-lastFrame)/1000,.03);lastFrame=now;time+=dt;uiClock+=dt;menuWait-=dt;
  if(connected&&now-lastEvent>900){connected=false;connectionUI();}
  if(calibrating&&now-calibrationStarted>4000){calibrating=false;$('calibration').textContent='No steady readings. Reconnect and try again.';}
  if(phase==='playing'&&(!available()||(trial.physicalKeypadRequired&&!raw.keypad?.connected)||(trial.physicalKnobRequired&&(!connected||!Number.isFinite(raw.knob)))||(trial.physicalLcdRequired&&lcdOnline===false)))pause('connection');
  const controls=input();
  const menuAxis=Math.abs(controls.x)>Math.abs(controls.y)?controls.x:controls.y;
  if(phase==='ready'&&!learning&&!calibrating&&!document.hidden&&Math.abs(menuAxis)>.65&&menuWait<=0){selectGame(selected+(menuAxis>0?1:-1));menuWait=.45;}
  if(phase==='playing'){
    trial.update(dt,controls);for(const event of trial.events.splice(0)){music.effect(event);const sound={telephone:'ring',receiver:'warning',score:'success',death:'loss'}[event];if(sound)hardwareBuzzer(sound);}
    commitScore();if(scoreDirty&&time-lastSave>1)flushRecords();if(trial.won)win();else if(trial.dead)end();
  }
  const t=$('reduce').checked?0:time;
  c.save();
  if(trial.hit>0&&!$('reduce').checked)c.translate(Math.sin(time*90)*trial.hit*5,Math.cos(time*70)*trial.hit*3);
  trial.draw(c,t);
  if(selected!==6&&phase==='ready'&&!$('reduce').checked)apparition(.22);
  if(selected!==6&&phase==='dead'&&!$('reduce').checked)apparition(.65);
  if(trial.hit>0){c.fillStyle=`rgba(123,43,25,${trial.hit*.3})`;c.fillRect(0,0,W,H);}
  c.restore();
  if(toastTime>0){toastTime-=dt;if(toastTime<=0)$('seal-toast').hidden=true;}
  if(uiClock>.12){uiClock=0;ui();$('transmission').textContent=`TRANSMISSION ${String(Math.floor(time)).padStart(3,'0')} / DO NOT DISCONNECT`;}
  requestAnimationFrame(frame);
}
selectGame(6);if(load('night-shift-finished',false)){document.body.classList.add('shift-finished');document.querySelector('.archive h1').innerHTML='The lines<br>are <em>quiet.</em>';}connectionUI();requestAnimationFrame(frame);

// Keep physical indicators alive only while this page is active.
let ledRequestPending=false;
setInterval(async()=>{
  if(publicDemo||ledRequestPending||document.hidden)return;
  let mask=0;
  if(!document.hidden){
    if(phase==='playing')mask=meta().id==='switchboard'?(trial.watching?4:trial.warning?2:1):1;
    else if(phase==='paused')mask=2;
    else if(phase==='dead')mask=4;
    else if(phase==='won')mask=1;
  }
  ledRequestPending=true;
  try{await fetch('/api/leds',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mask}),signal:AbortSignal.timeout(1000)});}catch{}finally{ledRequestPending=false;}
},250);

let lcdRequestPending=false;
setInterval(async()=>{
  if(publicDemo||lcdRequestPending||document.hidden)return;
  lcdRequestPending=true;
  try{await fetch('/api/lcd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rows:lcdRows(meta(),trial,phase),digit:segmentDigit(meta(),trial,phase)}),signal:AbortSignal.timeout(1000)});}catch{}finally{lcdRequestPending=false;}
},400);

async function hardwareBuzzer(sound,force=false){
 if(publicDemo)return;
 if(!force&&(!$('hardware-buzzer').checked||!connected||document.hidden))return;
 try{const r=await fetch('/api/buzzer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sound}),signal:AbortSignal.timeout(1000)});if(!r.ok)throw Error();if(force)$('buzzer-status').textContent=connected?'Short beep requested.':'Connect ESP32 to the Pi first.';}catch{if(force)$('buzzer-status').textContent='Buzzer bridge unavailable.';}
}
$('buzzer-test').addEventListener('click',()=>hardwareBuzzer('ring',true));
$('hardware-buzzer').addEventListener('change',()=>{if(!$('hardware-buzzer').checked)hardwareBuzzer('stop',true);});

$('segment-test').addEventListener('click',async()=>{
 try{const r=await fetch('/api/segment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({test:true})});$('segment-status').textContent=r.ok?'Watch the display: 0 through 9, one second each.':'Display test unavailable.';}catch{$('segment-status').textContent='Pi bridge unavailable.';}
});

for(const button of document.querySelectorAll('[data-key]'))button.addEventListener('click',()=>{if(phase==='playing'&&meta().id==='switchboard'){trial.key(button.dataset.key);canvas.focus({preventScroll:true});}});

async function checkLcd(){
 if(publicDemo)return;
 try{const r=await fetch('/api/lcd',{signal:AbortSignal.timeout(1500)});if(!r.ok)throw Error();const status=await r.json();lcdOnline=!!(status.connected&&status.lcd);$('lcd-health').textContent=lcdOnline?'UNO LCD ONLINE':'UNO LCD OFFLINE / CHECK WIRING';}catch{lcdOnline=false;$('lcd-health').textContent='UNO DISPLAY BRIDGE OFFLINE';}
}
checkLcd();setInterval(checkLcd,1500);

if(publicDemo){
  document.body.classList.add('public-demo');
  $('hardware-settings').hidden=true;$('hardware-readings').hidden=true;
  $('practice').disabled=true;
  const guide=$('console-guide');
  guide.innerHTML='<ol><li><b>TUNE</b> Drag the slider below the screen until the caller comes through.</li><li><b>DIAL</b> Read the desk extension. Type its digits, then # (or use the keypad).</li><li><b>ROUTE</b> Read the caller’s message. Choose a destination with arrows / WASD or the touch arrows.</li><li><b>CONNECT</b> Hold Space or HOLD TO CONNECT. Release before the eye turns red.</li></ol><p>HANG UP or H cancels the call and lowers attention, but clears your work. Connect all six callers to finish the shift.</p>';
  const source=document.createElement('a');source.href='https://github.com/adr1el-m/channel';source.textContent='BUILD NOTES & SOURCE ↗';source.target='_blank';source.rel='noopener noreferrer';document.querySelector('footer').prepend(source);
}
