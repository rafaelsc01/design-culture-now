/* ===== INICIO menus_evitan_esfera =====
   Cada panel se posiciona fuera de la esfera (centro 600,324; radio 140),
   con una separación de 12 px, sin restringir superposición con los títulos.
   Los botones, sus movimientos y las interacciones originales no se modifican.
   El posicionamiento se recalcula si cambian las dimensiones de los paneles.
   ===== */
(() => {
  const W = 1200, H = 788;
  const points = Array.from(document.querySelectorAll('#scene > .point'));
  const circle = {x:600,y:324,r:152}; // 140 px esfera + 12 px de separación
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const clearOfSphere=(x,y,w,h)=>{
    const closestX=clamp(circle.x,x,x+w);
    const closestY=clamp(circle.y,y,y+h);
    return (closestX-circle.x)**2+(closestY-circle.y)**2 >= circle.r**2;
  };
  const withinScene=(x,y,w,h)=>x>=6 && x+w<=W-6 && y>=6 && y+h<=H-6;
  function placeMenus(){
    // Mantener cada panel fuera de los nombres externos al abrirse.
    // El margen incluye los desplazamientos flotantes de hasta +/-15 px.
    const labelRects=points.map(p=>{
      const label=p.querySelector('.point-label');
      if(!label)return null;
      const pad=18;
      const x=p.offsetLeft+label.offsetLeft;
      const y=p.offsetTop+(11.8537-label.offsetHeight)/2;
      return {x:x-pad,y:y-pad,w:label.offsetWidth+pad*2,h:label.offsetHeight+pad*2};
    }).filter(Boolean);
    const clearOfLabels=(x,y,w,h)=>labelRects.every(r=>
      x+w<=r.x || x>=r.x+r.w || y+h<=r.y || y>=r.y+r.h
    );
    points.forEach((point,index)=>{
      const panel=point.querySelector('.panel');
      if(!panel)return;
      const w=panel.offsetWidth, h=panel.offsetHeight;
      const px=point.offsetLeft, py=point.offsetTop;
      // Preferencias por ubicación original de cada círculo.
      // Las posiciones se miden desde la escena, no desde el navegador.
      const preferred=[
        [px+22,py+12],       // 1: derecha y abajo
        [px-w/2,py+22],      // 2: centrado debajo del círculo
        [px+22,py+12],       // 3: derecha y abajo, fuera del borde de la esfera
        [px-w+34,py+34]     // 4: hacia la izquierda y abajo
      ][index];
      const choices=[preferred];
      const xs=[px+22,px-w-22,px-w/2,px-w+34,6,W-w-6];
      const ys=[py+22,py+34,py+50,py+64,py+80,py+105,py-h-22,6,H-h-6];
      for(const x of xs)for(const y of ys)choices.push([x,y]);
      // Si cambia el contenido, buscamos una posición válida cercana a la preferida.
      const possible=choices.filter(([x,y])=>withinScene(x,y,w,h)&&clearOfSphere(x,y,w,h)&&clearOfLabels(x,y,w,h));
      let best=possible.length?possible.reduce((a,b)=>{
        const score=p=>(p[0]-preferred[0])**2+(p[1]-preferred[1])**2;
        return score(b)<score(a)?b:a;
      }):null;
      if(!best){
        // Exploración de toda la escena en pasos de 8px para paneles más grandes.
        let minCost=Infinity;
        for(let y=6;y<=H-h-6;y+=8){
          for(let x=6;x<=W-w-6;x+=8){
            if(!clearOfSphere(x,y,w,h)||!clearOfLabels(x,y,w,h))continue;
            const cost=(x-preferred[0])**2+(y-preferred[1])**2;
            if(cost<minCost){minCost=cost;best=[x,y];}
          }
        }
      }
      if(!best)return;
      panel.style.right='auto';
      panel.style.left=(best[0]-px).toFixed(3)+'px';
      panel.style.top=(best[1]-py).toFixed(3)+'px';
    });
  }
  placeMenus();
  if(typeof ResizeObserver!=='undefined'){
    const ro=new ResizeObserver(placeMenus);
    points.forEach(p=>ro.observe(p.querySelector('.panel')));
  }
  window.addEventListener('resize',placeMenus);
})();
/* ===== FIN menus_evitan_esfera ===== */
