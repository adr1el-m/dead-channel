import test from 'node:test';
import assert from 'node:assert/strict';
import {lcdRows} from '../web/lcd.js';
import {CARTRIDGES} from '../web/games.js';
import {SWITCHBOARD} from '../web/switchboard.js';
test('LCD keeps room information through every eye phase',()=>{
 const g=new SWITCHBOARD.Game();g.age=5;
 assert.deepEqual(lcdRows(SWITCHBOARD,g,'playing'),['CALL FROM RM 05','HOLD TO CONNECT']);
 g.age=4;assert.equal(lcdRows(SWITCHBOARD,g,'playing')[0],'CALL FROM RM 05');
 g.age=0;assert.equal(lcdRows(SWITCHBOARD,g,'playing')[0],'CALL FROM RM 05');
});
test('LCD radio follows dial and lock state; all game screens fit 16x2',()=>{
 for(const m of [...CARTRIDGES,SWITCHBOARD])for(const phase of ['ready','playing','paused','dead','won']){
  const rows=lcdRows(m,new m.Game(),phase);assert.equal(rows.length,2);assert.ok(rows.every(r=>r.length<=16&&/^[ -~]*$/.test(r)));
 }
 const m=CARTRIDGES.find(m=>m.id==='frequency');const g=new m.Game();g.dial=g.target;
 assert.equal(lcdRows(m,g,'playing')[1],'CLEAR! PRESS BTN');
});
test('LCD extension entry stays visible while the eye watches',()=>{
 const g=new SWITCHBOARD.Game();g.keypadEnabled=true;g.extension='4821';g.entry='48';
 assert.deepEqual(lcdRows(SWITCHBOARD,g,'playing'),['RM05 EXT 4821','CODE 48__ # SEND']);
 g.age=5;assert.deepEqual(lcdRows(SWITCHBOARD,g,'playing'),['RM05 EXT 4821','CODE 48__ # SEND']);
 g.key('hangup');assert.equal(lcdRows(SWITCHBOARD,g,'playing')[0],'CALL CANCELLED');
});

test('seven segment counts callers, lives and clears the menu',async()=>{
 const {segmentDigit}=await import('../web/lcd.js');
 const g=new SWITCHBOARD.Game();assert.equal(segmentDigit(SWITCHBOARD,g,'playing'),6);
 g.score=4;assert.equal(segmentDigit(SWITCHBOARD,g,'paused'),2);
 g.score=6;assert.equal(segmentDigit(SWITCHBOARD,g,'won'),0);
 assert.equal(segmentDigit(SWITCHBOARD,g,'ready'),-1);
 for(const m of CARTRIDGES){const trial=new m.Game();const digit=segmentDigit(m,trial,'playing');assert.ok(Number.isInteger(digit)&&digit>=0&&digit<=9);}
});
test('console LCD reveals extension after tuning without eye-warning overrides',()=>{
 const g=new SWITCHBOARD.Game();g.consoleMode=true;g.keypadEnabled=true;
 assert.equal(lcdRows(SWITCHBOARD,g,'playing')[0],'TUNE THE CALL');
 g.update(.5,{x:0,y:0,dial:g.caller.frequency,held:false});assert.equal(lcdRows(SWITCHBOARD,g,'playing')[0],`EXT ${g.extension}`);
 const calm=lcdRows(SWITCHBOARD,g,'playing');g.age=4;assert.deepEqual(lcdRows(SWITCHBOARD,g,'playing'),calm);g.age=5;assert.deepEqual(lcdRows(SWITCHBOARD,g,'playing'),calm);
 for(const k of g.extension+'#')g.key(k);g.age=0;const routed=lcdRows(SWITCHBOARD,g,'playing');g.age=5;assert.deepEqual(lcdRows(SWITCHBOARD,g,'playing'),routed);
});
