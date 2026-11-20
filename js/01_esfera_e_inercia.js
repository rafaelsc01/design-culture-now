(() => {
  'use strict';
  const canvas=document.getElementById('sphere');
  const ctx=canvas.getContext('2d',{alpha:true});
  const TEX_W=1152,TEX_H=988, PI=Math.PI;
  const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
  const viewScale=()=>document.getElementById('scene').getBoundingClientRect().width/1200;
  const smoother=(a,b,x)=>{x=clamp((x-a)/(b-a),0,1);return x*x*(3-2*x);};
  let yaw=0,pitch=0,drag=false,lastX=0,lastY=0,dirty=false;
  let targetYaw=0,targetPitch=0,dragFrame=0,lastDragTime=0;
  let frontData,frontBlurData,backSharpData,backBlurData;
  const sprite=document.createElement('canvas'),sc=sprite.getContext('2d');
  const back=document.createElement('canvas');
  const blur=document.createElement('canvas');
  const front=document.createElement('canvas');
  const frontBlur=document.createElement('canvas');
  const textureAlpha=(data,u,v)=>{
    if(u<0||u>=1||v<0||v>=1)return 0;
    const x=(u*(TEX_W-1))|0, y=((1-v)*(TEX_H-1))|0;
    return data[(y*TEX_W+x)*4+3]/255;
  };
  function buildTextures(image){
    for(const c of [front,frontBlur,back,blur]){c.width=TEX_W;c.height=TEX_H;}
    const fc=front.getContext('2d',{willReadFrequently:true});
    const insetX=TEX_W*.035,insetY=TEX_H*.065,areaW=TEX_W*.93,areaH=TEX_H*.87;
    fc.clearRect(0,0,TEX_W,TEX_H);fc.drawImage(image,insetX,insetY,areaW,areaH);
    const bc=back.getContext('2d',{willReadFrequently:true});
    bc.clearRect(0,0,TEX_W,TEX_H);
    const midA=insetY+areaH*25.8/82.45,midB=insetY+areaH*47.4/82.45;
    // Patterned back: diagonal lines in DESIGN/NOW, dot matrix in CULTURE.
    function hatch(top,bottom,direction){
      bc.save();bc.beginPath();bc.rect(0,top,TEX_W,bottom-top);bc.clip();
      bc.strokeStyle='#3973A1';bc.lineWidth=7;
      const height=bottom-top;
      for(let x=-TEX_H*2;x<TEX_W+TEX_H*2;x+=22){
        bc.beginPath();bc.moveTo(x,top);bc.lineTo(x+direction*height,bottom);bc.stroke();
      }
      bc.restore();
    }
    hatch(0,midA,+1);hatch(midB,TEX_H,-1);
    bc.fillStyle='#3C74A3';
    for(let y=midA+7;y<midB;y+=22){
      for(let x=9+((Math.floor(y/22)%2)*11);x<TEX_W;x+=22){
        bc.beginPath();bc.arc(x,y,7.3,0,2*PI);bc.fill();
      }
    }
    bc.globalCompositeOperation='destination-in';
    bc.drawImage(image,insetX,insetY,areaW,areaH);
    bc.globalCompositeOperation='source-over';
    const blurred=blur.getContext('2d',{willReadFrequently:true});
    blurred.filter='blur(7px)';blurred.drawImage(back,0,0);
    blurred.filter='none';
    const fbl=frontBlur.getContext('2d',{willReadFrequently:true});
    fbl.filter='blur(5px)';fbl.drawImage(front,0,0);fbl.filter='none';
    frontBlurData=fbl.getImageData(0,0,TEX_W,TEX_H).data;
    frontData=fc.getImageData(0,0,TEX_W,TEX_H).data;
    backSharpData=bc.getImageData(0,0,TEX_W,TEX_H).data;
    backBlurData=blurred.getImageData(0,0,TEX_W,TEX_H).data;
    render();
  }
  const ANGLE_W=.96,ANGLE_H=.99;
  function getLetter(lon,lat,blurred){
    const other=lon>0?lon-PI:lon+PI;
    const rear=Math.abs(other)<ANGLE_W && Math.abs(lon)>=ANGLE_W;
    const local=rear?other:lon;
    if(Math.abs(local)>=ANGLE_W||Math.abs(lat)>=ANGLE_H)return 0;
    const u=local/(2*ANGLE_W)+.5,v=lat/(2*ANGLE_H)+.5;
    return textureAlpha(rear?(blurred?backBlurData:backSharpData):(blurred?frontBlurData:frontData),u,v);
  }
  function isRear(lon){let other=lon>0?lon-PI:lon+PI;return Math.abs(other)<ANGLE_W&&Math.abs(lon)>=ANGLE_W;}
  function render(){
    if(!frontData)return;
    let cw=canvas.clientWidth,ch=canvas.clientHeight;
    if(cw<2||ch<2)return;
    const dpr=Math.min(2,devicePixelRatio||1);
    const width=Math.round(cw*dpr),height=Math.round(ch*dpr);
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
    ctx.clearRect(0,0,width,height);
    const visualSize=400*dpr; // Fixed visible sphere size: 400x400 px
    const calcSize=720; // Preserve 720x720 internal rendering resolution
    if(sprite.width!==calcSize||sprite.height!==calcSize){sprite.width=calcSize;sprite.height=calcSize;}
    const bitmap=sc.createImageData(calcSize,calcSize),data=bitmap.data;
    const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
    // Fixed material and optical appearance; no fade timers or auto-spin.
    for(let iy=0;iy<calcSize;iy++){
      const ny=(1-2*(iy+.5)/calcSize)*1.012;
      for(let ix=0;ix<calcSize;ix++){
        const nx=(2*(ix+.5)/calcSize-1)*1.012;
        const d2=nx*nx+ny*ny;
        if(d2>1.016)continue;
        const edge=1-smoother(.990,1.013,Math.sqrt(d2));
        if(edge<=0)continue;
        const z=Math.sqrt(Math.max(0,1-d2));
        // Undo mouse yaw and pitch to obtain UV coordinates in the object's frame.
        const nearPX=nx,nearPY=ny*cp+z*sp,nearPZ=-ny*sp+z*cp;
        const nearX=nearPX*cy-nearPZ*sy,nearZ=nearPX*sy+nearPZ*cy;
        const nearLat=Math.asin(clamp(nearPY,-1,1));
        const nearLon=Math.atan2(nearX,nearZ);
        const farPX=nx,farPY=ny*cp-z*sp,farPZ=-ny*sp-z*cp;
        const farX=farPX*cy-farPZ*sy,farZ=farPX*sy+farPZ*cy;
        const farLat=Math.asin(clamp(farPY,-1,1));
        const farLon=Math.atan2(farX,farZ);
        const nearTex=getLetter(nearLon,nearLat,false);
        const farTex=getLetter(farLon,farLat,true);
        // Far-side letters are faint and softened by the translucent shell.
        const ghost=farTex*.31;
        // Lightly frosted pearl glass, increasing opacity near the rim.
        const fresnel=Math.pow(1-z,2.15);
        const light=clamp(.79+.22*(-nx*.63+ny*.55+z*.25),.58,1.04);
        const glassOpacity=.095+fresnel*.22;
        const glassR=234*light,glassG=240*light,glassB=245*light;
        const baseR=249,baseG=251,baseB=252;
        let r=baseR*(1-ghost)+91*ghost;
        let g=baseG*(1-ghost)+139*ghost;
        let b=baseB*(1-ghost)+177*ghost;
        // translucent surface floats in front of the rear lettering.
        r=r*(1-glassOpacity)+glassR*glassOpacity;
        g=g*(1-glassOpacity)+glassG*glassOpacity;
        b=b*(1-glassOpacity)+glassB*glassOpacity;
        const nearRear=isRear(nearLon);
        const frontOpacity=nearTex*(nearRear?.89:.99);
        const inkR=nearRear?77:44;
        const inkG=nearRear?128:105;
        const inkB=nearRear?171:155;
        r=r*(1-frontOpacity)+inkR*frontOpacity;
        g=g*(1-frontOpacity)+inkG*frontOpacity;
        b=b*(1-frontOpacity)+inkB*frontOpacity;
        // Subtle pearly outline and soft reflection belong to the sphere itself.
        const highlight=Math.pow(Math.max(0,nx*(-.44)+ny*.52+z*.73),22)*.12*(1-frontOpacity);
        const line=Math.pow(1-z,9)*.16;
        r=r*(1-highlight)+255*highlight;
        g=g*(1-highlight)+255*highlight;
        b=b*(1-highlight)+255*highlight;
        r=r*(1-line)+206*line;
        g=g*(1-line)+220*line;
        b=b*(1-line)+232*line;
        const k=(iy*calcSize+ix)*4;
        /* ===== INICIO 1stTry: transparencia real de la esfera =====
           Permite ver velocidad_A a través del vidrio, conservando las letras.
           Para revertir esta prueba cambia FIRST_TRY a false.
        */
        const FIRST_TRY=true;
        if(FIRST_TRY){
          // Cristal semitransparente en el centro y más denso en los bordes.
          // La tipografía frontal permanece opaca para conservar la nitidez.
          const baseShellAlpha=clamp(.44+fresnel*.34+frontOpacity*.56,.44,1);
          /* ===== INICIO 2ndTry =====
             Variante de 1stTry: disminuye un 25% la visibilidad del
             fondo a través de la esfera (sin modificar velocidad_A).
             Volver a 1stTry: establecer SECOND_TRY_VISIBILITY = 1.
          */
          const SECOND_TRY_VISIBILITY=0.75;
          const shellAlpha=1-(1-baseShellAlpha)*SECOND_TRY_VISIBILITY;
          /* ===== FIN 2ndTry ===== */
          // El mismo color original sobre fondo blanco, con alpha real:
          // evita oscurecer la superficie o aclarar las letras.
          const bias=255*(1-shellAlpha),inverse=1/shellAlpha;
          data[k]=clamp((r-bias)*inverse,0,255);
          data[k+1]=clamp((g-bias)*inverse,0,255);
          data[k+2]=clamp((b-bias)*inverse,0,255);
          data[k+3]=Math.round(255*edge*shellAlpha);
        }else{
          data[k]=r;data[k+1]=g;data[k+2]=b;data[k+3]=Math.round(255*edge);
        }
        /* ===== FIN 1stTry ===== */
      }
    }
    sc.putImageData(bitmap,0,0);
    const cx=width*.5,cyy=height*.5;
    // Shadow removed by request; all other rendering remains unchanged.
    ctx.imageSmoothingQuality='high';
    ctx.drawImage(sprite,cx-visualSize/2,cyy-visualSize/2,visualSize,visualSize);
  }
  function schedule(){if(dirty)return;dirty=true;requestAnimationFrame(()=>{dirty=false;render();});}
  const source=document.querySelector('#source-svg svg');
  source.setAttribute('width',String(TEX_W));source.setAttribute('height',String(TEX_H));
  const img=new Image();img.onload=()=>buildTextures(img);
  img.onerror=()=>console.error('No se pudo dibujar el SVG original.');
  img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(source));
  /* ===== INICIO inercia_esfera =====
     Al soltar después de arrastrar, conserva parte de la velocidad del
     gesto y la amortigua gradualmente. Independiente de 1stTry y velocidad_A.
  */
  let pointerSpinYaw=0,pointerSpinPitch=0;
  let inertiaYaw=0,inertiaPitch=0;
  let lastPointerTime=0,lastMovementTime=0;
  const inertiaTau=1.98;   // segundos: duración natural de la desaceleración
  function animateDrag(time){
    dragFrame=0;
    const dtMs=lastDragTime?Math.min(80,Math.max(1,time-lastDragTime)):16.7;
    lastDragTime=time;
    if(!drag){
      // Integramos la velocidad amortiguada en el objetivo de orientación.
      const fade=Math.exp(-(dtMs/1000)/inertiaTau);
      const step=inertiaTau*(1-fade);
      targetYaw+=inertiaYaw*step;
      targetPitch=clamp(targetPitch+inertiaPitch*step,-1.46,1.46);
      inertiaYaw*=fade;
      inertiaPitch*=fade;
      if((targetPitch>=1.46&&inertiaPitch>0)||(targetPitch<=-1.46&&inertiaPitch<0))inertiaPitch=0;
    }
    // Se conserva el suavizado de 48 ms de la rotación original.
    const smoothing=1-Math.exp(-dtMs/48);
    yaw+=(targetYaw-yaw)*smoothing;
    pitch+=(targetPitch-pitch)*smoothing;
    schedule();
    if(Math.abs(targetYaw-yaw)>.0003||Math.abs(targetPitch-pitch)>.0003||
       (!drag&&(Math.abs(inertiaYaw)>.008||Math.abs(inertiaPitch)>.008))){
      dragFrame=requestAnimationFrame(animateDrag);
    }
  }
  canvas.addEventListener('pointerdown',e=>{
    const r=canvas.getBoundingClientRect(),radius=r.width/2;
    if(Math.hypot(e.clientX-r.left-r.width/2,e.clientY-r.top-r.height/2)>radius)return;
    // Un nuevo gesto detiene la inercia previa y toma el control de inmediato.
    if(dragFrame)cancelAnimationFrame(dragFrame);
    dragFrame=0;drag=true;lastX=e.clientX;lastY=e.clientY;
    targetYaw=yaw;targetPitch=pitch;lastDragTime=0;
    pointerSpinYaw=0;pointerSpinPitch=0;inertiaYaw=0;inertiaPitch=0;
    lastPointerTime=performance.now();lastMovementTime=0;
    canvas.classList.add('dragging');canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove',e=>{
    if(!drag)return;
    const dx=e.clientX-lastX,dy=e.clientY-lastY;
    if(dx===0&&dy===0)return;
    const now=performance.now(),dt=Math.max(8,now-lastPointerTime);
    const dyaw=(dx/viewScale())*.0069;
    const dpitch=(dy/viewScale())*.0062;
    targetYaw+=dyaw;
    targetPitch=clamp(targetPitch+dpitch,-1.46,1.46);
    const blend=1-Math.exp(-dt/40);
    pointerSpinYaw+=(dyaw/(dt/1000)-pointerSpinYaw)*blend;
    pointerSpinPitch+=(dpitch/(dt/1000)-pointerSpinPitch)*blend;
    lastX=e.clientX;lastY=e.clientY;
    lastPointerTime=now;lastMovementTime=now;
    if(!dragFrame)dragFrame=requestAnimationFrame(animateDrag);
  });
  function stop(e){
    if(!drag)return;
    drag=false;
    const fresh=lastMovementTime>0&&(performance.now()-lastMovementTime)<95;
    const canGlide=e&&e.type==='pointerup'&&fresh;
    // Una pulsación sin arrastre no produce giro; solo continúa el último gesto.
    inertiaYaw=canGlide?clamp(pointerSpinYaw*.68,-5,5):0;
    inertiaPitch=canGlide?clamp(pointerSpinPitch*.68,-4,4):0;
    canvas.classList.remove('dragging');
    if(e&&canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
    lastDragTime=0;
    if(!dragFrame)dragFrame=requestAnimationFrame(animateDrag);
  }
  canvas.addEventListener('pointerup',stop);
  canvas.addEventListener('pointercancel',stop);
  /* ===== FIN inercia_esfera ===== */
  canvas.addEventListener('keydown',e=>{
    const a=.13;if(e.key==='ArrowLeft')yaw-=a;else if(e.key==='ArrowRight')yaw+=a;
    else if(e.key==='ArrowUp')pitch=clamp(pitch-.13,-1.46,1.46);
    else if(e.key==='ArrowDown')pitch=clamp(pitch+.13,-1.46,1.46);
    else return;e.preventDefault();targetYaw=yaw;targetPitch=pitch;schedule();
  });
  window.addEventListener('resize',schedule);
})();
