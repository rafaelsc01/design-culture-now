/* ===== INICIO menus_evitan_esfera =====
   Cada nombre y panel se trata como un conjunto completo.
   Dos conjuntos a cada lado de la esfera, sin scroll ni recortes.
   Se conservan las coordenadas originales como posiciones preferidas.
   ===== */
(()=>{
  'use strict';
  const stage=document.getElementById('stage');
  const scene=document.getElementById('scene');
  const sphere=document.getElementById('sphere');
  const items=Array.from(scene.querySelectorAll(':scope > .point')).map(point=>({
    point,label:point.querySelector('.point-label'),panel:point.querySelector('.panel'),
    originX:parseFloat(point.style.left),originY:parseFloat(point.style.top)
  }));
  if(items.length!==4)return;
  const columns=[[1,0],[2,3]];
  const drift=15, gap=8, entrance=7, separation=12;
  const clamp=(x,a,b)=>Math.max(a,Math.min(Math.max(a,b),x));
  const put=(style,prop,val)=>{if(style[prop]!==val)style[prop]=val;};
  const px=x=>x.toFixed(4)+'px';
  let scale=1, frame=0;
  function trackPanels(){
    frame=0;
    for(const {point,label,panel} of items){
      const l=label.getBoundingClientRect(),p=point.getBoundingClientRect();
      put(panel.style,'right','auto');
      put(panel.style,'left',px((l.left-p.left)/scale));
      put(panel.style,'top',px((l.bottom-p.top)/scale+gap));
    }
    if(items.some(o=>o.point.classList.contains('open')))frame=requestAnimationFrame(trackPanels);
  }
  function schedule(){
    if(!frame)frame=requestAnimationFrame(trackPanels);
  }
  function layout(){
    const st=stage.getBoundingClientRect(), sc=scene.getBoundingClientRect();
    const ss=sc.width/1200;
    if(!(ss>0))return;
    const sr=sphere.getBoundingClientRect();
    const margin=Math.min(8,st.width*.015,st.height*.015);
    const inner={left:st.left+margin,right:st.right-margin,top:st.top+margin,bottom:st.bottom-margin};
    const sphereGap=12*ss;
    const regions=[
      {left:inner.left,right:sr.left-sphereGap},
      {left:sr.right+sphereGap,right:inner.right}
    ];
    const boxes=items.map(({point,label,panel})=>{
      // offsetHeight ignores CSS transforms, yielding the full natural content height.
      panel.style.maxHeight='none';
      const lx=label.offsetLeft,lh=label.offsetHeight,d=point.offsetHeight;
      const top=(d-lh)/2,bottom=(d+lh)/2;
      const minX=-drift,minY=Math.min(0,top)-drift;
      const maxX=Math.max(d,lx+label.offsetWidth,lx+panel.offsetWidth)+drift;
      const maxY=bottom+gap+panel.offsetHeight+drift+entrance;
      return {minX,minY,maxX,maxY,w:maxX-minX,h:maxY-minY};
    });
    // Retain the previous width-based size except where full panels cannot fit.
    const desired=ss*(Number(getComputedStyle(scene).getPropertyValue('--menu-scale'))||1);
    scale=desired;
    for(let j=0;j<2;j++){
      const [a,b]=columns[j],R=regions[j];
      scale=Math.min(scale,(R.right-R.left)/Math.max(boxes[a].w,boxes[b].w),
        (inner.bottom-inner.top)/(boxes[a].h+boxes[b].h+separation));
    }
    if(!(scale>0))return;
    for(const {point} of items)point.style.setProperty('--menu-scale',String(scale/ss));
    const pref=items.map((o,i)=>({
      x:sc.left+o.originX*ss+boxes[i].minX*scale,
      y:sc.top+o.originY*ss+boxes[i].minY*scale
    }));
    for(let j=0;j<2;j++){
      const [a,b]=columns[j],R=regions[j],A=boxes[a],B=boxes[b];
      const ha=A.h*scale,hb=B.h*scale,space=separation*scale;
      const maxA=inner.bottom-ha-hb-space;
      const maxB=inner.bottom-hb;
      let ya=clamp(pref[a].y,inner.top,maxA);
      let yb=clamp(pref[b].y,ya+ha+space,maxB);
      // Share any necessary vertical correction to stay near both original positions.
      if(yb>pref[b].y){
        const correction=Math.min(ya-inner.top,(yb-pref[b].y)/2);
        ya-=correction;
        yb=clamp(pref[b].y,ya+ha+space,maxB);
      }
      for(const [i,y] of [[a,ya],[b,yb]]){
        const box=boxes[i],{point}=items[i];
        const x=clamp(pref[i].x,R.left,R.right-box.w*scale);
        put(point.style,'left',px((x-box.minX*scale-sc.left)/ss));
        put(point.style,'top',px((y-box.minY*scale-sc.top)/ss));
      }
    }
    trackPanels();
  }
  function relayout(){
    if(frame){cancelAnimationFrame(frame);frame=0;}
    layout();
  }
  const observer=new MutationObserver(schedule);
  items.forEach(o=>observer.observe(o.point,{attributes:true,attributeFilter:['class']}));
  scene.addEventListener('layoutscalechange',relayout);
  window.addEventListener('resize',relayout);
  if(document.fonts)document.fonts.ready.then(relayout);
  relayout();
})();
/* ===== FIN menus_evitan_esfera ===== */
