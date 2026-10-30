// Two fixed-width ASCII rows for the physical 16x2 display.
export function lcdRows(meta, trial, phase) {
  let rows;
  if (phase==='paused') rows=['SIGNAL PAUSED','CLICK TO RESUME'];
  else if (phase==='won') rows=meta.id==='switchboard'?['SHIFT COMPLETE','ALL CALLERS HOME']:['SEAL RECOVERED',meta.title];
  else if (phase==='dead') rows=['TRANSMISSION LOST','PRESS TO RETRY'];
  else if (phase!=='playing') rows=[meta.title,'PRESS TO START'];
  else if(meta.id==='switchboard'&&trial.consoleMode){
    if(trial.hangupWait>0)rows=['LINE GROUNDED',`RETRY IN ${Math.ceil(trial.hangupWait)}s`];
    else if(!trial.heard)rows=['TUNE THE CALL',`SIGNAL ${Math.round(trial.quality*100)}%`];
    else if(!trial.authorized)rows=[`EXT ${trial.extension}`,trial.codeStatus||`CODE ${trial.entry.padEnd(4,'_')} # SEND`];
    else if(!trial.tuned)rows=['CARRIER LOST','RETUNE THE KNOB'];
    else rows=[trial.destination,trial.socket===trial.target?'HOLD TO CONNECT':'CHOOSE THE ROOM'];
  }
  else if (meta.id==='switchboard'&&trial.keypadEnabled&&trial.hangupWait>0) rows=['CALL CANCELLED',`RETRY IN ${Math.ceil(trial.hangupWait)}s`];
  else if (meta.id==='switchboard'&&trial.keypadEnabled&&!trial.authorized) rows=[`RM${String(trial.target+1).padStart(2,'0')} EXT ${trial.extension}`,trial.codeStatus||`CODE ${trial.entry.padEnd(4,'_')} # SEND`];
  else if (meta.id==='switchboard') rows=[`CALL FROM RM ${String(trial.target+1).padStart(2,'0')}`,`HOLD TO CONNECT`];
  else if (meta.id==='frequency') rows=[`${(88+trial.dial*14).toFixed(2)} MHz`,trial.tuned?'CLEAR! PRESS BTN':`SIGNAL ${Math.round(trial.quality*100)}%`];
  else rows=[meta.title,`SCORE ${Math.floor(trial.score)}`];
  return rows.map(row=>row.replace(/[^ -~]/g,' ').slice(0,16));
}

export function segmentDigit(meta,trial,phase){
 if(!['playing','paused','won','dead'].includes(phase))return -1;
 if(meta.id==='switchboard')return Math.max(0,Math.min(6,6-Math.floor(trial.score)));
 if(meta.id==='frequency')return Math.max(0,Math.min(9,trial.strikes));
 if(Number.isFinite(trial.lives))return Math.max(0,Math.min(9,trial.lives));
 if(meta.id==='ghost')return Math.max(0,Math.min(8,meta.goal-Math.floor(trial.score)));
 return Math.max(0,Math.min(9,Math.floor(trial.score/meta.goal*9)));
}
