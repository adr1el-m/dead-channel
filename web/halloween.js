// Native game decorations: carved faces, wax and thread, no downloaded sprites.
export function pumpkin(c,x,y,r=12,lit=false,t=0){
 c.save();c.translate(x,y);
 if(lit){const g=c.createRadialGradient(0,0,1,0,0,r*2.5);g.addColorStop(0,'#f79e363b');g.addColorStop(1,'#f79e3600');c.fillStyle=g;c.fillRect(-r*3,-r*3,r*6,r*6);}
 c.fillStyle='#718052';c.fillRect(-2,-r-5,4,9);
 for(const [dx,ry] of [[-r*.4,.8],[r*.4,.8],[0,.9]]){c.fillStyle=lit?(dx?'#ac5227':'#cc7235'):(dx?'#663b2b':'#7a4930');c.beginPath();c.ellipse(dx,0,r*.6,r*ry,0,0,Math.PI*2);c.fill();}
 c.fillStyle=lit?'#ffe09a':'#15160f';
 for(const sign of [-1,1]){c.beginPath();c.moveTo(sign*r*.65,-r*.07);c.lineTo(sign*r*.2,-r*.07);c.lineTo(sign*r*.35,-r*.48);c.closePath();c.fill();}
 c.beginPath();c.moveTo(-r*.6,r*.23);c.lineTo(-r*.3,r*.48);c.lineTo(0,r*.31);c.lineTo(r*.25,r*.48);c.lineTo(r*.6,r*.2);c.lineTo(r*.35,r*.65);c.lineTo(-r*.35,r*.65);c.closePath();c.fill();c.restore();
}
export function cobweb(c,x,y,size=65,flip=false){
 c.save();c.translate(x,y);if(flip)c.scale(-1,1);c.strokeStyle='#bdad8a35';c.lineWidth=.7;
 for(let i=0;i<5;i++){const a=i*Math.PI/8;c.beginPath();c.moveTo(0,0);c.lineTo(Math.cos(a)*size,Math.sin(a)*size);c.stroke();}
 for(let ring=1;ring<=4;ring++){const r=size*ring/4;c.beginPath();c.moveTo(r,0);for(let i=1;i<5;i++){const a=i*Math.PI/8,b=(i-.5)*Math.PI/8;c.quadraticCurveTo(Math.cos(b)*r*.82,Math.sin(b)*r*.82,Math.cos(a)*r,Math.sin(a)*r);}c.stroke();}c.restore();
}
export function candle(c,x,y,t=0){
 c.fillStyle='#8e7955';c.fillRect(x-5,y-21,10,23);c.fillStyle='#e2c994';c.fillRect(x-4,y-21,8,20);c.fillRect(x+2,y-18,3,10);
 c.fillStyle='#ef9b44';c.beginPath();c.ellipse(x,y-28,4,8+Math.sin(t*3+x)*1.2,.12,0,Math.PI*2);c.fill();c.fillStyle='#ffe9ac';c.beginPath();c.ellipse(x,y-26,2,4,0,0,7);c.fill();
}
export function bat(c,x,y,size=12){
 c.save();c.translate(x,y);c.scale(size/12,size/12);c.fillStyle='#0b0b13';c.beginPath();c.moveTo(0,2);c.lineTo(-14,-6);c.quadraticCurveTo(-10,3,-10,7);c.quadraticCurveTo(-5,2,-2,7);c.lineTo(0,5);c.lineTo(2,7);c.quadraticCurveTo(5,2,10,7);c.quadraticCurveTo(10,3,14,-6);c.closePath();c.fill();c.restore();
}
