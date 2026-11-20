(()=>{
const stage=document.querySelector('#stage'),scene=document.querySelector('#scene');
function resize(){
  // Fit the complete design within the available viewport without scrolling.
  const scale=Math.min(stage.clientWidth/1200,stage.clientHeight/788);
  scene.style.left=((stage.clientWidth-1200*scale)/2)+'px';
  scene.style.top='0px';
  scene.style.transform='scale('+scale+')';
}
resize();if(typeof ResizeObserver!=='undefined'){new ResizeObserver(resize).observe(stage)}else{window.addEventListener('resize',resize)}
const points=[...scene.querySelectorAll('.point')];const pinned=new Set(),hovered=new Set(),suppressed=new Set(),timers=new Map();
function update(){points.forEach((p,i)=>{const open=pinned.has(i)||(hovered.has(i)&&!suppressed.has(i));p.classList.toggle('open',open);p.classList.toggle('pinned',pinned.has(i));p.querySelectorAll(':scope > .dot, :scope > .point-label').forEach(control=>control.setAttribute('aria-expanded',String(open)));});}
points.forEach((p,i)=>{const btn=p.querySelector('button');p.addEventListener('pointerenter',()=>{clearTimeout(timers.get(i));hovered.add(i);update();});p.addEventListener('pointerleave',()=>{timers.set(i,setTimeout(()=>{hovered.delete(i);suppressed.delete(i);update();},180));});[btn,p.querySelector(':scope > .point-label')].filter(Boolean).forEach(control=>control.addEventListener('click',e=>{e.stopPropagation();if(pinned.has(i)){pinned.delete(i);suppressed.add(i)}else{pinned.add(i);suppressed.delete(i)}hovered.add(i);update();}));});
stage.addEventListener('click',e=>{if(!e.target.closest('.point')){pinned.clear();hovered.clear();suppressed.clear();update();}});
})();
