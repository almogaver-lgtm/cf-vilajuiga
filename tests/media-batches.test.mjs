import test from 'node:test';
import assert from 'node:assert/strict';
import {mediaBatches} from '../media-batches.mjs';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
test('media reads start two batches together, cap concurrency and keep batches at six',async()=>{
 const gates=Array.from({length:4},deferred),seen=[];let active=0,peak=0;
 const done=mediaBatches(Array.from({length:19},(_,i)=>i),async batch=>{
  const i=seen.length;seen.push(batch);active++;peak=Math.max(peak,active);await gates[i].promise;active--;
 });
 assert.equal(seen.length,2);assert.equal(peak,2);
 gates[0].resolve();await Promise.resolve();await Promise.resolve();assert.equal(seen.length,3);
 gates[1].resolve();await Promise.resolve();await Promise.resolve();assert.equal(seen.length,4);
 gates[2].resolve();gates[3].resolve();await done;
 assert.equal(peak,2);assert.deepEqual(seen.flat().sort((a,b)=>a-b),Array.from({length:19},(_,i)=>i));assert(seen.every(b=>b.length<=6));
});
test('view cancellation or a failed batch stops queued work',async()=>{
 for(const mode of ['cancel','failure']){
  const gate=deferred();let current=true,calls=0;
  const done=mediaBatches(Array.from({length:24},(_,i)=>i),async()=>{calls++;await gate.promise;return mode==='failure'?false:undefined;},()=>current);
  assert.equal(calls,2);if(mode==='cancel')current=false;gate.resolve();await done;assert.equal(calls,2);
 }
});
test('empty or already cancelled work makes no requests',async()=>{
 const load=()=>{throw Error('No request expected');};await mediaBatches([],load);await mediaBatches([1],load,()=>false);
});
