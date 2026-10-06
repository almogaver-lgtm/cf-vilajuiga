/** CF VILAJUÏGA — FASE 3, Apps Script V8. No secrets in this source. */
const APP = Object.freeze({version:'2.1.0', portraitLimit:409600, portraitDimension:1200, usersTTL:180, bodyLimit:2400000,
  thumbLimit:122880, maxPhotosPerBatch:6, privacyText:
  "Aquesta aplicació és d'ús privat per a les famílies de l'equip i pot contenir fotografies de menors. En accedir-hi et compromets a no publicar ni redistribuir les fotografies fora del grup sense l'autorització corresponent.",
  downloadNotice:"Ús exclusivament privat i familiar. No publiquis aquesta fotografia a xarxes socials ni la comparteixis fora del grup sense autorització."});
const SCHEMA = Object.freeze({
  '01_PARTITS':['partit_id','jornada','data','hora','local','visitant','camp_nom','camp_adreca','camp_lat','camp_lng','estat','gols_local','gols_visitant','cronica','visible','actualitzat_at','actualitzat_per'],
  '02_CONFIG':['clau','valor','tipus','descripcio'],
  '03_USUARIS':['telefon','nom','rol','codi','actiu','privacitat_version','privacitat_at','creat_at','notes'],
  '04_FOTOS':['foto_id','partit_id','drive_file_id','thumb_file_id','mime_type','bytes','amplada','alcada','jugadors_ids','peu','no_mostrar','motiu_ocultacio','pujat_at','pujat_per_tel','pujat_per_nom','eliminat','eliminat_at','eliminat_per'],
  '05_JUGADORS':['jugador_id','nom','dorsal','no_mostrar','actiu','posicio','foto_id','foto_drive_file_id','actualitzat_at','ultima_peticio','ultima_peticio_hash'],
  '06_REGISTRE':['log_id','timestamp','data_local','accio','telefon','nom','rol','sessio_id','partit_id','objecte_id','valor_anterior','valor_nou','user_agent']
});
const DEFAULTS = [
  ['equip_nom','CF VILAJUÏGA','text','Equip de referència'],['temporada','2026/27','text','Temporada'],
  ['timezone','Europe/Madrid','text','Zona horària'],['app_nom','CF Vilajuïga','text','Nom'],
  ['color_primari','#14532d','text','Color'],['login_mode','telefon','text','telefon o telefon+codi'],
  ['session_days','30','number','Durada de sessió'],['privacy_version','1','text','Versió del compromís'],
  ['cronica_max_chars','1500','number','Longitud màxima'],['upload_max_bytes','1572864','number','Màxim JPEG'],
  ['image_max_dimension','1600','number','Costat màxim'],['thumbnail_max_dimension','480','number','Costat màxim miniatura']
];
function fail_(code,message) { const e=new Error(message); e.apiCode=code; throw e; }
function need_(condition,code,message) { if(!condition) fail_(code,message); }
function now_() { return new Date().toISOString(); }
function props_() { return PropertiesService.getScriptProperties(); }
function property_(key) { const v=props_().getProperty(key); need_(v,'NOT_CONFIGURED','Falta configurar el backend.'); return v; }
function json_(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }
function doGet(e) {
  const a=e && e.parameter && e.parameter.action || 'health';
  if(a==='version') return json_({ok:true,data:{version:APP.version}});
  if(a==='health') return json_({ok:true,data:{service:'cf-vilajuiga',version:APP.version,
    configured:!!(props_().getProperty('SHEET_ID') && props_().getProperty('DRIVE_ROOT_FOLDER_ID') && props_().getProperty('SESSION_SECRET'))}});
  return json_({ok:false,error:{code:'UNKNOWN_ACTION',message:'Acció no disponible.'}});
}
function doPost(e) {
  try {
    need_(e && e.postData && typeof e.postData.contents==='string','BAD_REQUEST','Cal un cos JSON.');
    need_(e.postData.contents.length<=APP.bodyLimit,'PAYLOAD_TOO_LARGE','Petició massa gran.');
    let p; try { p=JSON.parse(e.postData.contents); } catch(_) { fail_('BAD_JSON','JSON no vàlid.'); }
    need_(p && typeof p==='object' && !Array.isArray(p),'BAD_REQUEST','Petició no vàlida.');
    return json_({ok:true,data:dispatch_(p)});
  } catch(e) {
    // Do not log request bodies, tokens, phone numbers, image data or Google error details.
    return json_({ok:false,error:{code:e.apiCode || 'INTERNAL_ERROR',message:e.apiCode ? e.message : 'Error intern. Torna-ho a provar.'}});
  }
}
function dispatch_(p) {
  const reads=['bootstrap','listPhotos','getPhoto','getThumbnails','getPlayerPortraits'];
  const writes=['acceptPrivacy','logout','updateResult','updateChronicle','uploadPhoto','downloadPhoto','hidePhoto','showPhoto','deletePhoto','savePlayer'];
  if(p.action==='login') return locked_(()=>login_(p));
  need_(reads.includes(p.action)||writes.includes(p.action),'UNKNOWN_ACTION','Acció no disponible.');
  if(writes.includes(p.action)) return locked_(()=>{
    const c=config_(), a=authenticate_(p.token,c,true);
    if(p.action!=='acceptPrivacy' && p.action!=='logout') privacy_(a,c);
    switch(p.action) {
      case 'acceptPrivacy': return acceptPrivacy_(p,a,c);
      case 'logout': return logout_(p,a,c);
      case 'updateResult': return updateMatch_(p,a,c,false);
      case 'updateChronicle': return updateMatch_(p,a,c,true);
      case 'uploadPhoto': return uploadPhoto_(p,a,c);
      case 'savePlayer': return savePlayer_(p,a,c);
      case 'downloadPhoto': return media_(p,a,c,false,true);
      case 'hidePhoto': case 'showPhoto': return visibility_(p,a,c);
      case 'deletePhoto': return deletePhoto_(p,a,c);
    }
  });
  const c=config_(), a=authenticate_(p.token,c,p.action!=='bootstrap');
  privacy_(a,c);
  if(p.action==='bootstrap') return bootstrap_(p,a,c);
  if(p.action==='listPhotos') return listPhotos_(p,a,c);
  if(p.action==='getPhoto') return media_(p,a,c,false,false);
  if(p.action==='getPlayerPortraits') return playerPortraits_(p,a,c);
  return thumbnails_(p,a,c);
}
function locked_(fn) {
  const lock=LockService.getScriptLock();
  need_(lock.tryLock(10000),'BUSY','El servidor està ocupat. Torna-ho a provar.');
  try { return fn(); } finally { try { SpreadsheetApp.flush(); } finally { lock.releaseLock(); } }
}
function sheet_(name) {
  const s=SpreadsheetApp.openById(property_('SHEET_ID')).getSheetByName(name);
  need_(s,'SCHEMA_ERROR','Falta una pestanya.');
  const h=s.getRange(1,1,1,SCHEMA[name].length).getValues()[0];
  need_(JSON.stringify(h)===JSON.stringify(SCHEMA[name]),'SCHEMA_ERROR','Capçaleres incorrectes a '+name+'.');
  return s;
}
function rows_(name) {
  const s=sheet_(name), n=s.getLastRow()-1;
  if(n<=0) return [];
  return s.getRange(2,1,n,SCHEMA[name].length).getValues().map((r,i)=>{
    const o={_row:i+2}; SCHEMA[name].forEach((h,j)=>o[h]=r[j]); return o;
  }).filter(o=>String(o[SCHEMA[name][0]]).trim()!=='');
}
function unique_(rows,key,value) {
  const hits=rows.filter(r=>String(r[key])===String(value));
  need_(hits.length<=1,'SCHEMA_ERROR','Identificador duplicat.');
  return hits[0] || null;
}
function cell_(v) {
  if(v===null || v===undefined) return '';
  if(typeof v==='string' && /^[=+\-@']/.test(v)) return "'"+v; // Formula injection protection.
  return v;
}
function put_(name,obj,row) {
  const s=sheet_(name), n=row || s.getLastRow()+1;
  s.getRange(n,1,1,SCHEMA[name].length).setValues([SCHEMA[name].map(k=>cell_(obj[k]))]);
  SpreadsheetApp.flush(); return n;
}
function bool_(v) { return v===true || v==='TRUE'; }
function safeFalse_(v) { return v===false || v==='FALSE'; }
function text_(v,max,field) { need_(typeof v==='string' && v.length<=max,'VALIDATION','Camp no vàlid: '+field+'.'); return v; }
function id_(v) { need_(typeof v==='string' && /^[A-Za-z0-9_-]{1,64}$/.test(v),'VALIDATION','ID no vàlid.'); return v; }
function uuid_(v) { need_(typeof v==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v),'VALIDATION','Cal un UUID vàlid.'); return v.toLowerCase(); }
function phone_(v) {
  need_(typeof v==='string' && v.length<=40,'INVALID_LOGIN','Dades d’accés incorrectes.');
  let n=v.replace(/[\s().-]/g,''); if(n.startsWith('00')) n='+'+n.slice(2);
  if(/^\d{9}$/.test(n)) n='+34'+n;
  need_(/^\+[1-9]\d{7,14}$/.test(n),'INVALID_LOGIN','Dades d’accés incorrectes.'); return n;
}
function config_() {
  const c={}; rows_('02_CONFIG').forEach(r=>{
    need_(!Object.prototype.hasOwnProperty.call(c,r.clau),'SCHEMA_ERROR','Configuració duplicada.'); c[r.clau]=String(r.valor);
  });
  DEFAULTS.forEach(r=>need_(Object.prototype.hasOwnProperty.call(c,r[0]),'SCHEMA_ERROR','Falta configuració: '+r[0]));
  need_(['telefon','telefon+codi'].includes(c.login_mode),'SCHEMA_ERROR','Mode de login desconegut.');
  need_(c.timezone==='Europe/Madrid','SCHEMA_ERROR','Zona horària no vàlida.');
  [['session_days',1,30],['cronica_max_chars',1,1500],['upload_max_bytes',1000,1572864],
    ['image_max_dimension',1,1600],['thumbnail_max_dimension',1,480]].forEach(([k,min,max])=>{
      c[k]=Number(c[k]); need_(Number.isInteger(c[k])&&c[k]>=min&&c[k]<=max,'SCHEMA_ERROR','Configuració fora de límits: '+k);
    });
  need_(c.privacy_version.length>0 && c.privacy_version.length<=32,'SCHEMA_ERROR','Versió de privacitat no vàlida.');
  return c;
}
function users_(fresh) {
  const cache=CacheService.getScriptCache(), key='users-v2';
  if(!fresh) { const v=cache.get(key); if(v) return JSON.parse(v); }
  const rows=rows_('03_USUARIS'), seen={};
  rows.forEach(r=>{ const n=phone_(String(r.telefon)); need_(!seen[n],'SCHEMA_ERROR','Telèfon duplicat.'); seen[n]=true; r.telefon=n;
    need_(['familia','editor','admin'].includes(r.rol),'SCHEMA_ERROR','Rol desconegut.'); });
  const serialized=JSON.stringify(rows); if(serialized.length<80000) cache.put(key,serialized,APP.usersTTL);
  return rows;
}
function invalidateUsers_() { CacheService.getScriptCache().remove('users-v2'); }
function hmac_(s) { return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(s,property_('SESSION_SECRET'),Utilities.Charset.UTF_8)).replace(/=+$/,''); }
function constantEqual_(a,b) { if(typeof a!=='string'||typeof b!=='string') return false; let x=a.length^b.length; for(let i=0;i<Math.max(a.length,b.length);i++) x|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0); return x===0; }
function binding_(u,c) { return hmac_('binding|'+JSON.stringify([u.telefon,u.creat_at,u.codi,c.login_mode])); }
function userPublic_(u,c) { return {nom:String(u.nom),rol:u.rol,privacyAccepted:String(u.privacitat_version)===c.privacy_version,privacyVersion:c.privacy_version}; }
function rateLimit_(n) {
  // Cache is best-effort, not a durable brute-force defence. No source IP in doPost.
  const cache=CacheService.getScriptCache(), k='login-'+hmac_(n), g='login-global';
  const t=Date.now();
  [[k,5,900000],[g,100,60000]].forEach(([key,max,window])=>{
    let entry=cache.get(key); entry=entry ? JSON.parse(entry) : {at:t,n:0};
    if(t-entry.at>=window) entry={at:t,n:0};
    need_(entry.n<max,'RATE_LIMIT','Massa intents. Espera abans de tornar-ho a provar.');
    entry.n++; cache.put(key,JSON.stringify(entry),Math.ceil(window/1000));
  });
}
function login_(p) {
  const c=config_(), n=phone_(p.telefon); rateLimit_(n);
  const u=unique_(users_(true),'telefon',n);
  need_(u && bool_(u.actiu),'INVALID_LOGIN','Dades d’accés incorrectes.');
  if(c.login_mode==='telefon+codi') {
    need_(typeof p.codi==='string' && /^\d{6,12}$/.test(p.codi) && String(u.codi).startsWith('hmac-v1:') &&
      constantEqual_(u.codi,'hmac-v1:'+hmac_('code|'+n+'|'+p.codi)),'INVALID_LOGIN','Dades d’accés incorrectes.');
  }
  const issuedAt=Date.now(), payload={telefon:n,issuedAt,expiresAt:issuedAt+c.session_days*86400000,sessio_id:Utilities.getUuid(),binding:binding_(u,c)};
  const body=Utilities.base64EncodeWebSafe(JSON.stringify(payload),Utilities.Charset.UTF_8).replace(/=+$/,'');
  const a={user:u,session:payload};
  const today=Utilities.formatDate(new Date(),c.timezone,'yyyy-MM-dd');
  if(!rows_('06_REGISTRE').some(r=>r.accio==='LOGIN' && r.telefon===n && r.data_local===today)) audit_('LOGIN',a,c,p,'','',null,null);
  return {token:body+'.'+hmac_(body),expiresAt:new Date(payload.expiresAt).toISOString(),user:userPublic_(u,c),
    privacy:{version:c.privacy_version,text:APP.privacyText},testMode:c.login_mode==='telefon'};
}
function authenticate_(token,c,fresh) {
  need_(typeof token==='string' && token.length<2048,'UNAUTHORIZED','Cal iniciar sessió.');
  const bits=token.split('.'); need_(bits.length===2 && /^[A-Za-z0-9_-]+$/.test(bits[0]) && constantEqual_(hmac_(bits[0]),bits[1]),'UNAUTHORIZED','Sessió no vàlida.');
  let s; try { s=JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(bits[0])).getDataAsString()); } catch(_) { fail_('UNAUTHORIZED','Sessió no vàlida.'); }
  need_(s && Number.isSafeInteger(s.issuedAt)&&Number.isSafeInteger(s.expiresAt)&&s.issuedAt<=Date.now()+60000&&
    s.expiresAt>Date.now()&&s.expiresAt>s.issuedAt&&s.expiresAt-s.issuedAt<=30*86400000&&typeof s.sessio_id==='string','UNAUTHORIZED','Sessió caducada o no vàlida.');
  need_(!props_().getProperty('revoked:'+s.sessio_id),'UNAUTHORIZED','Sessió tancada.');
  const u=unique_(users_(fresh),'telefon',s.telefon);
  need_(u && bool_(u.actiu) && constantEqual_(s.binding,binding_(u,c)),'UNAUTHORIZED','Accés revocat.');
  return {user:u,session:s};
}
function privacy_(a,c) { need_(String(a.user.privacitat_version)===c.privacy_version,'PRIVACY_REQUIRED','Cal acceptar el compromís de privacitat.'); }
function role_(a,roles) { need_(roles.includes(a.user.rol),'FORBIDDEN','No tens permís per fer aquesta acció.'); }
function audit_(action,a,c,p,match,object,before,after,logId) {
  put_('06_REGISTRE',{log_id:logId ? uuid_(logId) : Utilities.getUuid(),timestamp:now_(),data_local:Utilities.formatDate(new Date(),c.timezone,'yyyy-MM-dd'),
    accio:action,telefon:a.user.telefon,nom:a.user.nom,rol:a.user.rol,sessio_id:a.session.sessio_id,
    partit_id:match||'',objecte_id:object||'',valor_anterior:before===null?'':JSON.stringify(before),valor_nou:after===null?'':JSON.stringify(after),
    user_agent:typeof p.user_agent==='string'?p.user_agent.slice(0,300):''});
}
function requestLog_(p,a,action) {
  const id=uuid_(p.request_id), log=unique_(rows_('06_REGISTRE'),'log_id',id);
  if(log) need_(log.telefon===a.user.telefon && log.accio===action && log.sessio_id===a.session.sessio_id,'CONFLICT','request_id ja utilitzat.');
  return log;
}
function acceptPrivacy_(p,a,c) {
  need_(p.accepted===true && String(p.version)===c.privacy_version,'VALIDATION','Cal acceptar la versió actual.');
  const old=requestLog_(p,a,'ACCEPT_PRIVACY');
  if(old) return {accepted:true,version:c.privacy_version};
  const u=a.user, before={privacitat_version:u.privacitat_version};
  u.privacitat_version=c.privacy_version; u.privacitat_at=now_();
  put_('03_USUARIS',u,u._row); invalidateUsers_();
  audit_('ACCEPT_PRIVACY',a,c,p,'','privacy-v'+c.privacy_version,before,{version:c.privacy_version},p.request_id);
  return {accepted:true,version:c.privacy_version};
}
function logout_(p,a,c) {
  cleanupRevocations_();
  const old=requestLog_(p,a,'LOGOUT');
  if(!old) audit_('LOGOUT',a,c,p,'',a.session.sessio_id,null,null,p.request_id);
  need_(Object.keys(props_().getProperties()).filter(k=>k.startsWith('revoked:')).length<1500,'BUSY','Massa sessions tancades. Contacta amb l’administrador.');
  props_().setProperty('revoked:'+a.session.sessio_id,String(a.session.expiresAt));
  return {loggedOut:true};
}
function match_(id,admin) {
  const m=unique_(rows_('01_PARTITS'),'partit_id',id_(id));
  need_(m && (admin || bool_(m.visible)),'NOT_FOUND','Partit no disponible.'); return m;
}
function matchPublic_(m) {
  const o={}; SCHEMA['01_PARTITS'].filter(k=>k!=='actualitzat_per').forEach(k=>o[k]=m[k]); return o;
}
function statistics_(matches,c) {
  const s={PJ:0,V:0,E:0,D:0,GF:0,GC:0,DG:0};
  matches.forEach(m=>{
    if(m.estat!=='jugat' || !Number.isInteger(m.gols_local) || !Number.isInteger(m.gols_visitant) || m.gols_local<0 || m.gols_visitant<0) return;
    const home=m.local===c.equip_nom, away=m.visitant===c.equip_nom;
    if(home===away) return;
    const gf=home?m.gols_local:m.gols_visitant,gc=home?m.gols_visitant:m.gols_local;
    s.PJ++;s.GF+=gf;s.GC+=gc;if(gf>gc)s.V++;else if(gf===gc)s.E++;else s.D++;
  }); s.DG=s.GF-s.GC; return s;
}
function bootstrap_(p,a,c) {
  const matches=rows_('01_PARTITS').filter(m=>bool_(m.visible));
  return {version:APP.version,features:{player_cards:true},user:userPublic_(a.user,c),config:{equip_nom:c.equip_nom,temporada:c.temporada,timezone:c.timezone,
    app_nom:c.app_nom,color_primari:c.color_primari,privacy_version:c.privacy_version,cronica_max_chars:c.cronica_max_chars,
    upload_max_bytes:c.upload_max_bytes,image_max_dimension:c.image_max_dimension,thumbnail_max_dimension:c.thumbnail_max_dimension,
    thumbnail_max_bytes:APP.thumbLimit,portrait_max_bytes:APP.portraitLimit,portrait_max_dimension:APP.portraitDimension,login_mode:c.login_mode},partits:matches.map(matchPublic_),estadistiques:statistics_(matches,c),
    jugadors:rows_('05_JUGADORS').filter(j=>bool_(j.actiu)&&(a.user.rol==='admin'||safeFalse_(j.no_mostrar)))
      .map(j=>playerPublic_(j,a.user.rol==='admin')),serverTime:now_()};
}
function upgradePlayerColumns_(s) {
  const old=['jugador_id','nom','dorsal','no_mostrar','actiu'], full=SCHEMA['05_JUGADORS'];
  const headers=s.getRange(1,1,1,full.length).getValues()[0];
  need_(JSON.stringify(headers.slice(0,5))===JSON.stringify(old),'SCHEMA_ERROR','Capçaleres de jugadors incorrectes.');
  for(let i=5;i<full.length;i++)need_(headers[i]===''||headers[i]===full[i],'SCHEMA_ERROR','Una columna nova de jugadors ja està ocupada.');
  s.getRange(1,6,1,full.length-5).setValues([full.slice(5)]).setBackground('#14532d').setFontColor('#ffffff').setFontWeight('bold');
}
function playerPublic_(j,admin) {
  return {jugador_id:j.jugador_id,nom:j.nom,dorsal:j.dorsal,posicio:j.posicio||'',te_retrat:!!(j.foto_id&&j.foto_drive_file_id),
    retrat_version:j.foto_id||'',actualitzat_at:j.actualitzat_at||'',...(admin?{no_mostrar:!safeFalse_(j.no_mostrar)}:{})};
}
function playerFolder_(create) {
  const root=DriveApp.getFolderById(property_('DRIVE_ROOT_FOLDER_ID'));assertPrivate_(root);
  return singleFolder_(root,'jugadors',create);
}
function playerPortraits_(p,a,c) {
  need_(Array.isArray(p.jugador_ids)&&p.jugador_ids.length<=6&&new Set(p.jugador_ids).size===p.jugador_ids.length,'VALIDATION','Màxim sis retrats per petició.');
  const players=rows_('05_JUGADORS');
  return {items:p.jugador_ids.map(id=>{
    try {
      const j=unique_(players,'jugador_id',id_(id));
      need_(j&&bool_(j.actiu)&&(safeFalse_(j.no_mostrar)||a.user.rol==='admin'&&p.include_hidden===true)&&j.foto_id&&j.foto_drive_file_id,'NOT_FOUND','Retrat no disponible.');
      const file=DriveApp.getFileById(j.foto_drive_file_id),folder=playerFolder_(false);assertPrivate_(file);
      need_(folder&&!file.isTrashed()&&file.getMimeType()==='image/jpeg'&&file.getName()===j.jugador_id+'_'+uuid_(j.foto_id)+'.jpg','NOT_FOUND','Retrat no disponible.');
      const parents=file.getParents();let found=false;while(parents.hasNext())if(parents.next().getId()===folder.getId())found=true;
      need_(found&&file.getSize()<=APP.portraitLimit,'NOT_FOUND','Retrat no disponible.');
      const base64=Utilities.base64Encode(file.getBlob().getBytes());jpeg_(base64,APP.portraitLimit,APP.portraitDimension);
      return {ok:true,jugador_id:id,retrat_version:j.foto_id,base64};
    }catch(e){return {ok:false,jugador_id:id,error:{code:e.apiCode||'INTERNAL_ERROR',message:'Retrat no disponible.'}};}
  })};
}
function savePlayer_(p,a,c) {
  role_(a,['admin']);const id=id_(p.jugador_id),request=uuid_(p.request_id);
  const nom=text_(p.nom,60,'nom'),position=p.posicio||'';
  need_(nom.trim().length>0&&['','Porter','Defensa','Migcampista','Davanter'].includes(position),'VALIDATION','Nom o posició incorrectes.');
  const dorsal=p.dorsal===''||p.dorsal===null?'':p.dorsal;
  need_(dorsal===''||Number.isInteger(dorsal)&&dorsal>=0&&dorsal<=99,'VALIDATION','El dorsal ha de ser de 0 a 99.');
  need_(typeof p.expected_updated_at==='string','VALIDATION','Falta la versió del jugador.');
  const image=p.photo_base64?jpeg_(p.photo_base64,APP.portraitLimit,APP.portraitDimension):null;
  const photoId=image?uuid_(p.foto_id):'';
  const hash=hmac_(JSON.stringify([id,nom,dorsal,position,p.expected_updated_at,photoId,image?hmac_(p.photo_base64):'']));
  const old=requestLog_(p,a,'SAVE_PLAYER');let j=unique_(rows_('05_JUGADORS'),'jugador_id',id);
  if(old||j&&j.ultima_peticio===request) {
    need_(j&&j.ultima_peticio===request&&j.ultima_peticio_hash===hash&&(!old||old.objecte_id===id),'CONFLICT','La petició ja s’ha utilitzat o el jugador ha canviat.');
    if(!old)audit_('SAVE_PLAYER',a,c,p,'',id,null,{hash,nom:j.nom,posicio:j.posicio},request);
    return {jugador:playerPublic_(j,true),replayed:true};
  }
  need_(!j?p.expected_updated_at==='':String(j.actualitzat_at||'')===p.expected_updated_at,'CONFLICT','El jugador ha canviat. Actualitza abans d’editar-lo.');
  const after={...(j||{jugador_id:id,no_mostrar:false,actiu:true}),nom,dorsal,posicio:position,actualitzat_at:now_(),ultima_peticio:request,ultima_peticio_hash:hash};
  let created=null,saved=false;
  try {
    if(image){
      const folder=playerFolder_(true),name=id+'_'+photoId+'.jpg',it=folder.getFilesByName(name);
      need_(!it.hasNext(),'CONFLICT','Aquest identificador de retrat ja existeix.');
      created=folder.createFile(Utilities.newBlob(image.bytes,'image/jpeg',name));assertPrivate_(created);
      after.foto_id=photoId;after.foto_drive_file_id=created.getId();
    }
    put_('05_JUGADORS',after,j?j._row:undefined);saved=true;
    audit_('SAVE_PLAYER',a,c,p,'',id,j?{nom:j.nom,dorsal:j.dorsal,posicio:j.posicio}:null,{hash,nom,dorsal,posicio:position},request);
    return {jugador:playerPublic_(after,true)};
  }catch(e){if(created&&!saved){try{Drive.Files.remove(created.getId());}catch(_){}}throw e;}
}
function updateMatch_(p,a,c,chronicle) {
  role_(a,['editor','admin']); const action=chronicle?'UPDATE_CHRONICLE':'UPDATE_RESULT', old=requestLog_(p,a,action);
  const m=match_(p.partit_id,a.user.rol==='admin');
  if(old) { need_(old.objecte_id===m.partit_id,'CONFLICT','request_id ja utilitzat.'); clearPendingMatch_(m.partit_id,p.request_id); return {partit:matchPublic_(m),replayed:true}; }
  const pending=props_().getProperty('pendingMatch:'+m.partit_id);
  if(pending) return resumeMatchEdit_(p,a,c,m,JSON.parse(pending),chronicle);
  need_(typeof p.expected_updated_at==='string' && p.expected_updated_at===String(m.actualitzat_at),'CONFLICT','El partit ha canviat. Actualitza les dades.');
  let before,after;
  if(chronicle) { before={cronica:m.cronica}; m.cronica=text_(p.cronica,c.cronica_max_chars,'cronica');after={cronica:m.cronica}; }
  else {
    need_(['pendent','jugat','ajornat','cancel·lat'].includes(p.estat),'VALIDATION','Estat no vàlid.');
    const scores=p.estat==='jugat';
    if(scores) need_([p.gols_local,p.gols_visitant].every(v=>Number.isInteger(v)&&v>=0&&v<=99),'VALIDATION','Els gols han de ser enters entre 0 i 99.');
    else need_([p.gols_local,p.gols_visitant].every(v=>v===null||v===''),'VALIDATION','Els partits sense jugar no poden tenir marcador.');
    before={estat:m.estat,gols_local:m.gols_local,gols_visitant:m.gols_visitant};
    m.estat=p.estat;m.gols_local=scores?p.gols_local:'';m.gols_visitant=scores?p.gols_visitant:'';
    after={estat:m.estat,gols_local:m.gols_local,gols_visitant:m.gols_visitant};
  }
  const prior=unique_(rows_('01_PARTITS'),'partit_id',m.partit_id);
  const nextAt=new Date(Math.max(Date.now(),Date.parse(prior.actualitzat_at)||0)+1).toISOString();
  const journalBefore={...before,actualitzat_at:prior.actualitzat_at,actualitzat_per:prior.actualitzat_per};
  const journalAfter={...after,actualitzat_at:nextAt,actualitzat_per:a.user.telefon};
  const meta={request_id:uuid_(p.request_id),action,telefon:a.user.telefon,sessio_id:a.session.sessio_id,
    nom:a.user.nom,rol:a.user.rol,hash:matchRequestHash_(p,chronicle),user_agent:typeof p.user_agent==='string'?p.user_agent.slice(0,300):''};
  const key='pendingMatch:'+m.partit_id;
  // Two bounded snapshots, then a commit marker. No Sheet write before the marker.
  [journalBefore,journalAfter].forEach(v=>need_(Utilities.newBlob(JSON.stringify(v)).getBytes().length<8500,'VALIDATION','Edició massa gran per al registre de recuperació.'));
  props_().setProperty(key+':before',JSON.stringify(journalBefore));
  props_().setProperty(key+':after',JSON.stringify(journalAfter));
  props_().setProperty(key,JSON.stringify(meta));
  return resumeMatchEdit_(p,a,c,prior,meta,chronicle);
}
function matchRequestHash_(p,chronicle) {
  return hmac_(JSON.stringify([p.partit_id,p.expected_updated_at,chronicle?p.cronica:[p.estat,p.gols_local,p.gols_visitant]]));
}
function clearPendingMatch_(id,requestId) {
  const key='pendingMatch:'+id,v=props_().getProperty(key);
  if(v && JSON.parse(v).request_id===String(requestId).toLowerCase()) {
    props_().deleteProperty(key);props_().deleteProperty(key+':before');props_().deleteProperty(key+':after');
  }
}
function samePatch_(m,patch) { return Object.keys(patch).every(k=>JSON.stringify(m[k])===JSON.stringify(patch[k])); }
function resumeMatchEdit_(p,a,c,m,meta,chronicle) {
  need_(meta.request_id===uuid_(p.request_id)&&meta.telefon===a.user.telefon&&meta.sessio_id===a.session.sessio_id&&
    meta.action===(chronicle?'UPDATE_CHRONICLE':'UPDATE_RESULT')&&meta.hash===matchRequestHash_(p,chronicle),
    'BUSY','Hi ha una edició pendent d’aquest partit. Reintenta la petició original.');
  const key='pendingMatch:'+m.partit_id, before=JSON.parse(property_(key+':before')),after=JSON.parse(property_(key+':after'));
  if(samePatch_(m,before)) {Object.assign(m,after);put_('01_PARTITS',m,m._row);}
  else need_(samePatch_(m,after),'CONFLICT','El Sheet ha canviat durant una edició pendent. Cal revisar-lo.');
  const actor={user:{telefon:meta.telefon,nom:meta.nom,rol:meta.rol},session:{sessio_id:meta.sessio_id}};
  audit_(meta.action,actor,c,{user_agent:meta.user_agent},m.partit_id,m.partit_id,before,after,meta.request_id);
  clearPendingMatch_(m.partit_id,meta.request_id);
  return {partit:matchPublic_(m),recovered:true};
}
function blocked_(f,players) {
  if(!safeFalse_(f.no_mostrar)) return true;
  const ids=String(f.jugadors_ids).split(',').filter(Boolean);
  return ids.some(id=>{const j=unique_(players,'jugador_id',id);return !j||!safeFalse_(j.no_mostrar);});
}
function canSee_(f,a,p,players) { return !bool_(f.eliminat) && safeFalse_(f.eliminat) && (!blocked_(f,players)||(a.user.rol==='admin'&&p.include_hidden===true)); }
function photo_(p,a) {
  const f=unique_(rows_('04_FOTOS'),'foto_id',uuid_(p.foto_id));
  need_(f && canSee_(f,a,p,rows_('05_JUGADORS')),'NOT_FOUND','Fotografia no disponible.');
  match_(f.partit_id,a.user.rol==='admin'&&p.include_hidden===true); return f;
}
function photoPublic_(f,admin,players) {
  return {foto_id:f.foto_id,partit_id:f.partit_id,mime_type:f.mime_type,bytes:f.bytes,amplada:f.amplada,alcada:f.alcada,
    jugadors_ids:String(f.jugadors_ids).split(',').filter(Boolean),peu:f.peu,pujat_at:f.pujat_at,pujat_per_nom:f.pujat_per_nom,
    ...(admin?{no_mostrar:!safeFalse_(f.no_mostrar),bloquejada:blocked_(f,players),motiu_ocultacio:f.motiu_ocultacio}:{})};
}
function listPhotos_(p,a,c) {
  const admin=a.user.rol==='admin'; match_(p.partit_id,admin&&p.include_hidden===true);
  const players=rows_('05_JUGADORS');
  const all=rows_('04_FOTOS').filter(f=>f.partit_id===p.partit_id&&canSee_(f,a,p,players))
    .sort((x,y)=>String(x.pujat_at).localeCompare(String(y.pujat_at))||String(x.foto_id).localeCompare(String(y.foto_id)));
  let start=0;
  if(p.after) { start=all.findIndex(f=>f.foto_id===p.after)+1;need_(start>0,'INVALID_CURSOR','La galeria ha canviat. Torna a carregar-la.'); }
  const limit=p.limit===undefined?30:p.limit;need_(Number.isInteger(limit)&&limit>=1&&limit<=50,'VALIDATION','Límit entre 1 i 50.');
  const selected=all.slice(start,start+limit);
  return {fotos:selected.map(f=>photoPublic_(f,admin,players)),nextCursor:start+limit<all.length?selected[selected.length-1].foto_id:null};
}
function privateFile_(id,matchId,expectedName) {
  // Follow recorded IDs only, verify exact private folder/name/mime before returning bytes.
  const file=DriveApp.getFileById(id), folder=matchFolder_(matchId,false);
  need_(folder && !file.isTrashed() && file.getMimeType()==='image/jpeg' && file.getName()===expectedName,'NOT_FOUND','Fitxer no disponible.');
  assertPrivate_(file); const parents=file.getParents(); let found=false;
  while(parents.hasNext()) if(parents.next().getId()===folder.getId()) found=true;
  need_(found,'NOT_FOUND','Fitxer fora de la carpeta prevista.'); return file;
}
function mediaBytes_(f,thumb,c) {
  const id=thumb?f.thumb_file_id:f.drive_file_id;
  const file=privateFile_(id,f.partit_id,f.foto_id+(thumb?'_thumb.jpg':'_photo.jpg'));
  need_(file.getSize()<=(thumb?APP.thumbLimit:c.upload_max_bytes),'PAYLOAD_TOO_LARGE','Fitxer massa gran.');
  return {foto_id:f.foto_id,mime_type:'image/jpeg',base64:Utilities.base64Encode(file.getBlob().getBytes()),filename:f.foto_id+'.jpg'};
}
function media_(p,a,c,thumb,download) {
  const f=photo_(p,a);
  if(download) {
    need_(p.private_use_ack===true,'VALIDATION','Cal confirmar l’ús privat.');
    const old=requestLog_(p,a,'DOWNLOAD_PHOTO');
    if(old) need_(old.objecte_id===f.foto_id,'CONFLICT','request_id ja utilitzat.');
    const data=mediaBytes_(f,thumb,c);
    if(!old) audit_('DOWNLOAD_PHOTO',a,c,p,f.partit_id,f.foto_id,null,{notice:APP.downloadNotice},p.request_id);
    return {...data,notice:APP.downloadNotice};
  }
  return mediaBytes_(f,thumb,c);
}
function thumbnails_(p,a,c) {
  need_(Array.isArray(p.foto_ids)&&p.foto_ids.length>0&&p.foto_ids.length<=APP.maxPhotosPerBatch,'VALIDATION','Demana entre 1 i 6 miniatures.');
  const seen={};p.foto_ids.forEach(id=>{uuid_(id);need_(!seen[id],'VALIDATION','ID repetit.');seen[id]=true;});
  return {items:p.foto_ids.map(id=>{
    try { const f=photo_({...p,foto_id:id},a);return {...mediaBytes_(f,true,c),ok:true}; }
    catch(e) { return {foto_id:id,ok:false,error:{code:e.apiCode||'INTERNAL_ERROR',message:e.apiCode?e.message:'No s’ha pogut recuperar la miniatura.'}}; }
  })};
}
function jpeg_(base64,max,maxDimension) {
  need_(typeof base64==='string' && base64.length>0 && base64.length<=4*Math.ceil(max/3) && base64.length%4===0 &&
    /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64),'VALIDATION','JPEG base64 no vàlid.');
  let bytes;try{bytes=Utilities.base64Decode(base64);}catch(_){fail_('VALIDATION','Base64 no vàlid.');}
  need_(bytes.length<=max && bytes.length>=12,'VALIDATION','Mida de JPEG fora del límit.');
  const b=bytes.map(v=>v&255);need_(b[0]===255&&b[1]===216&&b[b.length-2]===255&&b[b.length-1]===217,'VALIDATION','Cal un fitxer JPEG.');
  let i=2,width=0,height=0;
  const sof=[0xc0,0xc1,0xc2];
  while(i<b.length-2) {
    need_(b[i]===255,'VALIDATION','Estructura JPEG incorrecta.');while(b[i]===255)i++;
    const marker=b[i++];if(marker===0xda||marker===0xd9)break;
    if(marker===0x01 || marker>=0xd0&&marker<=0xd7)continue;
    need_(i+1<b.length,'VALIDATION','JPEG truncat.');const len=b[i]*256+b[i+1];
    need_(len>=2&&i+len<=b.length,'VALIDATION','JPEG truncat.');
    // Reject EXIF/XMP/IPTC/comments: uploaded canvas JPEGs must not expose GPS metadata.
    need_(![0xe1,0xed,0xfe].includes(marker),'VALIDATION','La foto conté metadades. Reexporta-la amb canvas.');
    if(sof.includes(marker)) { need_(len>=8&&b[i+2]===8,'VALIDATION','JPEG no compatible.');height=b[i+3]*256+b[i+4];width=b[i+5]*256+b[i+6]; }
    i+=len;
  }
  need_(width>0&&height>0&&Math.max(width,height)<=maxDimension,'VALIDATION','Dimensions JPEG fora del límit.');
  return {bytes,width,height}; // Header validation, not a complete JPEG decoder.
}
function assertPrivate_(item) {
  need_(item.getSharingAccess()===DriveApp.Access.PRIVATE && item.getEditors().length===0 && item.getViewers().length===0,
    'DRIVE_NOT_PRIVATE','La carpeta o el fitxer té permisos compartits. Revisa Drive.');
}
function singleFolder_(parent,name,create) {
  const it=parent.getFoldersByName(name);let f=it.hasNext()?it.next():null;
  need_(!it.hasNext(),'SCHEMA_ERROR','Carpeta duplicada.'); if(!f&&create)f=parent.createFolder(name);
  if(f)assertPrivate_(f);return f;
}
function matchFolder_(id,create) {
  const root=DriveApp.getFolderById(property_('DRIVE_ROOT_FOLDER_ID'));assertPrivate_(root);
  return singleFolder_(root,id_(id),create);
}
function uploadPhoto_(p,a,c) {
  const m=match_(p.partit_id,false), fotoId=uuid_(p.foto_id), old=requestLog_(p,a,'UPLOAD_PHOTO');
  const existing=unique_(rows_('04_FOTOS'),'foto_id',fotoId),players=rows_('05_JUGADORS');
  if(existing) {
    need_(existing.pujat_per_tel===a.user.telefon&&existing.partit_id===m.partit_id&&safeFalse_(existing.eliminat),'CONFLICT','foto_id ja utilitzat.');
    if(old)need_(old.objecte_id===fotoId,'CONFLICT','request_id ja utilitzat.');
    if(!old)audit_('UPLOAD_PHOTO',a,c,p,m.partit_id,fotoId,null,{foto_id:fotoId,recovered:true},p.request_id);
    return {foto:photoPublic_(existing,a.user.rol==='admin',players),replayed:true};
  }
  need_(!old,'CONFLICT','request_id ja utilitzat.');
  need_(Array.isArray(p.jugadors_ids)&&p.jugadors_ids.length<=30&&new Set(p.jugadors_ids).size===p.jugadors_ids.length,'VALIDATION','Etiquetes no vàlides.');
  p.jugadors_ids.forEach(id=>need_(unique_(players,'jugador_id',id_(id)),'VALIDATION','Jugador desconegut.'));
  const caption=text_(p.peu===undefined?'':p.peu,250,'peu');
  const image=jpeg_(p.photo_base64,c.upload_max_bytes,c.image_max_dimension), thumb=jpeg_(p.thumb_base64,APP.thumbLimit,c.thumbnail_max_dimension);
  need_(image.width>=thumb.width && image.height>=thumb.height,'VALIDATION','Miniatura més gran que la foto.');
  const folder=matchFolder_(m.partit_id,true),files=[];let saved=false;
  try {
    [[image,'_photo.jpg'],[thumb,'_thumb.jpg']].forEach(([img,suffix])=>{
      const name=fotoId+suffix;
      // Reuse a private orphan from a terminated earlier attempt, replacing its content.
      const it=folder.getFilesByName(name);const found=[];while(it.hasNext())found.push(it.next());
      found.forEach(f=>{assertPrivate_(f);Drive.Files.remove(f.getId());});
      const f=folder.createFile(Utilities.newBlob(img.bytes,'image/jpeg',name));files.push(f);assertPrivate_(f);
    });
    const f={foto_id:fotoId,partit_id:m.partit_id,drive_file_id:files[0].getId(),thumb_file_id:files[1].getId(),mime_type:'image/jpeg',
      bytes:image.bytes.length,amplada:image.width,alcada:image.height,jugadors_ids:p.jugadors_ids.join(','),peu:caption,
      no_mostrar:p.jugadors_ids.some(id=>!safeFalse_(unique_(players,'jugador_id',id).no_mostrar)),motiu_ocultacio:'',
      pujat_at:now_(),pujat_per_tel:a.user.telefon,pujat_per_nom:a.user.nom,eliminat:false,eliminat_at:'',eliminat_per:''};
    put_('04_FOTOS',f);saved=true;audit_('UPLOAD_PHOTO',a,c,p,m.partit_id,fotoId,null,{foto_id:fotoId,bytes:f.bytes,no_mostrar:f.no_mostrar},p.request_id);
    return {foto:photoPublic_(f,a.user.rol==='admin',players)};
  } catch(e) { if(!saved)files.forEach(f=>{try{Drive.Files.remove(f.getId());}catch(_){}});throw e; }
}
function visibility_(p,a,c) {
  role_(a,['admin']);const hide=p.action==='hidePhoto', action=hide?'HIDE_PHOTO':'SHOW_PHOTO';
  const f=photo_({...p,include_hidden:true},a),old=requestLog_(p,a,action);
  if(old) { need_(old.objecte_id===f.foto_id,'CONFLICT','request_id ja utilitzat.');return {foto:photoPublic_(f,true,rows_('05_JUGADORS')),replayed:true}; }
  const before={no_mostrar:f.no_mostrar,motiu_ocultacio:f.motiu_ocultacio};
  f.no_mostrar=hide;f.motiu_ocultacio=hide?text_(p.motiu || '',300,'motiu'):'';
  put_('04_FOTOS',f,f._row);audit_(action,a,c,p,f.partit_id,f.foto_id,before,{no_mostrar:hide,motiu_ocultacio:f.motiu_ocultacio},p.request_id);
  // A player restriction still blocks the photo after SHOW_PHOTO.
  return {foto:photoPublic_(f,true,rows_('05_JUGADORS'))};
}
function removeRecordedFile_(id,matchId,name) {
  if(!id)return;
  // Do not treat permission failures or unknown Google errors as successful deletion.
  const f=privateFile_(id,matchId,name);Drive.Files.remove(f.getId());
}
function deletePhoto_(p,a,c) {
  role_(a,['admin']);need_(p.confirm_permanent===true,'VALIDATION','Cal confirmar l’eliminació definitiva.');
  const id=uuid_(p.foto_id),f=unique_(rows_('04_FOTOS'),'foto_id',id);need_(f,'NOT_FOUND','Fotografia no disponible.');
  const old=requestLog_(p,a,'DELETE_PHOTO');if(old)need_(old.objecte_id===id,'CONFLICT','request_id ja utilitzat.');
  if(!bool_(f.eliminat)) {
    f.eliminat=true;f.no_mostrar=true;f.eliminat_at=now_();f.eliminat_per=a.user.telefon;put_('04_FOTOS',f,f._row);
    // Tombstone before touching Drive: no API retrieval even if physical deletion fails.
  }
  if(!old)audit_('DELETE_PHOTO',a,c,p,f.partit_id,id,null,{stage:'requested'},p.request_id);
  const pending=[];
  [['drive_file_id','_photo.jpg'],['thumb_file_id','_thumb.jpg']].forEach(([field,suffix])=>{
    if(!f[field])return;
    try {removeRecordedFile_(f[field],f.partit_id,f.foto_id+suffix);f[field]='';put_('04_FOTOS',f,f._row);}catch(_){pending.push(field);}
  });
  if(pending.length) return {foto_id:id,deleted:false,hidden:true,pending:true,message:'Oculta. Queden fitxers per eliminar; repeteix la mateixa petició.'};
  if(!rows_('06_REGISTRE').some(r=>r.accio==='DELETE_PHOTO_COMPLETE'&&r.objecte_id===id))audit_('DELETE_PHOTO_COMPLETE',a,c,p,f.partit_id,id,null,{stage:'complete'});
  return {foto_id:id,deleted:true,permanent:true};
}
/** EDITOR-ONLY functions below are never dispatched over the public API. */
function installBackend() {
  return locked_(()=>{
    const p=props_();
    if(!p.getProperty('SESSION_SECRET'))p.setProperty('SESSION_SECRET',[1,2,3,4].map(()=>Utilities.getUuid()).join(''));
    let ss;
    if(p.getProperty('SHEET_ID'))ss=SpreadsheetApp.openById(p.getProperty('SHEET_ID'));
    else {ss=SpreadsheetApp.create('CF VILAJUÏGA · 2026-27');ss.getSheets()[0].setName('01_PARTITS');p.setProperty('SHEET_ID',ss.getId());}
    ss.setSpreadsheetTimeZone('Europe/Madrid');
    Object.keys(SCHEMA).forEach(name=>{
      let s=ss.getSheetByName(name);if(!s)s=ss.insertSheet(name);
      if(s.getLastRow()===0){s.getRange(1,1,1,SCHEMA[name].length).setValues([SCHEMA[name]]);s.setFrozenRows(1);
        s.getRange(1,1,1,SCHEMA[name].length).setBackground('#14532d').setFontColor('#ffffff').setFontWeight('bold');}
      if(name==='05_JUGADORS')upgradePlayerColumns_(s);
      sheet_(name);
    });
    const configRows=rows_('02_CONFIG');DEFAULTS.filter(r=>!configRows.some(x=>x.clau===r[0])).forEach(r=>put_('02_CONFIG',{clau:r[0],valor:r[1],tipus:r[2],descripcio:r[3]}));
    if(!p.getProperty('DRIVE_ROOT_FOLDER_ID')){
      let top;if(p.getProperty('DRIVE_APP_FOLDER_ID'))top=DriveApp.getFolderById(p.getProperty('DRIVE_APP_FOLDER_ID'));
      else {top=DriveApp.createFolder('CF VILAJUIGA APP');p.setProperty('DRIVE_APP_FOLDER_ID',top.getId());}
      assertPrivate_(top);const season=singleFolder_(top,'2026-27',true),photos=singleFolder_(season,'fotos',true);
      p.setProperty('DRIVE_ROOT_FOLDER_ID',photos.getId());
    }
    assertPrivate_(DriveApp.getFileById(ss.getId()));matchFolder_('P001',false);playerFolder_(true);
    p.setProperty('APP_VERSION',APP.version);
    const result={sheet_url:ss.getUrl(),photos_url:DriveApp.getFolderById(p.getProperty('DRIVE_ROOT_FOLDER_ID')).getUrl(),version:APP.version};
    console.log(JSON.stringify(result));return result;
  });
}
function addUser(telefon,nom,rol) {
  return locked_(()=>{
    const n=phone_(telefon);need_(['admin','editor','familia'].includes(rol),'VALIDATION','Rol no vàlid.');
    need_(!unique_(users_(true),'telefon',n),'CONFLICT','L’usuari ja existeix.');
    put_('03_USUARIS',{telefon:n,nom:text_(nom,80,'nom'),rol,codi:'',actiu:true,privacitat_version:'',privacitat_at:'',creat_at:now_(),notes:''});invalidateUsers_();
  });
}
function setUserCode(telefon,codi) {
  return locked_(()=>{
    const n=phone_(telefon);need_(typeof codi==='string'&&/^\d{6,12}$/.test(codi),'VALIDATION','Codi de 6 a 12 xifres.');
    const u=unique_(users_(true),'telefon',n);need_(u,'NOT_FOUND','Usuari no trobat.');
    u.codi='hmac-v1:'+hmac_('code|'+n+'|'+codi);put_('03_USUARIS',u,u._row);invalidateUsers_();
  });
}
function setLoginMode(mode) {
  return locked_(()=>{
    need_(['telefon','telefon+codi'].includes(mode),'VALIDATION','Mode no vàlid.');
    if(mode==='telefon+codi')need_(users_(true).filter(u=>bool_(u.actiu)).every(u=>String(u.codi).startsWith('hmac-v1:')),'VALIDATION','Falten codis per a usuaris actius.');
    const r=unique_(rows_('02_CONFIG'),'clau','login_mode');r.valor=mode;put_('02_CONFIG',r,r._row);invalidateUsers_();
  });
}
function cleanupRevocations_() { const p=props_(), all=p.getProperties();Object.keys(all).filter(k=>k.startsWith('revoked:')&&Number(all[k])<=Date.now()).forEach(k=>p.deleteProperty(k)); }
function recoverPendingMatchAudits() {
  return locked_(()=>{
    const all=props_().getProperties(),c=config_(),results=[];
    Object.keys(all).filter(k=>/^pendingMatch:[A-Za-z0-9_-]+$/.test(k)).forEach(key=>{
      const id=key.slice('pendingMatch:'.length),meta=JSON.parse(all[key]);
      const m=unique_(rows_('01_PARTITS'),'partit_id',id),after=JSON.parse(property_(key+':after'));
      if(!m || !samePatch_(m,after)) {results.push({partit_id:id,status:'needs_review'});return;}
      if(!unique_(rows_('06_REGISTRE'),'log_id',meta.request_id)) {
        audit_(meta.action,{user:{telefon:meta.telefon,nom:meta.nom,rol:meta.rol},session:{sessio_id:meta.sessio_id}},
          c,{user_agent:meta.user_agent},id,id,JSON.parse(property_(key+':before')),after,meta.request_id);
      }
      clearPendingMatch_(id,meta.request_id);results.push({partit_id:id,status:'audited'});
    });return results;
  });
}
function maintenance() { return locked_(()=>{cleanupRevocations_();invalidateUsers_();return {ok:true};}); }
function invalidateUserCache() { invalidateUsers_(); }
function importCalendar(csvText) {
  return locked_(()=>{
    const parsed=Utilities.parseCsv(text_(csvText,200000,'CSV').replace(/^\uFEFF/,''));
    const expected=SCHEMA['01_PARTITS'].slice(0,10);need_(JSON.stringify(parsed[0])===JSON.stringify(expected),'VALIDATION','Capçalera CSV incorrecta.');
    const existing=rows_('01_PARTITS'), seen={}, pending=[], cfg=config_();
    parsed.slice(1).filter(r=>r.some(Boolean)).forEach(r=>{
      need_(r.length===10,'VALIDATION','Nombre de columnes CSV incorrecte.');
      const m={};expected.forEach((k,i)=>m[k]=r[i]);id_(m.partit_id);
      need_(!seen[m.partit_id]&&!unique_(existing,'partit_id',m.partit_id),'CONFLICT','ID de partit repetit.');seen[m.partit_id]=true;
      need_(/^\d{4}-\d{2}-\d{2}$/.test(m.data)&&new Date(m.data+'T12:00:00Z').toISOString().slice(0,10)===m.data,'VALIDATION','Data ISO no vàlida.');
      need_(m.hora===''||/^([01]\d|2[0-3]):[0-5]\d$/.test(m.hora),'VALIDATION','Hora no vàlida.');
      m.jornada=Number(m.jornada);need_(Number.isInteger(m.jornada)&&m.jornada>=1&&m.jornada<=100,'VALIDATION','Jornada no vàlida.');
      ['local','visitant','camp_nom','camp_adreca'].forEach(k=>text_(m[k],250,k));
      need_(m.local.length>0&&m.visitant.length>0&&m.camp_nom.length>0&&m.local!==m.visitant&&(m.local===cfg.equip_nom||m.visitant===cfg.equip_nom),'VALIDATION','Nom d’equip inconsistent.');
      need_((m.camp_lat==='')===(m.camp_lng===''),'VALIDATION','Calen les dues coordenades.');
      if(m.camp_lat!==''){m.camp_lat=Number(m.camp_lat);m.camp_lng=Number(m.camp_lng);need_(Number.isFinite(m.camp_lat)&&Math.abs(m.camp_lat)<=90&&Number.isFinite(m.camp_lng)&&Math.abs(m.camp_lng)<=180,'VALIDATION','GPS no vàlid.');}
      pending.push({...m,estat:'pendent',gols_local:'',gols_visitant:'',cronica:'',visible:true,actualitzat_at:now_(),actualitzat_per:'EDITOR_IMPORT'});
    });
    pending.forEach(m=>put_('01_PARTITS',m));return {imported:pending.length};
  });
}
