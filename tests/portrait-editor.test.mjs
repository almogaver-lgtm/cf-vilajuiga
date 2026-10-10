import test from 'node:test';
import assert from 'node:assert/strict';
import {PORTRAIT_OUTPUT,normalizeRotation,portraitTransform} from '../portrait-editor.mjs';

test('portrait output matches the card frame and stays within backend dimensions',()=>{
 assert.deepEqual(PORTRAIT_OUTPUT,{width:1064,height:1200});
 assert.ok(PORTRAIT_OUTPUT.width/PORTRAIT_OUTPUT.height>0.886);
 assert.ok(PORTRAIT_OUTPUT.width/PORTRAIT_OUTPUT.height<0.887);
 assert.equal(Math.max(PORTRAIT_OUTPUT.width,PORTRAIT_OUTPUT.height),1200);
});

test('rotation is restricted to stable quarter turns',()=>{
 assert.equal(normalizeRotation(90),90);
 assert.equal(normalizeRotation(-90),270);
 assert.equal(normalizeRotation(450),90);
 assert.equal(normalizeRotation(44),0);
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
