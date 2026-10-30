import test from 'node:test';
import assert from 'node:assert/strict';
import {Switchboard} from '../web/switchboard.js';
const idle={x:0,y:0,held:false};
test('six callers can be connected with normal navigation and timed release',()=>{const g=new Switchboard();for(let i=0;i<12000&&!g.won&&!g.dead;i++){const difference=(g.target-g.socket+6)%6;g.update(1/120,{x:difference?(difference<=3?1:-1):0,y:0,held:difference===0&&!g.warning&&!g.watching});}assert.ok(g.won);assert.equal(g.receipt.length,6);assert.equal(new Set(g.connected).size,6);assert.ok(g.suspicion<1);const age=g.age;g.update(1,idle);assert.equal(g.age,age);});
test('watching punishes held current, silence recovers, idle never kills',()=>{const g=new Switchboard();g.age=5;g.update(.5,{...idle,held:true});assert.ok(g.suspicion>0);const suspicion=g.suspicion;g.update(.5,idle);assert.ok(g.suspicion<suspicion);for(let i=0;i<10000;i++)g.update(.016,idle);assert.equal(g.dead,false);});
test('wrong socket cannot score and sustained noise loses the shift',()=>{const g=new Switchboard();for(let i=0;i<2000&&!g.dead;i++)g.update(.016,{...idle,held:true});assert.equal(g.score,0);assert.ok(g.dead);});
test('partial connection survives releasing the button and the waking cycle',()=>{const g=new Switchboard();g.socket=g.target;g.update(.5,{...idle,held:true});const charge=g.charge;g.update(1,idle);assert.equal(g.charge,charge);g.update(1,{...idle,held:true});assert.equal(g.score,1);});
test('keypad mode requires correct extension before a call can connect',()=>{
 const g=new Switchboard();g.keypadEnabled=true;g.extension='4821';g.socket=g.target;
 g.update(1.4,{...idle,held:true});assert.equal(g.score,0);
 for(const k of '4821#')g.key(k);assert.equal(g.authorized,true);
 g.update(1.4,{...idle,held:true});assert.equal(g.score,1);assert.equal(g.authorized,false);assert.equal(g.entry,'');
});
test('wrong codes add attention, clear works, hangup resets partial calls with cooldown',()=>{
 const g=new Switchboard();g.keypadEnabled=true;g.extension='4821';
 for(const k of '12*')g.key(k);assert.equal(g.entry,'');
 for(const k of '0000#')g.key(k);assert.equal(g.authorized,false);assert.ok(g.suspicion>0);
 g.charge=.5;g.authorized=true;g.key('hangup');assert.equal(g.charge,0);assert.equal(g.authorized,false);assert.equal(g.hangupWait,3);
 const code=g.extension;g.key('hangup');assert.equal(g.extension,code);g.key('1');assert.equal(g.entry,'');
 g.update(1,idle);assert.equal(g.hangupWait,2);
});
test('keypad-assisted six-call run is winnable',()=>{
 const g=new Switchboard();g.keypadEnabled=true;
 for(let frame=0;frame<12000&&!g.won&&!g.dead;frame++){
  if(!g.authorized)for(const k of g.extension+'#')g.key(k);
  g.update(1/120,{...idle,held:!g.warning&&!g.watching});
 }
 assert.equal(g.won,true);assert.equal(g.suspicion,0);
});

test('console loop requires tuning, code, interpretation and a safe connection',()=>{
 const g=new Switchboard();g.consoleMode=true;g.keypadEnabled=true;g.extension='4821';g.socket=0;
 for(const k of '4821#')g.key(k);assert.equal(g.authorized,false,'cannot bypass tuning');
 g.update(.5,{...idle,dial:g.caller.frequency});assert.equal(g.heard,true);
 for(const k of '4821#')g.key(k);assert.equal(g.authorized,true);assert.equal(g.socket,0,'keypad must not route the call for you');
 g.update(.5,{...idle,dial:g.caller.frequency,held:true});assert.equal(g.score,0,'wrong destination cannot connect');
 g.socket=g.target;g.update(1.4,{...idle,dial:g.caller.frequency,held:true});assert.equal(g.score,1);assert.equal(g.heard,false);assert.equal(g.authorized,false);
});
test('detuning pauses a connection and emergency hangup trades progress for attention',()=>{
 const g=new Switchboard();g.consoleMode=true;g.keypadEnabled=true;g.authorized=true;g.heard=true;g.socket=g.target;g.suspicion=.6;
 g.update(.3,{...idle,dial:g.caller.frequency,held:true});const charge=g.charge;
 g.update(.3,{...idle,dial:1,held:true});assert.equal(g.charge,charge);
 g.key('hangup');assert.equal(g.charge,0);assert.equal(g.heard,false);assert.ok(g.suspicion<=.25);assert.equal(g.hangupWait,3);
 g.key('hangup');assert.ok(g.suspicion>0,'cooldown prevents attention-spam exploit');
});
test('complete six-caller console shift succeeds with measured navigation and all physical actions',()=>{
 const g=new Switchboard();g.consoleMode=true;g.keypadEnabled=true;
 for(let i=0;i<20000&&!g.dead&&!g.won;i++){
  if(g.heard&&!g.authorized)for(const k of g.extension+'#')g.key(k);
  const diff=(g.target-g.socket+6)%6;
  g.update(1/120,{x:diff?(diff<=3?1:-1):0,y:0,dial:g.caller.frequency,held:g.heard&&g.authorized&&!diff&&!g.warning&&!g.watching});
 }
 assert.equal(g.won,true);assert.equal(g.receipt.length,6);assert.equal(new Set(g.connected).size,6);assert.ok(g.suspicion<1);
});
