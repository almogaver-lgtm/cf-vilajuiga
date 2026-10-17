import {cp,readFile,readdir,rm,mkdir,writeFile,access} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {resolve,dirname,join,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const LOCAL=join(ROOT,'.preview');
const CONFIG_FILE=join(LOCAL,'config.json');
const PRODUCTION_API=/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/;
export const FRONTEND_FILES=Object.freeze([
  'index.html','styles.css','player-cards.css','fonts.css','app.mjs','api-client.mjs','portrait-editor.mjs','domain.mjs','league.mjs','player-cards.mjs','media-batches.mjs','config.mjs','sw.js','manifest.webmanifest',
  'assets/OFL.txt','assets/app-icon.svg','assets/icon-192.png','assets/icon-512.png','assets/icon-maskable.png','assets/crest.jpg','assets/football.jpg','assets/barlow-condensed-700.ttf'
]);

function command(bin,args,{cwd=ROOT,allowFailure=false}={}){
  const result=spawnSync(bin,args,{cwd,encoding:'utf8',stdio:['inherit','pipe','pipe'],shell:false});
  if(result.status!==0&&!allowFailure)throw new Error(`${bin} ${args.join(' ')} ha fallat: ${(result.stderr||result.stdout||result.error?.message||'').trim()}`);
  return result;
}
const git=(...args)=>command('git',args).stdout.trim();
async function exists(path){try{await access(path);return true;}catch{return false;}}
function inside(base,target){const rel=relative(resolve(base),resolve(target));return rel!==''&&!rel.startsWith('..'+sep)&&rel!=='..';}
export function validatePreviewConfig(config,productionApi){
  if(!config||config.environment!=='preview')throw new Error('La configuració ha d’indicar environment=preview.');
  if(config.github_owner!=='almogaver-lgtm'||config.github_repo!=='cf-vilajuiga-proves')throw new Error('El destí estàtic no és el repositori de proves autoritzat.');
  if(!PRODUCTION_API.test(String(config.api_url||'')))throw new Error('Falta una URL /exec de proves vàlida.');
  if(config.api_url===productionApi)throw new Error('La publicació de proves rebutja explícitament el backend de producció.');
  for(const key of ['script_id','deployment_id','sheet_id','drive_root_folder_id'])if(typeof config[key]!=='string'||config[key].length<8)throw new Error(`Falta ${key} de l’entorn de proves.`);
  const keys=['script_id','deployment_id','sheet_id','drive_root_folder_id'],ids=keys.map(key=>config[key]),productionIds=config.production_ids||{};
  for(const key of keys)if(typeof productionIds[key]!=='string'||productionIds[key].length<8)throw new Error(`Falta production_ids.${key}; no es pot demostrar la separació de producció.`);
  if(new Set(ids).size!==ids.length)throw new Error('Els recursos de proves han de tenir identificadors diferents.');
  if(ids.some(id=>Object.values(productionIds).includes(id)))throw new Error('Un recurs de proves coincideix amb producció.');
  return config;
}
async function sourceProductionApi(){const source=await readFile(join(ROOT,'config.mjs'),'utf8'),match=source.match(/API_URL='([^']+)'/);if(!match)throw new Error('No s’ha pogut llegir l’API de producció.');return match[1];}
async function filesUnder(base,current=base){const entries=await readdir(current,{withFileTypes:true}),result=[];for(const entry of entries){const path=join(current,entry.name);if(entry.isDirectory())result.push(...await filesUnder(base,path));else result.push(relative(base,path).replaceAll('\\','/'));}return result.sort();}
export async function buildPreviewSite({source=ROOT,destination,config,commit,version='4.2.0'}){
  if(!inside(source,destination))throw new Error('El directori generat ha d’estar dins del projecte.');
  validatePreviewConfig(config,await sourceProductionApi());await rm(destination,{recursive:true,force:true});await mkdir(destination,{recursive:true});
  for(const name of FRONTEND_FILES){const from=join(source,name),to=join(destination,name);await mkdir(dirname(to),{recursive:true});await cp(from,to);}
  const previewVersion=`${version}-preview.${commit}`;
  let frontend=await readFile(join(destination,'config.mjs'),'utf8');frontend=frontend.replace(/API_URL='[^']+'/,`API_URL='${config.api_url}'`).replace(/APP_VERSION='[^']+'/,`APP_VERSION='${previewVersion}'`).replace(/ENVIRONMENT='[^']+'/,"ENVIRONMENT='preview'").replace(/BUILD_COMMIT='[^']*'/,`BUILD_COMMIT='${commit}'`);await writeFile(join(destination,'config.mjs'),frontend);
  let worker=await readFile(join(destination,'sw.js'),'utf8');worker=worker.replace(/const CACHE=PREFIX\+'[^']+';/,`const CACHE=PREFIX+'v${previewVersion}';`);await writeFile(join(destination,'sw.js'),worker);
  const manifest=JSON.parse(await readFile(join(destination,'manifest.webmanifest'),'utf8'));manifest.name='PROVES · '+manifest.name;manifest.short_name='Vilajuïga · proves';await writeFile(join(destination,'manifest.webmanifest'),JSON.stringify(manifest));
  await writeFile(join(destination,'.nojekyll'),'');await writeFile(join(destination,'preview.json'),JSON.stringify({environment:'preview',frontend_version:previewVersion,backend_version:'3.2.0',commit},null,2));
  const actual=await filesUnder(destination),expected=[...FRONTEND_FILES,'.nojekyll','preview.json'].sort();if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error('L’artefacte conté fitxers fora de la llista explícita.');return {version:previewVersion,files:actual};
}
async function loadConfig(){if(!await exists(CONFIG_FILE))throw new Error('Falta .preview/config.json. Executa npm run preview:setup.');return JSON.parse(await readFile(CONFIG_FILE,'utf8'));}
async function assertDevelop(){if(git('branch','--show-current')!=='develop')throw new Error('Les proves només es publiquen des de develop.');}
async function assertCleanCommit(){if(git('status','--porcelain'))throw new Error('Cal provar i commitejar exactament el codi abans de publicar-lo a proves.');return git('rev-parse','HEAD');}
function clasp(args,cwd){return process.platform==='win32'
  ?command(process.env.ComSpec||'cmd.exe',['/d','/s','/c','npx.cmd','--yes','@google/clasp',...args],{cwd})
  :command('npx',['--yes','@google/clasp',...args],{cwd});}
function requireProductionIds(config){for(const key of ['script_id','deployment_id','sheet_id','drive_root_folder_id'])if(typeof config.production_ids?.[key]!=='string'||config.production_ids[key].length<8)throw new Error(`Falta production_ids.${key}; s’atura abans de modificar Apps Script.`);}
export function assertPreviewScriptTarget(config,backend){
  requireProductionIds(config);let actual;try{actual=JSON.parse(readFileSync(join(backend,'.clasp.json'),'utf8')).scriptId;}catch{throw new Error('Falta una identitat .clasp.json de proves vàlida.');}
  if(typeof config.script_id!=='string'||actual!==config.script_id)throw new Error('El scriptId de clasp no coincideix amb la configuració de proves.');
  if(actual===config.production_ids.script_id)throw new Error('El projecte Apps Script seleccionat és el de producció.');return actual;
}
export function assertPreviewDeploymentListing(config,output){
  if(!config.deployment_id)return true;if(config.deployment_id===config.production_ids?.deployment_id)throw new Error('El desplegament seleccionat és el de producció.');
  if(!String(output).split(/\s+/).includes(config.deployment_id))throw new Error('El desplegament configurat no pertany al projecte Apps Script de proves.');return true;
}
export function deploymentCommand(deploymentId,version,description){return deploymentId
  ?['redeploy',deploymentId,'--versionNumber',String(version),'--description',description]
  :['deploy','--versionNumber',String(version),'--description',description];}
export function deploymentIds(output){return [...new Set(String(output).match(/AKfy[A-Za-z0-9_-]+/g)||[])];}
function assertPreviewDeployment(config,backend){
  assertPreviewScriptTarget(config,backend);if(!config.deployment_id)return;
  assertPreviewDeploymentListing(config,clasp(['deployments'],backend).stdout);
}
function previewClasp(config,args,backend){assertPreviewDeployment(config,backend);return clasp(args,backend);}
async function syncBackendDir(){const dir=join(LOCAL,'backend');await mkdir(dir,{recursive:true});await rm(join(dir,'PreviewSetup.gs'),{force:true});await cp(join(ROOT,'backend','Code.gs'),join(dir,'Code.gs'));await cp(join(ROOT,'backend','appsscript.json'),join(dir,'appsscript.json'));return dir;}
async function installPreviewOverTemporaryEndpoint(backend,config,phone){
  const secret=randomBytes(32).toString('base64url'),codeFile=join(backend,'Code.gs'),source=await readFile(codeFile,'utf8');
  await writeFile(codeFile,source.replace('function doPost(e) {','function doPost(e) {\n  const previewSetup=previewSetupRequest_(e);if(previewSetup)return previewSetup;'));
  await writeFile(join(backend,'PreviewSetup.gs'),`const PREVIEW_SETUP_SECRET='${secret}';\nfunction previewSetupRequest_(e){\n  let body;try{body=JSON.parse(e&&e.postData&&e.postData.contents||'{}');}catch(_){return null;}\n  if(body.action!=='_previewSetup')return null;\n  try{need_(constantEqual_(String(body.setup_secret||''),PREVIEW_SETUP_SECRET),'FORBIDDEN','Configuració no autoritzada.');return json_({ok:true,data:installPreviewBackend(body.telefon,body.production_ids)});}\n  catch(error){return json_({ok:false,error:{code:error.apiCode||'INTERNAL_ERROR',message:error.apiCode?error.message:'Error intern.'}});}\n}\n`);
  previewClasp(config,['push','--force'],backend);const temporaryVersion=previewClasp(config,['version','Inicialització privada de proves'],backend).stdout.match(/\d+/)?.[0];if(!temporaryVersion)throw new Error('No s’ha pogut crear la versió temporal de configuració.');
  if(!config.deployment_id){const existing=deploymentIds(previewClasp(config,['deployments'],backend).stdout);if(existing.length>1)throw new Error('Hi ha més d’un desplegament al projecte de proves; no se’n seleccionarà cap automàticament.');if(existing.length===1)config.deployment_id=existing[0];}
  if(config.deployment_id)previewClasp(config,deploymentCommand(config.deployment_id,temporaryVersion,'Inicialització privada de proves'),backend);else{const result=previewClasp(config,deploymentCommand('',temporaryVersion,'Inicialització privada de proves'),backend);config.deployment_id=deploymentIds(result.stdout+' '+result.stderr)[0];if(!config.deployment_id)throw new Error('No s’ha pogut obtenir l’identificador del desplegament Apps Script.');assertPreviewDeployment(config,backend);}
  config.api_url=`https://script.google.com/macros/s/${config.deployment_id}/exec`;let data,lastError;
  for(let i=0;i<12;i++){try{const response=await fetch(config.api_url,{method:'POST',redirect:'follow',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'_previewSetup',setup_secret:secret,telefon:phone,production_ids:config.production_ids})}),result=await response.json();if(result.ok){data=result.data;break;}lastError=new Error(result.error?.message||'Inicialització rebutjada.');}catch(error){lastError=error;}await new Promise(resolve=>setTimeout(resolve,5000));}
  if(!data?.sheet_id)throw lastError||new Error('No s’han pogut crear els recursos privats de proves.');
  await syncBackendDir();previewClasp(config,['push','--force'],backend);const cleanVersion=previewClasp(config,['version','Backend de proves sense inicialitzador'],backend).stdout.match(/\d+/)?.[0];if(!cleanVersion)throw new Error('No s’ha pogut crear la versió neta del backend.');previewClasp(config,deploymentCommand(config.deployment_id,cleanVersion,'Backend de proves 3.2.0'),backend);return data;
}
async function setup(){
  await assertDevelop();await mkdir(LOCAL,{recursive:true});const phone=process.env.CFV_PREVIEW_PHONE;if(!phone)throw new Error('Falta indicar el telèfon de David només per a aquesta ordre amb CFV_PREVIEW_PHONE.');const productionApi=await sourceProductionApi(),productionDeployment=productionApi.match(/\/s\/([^/]+)\/exec$/)?.[1];let config=await exists(CONFIG_FILE)?JSON.parse(await readFile(CONFIG_FILE,'utf8')):{environment:'preview',github_owner:'almogaver-lgtm',github_repo:'cf-vilajuiga-proves',production_api_url:productionApi,production_ids:{script_id:process.env.CFV_PRODUCTION_SCRIPT_ID||'',deployment_id:productionDeployment||'',sheet_id:process.env.CFV_PRODUCTION_SHEET_ID||'',drive_root_folder_id:process.env.CFV_PRODUCTION_DRIVE_ROOT_ID||''}};requireProductionIds(config);
  const gh=command('gh',['auth','status'],{allowFailure:true});if(gh.status!==0)throw new Error('Cal renovar una sola vegada l’autenticació de GitHub CLI amb `gh auth login`.');
  if(command('gh',['repo','view',`${config.github_owner}/${config.github_repo}`],{allowFailure:true}).status!==0)command('gh',['repo','create',`${config.github_owner}/${config.github_repo}`,'--public','--description','Desplegament sintètic de proves del CF Vilajuïga','--disable-issues']);
  let backend=join(LOCAL,'backend');await mkdir(backend,{recursive:true});const hasClasp=await exists(join(backend,'.clasp.json'));if(!hasClasp){if(config.script_id)throw new Error('La configuració indica un projecte però falta .clasp.json; no se’n crearà ni adoptarà cap altre.');await rm(backend,{recursive:true,force:true});await mkdir(backend,{recursive:true});clasp(['create','--title','CF Vilajuïga · PROVES','--type','standalone'],backend);config.script_id=JSON.parse(await readFile(join(backend,'.clasp.json'),'utf8')).scriptId;}assertPreviewScriptTarget(config,backend);await writeFile(CONFIG_FILE,JSON.stringify(config,null,2));backend=await syncBackendDir();assertPreviewScriptTarget(config,backend);const data=await installPreviewOverTemporaryEndpoint(backend,config,phone);Object.assign(config,{sheet_id:data.sheet_id,drive_root_folder_id:data.drive_root_folder_id});validatePreviewConfig(config,productionApi);await writeFile(CONFIG_FILE,JSON.stringify(config,null,2));console.log(JSON.stringify({ok:true,config:CONFIG_FILE,invite_code:data.codi,expires_at:data.caduca_at},null,2));
}
async function runValidation(){for(const args of [['test'],['run','test:backend'],['run','test:performance'],['run','test:browser']])command('npm',args);command('git',['diff','--check']);}
async function publish(){
  await assertDevelop();const commit=await assertCleanCommit(),config=validatePreviewConfig(await loadConfig(),await sourceProductionApi());await runValidation();const backend=await syncBackendDir();previewClasp(config,['push','--force'],backend);const version=previewClasp(config,['version',`Preview ${commit.slice(0,12)}`],backend).stdout.match(/\d+/)?.[0];if(!version)throw new Error('No s’ha pogut crear la versió del backend de proves.');previewClasp(config,deploymentCommand(config.deployment_id,version,`Preview ${commit.slice(0,12)}`),backend);
  const health=await fetch(config.api_url+'?action=health').then(response=>response.json());if(!health.ok||health.data?.environment!=='preview'||health.data?.version!=='3.2.0'||health.data?.configured!==true)throw new Error('El backend desplegat no és el backend de proves 3.2.0 configurat.');
  const site=join(LOCAL,'site'),built=await buildPreviewSite({destination:site,config,commit:commit.slice(0,12)}),repo=join(LOCAL,'site-repository');if(!await exists(join(repo,'.git')))command('git',['clone',`https://github.com/${config.github_owner}/${config.github_repo}.git`,repo]);else command('git',['pull','--ff-only','origin','main'],{cwd:repo});for(const name of await readdir(repo))if(name!=='.git')await rm(join(repo,name),{recursive:true,force:true});for(const name of await readdir(site))await cp(join(site,name),join(repo,name),{recursive:true});command('git',['add','--all'],{cwd:repo});if(command('git',['diff','--cached','--quiet'],{cwd:repo,allowFailure:true}).status!==0){command('git',['commit','-m',`Publish preview ${built.version} (${commit.slice(0,12)})`],{cwd:repo});command('git',['push','origin','main'],{cwd:repo});}
  if(command('gh',['api',`repos/${config.github_owner}/${config.github_repo}/pages`],{allowFailure:true}).status!==0)command('gh',['api','--method','POST',`repos/${config.github_owner}/${config.github_repo}/pages`,'-f','source[branch]=main','-f','source[path]=/']);const url=`https://${config.github_owner}.github.io/${config.github_repo}/`;let verified=false;for(let i=0;i<12;i++){try{const marker=await fetch(url+'preview.json?commit='+commit).then(r=>r.ok?r.json():null);if(marker?.commit===commit){verified=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,5000));}if(!verified)throw new Error('GitHub Pages encara no serveix el commit publicat.');config.last_published={commit,frontend_version:built.version,backend_version:'3.2.0',url,published_at:new Date().toISOString()};await writeFile(CONFIG_FILE,JSON.stringify(config,null,2));console.log(JSON.stringify(config.last_published,null,2));
}
async function releasePrepare(){const config=validatePreviewConfig(await loadConfig(),await sourceProductionApi()),commit=await assertCleanCommit();if(config.last_published?.commit!==commit)throw new Error('El commit actual no coincideix amb el commit verificat a proves.');await writeFile(join(LOCAL,'release.json'),JSON.stringify({commit,frontend_version:'4.2.0',backend_version:'3.2.0',preview_url:config.last_published.url,production_published:false},null,2));console.log('Promoció preparada localment; producció no s’ha modificat.');}

if(process.argv[1]===fileURLToPath(import.meta.url)){const action=process.argv[2];try{if(action==='setup')await setup();else if(action==='publish')await publish();else if(action==='release')await releasePrepare();else throw new Error('Acció desconeguda.');}catch(error){console.error(error.message);process.exitCode=1;}}
