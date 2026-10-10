export const PORTRAIT_OUTPUT=Object.freeze({width:1064,height:1200});
const MIN_ZOOM=1,MAX_ZOOM=3;
const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));

export function normalizeRotation(value){
 const quarter=Math.round((Number(value)||0)/90)*90;
 return ((quarter%360)+360)%360;
}

export function portraitTransform({sourceWidth,sourceHeight,frameWidth=PORTRAIT_OUTPUT.width,frameHeight=PORTRAIT_OUTPUT.height,rotation=0,zoom=1,panX=0,panY=0}){
 const width=Number(sourceWidth),height=Number(sourceHeight),targetWidth=Number(frameWidth),targetHeight=Number(frameHeight);
 if(!(width>0&&height>0&&targetWidth>0&&targetHeight>0))throw new Error('Dimensions de retrat no vàlides.');
 const normalizedRotation=normalizeRotation(rotation),swapped=normalizedRotation===90||normalizedRotation===270;
 const orientedWidth=swapped?height:width,orientedHeight=swapped?width:height;
 const normalizedZoom=clamp(Number(zoom)||MIN_ZOOM,MIN_ZOOM,MAX_ZOOM);
 const scale=Math.max(targetWidth/orientedWidth,targetHeight/orientedHeight)*normalizedZoom;
 const maxPanX=Math.max(0,(orientedWidth*scale-targetWidth)/(2*targetWidth));
 const maxPanY=Math.max(0,(orientedHeight*scale-targetHeight)/(2*targetHeight));
 return {rotation:normalizedRotation,zoom:normalizedZoom,panX:clamp(Number(panX)||0,-maxPanX,maxPanX),panY:clamp(Number(panY)||0,-maxPanY,maxPanY),scale,maxPanX,maxPanY};
}

async function decodePortrait(file){
 if(!(file instanceof Blob)||file.size>35*1024*1024||file.type==='image/svg+xml')throw new Error('Tria una fotografia de menys de 35 MB.');
 if(typeof createImageBitmap==='function'){
  try{const bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});return {image:bitmap,close:()=>bitmap.close()};}catch(_){ }
 }
 const url=URL.createObjectURL(file),image=new Image();
 try{image.src=url;await image.decode();return {image,close:()=>URL.revokeObjectURL(url)};}
 catch(_){URL.revokeObjectURL(url);throw new Error('El navegador no pot obrir aquesta imatge. Converteix-la a JPEG o PNG.');}
}

function canvasBlob(canvas,quality){return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('No s’ha pogut preparar el JPEG.')),'image/jpeg',quality));}

export async function createPortraitEditor(file,{canvas,zoomInput,onChange}={}){
 if(!(canvas instanceof HTMLCanvasElement))throw new Error('No s’ha trobat el llenç de retall.');
 const decoded=await decodePortrait(file),sourceWidth=decoded.image.width,sourceHeight=decoded.image.height;
 if(!(sourceWidth>0&&sourceHeight>0)){decoded.close();throw new Error('La fotografia no té dimensions vàlides.');}
 let transform={rotation:0,zoom:1,panX:0,panY:0},destroyed=false,pinch=null;
 const pointers=new Map(),listeners=[];
 const listen=(target,type,handler,options)=>{target.addEventListener(type,handler,options);listeners.push(()=>target.removeEventListener(type,handler,options));};
 const normalized=()=>portraitTransform({sourceWidth,sourceHeight,...transform});
 const drawTo=target=>{
  if(destroyed||!(target instanceof HTMLCanvasElement))return;
  const ctx=target.getContext('2d');if(!ctx)throw new Error('Canvas no disponible.');
  const current=portraitTransform({sourceWidth,sourceHeight,frameWidth:target.width,frameHeight:target.height,...transform});
  ctx.save();ctx.fillStyle='#dbe5e9';ctx.fillRect(0,0,target.width,target.height);
  ctx.translate(target.width/2+current.panX*target.width,target.height/2+current.panY*target.height);
  ctx.rotate(current.rotation*Math.PI/180);ctx.scale(current.scale,current.scale);
  ctx.drawImage(decoded.image,-sourceWidth/2,-sourceHeight/2);ctx.restore();
 };
 const redraw=()=>{if(destroyed)return;transform=normalized();if(zoomInput)zoomInput.value=String(transform.zoom);canvas.dataset.rotation=String(transform.rotation);canvas.dataset.zoom=String(transform.zoom);canvas.dataset.panX=String(transform.panX);canvas.dataset.panY=String(transform.panY);drawTo(canvas);onChange?.();};
 const setTransform=next=>{transform={...transform,...next};redraw();};
 const pointerPosition=event=>({x:event.clientX,y:event.clientY});
 const beginPinch=()=>{if(pointers.size!==2){pinch=null;return;}const [a,b]=[...pointers.values()],rect=canvas.getBoundingClientRect();pinch={distance:Math.hypot(b.x-a.x,b.y-a.y)||1,midX:(a.x+b.x)/2,midY:(a.y+b.y)/2,zoom:transform.zoom,panX:transform.panX,panY:transform.panY,width:rect.width||1,height:rect.height||1};};
 listen(canvas,'pointerdown',event=>{event.preventDefault();pointers.set(event.pointerId,pointerPosition(event));try{canvas.setPointerCapture(event.pointerId);}catch(_){ }if(pointers.size===2)beginPinch();});
 listen(canvas,'pointermove',event=>{if(!pointers.has(event.pointerId))return;event.preventDefault();const previous=pointers.get(event.pointerId),next=pointerPosition(event);pointers.set(event.pointerId,next);
  if(pointers.size===1){const rect=canvas.getBoundingClientRect();setTransform({panX:transform.panX+(next.x-previous.x)/(rect.width||1),panY:transform.panY+(next.y-previous.y)/(rect.height||1)});return;}
  if(pointers.size===2){if(!pinch)beginPinch();const [a,b]=[...pointers.values()],distance=Math.hypot(b.x-a.x,b.y-a.y)||1,midX=(a.x+b.x)/2,midY=(a.y+b.y)/2;setTransform({zoom:pinch.zoom*distance/pinch.distance,panX:pinch.panX+(midX-pinch.midX)/pinch.width,panY:pinch.panY+(midY-pinch.midY)/pinch.height});}
 });
 const endPointer=event=>{pointers.delete(event.pointerId);pinch=null;if(pointers.size===2)beginPinch();};
 listen(canvas,'pointerup',endPointer);listen(canvas,'pointercancel',endPointer);listen(canvas,'lostpointercapture',endPointer);
 listen(canvas,'wheel',event=>{event.preventDefault();setTransform({zoom:transform.zoom*(event.deltaY<0?1.08:.92)});},{passive:false});
 if(zoomInput)listen(zoomInput,'input',()=>setTransform({zoom:Number(zoomInput.value)}));
 canvas.width=532;canvas.height=600;redraw();
 return {
  drawTo,
  getTransform:()=>({...transform}),
  setTransform,
  rotate:degrees=>setTransform({rotation:transform.rotation+degrees,panX:0,panY:0}),
  reset:()=>setTransform({rotation:0,zoom:1,panX:0,panY:0}),
  async exportJpeg({maxBytes=409600}={}){
   for(const scale of [1,.88,.76,.66]){
    const output=document.createElement('canvas');output.width=Math.round(PORTRAIT_OUTPUT.width*scale);output.height=Math.round(PORTRAIT_OUTPUT.height*scale);drawTo(output);
    for(const quality of [.9,.82,.74,.66,.58,.5]){const blob=await canvasBlob(output,quality);if(blob.size<=maxBytes)return {blob,width:output.width,height:output.height};}
   }
   throw new Error('No s’ha pogut comprimir el retrat dins del límit.');
  },
  destroy(){if(destroyed)return;destroyed=true;pointers.clear();listeners.splice(0).forEach(remove=>remove());decoded.close();}
 };
}
