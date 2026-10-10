import test from 'node:test';
import assert from 'node:assert/strict';
import {GALLERY_UPLOAD_LIMITS,galleryUploadConfig} from '../api-client.mjs';

test('gallery uploads use the mobile limits when the server is more permissive',()=>{
 assert.deepEqual(GALLERY_UPLOAD_LIMITS,{image_max_dimension:1280,upload_max_bytes:819200,thumbnail_max_dimension:480,thumbnail_max_bytes:81920});
 assert.deepEqual(galleryUploadConfig({image_max_dimension:1600,upload_max_bytes:1572864,thumbnail_max_dimension:480,thumbnail_max_bytes:122880}),{image_max_dimension:1280,upload_max_bytes:819200,thumbnail_max_dimension:480,thumbnail_max_bytes:81920,avoid_size_increase:true});
});

test('gallery uploads preserve stricter server limits',()=>{
 const config=galleryUploadConfig({image_max_dimension:1024,upload_max_bytes:600000,thumbnail_max_dimension:320,thumbnail_max_bytes:60000,privacy_version:'1'});
 assert.deepEqual(config,{image_max_dimension:1024,upload_max_bytes:600000,thumbnail_max_dimension:320,thumbnail_max_bytes:60000,privacy_version:'1',avoid_size_increase:true});
});
