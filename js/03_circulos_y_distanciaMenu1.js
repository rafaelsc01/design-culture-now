/* Variable de separación entre cada circulito y su texto externo. */
const distanciaMenu1 = 10; // píxeles
   document.documentElement.style.setProperty('--distanciaMenu1', `${distanciaMenu1}px`);

/* Cada punto flota de forma independiente. Si su menú queda fijado,
   se congela exactamente donde está hasta que el menú se cierre. */
(()=>{
  const points=[...document.querySelectorAll('#scene .point')];
  if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  points.forEach((point,index)=>{
    const dot=point.querySelector(':scope > .dot');
     const label=point.querySelector(':scope > .point-label');
    let timer=null,paused=false;
    function drift(){
      if(paused)return;
      const duration=1250+Math.random()*937.5;
      const x=(Math.random()*2-1)*15;
      const y=(Math.random()*2-1)*15;
      const motion=`translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`;
      dot.style.transition=`transform ${duration}ms ease-in-out, box-shadow .2s ease`;
      dot.style.transform=motion;
      if(label){label.style.transition=`transform ${duration}ms ease-in-out`;label.style.transform=motion;}
      timer=window.setTimeout(drift,duration+90);
    }
    function sync(){
      const shouldPause=point.classList.contains('pinned');
      if(shouldPause===paused)return;
      paused=shouldPause;
      if(timer!==null){window.clearTimeout(timer);timer=null;}
      if(paused){
        // Captura la posición interpolada actual antes de cancelar la transición.
        const current=getComputedStyle(dot).transform;
        dot.style.transition='none';
        dot.style.transform=current==='none'?'translate3d(0px,0px,0)':current;
         if(label){label.style.transition='none';label.style.transform=dot.style.transform;}
      }else{
        // Retoma sin saltar de vuelta a la coordenada de origen.
        void dot.offsetWidth;
        dot.style.transition='transform 2125ms ease-in-out, box-shadow .2s ease';
         if(label)label.style.transition='transform 2125ms ease-in-out';
        timer=window.setTimeout(drift,90);
      }
    }
    new MutationObserver(sync).observe(point,{attributes:true,attributeFilter:['class']});
    timer=window.setTimeout(drift,400+index*380);
  });
})();
