import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {readFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const project=fileURLToPath(new URL('../',import.meta.url));
process.chdir(project);
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const server=spawn('python3',['-u','-m','http.server','8080','--bind','127.0.0.1'],{stdio:['ignore','pipe','pipe']});
await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>code&&reject(new Error('HTTP server failed')));});
process.on('exit',()=>server.kill());
const browser=await chromium.launch({...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox'],headless:true});
mkdirSync('test-output',{recursive:true});
const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
let fixtureScenario=false,cardScenario=false,failCardSave=false,cardSaves=[],combineBootstrap=true,failBootstrap=false,omitPortrait=false;
const apiCalls=[];
let portraitGate=null;
const portraitSvg='<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="#b8d9e7"/><circle cx="300" cy="220" r="105" fill="#f3ede2"/><path d="M90 800V550c0-150 90-230 210-230s210 80 210 230v250" fill="#167ca6"/><path d="M260 340h80v460h-80" fill="#f2f4f0"/></svg>';
const sharp=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/sharp':'sharp');
const portraitB64=(await sharp(Buffer.from(portraitSvg)).jpeg().toBuffer()).toString('base64');
const players=[{jugador_id:'card1',nom:'Jugador de prova',dorsal:10,posicio:'Migcampista',te_retrat:true,retrat_version:'portrait1',actualitzat_at:'2026-10-06T10:00:00Z'},{jugador_id:'card2',nom:'Un nom llarg de prova',dorsal:1,posicio:'Porter',te_retrat:false,actualitzat_at:''},{jugador_id:'card3',nom:'Prova',dorsal:7,posicio:'Davanter',te_retrat:false,actualitzat_at:''}];
const realCalendar=JSON.parse(readFileSync('tests/fixtures/calendar-2026-27.json','utf8'));
let privacy=false,role='admin',empty=false,failUpload=false,uploads=[],revoked=false;
const m={partit_id:'m1',data:'2026-10-10',hora:'10:00',jornada:1,local:'CF VILAJUÏGA',visitant:'Rival de prova',camp_nom:'Camp de prova',camp_adreca:'Adreça de prova',camp_lat:'',camp_lng:'',estat:'pendent',gols_local:'',gols_visitant:'',cronica:'',actualitzat_at:'2026-10-01T10:00:00Z'};
const photo={foto_id:'00000000-0000-4000-8000-000000000001',partit_id:'m1',peu:'Foto de prova',pujat_per_nom:'Família de prova',pujat_at:'2026-10-01T10:00:00Z',no_mostrar:false,bloquejada:false};
const b64=readFileSync('assets/football.jpg').toString('base64');
const bootstrap=()=>({user:{nom:'Família de prova',rol:role,privacyAccepted:privacy},config:{equip_nom:'CF VILAJUÏGA',temporada:'2026/27',privacy_version:'1'},partits:fixtureScenario?realCalendar:empty?[]:[m],jugadors:cardScenario?players.filter(j=>!omitPortrait||j.jugador_id!=='card1'):[],...(cardScenario?{features:{player_cards:true,fresh_permissions:true}}:{}),estadistiques:{PJ:0,V:0,E:0,D:0,GF:0,GC:0,DG:0}});
await context.route('https://script.google.com/**',async route=>{
 const p=JSON.parse(route.request().postData()||'{}');apiCalls.push(p.action);let data;if((revoked||failBootstrap)&&p.action==='bootstrap'){await route.fulfill({contentType:'application/json',body:JSON.stringify({ok:false,error:{code:revoked?'UNAUTHORIZED':'INTERNAL_ERROR',message:'Error sintètic de prova'}})});return;}
 switch(p.action){
 case 'login':data={token:'synthetic-test-token',expiresAt:'2099-01-01T00:00:00Z',user:bootstrap().user,privacy:{text:'Compromís sintètic de prova.',version:'1'},...(combineBootstrap&&privacy&&p.include_bootstrap?{bootstrap:bootstrap()}: {})};break;
 case 'acceptPrivacy':privacy=true;data={accepted:true,...(combineBootstrap&&p.include_bootstrap?{bootstrap:bootstrap()}: {})};break;
 case 'bootstrap':data=bootstrap();break;
 case 'listPhotos':data={fotos:[photo],nextCursor:null};break;
 case 'getThumbnails':data={items:[{foto_id:photo.foto_id,ok:true,base64:b64}]};break;
 case 'getPhoto':case 'downloadPhoto':data={base64:b64,filename:'prova.jpg'};break;
 case 'updateResult':Object.assign(m,{estat:p.estat,gols_local:p.gols_local,gols_visitant:p.gols_visitant,actualitzat_at:'2026-10-06T10:00:00Z'});data={partit:m};break;
 case 'updateChronicle':m.cronica=p.cronica;data={partit:m};break;
 case 'getPlayerPortraits':if(portraitGate)await portraitGate;data={items:p.jugador_ids.map(id=>({ok:true,jugador_id:id,retrat_version:players.find(j=>j.jugador_id===id).retrat_version,base64:portraitB64}))};break;
 case 'savePlayer':cardSaves.push(p);if(failCardSave){failCardSave=false;await route.fulfill({contentType:'application/json',body:JSON.stringify({ok:false,error:{code:'BUSY',message:'Error sintètic de prova'}})});return;}const oldPlayer=players.find(j=>j.jugador_id===p.jugador_id);const player={...(oldPlayer||{}),jugador_id:p.jugador_id,nom:p.nom,dorsal:p.dorsal,posicio:p.posicio,te_retrat:!!p.photo_base64||!!oldPlayer?.te_retrat,retrat_version:p.foto_id||oldPlayer?.retrat_version,actualitzat_at:'2026-10-06T12:00:00Z'};if(oldPlayer)Object.assign(oldPlayer,player);else players.push(player);data={jugador:player};break;
 case 'uploadPhoto':uploads.push(p);if(failUpload){failUpload=false;await route.fulfill({contentType:'application/json',body:JSON.stringify({ok:false,error:{code:'BUSY',message:'Error de prova'}})});return;}data={foto:photo};break;
 case 'hidePhoto':photo.no_mostrar=true;photo.bloquejada=true;data={foto:photo};break;
 case 'showPhoto':photo.no_mostrar=false;photo.bloquejada=false;data={foto:photo};break;
 case 'deletePhoto':data={deleted:true};break;
 case 'logout':data={loggedOut:true};break;
 default:throw new Error('Unexpected action '+p.action);
 }
 await route.fulfill({contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({ok:true,data})});
});
await page.goto('http://127.0.0.1:8080/');await page.locator('#login-phone').waitFor();await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:'test-output/login-desktop.png',fullPage:true});
await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-output/login-mobile.png',fullPage:true});
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'mobile login overflow');
await page.locator('#login-phone').fill('999000123');await page.locator('#login-form [type=submit]').click();await page.locator('#privacy-form').waitFor();
assert.equal(await page.evaluate(()=>Object.keys(localStorage).length),0,'token stored before consent');
await page.locator('[name=accepted]').check();await page.locator('#privacy-form [type=submit]').click();await page.locator('.hero').waitFor();
assert.deepEqual(apiCalls,['login','acceptPrivacy'],'consent and initial data need two requests, with no extra bootstrap');
await page.screenshot({path:'test-output/home-mobile-test.png',fullPage:true});
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'mobile home overflow');
await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'test-output/home-desktop-test.png',fullPage:true});
await page.locator('[data-action=match]').first().click();await page.locator('[data-action=edit-match]').click();await page.selectOption('#match-status','jugat');await page.fill('#gols-local','2');await page.fill('#gols-visitant','1');await page.locator('#edit-form [type=submit]').click();await page.locator('.detail-score').filter({hasText:'2 : 1'}).waitFor();
await page.locator('[data-action=close]').first().click();await page.locator('.sidebar [data-view=photos]').click();await page.locator('[data-thumb]:visible').waitFor();await page.locator('[data-action=photo]').click();await page.locator('.viewer-media img').waitFor();
await page.locator('[data-action=download-photo]').click();const downloadPromise=page.waitForEvent('download');await page.locator('[data-action=confirm-download]').click();await downloadPromise;
await page.locator('[data-action=upload]').first().click();await page.locator('#upload-files').setInputFiles({name:'prova.jpg',mimeType:'image/jpeg',buffer:readFileSync('assets/football.jpg')});failUpload=true;await page.locator('#upload-form [type=submit]').click();await page.locator('[data-action=retry-uploads]').waitFor();await page.locator('[data-action=retry-uploads]').click();await page.locator('.queue-item.done').waitFor();
assert.equal(uploads.length,2);assert.equal(uploads[0].foto_id,uploads[1].foto_id);assert.equal(uploads[0].request_id,uploads[1].request_id);assert.ok(Buffer.from(uploads[0].photo_base64,'base64').length<=1572864);
await page.locator('[data-action=close]').first().click();await context.setOffline(true);await page.locator('.offline-banner').waitFor();assert.equal(await page.locator('[data-action=upload]').first().isDisabled(),true);await context.setOffline(false);await page.locator('.offline-banner').waitFor({state:'hidden'});
await page.locator('[data-action=account]').first().click();await page.locator('[data-action=logout]').click();await page.locator('#login-form').waitFor();assert.equal(await page.evaluate(()=>Object.keys(localStorage).length),0);
role='familia';const loginStart=apiCalls.length;await page.locator('#login-phone').fill('999000123');await page.locator('#login-form [type=submit]').click();await page.locator('.hero').waitFor();assert.deepEqual(apiCalls.slice(loginStart),['login'],'accepted users enter with one request');await page.locator('[data-action=match]').first().click();assert.equal(await page.locator('[data-action=edit-match]').count(),0,'family cannot edit');await page.locator('[data-action=close]').first().click();revoked=true;await page.locator('[data-action=refresh]').click();await page.locator('#login-form').waitFor();assert.equal(await page.evaluate(()=>Object.keys(localStorage).length),0,'revocation clears cached private snapshot');revoked=false;empty=true;combineBootstrap=false;const legacyStart=apiCalls.length;await page.locator('#login-phone').fill('999000123');await page.locator('#login-form [type=submit]').click();await page.locator('.hero').waitFor();assert.deepEqual(apiCalls.slice(legacyStart),['login','bootstrap'],'old backend login remains compatible');combineBootstrap=true;await page.screenshot({path:'test-output/home-empty-desktop.png',fullPage:true});await page.locator('.sidebar [data-view=calendar]').click();await page.getByText('La temporada ens espera').waitFor();
assert.deepEqual(errors,[]);
console.log('PASS: consent, responsive layouts, results, private gallery, download, upload retries, offline, logout, empty season.');


await page.locator('.sidebar [data-view=team]').click();await page.locator('.album-example').waitFor();assert.equal(await page.locator('[data-action=add-player]').count(),0,'old backend does not expose an unsupported editor');await page.evaluate(()=>document.getElementById('toast').hidden=true);await page.screenshot({path:'test-output/cards-empty-preview.png',fullPage:true});await page.locator('.sidebar [data-view=calendar]').click();
fixtureScenario=true;await page.locator('[data-action=refresh]').click();await page.locator('.match-row').nth(6).waitFor();
assert.equal(await page.locator('.match-row').count(),7,'exactly seven CF Vilajuïga fixtures');
await page.locator('[data-action=match][data-id="2026_27_f1_j01"]').click();await page.locator('.detail-top').waitFor();assert.ok((await page.locator('.detail-top').textContent()).includes('dissabte, 10 d’octubre'));assert.equal(await page.locator('.detail-info strong').first().innerText(),'10:00');assert.ok((await page.locator('.detail-info').innerText()).includes('Palau-saverdera'));await page.locator('[data-action=close]').click();
await page.locator('.sidebar [data-view=league]').click();await page.locator('.club-card').nth(7).waitFor();assert.equal(await page.locator('.club-card').count(),8);assert.equal(await page.locator('.our-club').count(),1);
assert.ok((await page.locator('[data-club=llers] .club-fixture').innerText()).includes('A casa'),'home match distinct from rival home ground');
assert.ok((await page.locator('[data-club=finca] .club-fixture').innerText()).includes('diumenge, 1 de novembre'));
const navataMap=await page.locator('[data-club=navata] a').getAttribute('href');assert.equal(navataMap,'https://maps.app.goo.gl/2aj47hjDicsMrnmKA');
await page.screenshot({path:'test-output/league-desktop.png',fullPage:true});
await page.setViewportSize({width:390,height:844});assert.equal(await page.locator('.mobile-nav .nav-btn').count(),5);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'mobile league overflow');await page.screenshot({path:'test-output/league-mobile.png',fullPage:true});
await page.locator('[data-club=finca] [data-action=club]').click();await page.locator('.club-sources').waitFor();assert.ok((await page.locator('.venue-note').innerText()).includes('accés'));await page.screenshot({path:'test-output/club-mobile.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'club detail overflow');
await page.locator('#modal .club-fixture').filter({hasText:'J4'}).click();await page.locator('.detail-top').waitFor();assert.equal(await page.locator('.detail-info strong').first().innerText(),'12:00');assert.ok((await page.locator('.detail-top').textContent()).includes('diumenge, 1 de novembre'));await page.locator('[data-action=close]').click();
await page.setViewportSize({width:360,height:780});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'360px league overflow');
await context.setOffline(true);await page.locator('.offline-banner').waitFor();assert.equal(await page.locator('.club-card').count(),8,'league remains available offline');await context.setOffline(false);await page.locator('.offline-banner').waitFor({state:'hidden'});
assert.deepEqual(errors,[]);console.log('PASS: seven PDF fixtures, home/away ground distinction, league cards, sources, maps, mobile and offline.');


await page.setViewportSize({width:1440,height:1000});role='admin';cardScenario=true;await page.locator('[data-action=refresh]').click();await page.locator('.sidebar [data-view=team]').click();await page.locator('[data-portrait]:visible').waitFor();assert.equal(await page.locator('.album-grid .football-card').count(),3);
await page.evaluate(()=>document.getElementById('toast').hidden=true);await page.screenshot({path:'test-output/cards-desktop.png',fullPage:true});
await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'card album mobile overflow');await page.screenshot({path:'test-output/cards-mobile.png',fullPage:true});
await page.locator('[data-action=player]').first().click();await page.locator('#modal [data-portrait]:visible').waitFor();await page.screenshot({path:'test-output/card-detail-mobile.png',fullPage:true});await page.locator('[data-action=close]').click();
await page.locator('[data-action=edit-player]').first().click();await page.locator('#player-name').fill('Cromo de prova');await page.locator('#player-position').selectOption('Defensa');await page.locator('#player-portrait').setInputFiles({name:'retrat.jpg',mimeType:'image/jpeg',buffer:Buffer.from(portraitB64,'base64')});await page.locator('#player-live-preview .player-portrait').waitFor();failCardSave=true;await page.locator('#player-form [type=submit]').click();await page.locator('#player-error:visible').waitFor();await page.locator('#player-form [type=submit]').click();await page.locator('.album-grid').waitFor();assert.equal(cardSaves.length,2);assert.equal(cardSaves[0].request_id,cardSaves[1].request_id);assert.equal(cardSaves[0].foto_id,cardSaves[1].foto_id);assert.ok(Buffer.from(cardSaves[1].photo_base64,'base64').length<=409600);assert.equal(cardSaves[1].posicio,'Defensa');
await page.locator('[data-action=add-player]').first().click();await page.locator('#player-name').fill('Nou cromo');await page.locator('#player-jersey').fill('9');await page.locator('#player-position').selectOption('Davanter');await page.locator('#player-form [type=submit]').click();await page.locator('.album-grid .football-card').nth(3).waitFor();assert.equal(await page.locator('.album-grid .football-card').count(),4);
await page.setViewportSize({width:360,height:780});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'360px card overflow');
await context.setOffline(true);await page.locator('.offline-banner').waitFor();assert.equal(await page.locator('[data-action=edit-player]').first().isDisabled(),true);assert.equal(await page.locator('[data-portrait]:visible').count(),0,'private portraits removed on disconnect');await context.setOffline(false);await page.locator('.offline-banner').waitFor({state:'hidden'});
role='familia';await refreshed();await page.locator('.album-grid').waitFor();assert.equal(await page.locator('[data-action=edit-player]').count(),0);assert.equal(await page.locator('[data-action=add-player]').count(),0);assert.deepEqual(errors,[]);console.log('PASS: player cards, portrait privacy, editor previews, idempotent retries, add player, mobile and family permissions.');

async function refreshed(){
 const response=page.waitForResponse(r=>r.url().startsWith('https://script.google.com/')&&JSON.parse(r.request().postData()||'{}').action==='bootstrap');
 await page.locator('[data-action=refresh]').click();await response;await page.locator('[data-action=refresh]:enabled').waitFor();
}
await page.locator('[data-portrait]:visible').waitFor();
const portraitCount=()=>apiCalls.filter(a=>a==='getPlayerPortraits').length;
const savedPortrait=await page.locator('[data-player-card=card1] [data-portrait]').getAttribute('src'),savedCount=portraitCount();
await refreshed();assert.equal(portraitCount(),savedCount,'unchanged authorized portraits are not downloaded again');assert.equal(await page.locator('[data-player-card=card1] [data-portrait]').getAttribute('src'),savedPortrait);
players[0].retrat_version='changed-portrait';await refreshed();await page.locator('[data-player-card=card1] [data-portrait]:visible').waitFor();assert.equal(portraitCount(),savedCount+1,'a changed portrait is fetched once');
omitPortrait=true;await refreshed();assert.equal(await page.locator('[data-player-card=card1]').count(),0,'a newly restricted player disappears');
omitPortrait=false;await refreshed();await page.locator('[data-player-card=card1] [data-portrait]:visible').waitFor();
failBootstrap=true;await refreshed();await page.locator('.offline-banner').waitFor();assert.equal(await page.locator('[data-portrait]:visible').count(),0,'failed revalidation removes portraits');failBootstrap=false;await refreshed();await page.locator('[data-player-card=card1] [data-portrait]:visible').waitFor();
assert.equal(await page.evaluate(()=>Object.values(localStorage).some(v=>v.includes('base64')||v.includes('blob:'))),false,'private images are never persisted');
console.log('PASS: combined login/consent, legacy backend, portrait reuse, updated/restricted portraits and failed revalidation.');

// Both batches must start while responses are deliberately held. Navigation invalidates both.
let releasePortraits;portraitGate=new Promise(resolve=>releasePortraits=resolve);
for(let i=0;i<7;i++)players.push({jugador_id:'parallel'+i,nom:'Prova paral·lela '+i,dorsal:i+20,posicio:'Defensa',te_retrat:true,retrat_version:'parallel-portrait'+i,actualitzat_at:''});
const parallelStart=portraitCount();await refreshed();
for(let i=0;i<100&&portraitCount()<parallelStart+2;i++)await new Promise(resolve=>setTimeout(resolve,20));
assert.equal(portraitCount(),parallelStart+2,'two portrait batches start before either response is released');
await page.locator('.mobile-nav [data-view=calendar]').click();releasePortraits();portraitGate=null;
await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,100)));assert.equal(await page.locator('[data-portrait]').count(),0,'late portrait responses do not reattach to another view');
await page.locator('.mobile-nav [data-view=team]').click();await page.locator('[data-player-card=parallel6] [data-portrait]:visible').waitFor();assert.equal(portraitCount(),parallelStart+4,'returning to the album fetches freshly authorized portraits');
console.log('PASS: bounded parallel portrait loading and cancelled navigation cannot restore private images.');

const swContext=await browser.newContext();const swPage=await swContext.newPage();await swPage.goto('http://127.0.0.1:8080/');await swPage.evaluate(()=>navigator.serviceWorker.ready);await swPage.reload();await swContext.setOffline(true);await swPage.reload();await swPage.locator('#login-phone').waitFor();const cacheUrls=await swPage.evaluate(async()=>{const cs=await caches.keys();return (await Promise.all(cs.map(async c=>(await(await caches.open(c)).keys()).map(r=>r.url)))).flat();});assert.ok(cacheUrls.length>=17);assert.ok(cacheUrls.some(u=>u.endsWith('/league.mjs')));assert.ok(cacheUrls.some(u=>u.endsWith('/media-batches.mjs')));assert.ok(cacheUrls.every(u=>u.startsWith('http://127.0.0.1:8080/')));console.log('PASS: installed shell reloads offline; no API or private images in Cache Storage.');server.kill();process.exit(0);
