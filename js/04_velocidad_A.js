/* ===== INICIO velocidad_A =====
   Este bloque y el canvas #velocidad_A-background son independientes.
   Para retirar el efecto, se pueden eliminar los tres fragmentos
   señalados «velocidad_A» sin alterar los demás componentes de la página.
*/
(()=>{
  'use strict';
  const layer=document.getElementById('velocidad_A-background');
  if(!layer)return;
  const ctx=layer.getContext('2d',{alpha:true});
  const W=1200,H=788;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let lastTime=0,frame=0;
  const random=(min,max)=>min+Math.random()*(max-min);
  const strokes=[];
  // Líneas sólidas y líneas compuestas por puntos, con longitudes variadas.
  for(let kind=0;kind<2;kind++){
    const count=kind===0?78:64;
    for(let i=0;i<count;i++){
      const length=random(kind===0?65:85,kind===0?360:340);
      const direction=Math.random()<0.5?-1:1;
      const speed=random(385,1085)*direction;
      strokes.push({
        kind,
        x:random(-length,W),
        y:random(10,H-10),
        length,
        speed,
        target:speed,
        changeIn:random(0.35,1.35),
        opacity:random(kind===0?.10:.14,kind===0?.28:.31),
        thickness:random(.6,1.35),
        dotRadius:random(.65,1.25),
        spacing:random(5.5,9.5)
      });
    }
  }
  // Guinda: 50 de 142 líneas (35.2 %), distribuidas aleatoriamente.
  const guindaCounts=[27,23];
  for(let kind=0;kind<2;kind++){
    const group=strokes.filter(s=>s.kind===kind);
    for(let i=0;i<guindaCounts[kind];i++){
      const j=i+Math.floor(Math.random()*(group.length-i));
      [group[i],group[j]]=[group[j],group[i]];
      group[i].guinda=true;
    }
  }
  function resize(){
    const dpr=Math.min(window.devicePixelRatio||1,2);
    layer.width=Math.round(W*dpr);
    layer.height=Math.round(H*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  function move(stroke,dt){
    stroke.changeIn-=dt;
    if(stroke.changeIn<=0){
      const sign=Math.random()<.5?-1:1;
      stroke.target=random(420,1190)*sign;
      stroke.changeIn=random(0.45,1.6);
    }
    // La velocidad se aproxima suavemente al nuevo objetivo aleatorio.
    const smooth=1-Math.exp(-dt*2.25);
    stroke.speed+=(stroke.target-stroke.speed)*smooth;
    stroke.x+=stroke.speed*dt;
    const margin=stroke.length+30;
    if(stroke.x>W+30)stroke.x=-margin;
    if(stroke.x+stroke.length<-30)stroke.x=W+30;
  }
  function draw(){
    ctx.clearRect(0,0,W,H);
    for(const s of strokes){
      const shade=s.guinda
        ? (s.kind===0?'149,42,69':'154,52,78')
        : (s.kind===0?'79,130,172':'87,136,175');
      if(!s.kind){
        ctx.strokeStyle=`rgba(${shade},${s.opacity})`;
        ctx.lineWidth=s.thickness;
        ctx.beginPath();
        ctx.moveTo(s.x,s.y);
        ctx.lineTo(s.x+s.length,s.y);
        ctx.stroke();
      }else{
        ctx.fillStyle=`rgba(${shade},${s.opacity})`;
        ctx.beginPath();
        const n=Math.floor(s.length/s.spacing);
        for(let j=0;j<=n;j++){
          const x=s.x+j*s.spacing;
          if(x<-3||x>W+3)continue;
          ctx.moveTo(x+s.dotRadius,s.y);
          ctx.arc(x,s.y,s.dotRadius,0,Math.PI*2);
        }
        ctx.fill();
      }
    }
  }
  function tick(now){
    frame=0;
    const dt=Math.min((now-lastTime)/1000||.016,.05);
    lastTime=now;
    if(!reduced)for(const s of strokes)move(s,dt);
    draw();
    if(!reduced && !document.hidden)frame=requestAnimationFrame(tick);
  }
  resize();
  window.addEventListener('resize',resize);
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden && !reduced && !frame){
      lastTime=0;
      frame=requestAnimationFrame(tick);
    }
  });
  if(reduced)draw();else frame=requestAnimationFrame(tick);
})();
/* ===== FIN velocidad_A ===== */
