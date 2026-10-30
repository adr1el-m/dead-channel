export const W = 600, H = 720;
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const rnd = (a, b) => a + Math.random() * (b - a);
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const TAU = Math.PI * 2;
let scenery;
if(typeof Image!=='undefined'){scenery=new Image();scenery.src=new URL('./art/the-listener.jpg',import.meta.url).href;}
const PAPER = '#d1d9b9', RED = '#cd7957', GREEN = '#9ebd8b';

function text(c, value, x, y, size = 12, color = PAPER, align = 'left') {
  c.fillStyle = color; c.font = `${size}px monospace`; c.textAlign = align; c.fillText(value, x, y); c.textAlign = 'left';
}
function line(c, x, y, ex, ey, color = '#334335', width = 1) {
  c.strokeStyle = color; c.lineWidth = width; c.beginPath(); c.moveTo(x, y); c.lineTo(ex, ey); c.stroke();
}
function circle(c, x, y, r, color) {
  c.fillStyle = color; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
}
function glow(c, x, y, r, color = '#abc47a') {
  const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, color + '55'); g.addColorStop(1, color + '00'); c.fillStyle = g; c.fillRect(x-r, y-r, r*2, r*2);
}
function shade(c, x, y, r = 20, color = '#b6c5a1', eyes = '#151e15', t = 0) {
  c.fillStyle = color; c.beginPath(); c.moveTo(x-r, y+r);
  c.bezierCurveTo(x-r-5, y-r*1.6, x+r+5, y-r*1.6, x+r, y+r);
  for(let i=0;i<4;i++) c.lineTo(x+r-i*r*.66, y+r+(i%2?8:0)); c.closePath(); c.fill();
  c.fillStyle=eyes;c.beginPath();c.ellipse(x-r*.32,y-r*.12,r*.12,r*.28,Math.sin(t)*.1,0,TAU);c.ellipse(x+r*.32,y-r*.12,r*.12,r*.28,-Math.sin(t)*.1,0,TAU);c.fill();
  c.beginPath();c.ellipse(x,y+r*.5,r*.12,r*.21,0,0,TAU);c.fill();
}
function eyes(c, x, y, size, alpha = .4) {
  c.save();c.globalAlpha=alpha;
  [-1,1].forEach(s=>{c.fillStyle='#101710';c.beginPath();c.ellipse(x+s*size*.4,y,size*.23,size*.08,s*.15,0,TAU);c.fill();circle(c,x+s*size*.4,y,size*.035,'#d8c69b');});c.restore();
}
function ground(c, t, tint = '#0d180f') {
  c.fillStyle = tint; c.fillRect(0,0,W,H);
  if(scenery?.complete&&scenery.naturalWidth&&!document.body.classList.contains('reduced')){c.save();c.globalAlpha=.20;c.drawImage(scenery,0,0,W,H);c.restore();}
  for(let i=0;i<42;i++) {
    const x=(i*173+31)%W,y=(i*97+23)%H;
    c.fillStyle=i%3?'#90a87e18':'#c0bc8b28';c.fillRect(x,y+Math.sin(t*.5+i)*3,1+i%2,1+i%2);
  }
  const fog=c.createLinearGradient(0,H*.5,0,H);fog.addColorStop(0,'#87977700');fog.addColorStop(1,'#8797770d');c.fillStyle=fog;c.fillRect(0,0,W,H);
}
function tomb(c, x, y, width=30, height=42) {
  c.fillStyle='#233125';c.beginPath();c.roundRect(x,y,width,height,[width/2,width/2,0,0]);c.fill();
  line(c,x+width/2,y+10,x+width/2,y+27,'#65715a');line(c,x+width/2-6,y+16,x+width/2+6,y+16,'#65715a');
}
function heartHUD(c, lives, label='LIVES') { text(c,`${label} ${'╋ '.repeat(Math.max(0,lives))}`,30,42,12,RED); }
function bar(c,label,value,max,x=30,y=670,width=220,color=GREEN) {
  text(c,label,x,y-12,10,'#929e85');c.fillStyle='#263325';c.fillRect(x,y,width,3);c.fillStyle=color;c.fillRect(x,y,width*clamp(value/max,0,1),3);
}

class Trial {
  constructor() { this.score=0;this.dead=false;this.events=[];this.age=0;this.hit=0; }
  get won() { return this.score >= this.constructor.goal; }
  emit(name) { this.events.push(name); }
  end() { if(!this.dead){this.dead=true;this.emit('death');} }
  base(dt) { this.age+=dt;this.hit=Math.max(0,this.hit-dt); }
  hud(c,sub) { text(c,sub,570,42,11,'#9aab8c','right'); }
}

export class GhostFlight extends Trial {
  constructor(){super();this.y=320;this.vy=-180;this.obstacles=[];this.timer=.8;}
  action(){this.vy=-245;this.emit('flap');}
  update(dt){
    if(this.dead||this.won)return;this.base(dt);this.vy+=650*dt;this.y+=this.vy*dt;this.timer-=dt;
    if(this.timer<=0){const gap=Math.max(250,285-this.score*3);this.obstacles.push({x:620,top:clamp((this.obstacles.at(-1)?.top??190)+rnd(-75,75),85,575-gap),gap,passed:false});this.timer=2.2;}
    for(const o of this.obstacles){o.x-=(140+Math.min(this.score*2,25))*dt;
      if(!o.passed&&o.x+70<132){o.passed=true;this.score++;this.emit('score');}
      if(168>o.x-4&&132<o.x+74&&(this.y-17<o.top||this.y+17>o.top+o.gap))this.end();
    }
    this.obstacles=this.obstacles.filter(o=>o.x>-90);if(this.y<19||this.y>662)this.end();
  }
  draw(c,t){
    ground(c,t,'#101611');circle(c,463,116,53,'#b5b68c');circle(c,447,102,47,'#101611');
    eyes(c,300,180,270,.16);
    for(let i=-1;i<12;i++){const x=i*65-(t*9%65),h=80+((i+12)*47%100);c.fillStyle='#1c281e';c.fillRect(x,680-h,48,h);c.beginPath();c.moveTo(x-4,680-h);c.lineTo(x+24,650-h);c.lineTo(x+52,680-h);c.fill();}
    this.obstacles.forEach(o=>{
      c.fillStyle='#29382a';c.fillRect(o.x,0,70,o.top);c.fillRect(o.x,o.top+o.gap,70,680-o.top-o.gap);
      c.fillStyle='#6d795a';c.fillRect(o.x-4,o.top-12,78,12);c.fillRect(o.x-4,o.top+o.gap,78,12);
      for(let y=30;y<680;y+=62){if(y>o.top-35&&y<o.top+o.gap+20)continue;c.fillStyle='#9e9765';c.fillRect(o.x+28,y,12,21);if(Math.floor(y/62)%3===1)eyes(c,o.x+34,y+9,20,.9);}
    });
    c.fillStyle='#080d09';c.fillRect(0,680,W,40);glow(c,150,this.y,65);shade(c,150,this.y,20,PAPER,'#142013',t);
    this.hud(c,`${this.score} WINDOWS PASSED`);text(c,'DO NOT LET THEM SEE YOU',30,42,11,RED);
  }
}

export class BootBreaker extends Trial {
  constructor(){super();this.px=300;this.ball={x:300,y:610,vx:170,vy:-320};this.attached=true;this.lives=3;this.wave=1;this.bricks=[];this.build();}
  build(){this.bricks=[];for(let r=0;r<5;r++)for(let col=0;col<6;col++)this.bricks.push({x:38+col*88,y:106+r*37,w:78,h:25,hp:r===0&&this.wave>1?2:1});}
  action(){if(this.attached){this.attached=false;this.ball.vy=-330-this.wave*12;this.ball.vx=rnd(-180,180);this.emit('flap');}}
  update(dt,input){
    if(this.dead||this.won)return;this.base(dt);this.px=clamp(this.px+input.x*430*dt,65,535);
    const b=this.ball;if(this.attached){b.x=this.px;b.y=610;return;}
    const steps=Math.max(1,Math.ceil(Math.hypot(b.vx,b.vy)*dt/6));
    for(let s=0;s<steps;s++){
      const oldX=b.x,oldY=b.y;b.x+=b.vx*dt/steps;b.y+=b.vy*dt/steps;
      if(b.x<24){b.x=24;b.vx=Math.abs(b.vx);}if(b.x>576){b.x=576;b.vx=-Math.abs(b.vx);}if(b.y<67){b.y=67;b.vy=Math.abs(b.vy);}
      if(b.vy>0&&oldY+9<=630&&b.y+9>=630&&Math.abs(b.x-this.px)<66){const offset=clamp((b.x-this.px)/60,-1,1);const speed=Math.min(530,Math.hypot(b.vx,b.vy)+5);b.vx=offset*speed*.85;if(Math.abs(b.vx)<55)b.vx=(offset<0?-1:1)*55;b.vy=-Math.sqrt(speed*speed-b.vx*b.vx);b.y=620;this.emit('bounce');}
      for(const brick of this.bricks){if(!brick.hp)continue;
        if(b.x+9>brick.x&&b.x-9<brick.x+brick.w&&b.y+9>brick.y&&b.y-9<brick.y+brick.h){
          if(oldX+9<=brick.x||oldX-9>=brick.x+brick.w)b.vx=-b.vx;else b.vy=-b.vy;
          b.x=oldX;b.y=oldY;brick.hp--;if(!brick.hp)this.score+=10;this.emit('break');break;
        }
      }
    }
    if(b.y>735){this.lives--;this.hit=.5;this.emit('hurt');this.attached=true;if(!this.lives)this.end();}
    if(this.bricks.every(b=>!b.hp)){this.wave++;this.build();this.attached=true;this.emit('seal');}
  }
  draw(c,t){
    ground(c,t,'#19140f');
    for(let i=0;i<9;i++){line(c,15+i*72,60,15+i*72,690,'#3b302120');line(c,20,80+i*72,580,80+i*72,'#3b302130');}
    eyes(c,300,435,310,.3);this.bricks.forEach((b,i)=>{if(!b.hp)return;c.fillStyle=b.hp>1?'#9f8c60':['#6b6345','#615c42','#54543d','#454d38','#374533'][Math.floor(i/6)];c.fillRect(b.x,b.y,b.w,b.h);line(c,b.x+4,b.y+3,b.x+b.w-4,b.y+3,'#c7b98255');text(c,['RIP','1666','REST','NO','EXIT','†'][i%6],b.x+b.w/2,b.y+17,10,'#141a11','center');});
    c.fillStyle=PAPER;c.fillRect(this.px-58,630,116,10);c.fillStyle='#576344';c.fillRect(this.px-47,640,94,8);
    c.save();c.translate(this.ball.x,this.ball.y);c.rotate(t*(this.attached?0:3));c.fillStyle=RED;c.fillRect(-8,-11,12,17);c.fillRect(-8,1,23,10);c.fillStyle='#c3ae81';c.fillRect(-9,9,25,3);c.restore();
    if(this.attached)text(c,'PRESS BUTTON TO LAUNCH',300,555,13,PAPER,'center');heartHUD(c,this.lives);this.hud(c,`CRYPT ${this.wave}`);
  }
}

export class BlimpJump extends Trial {
  constructor(){super();this.x=300;this.y=540;this.vy=-470;this.camera=0;this.highest=0;this.cooldown=0;this.platforms=[{x:235,y:610,w:130,kind:0}];for(let i=1;i<18;i++)this.platforms.push({x:clamp(this.platforms.at(-1).x+rnd(-115,115),35,425),y:610-i*86,w:140,kind:i%5===0?1:0});}
  action(){if(this.cooldown<=0){this.vy=-500;this.cooldown=4;this.emit('flap');}}
  update(dt,input){
    if(this.dead||this.won)return;this.base(dt);this.cooldown=Math.max(0,this.cooldown-dt);this.x+=input.x*310*dt;if(this.x<-20)this.x=620;if(this.x>620)this.x=-20;
    const old=this.y;this.vy+=780*dt;this.y+=this.vy*dt;
    if(this.vy>0){for(const p of this.platforms){if(!p.broken&&old+25<=p.y&&this.y+25>=p.y&&this.x+19>p.x&&this.x-19<p.x+p.w){this.y=p.y-25;this.vy=-470;if(p.kind)p.broken=true;this.emit('bounce');break;}}}
    this.camera=Math.min(this.camera,this.y-290);this.highest=Math.max(this.highest,540-this.y);this.score=Math.floor(this.highest);
    this.platforms=this.platforms.filter(p=>p.y-this.camera<800);
    let top=Math.min(...this.platforms.map(p=>p.y));
    while(top>this.camera-120){top-=86;this.platforms.push({x:clamp(this.platforms.at(-1).x+rnd(-115,115),35,425),y:top,w:140,kind:Math.random()<.2?1:0});}
    if(this.y-this.camera>755)this.end();
  }
  draw(c,t){
    ground(c,t,'#131322');
    for(let i=0;i<8;i++){const y=((i*120-this.camera*.3)%900+900)%900-100;line(c,30,y,570,y,'#58607818');text(c,`${Math.floor((-this.camera+y)/100)} M`,545,y-5,9,'#61667b','right');}
    eyes(c,300,140+Math.sin(t*.25)*30,300,.22);
    for(const p of this.platforms){if(p.broken)continue;const y=p.y-this.camera;if(y<-30||y>750)continue;c.fillStyle=p.kind?'#70504c':'#4c5c66';c.fillRect(p.x,y,p.w,9);line(c,p.x+4,y,p.x+p.w-4,y,'#b1b5a1');for(let i=0;i<3;i++)line(c,p.x+10+i*28,y+10,p.x+10+i*28,y+19,'#62645e');}
    const by=this.y-this.camera;glow(c,this.x,by,75,'#7f9fb9');
    c.strokeStyle='#9ca6a6';c.lineWidth=1;[-12,12].forEach(s=>line(c,this.x+s,by+5,this.x+s*.5,by+30,'#9ca6a6'));
    c.fillStyle='#9da89b';c.beginPath();c.ellipse(this.x,by-9,25,29,0,0,TAU);c.fill();line(c,this.x,by-37,this.x,by+18,'#525d5d');eyes(c,this.x,by-10,32,1);c.fillStyle='#9f7654';c.fillRect(this.x-11,by+25,22,12);
    this.hud(c,`${this.score} M ASCENDED`);text(c,'THE SKY HAS NO CEILING',30,42,10,'#a3a5be');bar(c,'EMERGENCY LIFT',4-this.cooldown,4,30,675,180,'#a3a5be');
  }
}

export class Gravekeeper extends Trial {
  constructor(){super();this.player={x:300,y:360};this.enemies=[];this.souls=[];this.spawn=.8;this.soulTimer=.2;this.cooldown=0;this.pulse=0;this.lives=3;this.invincible=0;}
  action(){if(this.cooldown<=0){this.cooldown=4;this.pulse=.65;this.enemies=this.enemies.filter(e=>distance(e,this.player)>150);this.emit('pulse');}}
  update(dt,input){
    if(this.dead||this.won)return;this.base(dt);this.cooldown=Math.max(0,this.cooldown-dt);this.pulse=Math.max(0,this.pulse-dt);this.invincible=Math.max(0,this.invincible-dt);
    const norm=Math.max(1,Math.hypot(input.x,input.y));this.player.x=clamp(this.player.x+input.x/norm*230*dt,30,570);this.player.y=clamp(this.player.y+input.y/norm*230*dt,70,650);
    this.spawn-=dt;this.soulTimer-=dt;
    if(this.spawn<=0){const edge=Math.floor(rnd(0,4));this.enemies.push({x:edge===0?-20:edge===1?620:rnd(20,580),y:edge===2?40:edge===3?700:rnd(60,680)});this.spawn=Math.max(.35,1.5-this.age/100);}
    if(this.soulTimer<=0&&this.souls.length<4){this.souls.push({x:rnd(45,555),y:rnd(100,625)});this.soulTimer=2;}
    this.souls=this.souls.filter(s=>{if(distance(s,this.player)<28){this.score+=100;this.emit('score');return false;}return true;});
    for(const e of this.enemies){const d=Math.max(1,distance(e,this.player)),speed=57+Math.min(this.age*.65,65);e.x+=(this.player.x-e.x)/d*speed*dt;e.y+=(this.player.y-e.y)/d*speed*dt;
      if(d<27&&this.invincible<=0){this.lives--;this.invincible=1.5;this.hit=.4;this.emit('hurt');if(!this.lives)this.end();}
    }
  }
  draw(c,t){
    ground(c,t,'#0c1715');for(let i=0;i<20;i++)tomb(c,35+(i*127)%520,90+(i*97)%510,24,35);
    this.souls.forEach(s=>{glow(c,s.x,s.y,60,'#a8c997');circle(c,s.x,s.y+Math.sin(t*3+s.x)*3,5,'#cfdda7');});
    this.enemies.forEach(e=>shade(c,e.x,e.y,18,'#162a25','#c98565',t));
    const p=this.player;glow(c,p.x,p.y,120,'#d3be77');
    if(this.invincible<=0||Math.floor(t*8)%2){c.fillStyle='#c7c5a8';c.beginPath();c.moveTo(p.x,p.y-18);c.lineTo(p.x-13,p.y+17);c.lineTo(p.x+13,p.y+17);c.fill();circle(c,p.x,p.y-15,7,'#b7bca5');c.fillStyle='#e0b56f';c.fillRect(p.x+17,p.y-1,7,11);}
    if(this.pulse>0){c.strokeStyle='#b5c99a';c.lineWidth=2;c.beginPath();c.arc(p.x,p.y,(.65-this.pulse)*250,0,TAU);c.stroke();}
    heartHUD(c,this.lives);this.hud(c,`${this.score/100} SOULS FOUND`);bar(c,'LANTERN WARD',4-this.cooldown,4,30,680,210);
  }
}

export class LastSignal extends Trial {
  constructor(){super();this.x=300;this.enemies=[];this.bullets=[];this.spawn=.5;this.shot=0;this.lives=3;this.invincible=0;}
  action(){this.fire();}
  fire(){if(this.shot<=0){this.bullets.push({x:this.x,y:610});this.shot=.18;this.emit('shot');}}
  update(dt,input){
    if(this.dead||this.won)return;this.base(dt);this.x=clamp(this.x+input.x*370*dt,35,565);this.shot=Math.max(0,this.shot-dt);this.invincible=Math.max(0,this.invincible-dt);if(input.held)this.fire();this.spawn-=dt;
    if(this.spawn<=0){this.enemies.push({x:rnd(45,555),y:50,phase:rnd(0,6),speed:rnd(65,105)+Math.min(this.age,90)});this.spawn=Math.max(.23,.9-this.age/130);}
    this.bullets.forEach(b=>b.y-=520*dt);
    for(const e of this.enemies){e.y+=e.speed*dt;e.x=clamp(e.x+Math.sin(e.phase+this.age*2)*30*dt,25,575);
      for(const b of this.bullets){if(!b.used&&!e.dead&&Math.hypot(e.x-b.x,e.y-b.y)<26){e.dead=true;b.used=true;this.score+=25;this.emit('break');}}
      if(!e.dead&&(e.y>680||(Math.abs(e.x-this.x)<30&&Math.abs(e.y-630)<30))){e.dead=true;if(this.invincible<=0){this.lives--;this.invincible=.8;this.hit=.4;this.emit('hurt');if(!this.lives)this.end();}}
    }
    this.bullets=this.bullets.filter(b=>!b.used&&b.y>50);this.enemies=this.enemies.filter(e=>!e.dead);
  }
  draw(c,t){
    ground(c,t,'#101319');
    for(let i=0;i<10;i++){const y=(i*90+t*45)%800;line(c,50,y,550,y,'#293a422d');}for(let i=0;i<7;i++)line(c,40+i*87,65,40+i*87,680,'#293a422d');
    eyes(c,300,130,300,.25);
    this.enemies.forEach(e=>{glow(c,e.x,e.y,40,'#7f544d');shade(c,e.x,e.y,22,'#885e54','#0c1010',t);});
    this.bullets.forEach(b=>{c.fillStyle='#c8d7b1';c.fillRect(b.x-2,b.y-12,4,19);glow(c,b.x,b.y,20);});
    if(this.invincible<=0||Math.floor(t*9)%2){c.fillStyle='#c4c9aa';c.fillRect(this.x-17,622,34,21);c.fillRect(this.x-5,607,10,30);c.fillStyle='#4b614c';c.fillRect(this.x-11,631,22,4);for(let i=0;i<3;i++){line(c,this.x-25-i*9,622-i*8,this.x-25-i*9,652+i*8,'#71896b');line(c,this.x+25+i*9,622-i*8,this.x+25+i*9,652+i*8,'#71896b');}}
    heartHUD(c,this.lives,'FUSES');this.hud(c,`${this.score/25} CONTACTS ERASED`);text(c,'HOLD BUTTON TO TRANSMIT',300,693,11,'#a4b49c','center');
  }
}

export class DeadFrequency extends Trial {
  constructor(){super();this.dial=.5;this.target=rnd(.12,.88);this.remaining=14;this.strikes=3;this.round=1;this.locked=0;this.feedback='LISTEN FOR THE CLEAN SIGNAL';this.feedbackTime=0;this.lockCooldown=0;}
  get quality(){return clamp(1-Math.abs(this.target-this.dial)*4,0,1);}
  get tuned(){return Math.abs(this.target-this.dial)<Math.max(.023,.055-this.round*.0015);}
  next(){this.target=rnd(.08,.92);this.remaining=Math.max(6,14-this.round*.35);}
  action(){
    if(this.dead||this.won||this.lockCooldown>0)return;this.lockCooldown=.45;
    if(this.tuned){this.score+=100;this.round++;this.locked=.7;this.feedback='A VOICE RELEASED';this.emit('score');this.next();}
    else{this.strikes--;this.hit=.4;this.feedback='THAT WAS NOT A HUMAN VOICE';this.emit('hurt');if(!this.strikes)this.end();}
    this.feedbackTime=1.3;
  }
  update(dt,input){
    if(this.dead||this.won)return;this.base(dt);this.lockCooldown=Math.max(0,this.lockCooldown-dt);this.locked=Math.max(0,this.locked-dt);this.feedbackTime=Math.max(0,this.feedbackTime-dt);this.dial=clamp(Number.isFinite(input.dial)?input.dial:this.dial+input.x*dt*.32,0,1);this.remaining-=dt;
    if(this.remaining<=0){this.strikes--;this.hit=.4;this.emit('hurt');this.feedback='IT LEARNED YOUR NAME';this.feedbackTime=1.5;if(!this.strikes)this.end();else this.next();}
  }
  draw(c,t){
    ground(c,t,'#151710');eyes(c,300,210,370,this.quality*.55);
    c.strokeStyle='#36422c';c.strokeRect(35,270,530,200);
    for(let i=0;i<10;i++)line(c,35+i*59,270,35+i*59,470,'#2c3726');for(let i=0;i<5;i++)line(c,35,270+i*50,565,270+i*50,'#2c3726');
    c.strokeStyle=this.tuned?'#c2d4a3':'#7f936b';c.lineWidth=2;c.beginPath();
    for(let x=0;x<=530;x+=2){const clean=Math.sin(x*.055+t*3)*36;const noise=(Math.sin(x*1.5+t*8)*24+Math.sin(x*.7-t*5)*32)*(1-this.quality);const y=370+clean+noise;if(x)c.lineTo(x+35,y);else c.moveTo(x+35,y);}c.stroke();
    const dialY=540;line(c,55,dialY,545,dialY,'#93a17d');
    for(let i=0;i<=20;i++){const x=55+i*24.5;line(c,x,dialY-5,x,dialY+(i%5?8:16),'#718063');if(i%5===0)text(c,String(88+i*.7),x,dialY+37,10,'#929d7f','center');}
    c.fillStyle='#a8c99735';c.fillRect(55+(this.target-.055)*490,dialY-12,54,30);
    const dx=55+this.dial*490;line(c,dx,dialY-22,dx,dialY+18,RED,2);circle(c,dx,dialY-24,3,RED);
    text(c,`${(88+this.dial*14).toFixed(2)} MHz`,300,620,27,PAPER,'center');
    text(c,this.feedbackTime>0?this.feedback:this.tuned?'SIGNAL CLEAR / PRESS TO LOCK':'MOVE THE NEEDLE INTO THE PALE BAND',300,664,12,this.tuned?GREEN:RED,'center');
    heartHUD(c,this.strikes,'FUSES');this.hud(c,`${this.remaining.toFixed(1)} SECONDS`);bar(c,'SIGNAL STRENGTH',this.quality,1,45,499,510);
  }
}

export const CARTRIDGES = [
  {id:'ghost',title:'Ghost Flight',genre:'PRECISION / FLIGHT',symbol:'Ⅰ',story:'The windows are watching. Keep moving.',stick:'← → or ↑ ↓ Select a game before starting',button:'Tap to flap. Keep the ghost airborne.',note:'Do not look at the windows.',goal:8,objective:'Pass 8 cursed towers in one flight.',death:'The windows saw you.',color:'#9ebd8b',Game:GhostFlight},
  {id:'breaker',title:'Boot Breaker',genre:'BRICK BREAKER / THE CRYPT',symbol:'Ⅱ',story:'Someone bricked up the crypt. They left a boot on the wrong side.',stick:'← → Move the paddle',button:'Launch the boot. Clear the headstones.',note:'They were not buried deep enough.',goal:300,objective:'Break all 30 stones in the first crypt.',death:'The boot came back alone.',color:'#c2ac72',Game:BootBreaker},
  {id:'blimp',title:'Blimp Jump',genre:'VERTICAL PLATFORMER / ASCENT',symbol:'Ⅲ',story:'The balloon is full of breath that is not yours. Climb. Do not ask whose.',stick:'← → Drift between platforms',button:'Emergency lift. Recharges in 4 seconds.',note:'There is something above the clouds.',goal:1000,objective:'Climb 1,000 metres without falling.',death:'You heard the basket land.',color:'#aaaeca',Game:BlimpJump},
  {id:'grave',title:'Gravekeeper',genre:'SURVIVAL / LANTERN WARD',symbol:'Ⅳ',story:'Gather the lost lights. Stay ahead of the things that cast no shadow.',stick:'Move in all four directions',button:'Repel nearby shades. Recharges in 4 seconds.',note:'Count the graves again.',goal:1000,objective:'Collect 10 lost souls in one night.',death:'One more grave to count.',color:'#9fc5ae',Game:Gravekeeper},
  {id:'signal',title:'The Last Signal',genre:'SHOOTER / DEAD AIR',symbol:'Ⅴ',story:'The distress call worked. Unfortunately, something answered.',stick:'← → Move the transmitter',button:'Hold to fire. Stop them reaching the wire.',note:'Do not answer your own voice.',goal:500,objective:'Erase 20 contacts before the fuses burn out.',death:'The line is no longer yours.',color:'#b3c6cd',Game:LastSignal},
  {id:'frequency',title:'Dead Frequency',genre:'TUNING / OCCULT RADIO',symbol:'Ⅵ',story:'Six voices are trapped between stations. Tune the noise into a clean wave.',stick:'← → Tune slowly; centre to hold',button:'Lock when the signal is clear. Three fuses.',note:'If it says your name, keep tuning.',goal:600,objective:'Release 6 voices before losing all 3 fuses.',death:'It knows where you are.',color:'#c2c594',Game:DeadFrequency}
];

// The same objectives drive engine completion and the cabinet progress display.
for (const cartridge of CARTRIDGES) cartridge.Game.goal = cartridge.goal;
