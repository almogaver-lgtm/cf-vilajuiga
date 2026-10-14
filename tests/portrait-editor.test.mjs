import test from 'node:test';
import assert from 'node:assert/strict';
import {PORTRAIT_OUTPUT,normalizeRotation,portraitTransform} from '../portrait-editor.mjs';

test('portrait output matches the card frame and stays within backend dimensions',()=>{
 assert.deepEqual(PORTRAIT_OUTPUT,{width:1064,height:1200});
 assert.ok(PORTRAIT_OUTPUT.width/PORTRAIT_OUTPUT.height>0.886);
 assert.ok(PORTRAIT_OUTPUT.width/PORTRAIT_OUTPUT.height<0.887);
 assert.equal(Math.max(PORTRAIT_OUTPUT.width,PORTRAIT_OUTPUT.height),1200);
});

test('rotation keeps fine angles in a stable signed range',()=>{
 assert.equal(normalizeRotation(90),90);
 assert.equal(normalizeRotation(-90),-90);
 assert.equal(normalizeRotation(450),90);
 assert.equal(normalizeRotation(44.04),44);
 assert.equal(normalizeRotation(44.06),44.1);
});

test('portrait transform always covers the crop and clamps blank edges',()=>{
 const portrait=portraitTransform({sourceWidth:800,sourceHeight:1200,rotation:0,zoom:1,panX:1,panY:1});
 assert.equal(portrait.scale,1.33);
 assert.equal(portrait.panX,0,'a narrow image cannot move horizontally at minimum zoom');
 assert.ok(Math.abs(portrait.panY-.165)<.001,'vertical movement is clamped before exposing a blank edge');

 const rotated=portraitTransform({sourceWidth:800,sourceHeight:1200,rotation:90,zoom:1,panX:-1,panY:1});
 assert.equal(rotated.scale,1.5);
 assert.ok(rotated.panX<-.34&&rotated.panX>-.35);
 assert.equal(rotated.panY,0,'a rotated image cannot move vertically at minimum zoom');

 const zoomed=portraitTransform({sourceWidth:800,sourceHeight:1200,rotation:0,zoom:9,panX:-9,panY:9});
 assert.equal(zoomed.zoom,3,'zoom is capped for predictable memory and interaction');
 assert.ok(zoomed.panX<0&&zoomed.panY>0);
});

test('fine rotations keep every crop corner inside portrait and landscape images',()=>{
 for(const source of [{sourceWidth:800,sourceHeight:1400},{sourceWidth:1600,sourceHeight:900}])for(const rotation of [0,7.5,45,90,180,-33.3]){
  const frameWidth=1064,frameHeight=1200,current=portraitTransform({...source,frameWidth,frameHeight,rotation,zoom:1.35,panX:.9,panY:-.8}),angle=current.rotation*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle),tx=current.panX*frameWidth,ty=current.panY*frameHeight;
  for(const x of [-frameWidth/2,frameWidth/2])for(const y of [-frameHeight/2,frameHeight/2]){
   const localX=(c*(x-tx)+s*(y-ty))/current.scale,localY=(-s*(x-tx)+c*(y-ty))/current.scale;
   assert.ok(Math.abs(localX)<=source.sourceWidth/2+.001,`x corner exposed at ${rotation}`);assert.ok(Math.abs(localY)<=source.sourceHeight/2+.001,`y corner exposed at ${rotation}`);
  }
 }
});
