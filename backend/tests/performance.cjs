/** Counts service calls using synthetic in-memory Sheets/Drive; never accesses a real account. */
const fs=require('node:fs');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {setup}=require('./backend.test.cjs');
const code=process.argv[2]?fs.readFileSync(process.argv[2],'utf8'):undefined;
const summary=t=>({spreadsheetOpens:t.metrics.spreadsheetOpens,
 dataReads:Object.values(t.metrics.tableReads).reduce((a,b)=>a+b,0),headerReads:Object.values(t.metrics.headerReads).reduce((a,b)=>a+b,0),
 folderLookups:t.metrics.folderLookups,fileReads:t.metrics.fileReads,folderReads:t.metrics.folderReads,advancedFileReads:t.metrics.advancedFileReads,metadataReads:t.metrics.metadataReads,
 aclReads:t.metrics.aclReads,parentReads:t.metrics.parentReads,blobReads:t.metrics.blobReads});
const scenarios={};
{
 const t=setup(code),token=t.session('familia');t.resetMetrics();const result=t.req('bootstrap',token);assert(result.ok);
 scenarios.bootstrap=summary(t);
}
{
 const t=setup(code),admin=t.session(),token=t.session('familia');
 t.req('savePlayer',admin,{jugador_id:'J01',nom:'Un',dorsal:1,posicio:'Porter',expected_updated_at:'',photo_base64:t.jpeg,foto_id:crypto.randomUUID()});
 t.req('savePlayer',admin,{jugador_id:'J02',nom:'Dos',dorsal:2,posicio:'Defensa',expected_updated_at:'',photo_base64:t.jpeg,foto_id:crypto.randomUUID()});
 t.resetMetrics();const result=t.req('getPlayerPortraits',token,{jugador_ids:['J01','J02']});assert(result.ok);assert.equal(result.data.items.filter(x=>x.ok).length,2);
 scenarios.twoPortraits=summary(t);
}
{
 const t=setup(code),token=t.session('familia');t.resetMetrics();const result=t.req('listPhotos',token,{partit_id:'P001'});assert(result.ok);assert.equal(result.data.fotos.length,0);
 scenarios.emptyGallery=summary(t);
}
{
 const t=setup(code),token=t.session('familia'),ids=Array.from({length:6},()=>t.upload(token).data.foto.foto_id);
 t.resetMetrics();const result=t.req('getThumbnails',token,{foto_ids:ids});assert(result.ok);assert.equal(result.data.items.filter(x=>x.ok).length,6);
 scenarios.sixThumbnails=summary(t);
}
console.log(JSON.stringify({kind:'synthetic operation counts; not real latency',scenarios},null,2));
