/** Counts service calls using synthetic in-memory Sheets/Drive; never accesses a real account. */
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {setup}=require('./backend.test.cjs');
const code=process.argv[2]?fs.readFileSync(process.argv[2],'utf8'):undefined;
const t=setup(code),token=t.session('familia');
const ids=Array.from({length:6},()=>t.upload(token).data.foto.foto_id);
t.resetMetrics();const result=t.req('getThumbnails',token,{foto_ids:ids});
assert(result.ok);assert.equal(result.data.items.filter(x=>x.ok).length,6);
console.log(JSON.stringify({scenario:'six authorized thumbnails',spreadsheetOpens:t.metrics.spreadsheetOpens,
 dataReads:Object.values(t.metrics.tableReads).reduce((a,b)=>a+b,0),headerReads:Object.values(t.metrics.headerReads).reduce((a,b)=>a+b,0),
 folderLookups:t.metrics.folderLookups},null,2));
