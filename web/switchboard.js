import { pumpkin, cobweb, candle, bat } from './halloween.js';
export const DESTINATIONS=['PLATFORM','KITCHEN','WARD','ATTIC','PHONE BOOTH','FRONT DOOR'];
export const CALLERS=[
 {name:'THE WOMAN IN THE RAIN',frequency:.17,clue:'The glass is cracked. Rain gets in. There is one public telephone left on this street. Put me back there.',receipt:'05 / She leaves the receiver hanging. The rain stops.'},
 {name:'THE MAN WITH THE KETTLE',frequency:.77,clue:'I left the kettle on. The cup with the broken handle is still beside the stove. Someone will be thirsty.',receipt:'02 / A kettle whistles in a house with no electricity.'},
 {name:'THE CHILD WITH THE KEY',frequency:.43,clue:'Mum said the spare key is under the mat. I can see our house number. Please let me in.',receipt:'06 / Small footsteps cross the threshold. Two pairs leave.'},
 {name:'THE LAST COMMUTER',frequency:.88,clue:'The last train is pulling away. I am still beside the yellow line. My ticket says return.',receipt:'01 / The empty platform announces a homebound service.'},
 {name:'THE VOICE ABOVE YOU',frequency:.29,clue:'Not downstairs. Above the ceiling. Under the roof. There is a box of photographs nobody has opened.',receipt:'04 / The photograph now contains one more person.'},
 {name:'THE NURSE OFF DUTY',frequency:.61,clue:'There is one bed still occupied. Third floor of the hospital. He has been waiting for someone to say he can sleep.',receipt:'03 / The monitor falls silent. It is a peaceful sound.'}
];
// A six-line telephone exchange. The operator on the other side wakes on a fixed rhythm.
export class Switchboard {
  static goal=6;
  constructor(){this.score=0;this.dead=false;this.events=[];this.age=0;this.hit=0;this.socket=0;this.charge=0;this.suspicion=0;this.moveWait=0;this.lastDirection=0;this.connected=[];this.order=[4,1,5,0,3,2];this.message='Find the ringing room. Hold the button to connect.';this.grace=0;this.receipt=[];this.keypadEnabled=false;this.extension=String(Math.floor(1000+Math.random()*9000));this.entry='';this.authorized=false;this.hangupWait=0;this.codeStatus='';this.callRang=false;this.consoleMode=false;this.dial=.5;this.heard=false;this.listenCharge=0;this.signalAnnounced=false;}
  get caller(){return CALLERS[Math.min(this.score,5)];}
  get tuned(){return Math.abs(this.dial-this.caller.frequency)<.065;}
  get quality(){return Math.max(0,1-Math.abs(this.dial-this.caller.frequency)*2.4);}
  get stage(){return this.hangupWait>0?'RECONNECTING':(!this.heard||!this.tuned)?'TUNE':!this.authorized?'DIAL':this.socket!==this.target?'ROUTE':'CONNECT';}
  get destination(){return DESTINATIONS[this.socket];}
  get won(){return this.score===6;}
  get target(){return this.order[this.score]??2;}
  get cycle(){return this.age%7;}
  get watching(){return this.cycle>=4.8&&this.cycle<6.6;}
  get warning(){return this.cycle>=3.7&&this.cycle<4.8;}
  key(value){
    if(this.dead||this.won||!this.keypadEnabled)return;
    if(value==='hangup'||value==='D'){
      if(this.hangupWait>0)return;
      this.entry='';this.authorized=false;this.charge=0;this.hangupWait=3;
      this.extension=String(Math.floor(1000+Math.random()*9000));this.suspicion=Math.max(0,this.suspicion-.35);this.heard=false;this.listenCharge=0;this.signalAnnounced=false;this.codeStatus='HUNG UP - WAIT';this.emitKeySound('receiver');return;
    }
    if(this.hangupWait>0)return;
    if(value==='*'){this.entry='';this.codeStatus='';return;}
    if(this.consoleMode&&!this.heard){this.codeStatus='TUNE THE CALL';return;}
    if(this.authorized)return;
    if(value==='#'){
      if(this.entry===this.extension){this.authorized=true;if(!this.consoleMode)this.socket=this.target;this.codeStatus='CODE ACCEPTED';this.emitKeySound('score');}
      else{this.suspicion=Math.min(1,this.suspicion+.15);this.codeStatus='WRONG EXTENSION';this.emitKeySound('hurt');}
      this.entry='';return;
    }
    if(/^[0-9]$/.test(value)&&!this.authorized){this.entry=(this.entry+value).slice(0,4);this.codeStatus='';}
  }
  emitKeySound(name){this.events.push(name);}
  action(){} // Continuous pressure is intentional: release is the other half of the control.
  update(dt,input){
    if(this.dead||this.won)return;
    const wasWarning=this.warning;const oldBeat=Math.floor(this.age/2);this.age+=dt;if(!wasWarning&&this.warning)this.events.push('receiver');if(Math.floor(this.age/2)!==oldBeat&&!this.watching&&(!this.consoleMode||!this.callRang)){this.events.push('telephone');this.callRang=true;}this.hangupWait=Math.max(0,this.hangupWait-dt);this.hit=Math.max(0,this.hit-dt);this.moveWait-=dt;this.grace=Math.max(0,this.grace-dt);
    if(this.consoleMode){
      if(Number.isFinite(input.dial))this.dial=Math.max(0,Math.min(1,input.dial));
      if(this.tuned&&this.hangupWait<=0){this.listenCharge+=dt;if(this.listenCharge>=.45&&!this.heard){this.heard=true;this.events.push('score');}}else this.listenCharge=0;
    }
    const direction=Math.abs(input.y)>.5?(input.y>0?3:-3):Math.abs(input.x)>.5?(input.x>0?1:-1):0;
    if(direction&&(direction!==this.lastDirection||this.moveWait<=0)){this.socket=(this.socket+direction+6)%6;this.moveWait=.24;this.events.push('bounce');}this.lastDirection=direction;
    if(this.hangupWait>0){this.message='Call cancelled. Reconnecting in '+Math.ceil(this.hangupWait)+'s';return;}
    if(input.held&&this.grace<=0){
      if(this.watching){this.suspicion+=dt*.65;this.hit=.12;this.message='LET GO. IT CAN HEAR THE CURRENT.';}
      else if(this.consoleMode&&!this.tuned){this.message='Signal lost. Turn the tuning knob.';}
      else if(this.consoleMode&&!this.heard){this.message='Tune the caller before opening a line.';}
      else if(this.socket!==this.target){this.suspicion+=dt*.20;this.message='Wrong room. Follow the ringing number.';}
      else if(this.keypadEnabled&&!this.authorized){this.message='Enter extension, then # on keypad.';}
      else{this.charge+=dt/1.35;this.message='Keep the connection steady…';if(this.charge>=1){this.connected.push(this.target);this.receipt.push(this.consoleMode?this.caller.receipt:['05 / Mum says leave the porch light on.','02 / The dog still recognises my footsteps.','06 / I found the spare key. Thank you.','01 / Tell my wife the train was late.','04 / No, I have not grown any older.','03 / You can stop waiting up for me now.'][this.score]);this.score++;this.callRang=false;this.heard=false;this.listenCharge=0;this.signalAnnounced=false;this.authorized=false;this.entry='';this.codeStatus='';this.extension=String(Math.floor(1000+Math.random()*9000));this.charge=0;this.grace=.45;this.events.push('score');this.message=this.won?'All six callers made it home.':'A caller is home. Find the next room.';}}
    }else{this.suspicion=Math.max(0,this.suspicion-dt*.12);if(!input.held)this.message=this.consoleMode?(this.watching?'Stay quiet. The operator is listening.':this.warning?'Release the connection before the eye opens.':this.stage==='TUNE'?'Turn the knob until the signal is clear.':this.stage==='DIAL'?'Read the LCD. Enter the extension, then #.':this.stage==='ROUTE'?'Read the caller. Choose their destination.':'Hold the breadboard button to connect.'):this.watching?'Good. Stay quiet until the eye closes.':this.warning?'The lid is lifting. Be ready to let go.':'Find the ringing room. Hold to connect.';}
    if(this.suspicion>=1){this.suspicion=1;this.dead=true;this.events.push('death');}
  }
  draw(c,t){if(this.consoleMode){this.drawConsole(c,t);return;}
    const ink='#171b18',cream='#d7cfad',copper='#bc6947',green='#b4c8a1';
    const label=(s,x,y,size=12,color=cream,align='left')=>{c.fillStyle=color;c.font=`${size}px monospace`;c.textAlign=align;c.fillText(s,x,y);};
    c.fillStyle=ink;c.fillRect(0,0,600,720);
    // Worn enamel, ruled service labels, screws: all native drawing, no poster layer.
    for(let i=0;i<85;i++){c.strokeStyle=i%2?'#c3bb9610':'#00000030';c.beginPath();c.moveTo((i*137)%600,i*9);c.lineTo((i*137)%600+90,i*9-2);c.stroke();}
    c.strokeStyle='#6c6e53';c.strokeRect(18,18,564,684);
    for(const x of [29,571])for(const y of [29,691]){c.fillStyle='#767561';c.beginPath();c.arc(x,y,4,0,7);c.fill();c.strokeStyle=ink;c.beginPath();c.moveTo(x-3,y+2);c.lineTo(x+3,y-2);c.stroke();}
    label('MUNICIPAL NIGHT EXCHANGE',42,55,12);label('EST. 1906',558,55,10,'#999e84','right');
    c.fillStyle='#080b09';c.fillRect(42,75,516,152);
    // The eye is a gameplay clock, never a random jump scare.
    const open=this.watching?1:this.warning?(this.cycle-3.7)/1.1:.025;
    c.save();c.translate(300,143);c.fillStyle=cream;c.beginPath();c.ellipse(0,0,107,Math.max(2,46*open),0,0,Math.PI*2);c.fill();
    if(open>.1){c.save();c.beginPath();c.ellipse(0,0,107,46*open,0,0,7);c.clip();c.fillStyle=copper;c.beginPath();c.arc((this.socket%3-1)*24,0,34,0,7);c.fill();c.fillStyle='#050807';c.beginPath();c.arc((this.socket%3-1)*24,0,17,0,7);c.fill();for(let i=0;i<18;i++){const a=i*.35;c.strokeStyle='#191e19';c.beginPath();c.moveTo(Math.cos(a)*22+(this.socket%3-1)*24,Math.sin(a)*22);c.lineTo(Math.cos(a)*33+(this.socket%3-1)*24,Math.sin(a)*33);c.stroke();}c.restore();}
    c.restore();label(this.watching?'IT IS LISTENING — RELEASE':this.warning?'THE EYE IS OPENING':'OPERATOR ASLEEP',300,209,12,this.watching?copper:cream,'center');
    c.fillStyle=cream;c.save();c.translate(44,244);c.rotate(-.015);c.fillRect(0,0,512,64);label('INCOMING CALL',14,21,10,ink);label(this.won?'NO CALLS WAITING':`ROOM ${['01','02','03','04','05','06'][this.target]}${this.keypadEnabled?' / EXT '+this.extension:''}`,14,48,this.keypadEnabled?18:24,ink);label(`${this.score} / 6 HOME`,492,38,14,ink,'right');c.restore();
    for(let i=0;i<6;i++){
      const x=130+i%3*170,y=380+Math.floor(i/3)*140,done=this.connected.includes(i),chosen=this.socket===i;
      if(done){c.strokeStyle=copper;c.lineWidth=5;c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+80,y+120,240,640,300,680);c.stroke();}
      c.fillStyle='#0a0d0b';c.strokeStyle=chosen?cream:'#666e56';c.lineWidth=chosen?3:1;c.beginPath();c.arc(x,y,32,0,7);c.fill();c.stroke();c.fillStyle=done?copper:'#454f3d';c.beginPath();c.arc(x,y,13,0,7);c.fill();
      if(chosen){c.strokeStyle=green;c.lineWidth=5;c.beginPath();c.arc(x,y,39,-Math.PI/2,-Math.PI/2+Math.max(.02,this.charge)*Math.PI*2);c.stroke();label('▲',x,y+65,14,cream,'center');}
      label(`0${i+1}`,x,y-46,16,chosen?cream:'#939b81','center');
      if(i===this.target&&!this.won){c.fillStyle=green;c.beginPath();c.arc(x+47,y-24,4+(Math.sin(t*4)+1)*2,0,7);c.fill();}
    }
    c.lineWidth=1;c.fillStyle='#080b09';c.fillRect(42,609,516,60);label('ATTENTION',55,630,9,'#a6a98e');c.fillStyle='#394334';c.fillRect(140,620,400,10);c.fillStyle=copper;c.fillRect(140,620,400*this.suspicion,10);label(this.message,300,654,10,cream,'center');
    label(this.keypadEnabled?(this.hangupWait>0?'HUNG UP / PLEASE WAIT':this.authorized?'CODE ACCEPTED / HOLD TO CONNECT':`KEYPAD ${this.entry.padEnd(4,'_')}  # SEND  * CLEAR  D HANG UP`):'HOLD TO CONNECT / RELEASE WHEN WATCHED',300,691,10,'#a8ad94','center');c.textAlign='left';
  }
  drawConsole(c,t){
    const cream='#eee0bf',muted='#b0a797',amber='#efa365',green='#bdd2a1';
    const text=(s,x,y,size=12,color=cream,align='left')=>{c.fillStyle=color;c.font=`${size}px monospace`;c.textAlign=align;c.fillText(s,x,y);};
    const wire=(x,y,X,Y,color,width=1)=>{c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(X,Y);c.stroke();};
    c.fillStyle='#201b24';c.fillRect(0,0,600,720);
    const grain=c.createLinearGradient(0,0,600,720);grain.addColorStop(0,'#3a273329');grain.addColorStop(1,'#b9672920');c.fillStyle=grain;c.fillRect(0,0,600,720);
    cobweb(c,17,17,80);cobweb(c,583,17,71,true);
    c.strokeStyle='#526050';c.strokeRect(16,16,568,688);
    for(const x of [27,573])for(const y of [27,693]){c.fillStyle='#8f967e';c.beginPath();c.arc(x,y,4,0,7);c.fill();wire(x-2,y+2,x+2,y-2,'#253021');}
    text('ALL HALLOWS / NIGHT EXCHANGE',36,48,12);text(`${Math.min(this.score+1,6)} / 6`,563,48,12,muted,'right');
    // An eye built from the same electrical traces as the switchboard.
    const open=this.watching?1:this.warning?(this.cycle-3.7)/1.1:.02;
    c.fillStyle='#100f19';c.fillRect(35,64,530,119);
    c.fillStyle='#b5a785';c.beginPath();c.arc(502,99,21,0,7);c.fill();c.fillStyle='#100f19';c.beginPath();c.arc(494,93,19,0,7);c.fill();bat(c,460,99,8);bat(c,530,139,6);
    candle(c,59,164,t);candle(c,541,164,t);
    for(let i=0;i<14;i++){const x=55+i*38;wire(x,70,x,94+(i%3)*9,'#283b2c');wire(x,94+(i%3)*9,300,123,'#283b2c');}
    c.save();c.translate(300,120);c.beginPath();c.ellipse(0,0,92,Math.max(2,32*open),0,0,Math.PI*2);c.fillStyle=this.watching?amber:cream;c.fill();
    if(open>.1){c.save();c.clip();c.fillStyle='#0c130d';c.beginPath();c.arc((this.socket%3-1)*16,0,23,0,7);c.fill();c.fillStyle=cream;c.fillRect((this.socket%3-1)*16-3,-6,5,5);c.restore();}c.restore();
    text(this.watching?'RED / RELEASE':this.warning?'YELLOW / EYE OPENING':'GREEN / LINE SAFE',300,170,11,this.watching||this.warning?amber:green,'center');
    const stages=['TUNE','DIAL','ROUTE','CONNECT'];stages.forEach((s,i)=>{const x=36+i*134;c.fillStyle=this.stage===s?'#c8c8aa':'#27352a';c.fillRect(x,197,126,26);text(`${i+1} ${s}`,x+9,215,11,this.stage===s?'#182319':muted);});
    text(this.caller.name,36,248,12,amber);
    if(!this.heard){
      text('The caller is buried in the carrier noise.',36,278,12,muted);text('Turn the physical knob. Find the clear signal.',36,301,11,muted);
      c.strokeStyle=green;c.lineWidth=1.5;c.beginPath();for(let x=0;x<520;x+=2){const y=341+Math.sin(x*.07+t*3)*10+(Math.sin(x*.61+t*7)*17+Math.sin(x*.19-t*4)*14)*(1-this.quality);if(x)c.lineTo(40+x,y);else c.moveTo(40+x,y);}c.stroke();
    }else{
      let line='',row=0;for(const word of this.caller.clue.split(' ')){if((line+word).length>58){text(line,36,277+row*20,12,cream);row++;line='';}line+=word+' ';}if(line)text(line,36,277+row*20,12,cream);
      text(this.authorized?'EXTENSION ACCEPTED / SELECT A DESTINATION':'EXTENSION RECOVERED / READ THE LCD',36,364,10,green);
    }
    c.fillStyle='#304132';c.fillRect(36,388,528,5);c.fillStyle=this.tuned?green:amber;c.fillRect(36,388,528*this.quality,5);
    text(`${(88+this.dial*14).toFixed(2)} MHz`,36,414,12,cream);text(this.tuned?'SIGNAL CLEAR':`SIGNAL ${Math.round(this.quality*100)}%`,564,414,11,this.tuned?green:muted,'right');
    for(let i=0;i<6;i++){
      const x=36+(i%3)*180,y=439+Math.floor(i/3)*73,chosen=i===this.socket,done=this.connected.includes(i);
      c.fillStyle=chosen?'#354b35':'#1d2a20';c.fillRect(x,y,167,61);c.strokeStyle=chosen?cream:'#4c5b47';c.lineWidth=chosen?2:1;c.strokeRect(x,y,167,61);
      text(`0${i+1}`,x+10,y+20,10,done?green:muted);pumpkin(c,x+143,y+19,12,done,t);text(DESTINATIONS[i],x+10,y+44,12,cream);
      if(done){c.fillStyle='#f8bd6b';c.fillRect(x+7,y+54,153,2);}
      if(chosen&&this.charge>0){c.fillStyle=green;c.fillRect(x,y+57,167*Math.min(1,this.charge),4);}
    }
    text('OPERATOR ATTENTION',36,616,10,muted);c.fillStyle='#344233';c.fillRect(208,606,356,9);c.fillStyle=amber;c.fillRect(208,606,356*this.suspicion,9);
    text(this.message,300,644,11,cream,'center');
    text(this.hangupWait>0?`HANG UP / RECONNECT IN ${Math.ceil(this.hangupWait)}s`:`${this.entry.padEnd(4,'_')}  # SUBMIT  * CLEAR / RED BUTTON: HANG UP`,300,675,10,muted,'center');
    c.textAlign='left';
  }

}
export const SWITCHBOARD={id:'switchboard',title:'Please Hold.',genre:'NIGHT SHIFT / DO NOT WAKE THE OPERATOR',symbol:'⊗',story:'Six people called from rooms that were demolished in 1906. You are covering the night shift. Put them through.',stick:'Choose a destination from the caller’s message. Click to pause.',button:'Tune with the knob. Dial on the keypad. HOLD to connect; RELEASE when red.',note:'Do not put the operator on hold.',goal:6,objective:'Tune six voices out of the noise. Dial their extensions, interpret their requests, and route each call safely. The separate HANG UP button grounds the line but clears your current work.',death:'Your replacement starts Monday.',color:'#c2ac72',Game:Switchboard};
