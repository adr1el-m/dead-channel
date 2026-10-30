import test from 'node:test';
import assert from 'node:assert/strict';
import {CARTRIDGES, GhostFlight, BootBreaker, BlimpJump, Gravekeeper, LastSignal, DeadFrequency} from '../web/games.js';
const idle={x:0,y:0,held:false};

test('six distinct cartridges have reachable objectives and independent state',()=>{
  assert.equal(CARTRIDGES.length,6);assert.equal(new Set(CARTRIDGES.map(g=>g.Game)).size,6);
  for(const m of CARTRIDGES){assert.ok(m.goal>0);const a=new m.Game(),b=new m.Game();a.score=100;assert.equal(b.score,0);}
});
test('Ghost Flight flap reverses falling, towers score once, floor ends flight',()=>{
  const g=new GhostFlight();g.vy=200;g.action();assert.ok(g.vy<0);
  g.y=300;g.obstacles=[{x:50,top:100,gap:400,passed:false}];g.update(.016,idle);assert.equal(g.score,1);g.update(.016,idle);assert.equal(g.score,1);
  g.y=680;g.update(.016,idle);assert.ok(g.dead);
});
test('Boot Breaker uses joystick, launch, paddle-angle bounce and brick collision',()=>{
  const g=new BootBreaker();g.update(.1,{...idle,x:1});assert.ok(g.px>300);assert.equal(g.ball.x,g.px);g.action();assert.equal(g.attached,false);
  g.px=300;g.ball={x:340,y:619,vx:0,vy:350};g.update(.016,idle);assert.ok(g.ball.vy<0);assert.ok(g.ball.vx>0);
  g.bricks=[{x:100,y:100,w:78,h:25,hp:1},{x:400,y:100,w:78,h:25,hp:1}];g.ball={x:130,y:137,vx:0,vy:-330};g.update(.016,idle);assert.equal(g.score,10);assert.equal(g.bricks[0].hp,0);
});
test('Boot Breaker loses three balls and advances a cleared crypt',()=>{
  const g=new BootBreaker();for(let i=0;i<3;i++){g.attached=false;g.ball.y=740;g.ball.vy=320;g.update(.016,idle);}assert.ok(g.dead);assert.equal(g.lives,0);
  const h=new BootBreaker();h.attached=false;h.bricks=[];h.update(.016,idle);assert.equal(h.wave,2);assert.equal(h.bricks.length,30);
});
test('Blimp Jump lands only when falling, scrolls, breaks fragile platforms, and dies below view',()=>{
  const g=new BlimpJump();g.x=300;g.y=470;g.vy=300;g.platforms=[{x:250,y:500,w:110,kind:1}];g.update(.02,idle);assert.ok(g.vy<0);assert.ok(g.platforms[0].broken);
  g.y=100;g.vy=-100;g.update(.016,idle);assert.ok(g.camera<0);assert.ok(g.score>400);
  g.y=g.camera+780;g.update(.016,idle);assert.ok(g.dead);
});
test('Blimp Jump emergency lift has a real cooldown',()=>{
  const g=new BlimpJump();g.action();assert.equal(g.cooldown,4);g.vy=10;g.action();assert.equal(g.vy,10);g.update(.1,idle);assert.ok(g.cooldown<4);
});
test('Gravekeeper collects souls, repels shades, and limits collision damage',()=>{
  const g=new Gravekeeper();g.souls=[{...g.player}];g.update(.016,idle);assert.equal(g.score,100);
  g.enemies=[{x:301,y:360},{x:550,y:100}];g.action();assert.equal(g.enemies.length,1);assert.equal(g.cooldown,4);
  g.enemies=[{...g.player}];g.update(.016,idle);assert.equal(g.lives,2);g.update(.016,idle);assert.equal(g.lives,2);
  g.invincible=0;g.update(.016,idle);g.invincible=0;g.update(.016,idle);assert.ok(g.dead);
});
test('The Last Signal shoots while held, destroys contacts, and loses fuses',()=>{
  const g=new LastSignal();g.update(.016,{...idle,held:true});assert.equal(g.bullets.length,1);
  g.enemies=[{x:300,y:200,phase:0,speed:0}];g.bullets=[{x:300,y:210}];g.update(.016,idle);assert.equal(g.score,25);assert.equal(g.enemies.length,0);
  for(let i=0;i<3;i++){g.invincible=0;g.enemies=[{x:300,y:690,phase:0,speed:0}];g.update(.016,idle);}assert.ok(g.dead);
});
test('Dead Frequency rewards accurate tuning, penalizes false locks, times out and ends',()=>{
  const g=new DeadFrequency();g.dial=g.target;g.action();assert.equal(g.score,100);assert.equal(g.round,2);
  g.lockCooldown=0;g.dial=g.target<.5?1:0;g.action();assert.equal(g.strikes,2);
  g.remaining=0;g.update(.016,idle);assert.equal(g.strikes,1);assert.ok(g.remaining>0);
  g.remaining=0;g.update(.016,idle);assert.ok(g.dead);
});
test('all engines remain finite under sustained mixed controls',()=>{
  for(const {Game} of CARTRIDGES){
    const g=new Game();for(let i=0;i<1800&&!g.dead;i++){if(i%35===0)g.action();g.update(1/60,{x:Math.sin(i*.04),y:Math.cos(i*.03),held:i%60<30});}
    assert.ok(Number.isFinite(g.score));assert.ok(Number.isFinite(g.age));
  }
});

test('all six objectives finish and freeze the simulation',()=>{
  for(const m of CARTRIDGES){const g=new m.Game();g.score=m.goal-1;assert.equal(g.won,false);g.score=m.goal;assert.equal(g.won,true);const age=g.age;g.update(1/60,idle);assert.equal(g.age,age);assert.equal(g.dead,false);}
});
test('Ghost Flight can be completed through eight naturally spawned towers',()=>{
  const g=new GhostFlight();let frames=0;
  while(!g.dead&&!g.won&&frames++<6000){const o=g.obstacles.find(o=>o.x+74>=132);const target=o?o.top+o.gap/2:320;if(g.y>target+12&&g.vy>0)g.action();g.update(1/120,idle);}
  assert.ok(g.won,`Flight ended at ${g.score} towers`);
});
test('generated ascent platforms stay within a reachable horizontal step',()=>{
  for(let n=0;n<100;n++){const g=new BlimpJump();for(let i=1;i<g.platforms.length;i++)assert.ok(Math.abs(g.platforms[i].x-g.platforms[i-1].x)<=115);}
});
test('six accurate frequency locks complete the ritual',()=>{
 const g=new DeadFrequency();for(let i=0;i<6;i++){g.dial=g.target;g.action();g.update(.5,idle);}assert.equal(g.won,true);assert.equal(g.strikes,3);
});

test('Dead Frequency accepts the physical dial, clamps endpoints, and retains joystick fallback',()=>{
 const g=new DeadFrequency();g.update(.01,{...idle,dial:.8});assert.equal(g.dial,.8);
 g.update(.01,{...idle,dial:2});assert.equal(g.dial,1);
 g.update(.01,{...idle,dial:-1});assert.equal(g.dial,0);
 g.update(1,{...idle,x:1});assert.equal(g.dial,.32);
 g.update(.01,{...idle,dial:g.target});g.action();assert.equal(g.score,100);
});
