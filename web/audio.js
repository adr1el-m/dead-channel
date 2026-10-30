// Original procedural score: detuned drones, a minor-second ostinato,
// bell harmonics, heartbeat percussion and a short tape-style echo.
export class Soundtrack {
  constructor(){this.ctx=null;this.enabled=false;this.volume=.35;this.cartridge=0;this.step=0;this.next=0;this.timer=null;this.active=false;}
  async toggle(){
    if(this.enabled){this.enabled=false;await this.ctx.suspend();return false;}
    if(!this.ctx)this.build();
    await this.ctx.resume();this.enabled=true;this.next=this.ctx.currentTime+.06;
    if(!this.timer)this.timer=setInterval(()=>this.schedule(),80);
    return true;
  }
  build(){
    const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw new Error('Web Audio unavailable');
    this.ctx=new Audio();const c=this.ctx;
    this.master=c.createGain();this.master.gain.value=this.volume*.65;
    const compressor=c.createDynamicsCompressor();compressor.threshold.value=-20;compressor.ratio.value=5;
    this.master.connect(compressor);compressor.connect(c.destination);
    this.echo=c.createDelay(1);this.echo.delayTime.value=.39;
    const feedback=c.createGain();feedback.gain.value=.23;const wet=c.createGain();wet.gain.value=.19;
    this.echo.connect(feedback);feedback.connect(this.echo);this.echo.connect(wet);wet.connect(this.master);
    this.drones=[];
    for(let i=0;i<3;i++){
      const osc=c.createOscillator(),gain=c.createGain(),filter=c.createBiquadFilter();osc.type=i===2?'triangle':'sine';osc.frequency.value=[55,55.35,82.41][i];gain.gain.value=[.09,.07,.025][i];filter.type='lowpass';filter.frequency.value=180;osc.connect(filter);filter.connect(gain);gain.connect(this.master);osc.start();this.drones.push(osc);
    }
    const length=c.sampleRate*2;this.noise=c.createBuffer(1,length,c.sampleRate);const samples=this.noise.getChannelData(0);for(let i=0;i<length;i++)samples[i]=(Math.random()*2-1)*.18;
    const hiss=c.createBufferSource(),hissFilter=c.createBiquadFilter(),hissGain=c.createGain();hiss.buffer=this.noise;hiss.loop=true;hissFilter.type='bandpass';hissFilter.frequency.value=750;hissFilter.Q.value=.5;hissGain.gain.value=.025;hiss.connect(hissFilter);hissFilter.connect(hissGain);hissGain.connect(this.master);hiss.start();
  }
  setVolume(value){this.volume=value;if(this.master)this.master.gain.setTargetAtTime(value*.65,this.ctx.currentTime,.05);}
  select(index){this.cartridge=index;this.step=0;if(this.ctx){const base=[55,49,58.27,43.65,51.91,41.2][index];this.drones.forEach((o,i)=>o.frequency.setTargetAtTime(base*[1,1.006,1.498][i],this.ctx.currentTime,1.3));}}
  note(freq,time,duration=.6,level=.06,type='sine',echo=true){
    if(!this.ctx)return;const c=this.ctx,o=c.createOscillator(),gain=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,time);gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(level,time+.015);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);o.connect(gain);gain.connect(this.master);if(echo)gain.connect(this.echo);o.start(time);o.stop(time+duration+.02);o.onended=()=>{o.disconnect();gain.disconnect();};
  }
  schedule(){
    if(!this.enabled||this.ctx.state!=='running')return;
    const c=this.ctx;if(this.next<c.currentTime)this.next=c.currentTime+.03;
    const bpm=[66,88,74,60,96,54][this.cartridge],beat=60/bpm/2,root=[55,49,58.27,43.65,51.91,41.2][this.cartridge];
    const melody=[[0,12,1,7,0,13,6,1],[0,7,12,13,7,6,1,0],[12,19,13,24,18,13,7,1],[0,1,7,6,12,1,6,-1],[0,7,1,12,6,13,7,1],[0,13,1,6,0,7,18,1]][this.cartridge];
    while(this.next<c.currentTime+.25){
      const s=this.step%16;
      if(s%2===0){const interval=melody[(s/2)%8];const freq=root*4*Math.pow(2,interval/12);this.note(freq,this.next,beat*2.7,this.active?.045:.028,'sine');this.note(freq*2.003,this.next,.65,.009,'sine');}
      if(s%4===0)this.note(root*(s===8?Math.pow(2,1/12):1),this.next,beat*3.5,.12,'triangle',false);
      if(this.active&&(s===0||s===8)){this.note(58,this.next,.18,.14,'sine',false);this.note(48,this.next+.19,.15,.09,'sine',false);}
      if(this.active&&this.cartridge===4&&s%2===1)this.note(root*8,this.next,.04,.018,'triangle',false);
      this.next+=beat;this.step++;
    }
  }
  effect(name){
    if(!this.enabled||this.ctx.state!=='running')return;const t=this.ctx.currentTime;
    if(name==='telephone'){for(let i=0;i<3;i++){this.note(440,t+i*.12,.09,.035,'sine',false);this.note(480,t+i*.12,.09,.025,'sine',false);}return;}
    if(name==='receiver'){this.note(73,t,.6,.06,'triangle',false);this.note(69,t,.8,.04,'sine',false);return;}
    const sounds={flap:[230,.09,.035],bounce:[165,.12,.045],score:[660,.4,.05],break:[110,.08,.055],shot:[460,.045,.025],pulse:[82,.65,.07],hurt:[47,.35,.1],death:[38,1.7,.12],seal:[440,.9,.06]};
    const s=sounds[name];if(!s)return;this.note(s[0],t+.005,s[1],s[2],name==='shot'?'triangle':'sine');
    if(name==='score'||name==='seal')this.note(s[0]*Math.pow(2,1/12),t+.17,.8,.025);
    if(name==='death'){this.note(40.5,t+.02,2,.09,'triangle',false);this.note(311,t+.07,1.3,.025);}
  }
}
