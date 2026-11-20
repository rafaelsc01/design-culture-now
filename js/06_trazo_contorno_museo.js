/* ===== INICIO trazoContornoMuseo =====
   Un solo trazo negro móvil sobre los contornos reales de las letras.
   Independiente de la esfera, de velocidad_A y de los menús.
*/
(()=>{
  'use strict';
  const title=document.getElementById('museum-title');
  const scene=document.getElementById('scene');
  if(!title||!scene||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const trazoContornoMuseo={
    grosor:1.05, longitud:33, velocidad:85, variacion:.24, color:'#000000'
  };
  const pad=4, resolution=3;
  const text=title.textContent;
  const css=getComputedStyle(title);
  const font=css.fontWeight+' '+css.fontSize+' '+css.fontFamily;
  async function start(){
    if(document.fonts){
      await document.fonts.load(font,text);
      await document.fonts.ready;
    }
    // Locate the actual HTML baseline without changing the layout.
    const marker=document.createElement('span');
    marker.style.cssText='display:inline-block;width:0;height:0;padding:0;border:0;margin:0;vertical-align:baseline;';
    title.appendChild(marker);
    const rect=title.getBoundingClientRect();
    const scale=scene.getBoundingClientRect().width/1200;
    if(!scale){marker.remove();return;}
    const baseline=(marker.getBoundingClientRect().top-rect.top)/scale;
    const width=rect.width/scale+2*pad,height=rect.height/scale+2*pad;
    marker.remove();
    const mask=document.createElement('canvas');
    mask.width=Math.ceil(width*resolution);
    mask.height=Math.ceil(height*resolution);
    const mc=mask.getContext('2d',{willReadFrequently:true});
    mc.scale(resolution,resolution);
    mc.font=font;
    mc.fontKerning='normal';
    mc.textBaseline='alphabetic';
    mc.fillStyle='#000';
    mc.fillText(text,pad,pad+baseline);
    const w=mask.width,h=mask.height;
    const pixels=mc.getImageData(0,0,w,h).data;
    const filled=(x,y)=>pixels[(y*w+x)*4+3]>=128?1:0;
    // Marching squares: extract the silhouette of the actual rendered glyphs.
    // Each edge has an integer coordinate on a doubled pixel grid.
    const cases=[[],[[3,2]],[[2,1]],[[3,1]],[[0,1]],[[0,1],[3,2]],[[0,2]],[[0,3]],[[3,0]],[[0,2]],[[3,0],[2,1]],[[0,1]],[[3,1]],[[2,1]],[[3,2]],[]];
    const adjacency=new Map();
    const stride=2*w+3;
    function link(a,b){
      if(!adjacency.has(a))adjacency.set(a,[]);
      if(!adjacency.has(b))adjacency.set(b,[]);
      adjacency.get(a).push(b);adjacency.get(b).push(a);
    }
    for(let y=0;y<h-1;y++)for(let x=0;x<w-1;x++){
      const c=8*filled(x,y)+4*filled(x+1,y)+2*filled(x+1,y+1)+filled(x,y+1);
      if(!cases[c].length)continue;
      const X=2*x,Y=2*y;
      const edges=[Y*stride+X+1,(Y+1)*stride+X+2,(Y+2)*stride+X+1,(Y+1)*stride+X];
      cases[c].forEach(([a,b])=>link(edges[a],edges[b]));
    }
    const coord=k=>({x:(k%stride)/(2*resolution)+.5/resolution,y:Math.floor(k/stride)/(2*resolution)+.5/resolution});
    const used=new Set(),contours=[];
    for(const first of adjacency.keys()){
      if(used.has(first))continue;
      const points=[];
      let current=first,prev=-1,closed=false;
      while(!used.has(current)){
        used.add(current);points.push(coord(current));
        const next=(adjacency.get(current)||[]).find(k=>k!==prev);
        if(next===undefined)break;
        if(next===first){closed=true;break;}
        prev=current;current=next;
      }
      if(!closed||points.length<8)continue;
      // A very light smoothing removes pixel stair-steps without changing the glyph.
      const smooth=points.map((p,i)=>{
        const a=points[(i+points.length-1)%points.length],b=points[(i+1)%points.length];
        return {x:(a.x+2*p.x+b.x)/4,y:(a.y+2*p.y+b.y)/4};
      });
      smooth.push(smooth[0]);
      const lengths=[0];
      for(let i=1;i<smooth.length;i++)lengths.push(lengths[i-1]+Math.hypot(smooth[i].x-smooth[i-1].x,smooth[i].y-smooth[i-1].y));
      const total=lengths[lengths.length-1];
      if(total<5)continue;
      contours.push({points:smooth,lengths,total,x:Math.min(...smooth.map(p=>p.x))});
    }
    contours.sort((a,b)=>a.x-b.x);
    if(!contours.length)return;
    const canvas=document.createElement('canvas');
    canvas.setAttribute('aria-hidden','true');
    canvas.style.cssText='position:absolute;pointer-events:none;z-index:2;left:-'+pad+'px;top:-'+pad+'px;width:'+width+'px;height:'+height+'px;';
    canvas.width=mask.width;canvas.height=mask.height;
    title.appendChild(canvas);
    const ctx=canvas.getContext('2d');
    ctx.scale(resolution,resolution);
    ctx.strokeStyle=trazoContornoMuseo.color;
    ctx.lineWidth=trazoContornoMuseo.grosor;
    ctx.lineCap='round';ctx.lineJoin='round';
    function pointAt(c,d){
      d=Math.max(0,Math.min(c.total,d));
      let lo=0,hi=c.lengths.length-1;
      while(hi-lo>1){const m=(lo+hi)>>1;if(c.lengths[m]<=d)lo=m;else hi=m;}
      const a=c.points[lo],b=c.points[hi],len=c.lengths[hi]-c.lengths[lo];
      const t=len?(d-c.lengths[lo])/len:0;
      return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
    }
    let index=0,distance=0,last=0,elapsed=0;
    function frame(time){
      const dt=last?Math.min(.05,(time-last)/1000):0;last=time;elapsed+=dt;
      ctx.clearRect(0,0,width+1,height+1);
      const c=contours[index],tail=Math.min(trazoContornoMuseo.longitud,c.total*.48);
      // Slow, continuous speed changes resemble natural hand movement.
      const speed=trazoContornoMuseo.velocidad*(1+trazoContornoMuseo.variacion*(.7*Math.sin(elapsed*2.1)+.3*Math.sin(elapsed*4.7+1.3)));
      distance+=speed*dt;
      const from=Math.max(0,distance-tail),to=Math.min(distance,c.total);
      if(to>from){
        const steps=Math.max(2,Math.ceil((to-from)/.55));
        ctx.beginPath();
        for(let i=0;i<=steps;i++){
          const p=pointAt(c,from+(to-from)*i/steps);
          if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);
        }
        ctx.stroke();
      }
      // The trace tapers away before continuing on the next closed outline.
      if(distance>=c.total+tail){distance=0;index=(index+1)%contours.length;}
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  start().catch(error=>console.warn('trazoContornoMuseo:',error));
})();
/* ===== FIN trazoContornoMuseo ===== */
