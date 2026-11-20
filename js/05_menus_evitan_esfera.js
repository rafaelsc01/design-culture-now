/* ===== INICIO menus_evitan_esfera =====
   Los paneles permanecen debajo de su propio nombre, incluso al flotar.
   Ajuste horizontal mínimo para no salir de la pantalla ni tocar la esfera.
   Si falta altura, el contenido puede desplazarse dentro del panel.
   ===== */
(()=>{
  'use strict';
  const stage=document.getElementById('stage');
  const scene=document.getElementById('scene');
  const sphere=document.getElementById('sphere');
  const items=Array.from(scene.querySelectorAll(':scope > .point')).map(point=>({
    point,label:point.querySelector('.point-label'),panel:point.querySelector('.panel')
  })).filter(o=>o.label&&o.panel);
  const clamp=(x,a,b)=>Math.max(a,Math.min(Math.max(a,b),x));
  const set=(style,prop,val)=>{if(style[prop]!==val)style[prop]=val;};
  function placeMenus(){
    const stageRect=stage.getBoundingClientRect();
    const sceneRect=scene.getBoundingClientRect();
    const sceneScale=sceneRect.width/1200;
    const menuScale=Number(getComputedStyle(scene).getPropertyValue('--menu-scale'))||1;
    const scale=sceneScale*menuScale;
    if(!(scale>0))return;
    const margin=6, gap=8*scale;
    const left=stageRect.left+margin,right=stageRect.right-margin,bottom=stageRect.bottom-margin;
    const sr=sphere.getBoundingClientRect();
    const cx=(sr.left+sr.right)/2,cy=(sr.top+sr.bottom)/2,r=sr.width/2+12*sceneScale;
    const labels=items.map(o=>o.label.getBoundingClientRect());
    for(let i=0;i<items.length;i++){
      const {point,panel}=items[i],label=labels[i],pr=point.getBoundingClientRect();
      const w=panel.offsetWidth*scale;
      if(!w)continue;
      const y=label.bottom+gap;
      const desired=label.left;
      const preferredHeight=(panel.scrollHeight+2)*scale;
      const xs=[desired,label.right-w,left,right-w,cx-r-w,cx+r];
      const candidates=Array.from(new Set(xs.map(x=>clamp(x,left,right-w)))).map(x=>{
        let available=Math.max(0,bottom-y);
        // Never move a panel vertically away from its name.
        // Limit its height before it would enter the sphere or another label.
        const nearX=clamp(cx,x,x+w),dx=Math.abs(nearX-cx);
        if(dx<r){
          const dy=Math.sqrt(r*r-dx*dx),top=cy-dy,end=cy+dy;
          if(y<end)available=Math.min(available,Math.max(0,top-y));
        }
        labels.forEach((other,j)=>{
          if(i===j||other.right+gap<=x||other.left-gap>=x+w||other.bottom+gap<=y)return;
          available=Math.min(available,Math.max(0,other.top-gap-y));
        });
        const overlap=Math.max(0,Math.min(x+w,label.right)-Math.max(x,label.left));
        const distance=Math.abs(x-desired);
        return {x,available,overlap,distance};
      });
      // Prefer a usable panel directly below its name; only shift sideways
      // when necessary. A small internal scrollbar is preferable to a distant menu.
      const minUseful=Math.min(preferredHeight,110*scale);
      const usable=candidates.filter(c=>c.available>=minUseful);
      const anchored=usable.filter(c=>c.overlap>0);
      let pool=anchored.length?anchored:usable.length?usable:candidates;
      pool.sort((a,b)=>{
        const aFull=a.available>=preferredHeight,bFull=b.available>=preferredHeight;
        if(aFull!==bFull)return aFull?-1:1;
        if(!usable.length)return b.available-a.available||a.distance-b.distance;
        return a.distance-b.distance||b.available-a.available;
      });
      const best=pool[0];
      if(!best)continue;
      set(panel.style,'right','auto');
      set(panel.style,'left',((best.x-pr.left)/scale).toFixed(3)+'px');
      set(panel.style,'top',((y-pr.top)/scale).toFixed(3)+'px');
      set(panel.style,'maxHeight',Math.max(0,best.available/scale).toFixed(3)+'px');
    }
  }
  // Track the same interpolated movement as the labels only while menus are open.
  let frame=0;
  function tick(){
    frame=0;placeMenus();
    if(items.some(o=>o.point.classList.contains('open')))frame=requestAnimationFrame(tick);
  }
  function schedule(){
    if(!frame)frame=requestAnimationFrame(tick);
  }
  const observer=new MutationObserver(schedule);
  items.forEach(o=>observer.observe(o.point,{attributes:true,attributeFilter:['class']}));
  window.addEventListener('resize',schedule);
  scene.addEventListener('layoutscalechange',schedule);
  if(document.fonts)document.fonts.ready.then(schedule);
  schedule();
})();
/* ===== FIN menus_evitan_esfera ===== */
