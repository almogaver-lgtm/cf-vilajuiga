/** Frontend helpers. Keep tokens in the request body, never in URLs or logs. */
export async function apiPost(url, payload, {timeoutMs=45000}={}) {
  if(!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(url)) {
    throw new Error('Cal la URL /exec del desplegament d’Apps Script.');
  }
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try {
    const response=await fetch(url,{
      method:'POST',redirect:'follow',credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',
      headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload),signal:controller.signal
    });
    if(!response.ok)throw new Error('Resposta HTTP '+response.status+'.');
    let result;try{result=await response.json();}catch(_){throw new Error('Google no ha retornat JSON. Revisa el desplegament i els permisos.');}
    if(!result.ok){const e=new Error(result.error?.message||'Error d’API.');e.code=result.error?.code;throw e;}
    return result.data;
  } catch(e) {
    if(e.name==='AbortError'){
      const error=new Error('Resposta pendent. L’acció pot haver-se executat: conserva el mateix request_id i foto_id abans de reintentar.');
      error.code='OUTCOME_UNKNOWN';throw error;
    }
    throw e;
  } finally {clearTimeout(timer);}
}
export const requestId=()=>crypto.randomUUID();
export function jpegBlob(base64) {
  const binary=atob(base64),data=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)data[i]=binary.charCodeAt(i);
  return new Blob([data],{type:'image/jpeg'});
}
async function decodedImage(file) {
  if(typeof createImageBitmap==='function') {
    try {const bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});return {image:bitmap,close:()=>bitmap.close()};}catch(_){}
  }
  const url=URL.createObjectURL(file),image=new Image();
  try {image.src=url;await image.decode();return {image,close:()=>URL.revokeObjectURL(url)};}
  catch(_){URL.revokeObjectURL(url);throw new Error('El navegador no pot obrir aquesta imatge. Converteix-la a JPEG o PNG.');}
}
function toBlob(canvas,quality) {return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('No s’ha pogut preparar el JPEG.')),'image/jpeg',quality));}
async function resize(image,maxDimension,maxBytes,initialQuality) {
  let scale=Math.min(1,maxDimension/Math.max(image.width,image.height));
  const canvas=document.createElement('canvas');
  for(let attempt=0;attempt<4;attempt++) {
    canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas no disponible.');
    ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
    for(const quality of [initialQuality,Math.min(initialQuality,.75),Math.min(initialQuality,.68),.55]) {
      const blob=await toBlob(canvas,quality);if(blob.size<=maxBytes)return {blob,width:canvas.width,height:canvas.height};
    }
    scale*=.8;
  }
  throw new Error('No s’ha pogut comprimir la foto dins del límit.');
}
function base64Blob(blob) {return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=()=>reject(new Error('No s’ha pogut llegir el JPEG.'));r.readAsDataURL(blob);});}
export async function prepareUpload(file,{partit_id,jugadors_ids=[],sense_jugadors=false,peu='',config={}}) {
  if(!(file instanceof Blob)||file.size>35*1024*1024||file.type==='image/svg+xml')throw new Error('Tria una fotografia de menys de 35 MB.');
  const decoded=await decodedImage(file);
  try {
    const photo=await resize(decoded.image,config.image_max_dimension||1600,config.upload_max_bytes||1572864,.82);
    const thumb=await resize(decoded.image,Math.min(config.thumbnail_max_dimension||480,Math.max(photo.width,photo.height)),config.thumbnail_max_bytes||122880,.70);
    return {action:'uploadPhoto',request_id:requestId(),foto_id:requestId(),partit_id,jugadors_ids,sense_jugadors,peu,
      photo_base64:await base64Blob(photo.blob),thumb_base64:await base64Blob(thumb.blob)};
  } finally {decoded.close();}
}
