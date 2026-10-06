/** Keep read-only media requests bounded; discard queued work when its view changes. */
export async function mediaBatches(items,load,isCurrent=()=>true){
 let offset=0,stopped=false;
 await Promise.all(Array.from({length:Math.min(2,Math.ceil(items.length/6))},async()=>{
  while(!stopped&&offset<items.length&&isCurrent()){
   const batch=items.slice(offset,offset+=6);
   try{if(await load(batch)===false)stopped=true;}catch(e){stopped=true;throw e;}
  }
 }));
}
