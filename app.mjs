import {API_URL,APP_VERSION,TEAM_NAME} from './config.mjs';
import {playerCard,POSITIONS} from './player-cards.mjs';
import {mediaBatches} from './media-batches.mjs';
import {LEAGUE,CLUBS,clubFor,clubMapsUrl} from './league.mjs';
import {apiPost,requestId,prepareUpload,jpegBlob} from './api-client.mjs';
import {esc,sortedMatches,nextMatch,lastMatch,opponent,result,dateLabel,mapsUrl,filterMatches,icsForMatch,usableSession} from './domain.mjs';
const $=id=>document.getElementById(id);
const root=$('app'),modal=$('modal');
const PREFIX='cfv:v3:'+new URL('.',import.meta.url).pathname+':';
const SESSION_KEY=PREFIX+'session';
const read=k=>{try{return JSON.parse(localStorage.getItem(k));}catch{return null;}};
const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true;}catch{return false;}};
function remove(k){try{localStorage.removeItem(k);}catch{}}
function clearStored(){try{Object.keys(localStorage).filter(k=>k.startsWith(PREFIX)).forEach(k=>localStorage.removeItem(k));}catch{}}
const stored=read(SESSION_KEY);
const state={session:usableSession(stored)?stored:null,data:null,view:'home',filter:'all',verified:false,loading:false,error:'',loginBusy:false,
  privacy:null,authUser:null,galleryMatch:'',gallery:[],galleryNext:null,galleryLoading:false,includeHidden:false,thumbs:new Map(),images:new Set(),
  queue:null,uploading:false,installEvent:null,modalMatch:null,editMode:'result',viewerPhoto:null,viewGeneration:0,portraits:new Map(),portraitLoads:new Set(),playerDraft:null};
if(!state.session)clearStored();else state.data=read(PREFIX+'data:'+state.session.cacheKey)?.data||null;
const paths={home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18m-13 4h2m4 0h2m-8 3h2"/>',photos:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1.5"/><path d="m21 15-5-5L6 21"/>',team:'<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m2-17a3 3 0 0 1 0 6m1 4a5 5 0 0 1 3 5v2"/>',arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',chevron:'<path d="m9 5 7 7-7 7"/>',map:'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="2.5"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',refresh:'<path d="M20 7v5h-5M4 17v-5h5m-4.7-2a8 8 0 0 1 13.2-6L20 7M4 17l2.5 3A8 8 0 0 0 19.7 14"/>',download:'<path d="M12 3v12m-5-5 5 5 5-5M4 15v6h16v-6"/>',upload:'<path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5"/>',edit:'<path d="m16 3 5 5-12 12-6 1 1-6zM13 6l5 5"/>',eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15m-9 3v8m4-8v8"/>',logout:'<path d="M9 4H4v16h5m3-8h9m-4-4 4 4-4 4"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',ball:'<circle cx="12" cy="12" r="9"/><path d="m12 7 4 3-2 5h-4l-2-5zm0 0V3m4 7 5-1m-7 6 3 5m-7-5-3 5m1-10L3 9"/>',check:'<path d="m5 12 4 4L19 6"/>',phone:'<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 18h4"/>'};
const icon=name=>`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name]||paths.info}</svg>`;
const badge=(text,type='')=>`<span class="badge ${esc(type)}">${esc(text)}</span>`;
const actionBtn=(action,label,kind='btn',data='')=>`<button type="button" class="${kind}" data-action="${action}" ${data}>${label}</button>`;
const canEdit=()=>['editor','admin'].includes(state.data?.user?.rol);
const isAdmin=()=>state.data?.user?.rol==='admin';
const canWrite=()=>state.verified&&navigator.onLine&&!state.uploading;
const user=()=>state.data?.user||state.authUser||{};
const team=()=>state.data?.config?.equip_nom||TEAM_NAME;
const matches=()=>state.data?.partits||[];
const initials=name=>String(name||'?').split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase();
function toast(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').hidden=true,6500);}
function forgetImages(){state.viewGeneration++;state.images.forEach(url=>URL.revokeObjectURL(url));state.images.clear();state.thumbs.clear();state.portraits.clear();state.portraitLoads.clear();}
function imageUrl(base64){const url=URL.createObjectURL(jpegBlob(base64));state.images.add(url);return url;}
function clearLocal(){forgetImages();clearStored();Object.assign(state,{session:null,data:null,authUser:null,privacy:null,verified:false,queue:null,gallery:[],galleryNext:null,galleryMatch:'',includeHidden:false,viewerPhoto:null,pendingEdit:null,pendingDownload:null,pendingDelete:null,privacyRequest:null,view:'home',filter:'all',playerDraft:null});if(modal.open)modal.close();}
async function api(payload){
 if(!state.session)throw Object.assign(new Error('Cal iniciar sessió.'),{code:'UNAUTHORIZED'});
 try{return await apiPost(API_URL,{...payload,token:state.session.token,user_agent:navigator.userAgent});}
 catch(e){if(e.code==='UNAUTHORIZED'){clearLocal();state.error='La sessió ha caducat o s’ha revocat. Torna a entrar.';render();}throw e;}
}
function persistSession(){write(SESSION_KEY,state.session);}
function render(){
 if(!state.session||state.privacy)return renderLogin();
 if(!state.data)return renderLoading();
 const online=state.verified&&navigator.onLine;
 const labels={home:'Inici',calendar:'Partits',photos:'Galeria',team:'Equip',league:'Lliga'};
 root.innerHTML=`<div class="shell"><aside class="sidebar"><div class="brand-line"><img src="./assets/crest.jpg" alt="Escut CF Vilajuïga"><div class="brand-title">CF VILAJUÏGA<small>La nostra temporada</small></div></div><p class="nav-label">Temporada ${esc(state.data.config?.temporada||'2026/27')}</p><nav aria-label="Navegació principal">${nav()}</nav><div class="sidebar-bottom"><div class="sidebar-message"><strong>Cada partit,<br>una història.</strong>Les petites grans coses que ens fan equip.</div>${actionBtn('install',icon('phone')+' Instal·lar l’app','btn')}${actionBtn('account',icon('lock')+' Espai de les famílies','btn')}</div></aside>
 <div class="shell-content"><header class="topbar"><div class="top-title"><strong>La nostra temporada</strong><span> / ${labels[state.view]}</span></div><div class="mobile-logo"><img src="./assets/crest.jpg" alt=""><span>CF VILAJUÏGA<small>La nostra temporada</small></span></div><div class="top-actions"><span class="connection-label ${online?'':'offline'}"><span class="dot"></span>${online?'Dades actualitzades':state.loading?'Connectant…':'Sense dades noves'}</span>${actionBtn('refresh',icon('refresh'),'icon-btn',`aria-label="Actualitzar les dades" ${state.loading?'disabled':''}`)}<button type="button" class="account-btn" data-action="account" aria-label="El teu compte"><div class="avatar">${esc(initials(user().nom))}</div><span>${esc(user().nom)}</span></button></div></header>
 ${!online?`<div class="offline-banner" role="status">${state.loading?'Comprovant les últimes dades…':'Sense connexió amb el servidor. Mostrant les últimes dades disponibles; les edicions i les fotos necessiten connexió.'}</div>`:''}
 <main class="content" id="main">${state.error?`<div class="error-panel" role="alert">${esc(state.error)}</div>`:''}${state.view==='home'?home():state.view==='calendar'?calendar():state.view==='photos'?gallery():state.view==='league'?leagueView():teamView()}</main>
 <nav class="mobile-nav" aria-label="Navegació mòbil">${nav()}</nav></div></div>`;
 if(state.view==='photos')paintThumbs();
 if(state.view==='team'){paintPortraits();loadPortraits().catch(()=>{});}
}
function nav(){return [['home','Inici','home'],['calendar','Partits','calendar'],['photos','Galeria','photos'],['team','Equip','team'],['league','Lliga','ball']].map(([view,label,ico])=>`<button type="button" class="nav-btn ${state.view===view?'active':''}" data-action="navigate" data-view="${view}" ${state.view===view?'aria-current="page"':''}>${icon(ico)}<span>${label}</span></button>`).join('');}
function renderLogin(){
 const privacy=state.privacy;
 root.innerHTML=`<main class="login"><section class="login-poster" aria-label="La nostra temporada"><div class="poster-top"><div class="brand-line"><img src="./assets/crest.jpg" alt="Escut CF Vilajuïga"><div class="brand-title">CF VILAJUÏGA<small>La nostra temporada</small></div></div><span class="season-chip">2026 / 27</span></div><div class="poster-content"><p class="eyebrow">Futbol, família i poble</p><h1>Més que<br>un partit.<br><em>Som equip.</em></h1></div><div class="poster-bottom"><span>El lloc on guardar tot allò que passa dins i fora del camp.</span><span class="eyebrow">Vilajuïga · Alt Empordà</span></div></section>
 <section class="login-pane"><div class="login-form-wrap"><p class="eyebrow">Benvinguts a casa</p><h2>${privacy?'La privacitat<br>també fa equip.':'El nostre petit<br>gran equip.'}</h2><p class="login-lead">${privacy?'Abans d’entrar, compartim un compromís.':'Partits, resultats i records de la temporada, en un sol lloc per a les famílies.'}</p>
 ${privacy?`<form id="privacy-form"><div class="privacy-panel">${icon('lock')}<p>${esc(privacy.text)}</p><label class="check-line"><input type="checkbox" name="accepted" required> He llegit i accepto el compromís de privacitat.</label></div><button type="submit" class="btn full" ${state.loginBusy?'disabled':''}>${state.loginBusy?'Guardant…':'Entrar a la temporada '+icon('arrow')}</button></form>`:
 `<form class="login-form" id="login-form"><div class="form-field"><label for="login-phone">El teu telèfon</label><div class="phone-wrap"><span>ES · +34</span><input class="input" id="login-phone" name="telefon" type="tel" inputmode="tel" autocomplete="tel" placeholder="600 000 000" required maxlength="40"></div><p class="hint">Fes servir el número autoritzat per l’equip.</p></div><button type="button" class="text-btn" data-action="toggle-code" aria-expanded="false">Tens un codi personal?</button><div class="form-field" id="code-field" hidden><label for="login-code">Codi personal</label><input id="login-code" class="input" name="codi" type="password" inputmode="numeric" autocomplete="off" minlength="6" maxlength="12"></div><button type="submit" class="btn full" ${state.loginBusy?'disabled':''}>${state.loginBusy?'Entrant…':'Entrar a l’app '+icon('arrow')}</button></form>`}
 ${state.error?`<p class="error-msg" role="alert">${esc(state.error)}</p>`:''}<div class="login-note">${icon('lock')}<span>Un espai privat per a les famílies. Les fotografies es comparteixen dins del grup i amb respecte a tothom.</span></div><div class="login-footer">${actionBtn('about','Sobre l’app','text-btn')}${actionBtn('install','Afegir al mòbil','text-btn')}</div></div></section></main>`;
}
function renderLoading(){root.innerHTML=`<main class="initial-loader"><img src="./assets/crest.jpg" alt="CF Vilajuïga" width="76" height="84"><p>Preparant la temporada.</p><span class="spinner"></span>${state.error?`<p class="error-msg">${esc(state.error)}</p>${actionBtn('refresh','Tornar-ho a provar','btn')}${actionBtn('logout','Tornar al login','text-btn')}`:''}</main>`;}
function heading(eyebrow,title,description='',extra=''){return `<div class="page-heading"><div><p class="eyebrow">${esc(eyebrow)}</p><h1>${esc(title)}</h1>${description?`<p>${esc(description)}</p>`:''}</div>${extra}</div>`;}
function home(){
 const next=nextMatch(matches()),last=lastMatch(matches()),s=state.data.estadistiques||{PJ:0,V:0,E:0,D:0,GF:0,GC:0,DG:0};
 const hero=next?`<div class="hero-kicker">El proper partit ${badge('Jornada '+next.jornada)} ${badge(next.local===team()?'A casa':'A fora')}</div><h2 class="hero-title">CF Vilajuïga<em>vs. ${esc(opponent(next,team()))}</em></h2><div class="hero-meta"><span>${icon('calendar')}${esc(dateLabel(next.data))}</span><span>${icon('clock')}${esc(next.hora||'Hora pendent')}</span></div>${actionBtn('match','Tot el partit '+icon('arrow'),'btn light',`data-id="${esc(next.partit_id)}"`)}`:
 `<div class="hero-kicker">Temporada ${esc(state.data.config?.temporada||'2026/27')}<span class="live-pill">Som Vilajuïga</span></div><h2 class="hero-title">Tot comença<br><em>aquí.</em></h2><p class="hero-copy">Una nova temporada per jugar, créixer i compartir.</p>${actionBtn('navigate','Veure els partits '+icon('arrow'),'btn light','data-view="calendar"')}`;
 const forms=sortedMatches(matches()).filter(m=>m.estat==='jugat').slice(-5).map(m=>{const r=result(m,team());return r?`<span class="form-result ${r.type}" title="${esc(r.label)}">${r.type==='win'?'V':r.type==='draw'?'E':'D'}</span>`:''}).join('');
 return `${heading('L’espai de les famílies','La nostra temporada',`Hola, ${user().nom||'família'}. Ens veiem al camp.`)}<section class="hero"><div class="hero-content">${hero}</div><div class="hero-photo" role="img" aria-label="Pilota de futbol al camp, al capvespre"><span class="photo-tag">La nostra<br>passió</span></div></section>
 <div class="dash-grid"><section class="card"><div class="section-title"><h2>La temporada en números</h2><span class="eyebrow muted">${esc(state.data.config?.temporada||'2026/27')}</span></div><div class="stats">${[['PJ','Partits',''],['V','Victòries','win'],['E','Empats','draw'],['D','Derrotes','loss']].map(([k,label,type])=>`<div class="stat ${type}"><span class="number">${s[k]??0}</span><small>${label}</small></div>`).join('')}</div><div class="secondary-stats"><span>Gols a favor <b>${s.GF??0}</b></span><span>Gols en contra <b>${s.GC??0}</b></span><span>Diferència <b>${s.DG>0?'+':''}${s.DG??0}</b></span></div>${forms?`<div class="form-strip">${forms}<small>Últims partits</small></div>`:`<p class="empty-small">Els números s’ompliran amb els primers resultats.</p>`}</section>
 <section class="card"><div class="section-title"><h2>A peu de camp</h2></div><div class="quick-actions">${quick('navigate','calendar','Tots els partits','Dates, camps i resultats','calendar')}${quick('navigate','photos','Els nostres records','La galeria de la temporada','photos')}${quick('navigate','league','La nostra lliga','Els equips i els seus camps','ball')}</div></section>
 <section class="card"><div class="section-title"><h2>L’últim resultat</h2>${last?actionBtn('match','Veure partit →','text-btn',`data-id="${esc(last.partit_id)}"`):''}</div>${last?`<div class="result-card"><div><p>${esc(opponent(last,team()))}</p><small>${esc(dateLabel(last.data))} · Jornada ${last.jornada}</small>${badge(result(last,team())?.label||'Jugat',result(last,team())?.type)}</div><div class="score">${last.gols_local} <span class="muted">:</span> ${last.gols_visitant}</div></div>`:`<div class="empty-small">Encara no hi ha cap resultat.<br>Quan es jugui el primer partit, el trobaràs aquí.</div>`}</section>
 <section class="card"><div class="section-title"><h2>Records que fan equip</h2>${actionBtn('navigate','Obrir galeria →','text-btn','data-view="photos"')}</div><p class="empty-small">Les celebracions, els nervis, les rialles.<br>Compartim les fotos amb les famílies de l’equip.</p></section></div><footer class="season-footer"><span>${icon('lock')}Un espai privat. Un equip compartit.</span><span>CF Vilajuïga · ${esc(state.data.config?.temporada||'2026/27')}</span></footer>`;
}
function quick(action,view,title,subtitle,ico){return `<button type="button" class="quick-action" data-action="${action}" data-view="${view}"><span class="action-icon">${icon(ico)}</span><span><strong>${title}</strong><small>${subtitle}</small></span>${icon('chevron')}</button>`;}
function empty(title,text,ico='calendar',button=''){return `<div class="empty-state"><div class="empty-icon">${icon(ico)}</div><h2>${esc(title)}</h2><p>${esc(text)}</p>${button}</div>`;}
function calendar(){
 const list=filterMatches(matches(),state.filter);let month='';
 return `${heading('De jornada en jornada','Ens veiem al camp','Tot el calendari de la temporada, sempre a mà.')}<div class="tabs" role="group" aria-label="Filtrar partits">${[['all','Tots'],['upcoming','Per jugar'],['played','Resultats']].map(([f,l])=>actionBtn('filter',l,'tab '+(state.filter===f?'active':''),`data-filter="${f}" aria-pressed="${state.filter===f}"`)).join('')}</div>${!list.length?empty(matches().length?'Sense partits en aquest filtre':'La temporada ens espera',matches().length?'Prova un altre filtre per veure la resta de jornades.':'Afegirem el calendari quan el tinguem. Aquí hi trobaràs dates, hores i com arribar a cada camp.'):`<div class="match-list">${list.map(m=>{const key=String(m.data).slice(0,7),newMonth=key!==month;month=key;return `${newMonth?`<h2 class="month-heading">${esc(dateLabel(m.data,'month'))}</h2>`:''}${matchRow(m)}`;}).join('')}</div>`}`;
}
function matchRow(m){
 const r=result(m,team());const d=dateLabel(m.data,'short').replace('.','').split(' '),status=m.estat==='jugat'?r?.label||'Jugat':m.estat==='ajornat'?'Ajornat':m.estat==='cancel·lat'?'Cancel·lat':'Per jugar';
 return `<button type="button" class="match-row" data-action="match" data-id="${esc(m.partit_id)}"><span class="match-date"><b>${esc(d[0])}</b>${esc(d.slice(1).join(' '))}</span><div><div class="match-teams">${esc(m.local)}<span class="vs">vs.</span>${esc(m.visitant)}</div><div class="match-info"><span>Jornada ${esc(m.jornada)} · ${esc(dateLabel(m.data,'weekday'))}</span><span class="camp-info">${icon('map')}${esc(m.camp_nom||'Camp pendent')}</span></div></div><span class="match-status">${m.estat==='jugat'?`<span class="match-score">${esc(m.gols_local)} : ${esc(m.gols_visitant)}</span>`:`<span class="match-time">${esc(m.hora||'—')}</span>`}${badge(status,r?.type||'')}</span>${icon('chevron')}</button>`;
}
function gallery(){
 if(!matches().length)return heading('Els nostres records','Instants de temporada','El que passa al camp, ho guardem en família.')+empty('Els records encara han de venir','Quan afegim el calendari, podreu compartir les fotografies de cada partit.','photos');
 if(!state.galleryMatch)state.galleryMatch=(lastMatch(matches())||nextMatch(matches())||sortedMatches(matches())[0]).partit_id;
 const selected=matches().find(m=>m.partit_id===state.galleryMatch);
 return `${heading('Els nostres records','Instants de temporada','Les fotos són d’ús privat, dins del grup de famílies.')}<div class="gallery-toolbar"><label class="sr-only" for="gallery-match">Tria un partit</label><select class="input" id="gallery-match">${sortedMatches(matches()).map(m=>`<option value="${esc(m.partit_id)}" ${m.partit_id===state.galleryMatch?'selected':''}>J${m.jornada} · ${dateLabel(m.data,'short')} · ${esc(opponent(m,team()))}</option>`).join('')}</select>${actionBtn('upload',icon('upload')+' Compartir fotos','btn',canWrite()?'':'disabled')}</div>${isAdmin()?`<label class="toggle-line"><input type="checkbox" id="hidden-photos" ${state.includeHidden?'checked':''}> Incloure fotos ocultes · administració</label>`:''}
 ${state.galleryLoading&&!state.gallery.length?`<div class="empty-state"><span class="spinner"></span><p>Buscant els records d’aquest partit…</p></div>`:state.gallery.length?`<div class="photo-grid">${state.gallery.map(f=>`<article class="photo-card ${f.bloquejada?'blocked':''}"><button type="button" class="photo-open" data-action="photo" data-id="${esc(f.foto_id)}" aria-label="Obrir fotografia ${esc(f.peu||'del partit')}"><span class="spinner" data-photo-spinner="${esc(f.foto_id)}"></span><img data-thumb="${esc(f.foto_id)}" alt="${esc(f.peu||'Fotografia del partit')}" hidden></button><div class="photo-meta"><p>${esc(f.peu||'Un instant de partit')}</p><small>${esc(f.pujat_per_nom)} · ${esc(dateLabel(String(f.pujat_at).slice(0,10),'short'))}</small>${f.bloquejada?badge('Oculta','loss'):''}</div></article>`).join('')}</div>${state.galleryNext?`<div class="load-more">${actionBtn('more-photos',state.galleryLoading?'Carregant…':'Veure més records','btn ghost',state.galleryLoading?'disabled':'')}</div>`:''}`:
 empty('Aquest partit encara no té fotos',state.verified?'La primera foto pot ser la teva. Comparteix els records del partit amb la resta de famílies.':'Necessites connexió per consultar la galeria. Les fotos no es guarden offline.','photos',state.verified?actionBtn('upload','Compartir les primeres fotos','btn',canWrite()?'':'disabled'):'')}
 <div class="info-callout">${icon('lock')}<p>No comparteixis les fotografies fora del grup sense autorització. Si una imatge no s’ha de mostrar, avisa l’administrador.</p></div>`;
}
function leagueFixture(club){
 const list=sortedMatches(matches()).filter(m=>String(m.partit_id).startsWith('2026_27_f1_')&&(clubFor(m.local)?.id===club.id||clubFor(m.visitant)?.id===club.id));
 return nextMatch(list)||lastMatch(list)||list[0];
}
function clubMark(club){return club.own?'<img class="club-crest" src="./assets/crest.jpg" alt="Escut CF Vilajuïga">':`<span class="club-monogram" aria-hidden="true">${esc(club.short)}</span>`;}
function fixtureLink(m){return actionBtn('match',`<span><small>El nostre partit · J${esc(m.jornada)} · ${m.local===team()?'A casa':'A fora'}</small><strong>${esc(dateLabel(m.data))} · ${esc(m.hora||'Hora pendent')}</strong></span>${icon('chevron')}`,'club-fixture',`data-id="${esc(m.partit_id)}"`);}
function leagueView(){
 return `${heading('Futbol de l’Alt Empordà','La nostra lliga','Els equips amb qui compartirem la temporada.')}<section class="league-banner"><div><p class="eyebrow">${esc(LEAGUE.season)} · ${esc(LEAGUE.phase)}</p><h2>${esc(LEAGUE.name)}</h2><p>${esc(LEAGUE.organizer)}</p><span>${esc(LEAGUE.format)}</span></div><div class="league-count"><b>8</b><span>equips<br>una mateixa passió</span></div></section><div class="league-grid">${CLUBS.map(club=>{const m=leagueFixture(club);return `<article class="club-card ${club.own?'our-club':''}" data-club="${esc(club.id)}"><div class="club-heading">${clubMark(club)}<div><p>${esc(club.town)}</p><h2>${esc(club.name)}</h2>${club.own?badge('Som nosaltres','win'):''}</div></div><div class="club-field">${icon('map')}<div><h3>${esc(club.field)}</h3><p>${esc(club.address)}</p></div></div><div class="club-actions">${actionBtn('club','Coneix l’equip','btn secondary small',`data-id="${esc(club.id)}"`)}<a class="btn ghost small" href="${esc(clubMapsUrl(club))}" target="_blank" rel="noopener noreferrer" aria-label="Com arribar al camp de ${esc(club.name)}">${icon('map')} Com arribar-hi</a></div>${m?fixtureLink(m):''}</article>`;}).join('')}</div><div class="league-footnote"><p>${icon('info')} Dates i rivals segons el calendari facilitat. A les fitxes trobaràs les fonts de cada camp i les precisions d’accés disponibles.</p><p>Informació consultada el ${esc(dateLabel(LEAGUE.checked,'short'))} de 2026.</p></div>`;
}
function clubDetails(id){
 const club=CLUBS.find(c=>c.id===id);if(!club)return;const m=leagueFixture(club);
 openModal(club.name,`<div class="club-profile"><div class="club-heading">${clubMark(club)}<div><p>${esc(club.town)} · Alt Empordà</p><h3>${esc(club.name)}</h3>${club.own?badge('El nostre equip','win'):badge(LEAGUE.phase)}</div></div><p class="club-description">${esc(club.description)}</p><div class="club-field">${icon('map')}<div><h3>${esc(club.field)}</h3><p>${esc(club.address)}</p></div></div>${club.note?`<p class="venue-note">${esc(club.note)}</p>`:''}<a class="btn" href="${esc(clubMapsUrl(club))}" target="_blank" rel="noopener noreferrer">${icon('map')} Com arribar al seu camp</a>${m?fixtureLink(m):''}<div class="club-sources"><h3>Fonts de la informació</h3><ul>${club.sources.map(source=>`<li><a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.label)} ${icon('arrow')}</a></li>`).join('')}</ul><p>Calendari: Aleví masculí · Fase 1 · Grup 1 · Anada.<br>Consulta de les ubicacions: 6 d’octubre de 2026.</p></div></div>`);
}
function teamView(){
 const players=state.data.jugadors||[],enabled=state.data.features?.player_cards;
 const add=isAdmin()&&enabled?actionBtn('add-player',icon('team')+' Afegir jugador','btn',canWrite()?'':'disabled'):'';
 return `${heading('La nostra col·lecció','Els cromos de l’equip','Cada jugador, una part de la nostra història.',add)}<div class="album-heading"><div>${icon('ball')}<span>CF Vilajuïga · ${esc(state.data.config?.temporada||'2026/27')}</span></div><span>${players.length} ${players.length===1?'cromo':'cromos'} · Aleví</span></div>${players.length?`<div class="album-grid">${players.map(j=>`<div class="album-slot"><button class="card-open" type="button" data-action="player" data-id="${esc(j.jugador_id)}" aria-label="Obrir el cromo de ${esc(j.nom)}">${playerCard(j,{season:state.data.config?.temporada})}</button>${isAdmin()&&enabled?actionBtn('edit-player',icon('edit')+' Editar cromo','card-edit',`data-id="${esc(j.jugador_id)}" ${canWrite()?'':'disabled'}`):''}</div>`).join('')}</div>`:`<section class="album-empty"><div class="album-example">${playerCard({nom:'El teu nom',dorsal:'10',posicio:'Migcampista'},{preview:true,season:state.data.config?.temporada})}<small>Mostra del disseny · Dades d’exemple</small></div><div class="album-invitation"><p class="eyebrow">L’àlbum comença aquí</p><h2>Petits jugadors.<br>Grans protagonistes.</h2><p>El nom, el dorsal, la posició i el retrat. La nostra col·lecció, feta amb les persones que fan equip.</p>${add||'<p class="hint">Els cromos s’ompliran quan afegim els jugadors.</p>'}</div></section>`}<div class="info-callout">${icon('lock')}<p>Els retrats es comparteixen només amb les famílies. Les restriccions de fotografies de cada jugador també s’apliquen als cromos.</p></div>`;
}
const portraitKey=j=>j.jugador_id+':'+j.retrat_version;
function paintPortraits(){
 for(const j of state.data?.jugadors||[]){const key=portraitKey(j);if(!state.portraits.has(key))continue;const url=state.portraits.get(key);
  document.querySelectorAll(`[data-player-card="${CSS.escape(j.jugador_id)}"]`).forEach(card=>{const image=card.querySelector('[data-portrait]'),fallback=card.querySelector('.card-silhouette');if(url&&image){image.src=url;image.hidden=false;if(fallback)fallback.hidden=true;}else if(fallback){const label=fallback.querySelector('small');if(label)label.textContent='Retrat no disponible';}});
 }
}
async function loadPortraits(){
 if(!state.data?.features?.player_cards||!state.verified||!navigator.onLine)return;
 const generation=state.viewGeneration,token=state.session?.token;
 const list=(state.data.jugadors||[]).filter(j=>j.te_retrat&&!state.portraits.has(portraitKey(j))&&!state.portraitLoads.has(portraitKey(j)));
 list.forEach(j=>state.portraitLoads.add(portraitKey(j)));
 try{await mediaBatches(list,async chunk=>{
  try{const r=await api({action:'getPlayerPortraits',jugador_ids:chunk.map(j=>j.jugador_id),include_hidden:isAdmin()});if(state.viewGeneration!==generation||state.session?.token!==token||!navigator.onLine)return false;
   for(const j of chunk){const item=r.items.find(x=>x.jugador_id===j.jugador_id);state.portraits.set(portraitKey(j),item?.ok&&item.retrat_version===j.retrat_version?imageUrl(item.base64):null);state.portraitLoads.delete(portraitKey(j));}paintPortraits();
  }catch(e){if(state.viewGeneration!==generation)return false;chunk.forEach(j=>{state.portraits.set(portraitKey(j),null);state.portraitLoads.delete(portraitKey(j));});paintPortraits();return false;}
 },()=>state.viewGeneration===generation&&state.session?.token===token&&navigator.onLine);}
 finally{if(state.viewGeneration===generation)list.forEach(j=>state.portraitLoads.delete(portraitKey(j)));}
}
function playerDetails(id){const j=state.data.jugadors?.find(j=>j.jugador_id===id);if(!j)return;openModal(j.nom,`<div class="player-card-detail">${playerCard(j,{large:true,season:state.data.config?.temporada})}</div>`,isAdmin()&&state.data.features?.player_cards?actionBtn('edit-player',icon('edit')+' Editar cromo','btn',`data-id="${esc(id)}" ${canWrite()?'':'disabled'}`):'','player-dialog');paintPortraits();loadPortraits().catch(()=>{});}
function playerEditor(id){
 if(!isAdmin()||!canWrite()||!state.data.features?.player_cards)return;
 if(state.playerDraft&&state.playerDraft.id!==id){toast('Acaba de guardar el cromo pendent abans d’editar-ne un altre.');return;}
 const j=state.data.jugadors?.find(j=>j.jugador_id===id)||{nom:'',dorsal:'',posicio:'',actualitzat_at:''};
 const pending=state.playerDraft?.payload,values=pending||j;
 openModal(id?'Editar cromo':'Nou cromo',`<form id="player-form" data-id="${esc(id||'')}" data-expected="${esc(pending?.expected_updated_at??j.actualitzat_at??'')}"><div class="form-field"><label for="player-name">Nom</label><input class="input" id="player-name" name="nom" maxlength="60" value="${esc(values.nom)}" placeholder="Nom del jugador" required><p class="hint">Nom de pila, sense cognoms.</p></div><div class="player-form-pair"><div class="form-field"><label for="player-jersey">Dorsal</label><input class="input" id="player-jersey" name="dorsal" type="number" min="0" max="99" step="1" value="${esc(values.dorsal??'')}"></div><div class="form-field"><label for="player-position">Posició</label><select class="input" id="player-position" name="posicio"><option value="">Per definir</option>${POSITIONS.map(p=>`<option ${p===values.posicio?'selected':''}>${p}</option>`).join('')}</select></div></div><div class="form-field"><label for="player-portrait">Retrat ${j.te_retrat?'nou (opcional)':'(opcional)'}</label><input class="input" id="player-portrait" name="retrat" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif"><p class="hint">Pots preparar la foto abans. Format vertical, retrat centrat. L’app la comprimeix i la desa en privat.</p></div><div class="player-live-preview" id="player-live-preview">${playerCard({...j,nom:values.nom||'El teu nom',dorsal:values.dorsal,posicio:values.posicio,te_retrat:false},{preview:true,season:state.data.config?.temporada})}</div>${j.no_mostrar?'<p class="venue-note">Aquest jugador té activada la restricció de fotografies. El cromo continuarà ocult per a les famílies.</p>':''}<p id="player-error" class="error-msg" role="alert" hidden></p><button type="submit" class="btn full">${state.playerDraft?'Reintentar el mateix cromo':'Guardar cromo'}</button></form>`);paintPortraits();
}
function updatePlayerPreview(form){if(state.playerDraft)return;const values=new FormData(form);$('player-live-preview').innerHTML=playerCard({nom:String(values.get('nom')||'El teu nom'),dorsal:values.get('dorsal'),posicio:values.get('posicio')},{preview:true,season:state.data.config?.temporada});const file=form.elements.retrat.files[0];if(state.playerPreviewUrl){URL.revokeObjectURL(state.playerPreviewUrl);state.images.delete(state.playerPreviewUrl);state.playerPreviewUrl=null;}if(file){const img=document.createElement('img');img.className='player-portrait';img.alt='Previsualització local del retrat';img.src=imageUrlFromFile(file);state.playerPreviewUrl=img.src;const frame=$('player-live-preview').querySelector('.card-photo');frame.querySelector('.card-silhouette').hidden=true;frame.appendChild(img);}}
function imageUrlFromFile(file){const url=URL.createObjectURL(file);state.images.add(url);return url;}
async function savePlayer(form){
 if(!isAdmin()||!canWrite())return;const token=state.session?.token,values=new FormData(form),button=form.querySelector('[type=submit]');
 const draft={action:'savePlayer',jugador_id:state.playerDraft?.payload.jugador_id||form.dataset.id||requestId(),nom:String(values.get('nom')||'').trim(),dorsal:values.get('dorsal')===''?'':Number(values.get('dorsal')),posicio:values.get('posicio'),expected_updated_at:form.dataset.expected};
 const signature=JSON.stringify(draft),file=form.elements.retrat.files[0];
 if(state.playerDraft&&(state.playerDraft.signature!==signature||file)){ $('player-error').hidden=false;$('player-error').textContent='Hi ha un desament pendent. Reintenta els mateixos valors abans de canviar-los.';return;}
 state.uploading=true;button.disabled=true;button.textContent='Guardant cromo…';modal.querySelector('[data-action=close]').disabled=true;
 try{
  if(!state.playerDraft){const payload={...draft,request_id:requestId()};if(file){const prepared=await prepareUpload(file,{config:{...state.data.config,image_max_dimension:state.data.config.portrait_max_dimension||1200,upload_max_bytes:state.data.config.portrait_max_bytes||409600}});payload.photo_base64=prepared.photo_base64;payload.foto_id=prepared.foto_id;}state.playerDraft={id:form.dataset.id||undefined,signature,payload};}
  await api(state.playerDraft.payload);if(state.session?.token!==token)return;state.playerDraft=null;state.uploading=false;modal.close();await refresh(false);toast('Cromo guardat a l’àlbum.');
 }catch(e){if(state.session?.token!==token)return;if(['VALIDATION','FORBIDDEN','CONFLICT'].includes(e.code))state.playerDraft=null;$('player-error').hidden=false;$('player-error').textContent=e.message;button.textContent=state.playerDraft?'Reintentar el mateix cromo':'Guardar cromo';if(state.playerDraft)form.elements.retrat.value='';}
 finally{state.uploading=false;if(button.isConnected){button.disabled=false;modal.querySelector('[data-action=close]').disabled=false;}}
}

function openModal(title,body,footer='',className=''){modal.className=className;modal.innerHTML=`<header class="dialog-header"><h2 id="modal-title">${esc(title)}</h2>${actionBtn('close',icon('close'),'icon-btn','aria-label="Tancar"')}</header><div class="dialog-body">${body}</div>${footer?`<footer class="dialog-footer">${footer}</footer>`:''}`;if(!modal.open)modal.showModal();}
function matchDetails(id){
 const m=matches().find(m=>m.partit_id===id);if(!m)return;state.modalMatch=id;
 const host=clubFor(m.local),rival=clubFor(opponent(m,team()));
 const url=host&&m.camp_nom===host.field&&m.camp_adreca===host.address?clubMapsUrl(host):mapsUrl(m),r=result(m,team());const teamBlock=name=>`<div class="detail-team">${name===team()?`<img src="./assets/crest.jpg" alt="">`:`<span class="opponent-icon">${icon('ball')}</span>`}${esc(name)}</div>`;
 openModal('Jornada '+m.jornada,`<div class="detail-top"><p class="eyebrow">${esc(dateLabel(m.data))}</p><div class="detail-teams">${teamBlock(m.local)}<div class="detail-score">${m.estat==='jugat'?`${esc(m.gols_local)} : ${esc(m.gols_visitant)}`:'VS'}</div>${teamBlock(m.visitant)}</div><div style="margin-top:20px">${badge(r?.label||m.estat,r?.type||'')}</div></div>
 <div class="detail-info"><div>${icon('clock')}<span><strong>${esc(m.hora||'Hora pendent de confirmar')}</strong><small>${esc(dateLabel(m.data))}</small></span></div><div>${icon('map')}<span><strong>${esc(m.camp_nom||'Camp pendent')}</strong><small>${esc(m.camp_adreca||'')}</small></span></div></div><div class="detail-actions">${url?`<a class="btn" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${icon('map')} Com arribar-hi</a>`:''}${m.hora?actionBtn('add-calendar',icon('calendar')+' Al calendari','btn secondary',`data-id="${esc(id)}"`):''}</div>
 ${rival?`<div class="rival-link">${actionBtn('club',icon('ball')+' Coneix '+esc(rival.name),'btn ghost',`data-id="${esc(rival.id)}"`)}</div>`:''}${host?.note&&m.camp_nom===host.field?`<p class="venue-note">${esc(host.note)}</p>`:''}
 <section class="chronicle"><h3>La crònica</h3><p>${m.cronica?esc(m.cronica):'<span class="muted">Encara no hi ha crònica. La història d’aquest partit està per escriure.</span>'}</p></section>`,`${canEdit()?actionBtn('edit-match',icon('edit')+' Editar partit','btn ghost',`data-id="${esc(id)}" ${canWrite()?'':'disabled'}`):''}${actionBtn('match-gallery',icon('photos')+' Fotos del partit','btn',`data-id="${esc(id)}"`)}`);
}
function editor(id,mode='result'){
 if(!canEdit()||!canWrite())return;let m=matches().find(m=>m.partit_id===id);if(!m)return;const pending=state.pendingEdit?.payload;if(pending?.partit_id===id&&pending.action===(mode==='result'?'updateResult':'updateChronicle'))m={...m,...pending,actualitzat_at:pending.expected_updated_at};state.modalMatch=id;state.editMode=mode;
 openModal('Editar jornada '+m.jornada,`<div class="edit-tabs">${actionBtn('edit-tab','Marcador','btn small '+(mode==='result'?'':'ghost'),'data-mode="result"')}${actionBtn('edit-tab','Crònica','btn small '+(mode==='chronicle'?'':'ghost'),'data-mode="chronicle"')}</div><form id="edit-form" data-id="${esc(id)}" data-expected="${esc(m.actualitzat_at||'')}">${mode==='result'?`<div class="form-field"><label for="match-status">Estat del partit</label><select id="match-status" name="estat" class="input">${[['pendent','Per jugar'],['jugat','Jugat'],['ajornat','Ajornat'],['cancel·lat','Cancel·lat']].map(([v,l])=>`<option value="${v}" ${m.estat===v?'selected':''}>${l}</option>`).join('')}</select></div><div class="score-form"><div class="form-field"><label for="gols-local">${esc(m.local)}</label><input id="gols-local" name="gols_local" class="input" type="number" min="0" max="99" step="1" value="${m.gols_local===''?'':esc(m.gols_local)}" ${m.estat==='jugat'?'required':'disabled'}></div><div class="form-field"><label for="gols-visitant">${esc(m.visitant)}</label><input id="gols-visitant" name="gols_visitant" class="input" type="number" min="0" max="99" step="1" value="${m.gols_visitant===''?'':esc(m.gols_visitant)}" ${m.estat==='jugat'?'required':'disabled'}></div></div>`:`<div class="form-field"><label for="match-chronicle">La història del partit</label><textarea id="match-chronicle" name="cronica" class="input" maxlength="${state.data.config?.cronica_max_chars||1500}" rows="7">${esc(m.cronica||'')}</textarea><p class="hint">Màxim ${state.data.config?.cronica_max_chars||1500} caràcters. Evita cognoms i dades personals dels nens.</p></div>`}<p class="error-msg" id="edit-error" role="alert" hidden></p><button type="submit" class="btn full" style="margin-top:25px">Guardar els canvis</button></form>`);
}
async function saveEdit(form){
 if(!canEdit()||!canWrite())return;const values=new FormData(form),chronicle=state.editMode==='chronicle';
 const original=state.pendingEdit;
 const draft={action:chronicle?'updateChronicle':'updateResult',partit_id:form.dataset.id,expected_updated_at:form.dataset.expected,...(chronicle?{cronica:String(values.get('cronica'))}:{estat:values.get('estat'),gols_local:values.get('estat')==='jugat'?Number(values.get('gols_local')):null,gols_visitant:values.get('estat')==='jugat'?Number(values.get('gols_visitant')):null})};
 const signature=JSON.stringify(draft);
 if(original&&original.signature!==signature){$('edit-error').hidden=false;$('edit-error').textContent='Hi ha una petició pendent. Reintenta els mateixos valors abans de canviar-los.';return;}
 const transaction=original||{signature,payload:{...draft,request_id:requestId()}};state.pendingEdit=transaction;
 const btn=form.querySelector('button[type=submit]');btn.disabled=true;btn.textContent='Guardant…';
 try{const r=await api(transaction.payload);const index=state.data.partits.findIndex(m=>m.partit_id===r.partit.partit_id);state.data.partits[index]=r.partit;state.pendingEdit=null;cacheData();await refresh(false);matchDetails(r.partit.partit_id);toast('Canvis guardats.');}
 catch(e){if(!['OUTCOME_UNKNOWN','INTERNAL_ERROR','BUSY'].includes(e.code)&&e.name!=='TypeError')state.pendingEdit=null;const err=$('edit-error');if(err){err.hidden=false;err.textContent=e.message+(e.code==='CONFLICT'?' Tanca i actualitza abans d’editar.':'');}btn.disabled=false;btn.textContent='Reintentar el mateix canvi';}
}
function cacheData(){if(state.session&&state.data)write(PREFIX+'data:'+state.session.cacheKey,{savedAt:Date.now(),data:state.data});}
function applyBootstrap(data){
 // Reuse only portraits still authorized by a fresh server snapshot, in the same view and role.
 const keep=new Map(),sameRole=state.data?.user?.rol===data.user?.rol;
 if(data.features?.fresh_permissions&&data.user?.privacyAccepted&&state.view==='team'&&sameRole){
  for(const j of data.jugadors||[]){const key=portraitKey(j),url=state.portraits.get(key);if(j.te_retrat&&url)keep.set(key,url);}
 }
 const keptUrls=new Set(keep.values());state.viewGeneration++;
 state.images.forEach(url=>{if(!keptUrls.has(url)){URL.revokeObjectURL(url);state.images.delete(url);}});
 state.portraits=keep;state.portraitLoads.clear();state.thumbs.clear();state.gallery=[];state.galleryNext=null;
 if(modal.open&&(state.viewerPhoto||modal.querySelector('.player-card-detail')))modal.close();
 state.data=data;state.verified=true;cacheData();
}
async function refresh(show=true){
 if(!state.session||state.privacy||state.loading)return;const sessionToken=state.session.token;state.loading=true;state.error='';if(show)render();
 try{const data=await api({action:'bootstrap'});if(state.session?.token!==sessionToken)return;applyBootstrap(data);}
 catch(e){if(state.session?.token!==sessionToken)return;state.verified=false;forgetImages();state.gallery=[];if(modal.open&&!state.uploading)modal.close();if(e.code==='PRIVACY_REQUIRED'){clearLocal();state.error='El compromís de privacitat ha canviat. Torna a entrar per llegir-lo.';}else if(e.code!=='UNAUTHORIZED')state.error=state.data?'No s’han pogut obtenir dades noves. Pots consultar l’última versió guardada.':e.message;}
 finally{state.loading=false;render();if(state.view==='photos'&&state.verified)await loadGallery(true);if(state.view==='team'&&state.verified)await loadPortraits();}
}
async function login(form){
 const values=new FormData(form),phone=String(values.get('telefon')||'').trim(),code=String(values.get('codi')||'');state.loginBusy=true;state.error='';const btn=form.querySelector('[type=submit]');btn.disabled=true;btn.textContent='Entrant…';
 try{const r=await apiPost(API_URL,{action:'login',telefon:phone,...(code?{codi:code}:{}),include_bootstrap:true,user_agent:navigator.userAgent});clearLocal();state.authUser=r.user;state.session={token:r.token,expiresAt:r.expiresAt,cacheKey:requestId()};if(!r.user.privacyAccepted)state.privacy=r.privacy;else{persistSession();if(r.bootstrap)applyBootstrap(r.bootstrap);else await refresh(false);}}
 catch(e){state.error=e.message;}
 finally{state.loginBusy=false;render();}
}
async function acceptPrivacy(form){
 if(!new FormData(form).get('accepted')||!state.privacy)return;state.loginBusy=true;state.error='';const version=state.privacy.version;
 const payload=state.privacyRequest||{action:'acceptPrivacy',request_id:requestId(),accepted:true,version,include_bootstrap:true};state.privacyRequest=payload;render();
 try{const r=await api(payload);state.privacy=null;state.privacyRequest=null;persistSession();if(r.bootstrap)applyBootstrap(r.bootstrap);else await refresh(false);}
 catch(e){state.error=e.message;}
 finally{state.loginBusy=false;render();}
}
async function loadGallery(reset=false){
 if(!state.verified||!navigator.onLine||state.galleryLoading||!state.galleryMatch)return;const selected=state.galleryMatch,hidden=state.includeHidden,token=state.session?.token;
 state.galleryLoading=true;if(reset){forgetImages();state.gallery=[];state.galleryNext=null;}render();
 try{const r=await api({action:'listPhotos',partit_id:selected,include_hidden:hidden,...(!reset&&state.galleryNext?{after:state.galleryNext}:{}),limit:30});if(state.galleryMatch!==selected||state.includeHidden!==hidden||state.session?.token!==token)return;state.gallery=reset?r.fotos:[...state.gallery,...r.fotos];state.galleryNext=r.nextCursor;}
 catch(e){if(e.code!=='UNAUTHORIZED')toast(e.message);}
 finally{state.galleryLoading=false;render();if(state.session?.token===token&&(state.galleryMatch!==selected||state.includeHidden!==hidden))await loadGallery(true);}
 await loadThumbs();
}
function paintThumbs(){state.thumbs.forEach((url,id)=>{const img=document.querySelector(`[data-thumb="${CSS.escape(id)}"]`);if(img){img.src=url;img.hidden=false;}const spinner=document.querySelector(`[data-photo-spinner="${CSS.escape(id)}"]`);if(spinner)spinner.hidden=true;});}
async function loadThumbs(){
 const generation=state.viewGeneration,token=state.session?.token,hidden=state.includeHidden,ids=state.gallery.filter(f=>!state.thumbs.has(f.foto_id)).map(f=>f.foto_id);
 const current=()=>!!token&&state.session?.token===token&&state.view==='photos'&&state.viewGeneration===generation&&navigator.onLine;
 try{await mediaBatches(ids,async chunk=>{const r=await api({action:'getThumbnails',foto_ids:chunk,include_hidden:hidden});if(!current())return false;r.items.forEach(item=>{if(item.ok)state.thumbs.set(item.foto_id,imageUrl(item.base64));else{const img=document.querySelector(`[data-thumb="${CSS.escape(item.foto_id)}"]`);if(img){img.alt='Fotografia no disponible';img.hidden=false;}const spinner=document.querySelector(`[data-photo-spinner="${CSS.escape(item.foto_id)}"]`);if(spinner)spinner.hidden=true;}});paintThumbs();},current);}
 catch(e){if(current())toast('Algunes miniatures no s’han carregat. Actualitza per tornar-ho a provar.');}
}
async function viewPhoto(id){
 if(!state.verified||!navigator.onLine){toast('Necessites connexió per obrir fotografies.');return;}const f=state.gallery.find(f=>f.foto_id===id);if(!f)return;state.viewerPhoto=id;
 modal.className='viewer';modal.innerHTML=`<header class="dialog-header"><h2 id="modal-title">${esc(f.peu||'Un instant de partit')}</h2>${actionBtn('close',icon('close'),'icon-btn','aria-label="Tancar fotografia"')}</header><div class="viewer-media"><span class="spinner"></span></div><div class="viewer-caption"><div><p>${esc(f.peu||'Un record de temporada')}</p><small>Compartida per ${esc(f.pujat_per_nom)}</small></div><div class="viewer-controls">${actionBtn('download-photo',icon('download')+' Descarregar','btn',`data-id="${esc(id)}"`)}${isAdmin()?`${actionBtn('visibility-photo',icon('eye')+(f.no_mostrar?' Mostrar':' Ocultar'),'btn',`data-id="${esc(id)}"`)}${actionBtn('delete-photo',icon('trash')+' Eliminar','btn danger',`data-id="${esc(id)}"`)}`:''}</div></div>`;if(!modal.open)modal.showModal();
 try{const r=await api({action:'getPhoto',foto_id:id,include_hidden:state.includeHidden});if(state.viewerPhoto!==id||!modal.open)return;const media=modal.querySelector('.viewer-media'),img=document.createElement('img');img.src=imageUrl(r.base64);img.alt=f.peu||'Fotografia del partit';media.replaceChildren(img);}
 catch(e){if(modal.open&&state.viewerPhoto===id)modal.querySelector('.viewer-media').textContent=e.message;}
}
function downloadConfirm(id){openModal('Un record per a casa',`<div class="info-callout">${icon('lock')}<p>Ús exclusivament privat i familiar. No publiquis aquesta fotografia a xarxes socials ni la comparteixis fora del grup sense autorització.</p></div><p class="hint">La petició de descàrrega quedarà registrada.</p>`,actionBtn('confirm-download','Acceptar i descarregar','btn',`data-id="${esc(id)}"`));}
function blobDownload(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
async function downloadPhoto(id,button){
 const payload=state.pendingDownload?.foto_id===id?state.pendingDownload:{action:'downloadPhoto',request_id:requestId(),foto_id:id,private_use_ack:true,include_hidden:state.includeHidden};state.pendingDownload=payload;button.disabled=true;
 try{const r=await api(payload);blobDownload(jpegBlob(r.base64),r.filename);state.pendingDownload=null;modal.close();toast('Descàrrega preparada. Només per a ús familiar.');}
 catch(e){if(button.isConnected){button.disabled=false;toast(e.message);}}
}
async function photoVisibility(id){if(!isAdmin()||!canWrite())return;const f=state.gallery.find(f=>f.foto_id===id);if(!f)return;
 const payload={action:f.no_mostrar?'showPhoto':'hidePhoto',request_id:requestId(),foto_id:id,motiu:f.no_mostrar?'':'Ocultada des de l’app'};
 try{await api(payload);modal.close();await loadGallery(true);toast(f.no_mostrar?'Visibilitat actualitzada; les restriccions de jugador continuen aplicant-se.':'Fotografia ocultada.');}catch(e){toast(e.message);}
}
function deleteConfirm(id){openModal('Eliminar aquesta fotografia?',`<p>La fotografia i la miniatura s’eliminaran definitivament de Drive.</p><p class="hint" style="margin-top:14px">Aquesta acció no es pot desfer.</p>`,actionBtn('close','Cancel·lar','btn ghost')+actionBtn('confirm-delete','Eliminar definitivament','btn danger',`data-id="${esc(id)}"`));}
async function deletePhoto(id,button){if(!isAdmin()||!canWrite())return;const payload=state.pendingDelete?.foto_id===id?state.pendingDelete:{action:'deletePhoto',request_id:requestId(),foto_id:id,confirm_permanent:true};state.pendingDelete=payload;button.disabled=true;
 try{const r=await api(payload);if(r.pending){button.disabled=false;button.textContent='Reintentar l’eliminació';toast(r.message);return;}state.pendingDelete=null;modal.close();await loadGallery(true);toast('Fotografia eliminada.');}catch(e){if(button.isConnected)button.disabled=false;toast(e.message);}
}
function uploadDialog(){if(!canWrite()||!state.galleryMatch)return;state.queue=null;openModal('Compartir un tros de partit',`<form id="upload-form"><div class="upload-zone">${icon('upload')}<p>Tria les fotografies del partit</p><small>Les prepararem per al mòbil i les pujarem una a una.</small><label class="sr-only" for="upload-files">Fotografies</label><input id="upload-files" type="file" name="fotos" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif" multiple required></div><div class="form-field"><label for="photo-caption">Peu de foto opcional</label><input id="photo-caption" name="peu" class="input" maxlength="250" placeholder="Un gran matí de futbol"><p class="hint">S’aplicarà a les fotos seleccionades. Evita cognoms.</p></div>${(state.data.jugadors||[]).length?`<fieldset style="border:0;padding:0;margin-top:22px"><legend class="hint">Qui hi apareix? Etiqueta els jugadors, si els reconeixes.</legend><div class="player-tags">${state.data.jugadors.map(j=>`<label class="player-tag"><input type="checkbox" name="jugadors" value="${esc(j.jugador_id)}">${esc(j.nom)}${j.no_mostrar?' · no mostrar':''}</label>`).join('')}</div></fieldset>`:''}<div class="info-callout">${icon('lock')}<p>Comprova que aquestes fotos es poden compartir amb el grup. Les etiquetes ajuden a respectar les restriccions dels jugadors.</p></div><button type="submit" class="btn full">Pujar les fotografies</button></form>`);}
async function beginUpload(form){
 if(!canWrite())return;const files=[...form.querySelector('[type=file]').files];if(!files.length)return;
 if(files.length>40){toast('Tria com a màxim 40 fotografies per tanda.');return;}
 state.queue={partit_id:state.galleryMatch,jugadors_ids:[...form.querySelectorAll('[name=jugadors]:checked')].map(e=>e.value),peu:form.elements.peu.value,items:files.map(file=>({file,name:file.name,status:'pending',prepared:null,error:''}))};await uploadQueue();
}
function queueDialog(){
 const q=state.queue;if(!q)return;const done=q.items.filter(i=>i.status==='done').length;
 openModal('Records de partit',`<p>${done} de ${q.items.length} fotografies pujades</p><div class="progress" aria-label="Progrés de la pujada"><span style="width:${Math.round(done/q.items.length*100)}%"></span></div><div class="queue-list">${q.items.map(i=>`<div class="queue-item ${i.status}"><span>${esc(i.name)}</span><span class="status">${i.status==='done'?'Pujada ✓':i.status==='uploading'?'Pujant…':i.status==='failed'?'Ha fallat':'Pendent'}</span></div>`).join('')}</div>${q.items.some(i=>i.error)?`<p class="error-msg" role="alert">${esc(q.items.find(i=>i.error).error)}</p>`:''}`,
 state.uploading?'<p class="hint">Pujant una fotografia cada vegada…</p>':done===q.items.length?actionBtn('close','Tornar a la galeria','btn'):actionBtn('retry-uploads','Reintentar i continuar','btn')+actionBtn('close','Tancar','btn ghost'));
 const close=modal.querySelector('[data-action=close]');if(close)close.disabled=state.uploading;
}
async function uploadQueue(){
 if(!state.queue||state.uploading||!state.verified||!navigator.onLine)return;state.uploading=true;queueDialog();const q=state.queue,sessionToken=state.session?.token;
 for(const item of q.items){if(item.status==='done')continue;if(!navigator.onLine){item.status='failed';item.error='S’ha perdut la connexió. Les fotos anteriors ja estan guardades.';break;}
  item.status='uploading';item.error='';queueDialog();
  try{if(!item.prepared)item.prepared=await prepareUpload(item.file,{partit_id:q.partit_id,jugadors_ids:q.jugadors_ids,peu:q.peu,config:state.data.config});await api(item.prepared);if(state.session?.token!==sessionToken)break;item.status='done';item.prepared=null;}
  catch(e){item.status='failed';item.error=e.message;if(['VALIDATION','FORBIDDEN','PRIVACY_REQUIRED'].includes(e.code))item.prepared=null;break;}
 }
 state.uploading=false;if(state.session?.token===sessionToken){queueDialog();await loadGallery(true);}
}
async function navigate(view){if(!['home','calendar','photos','team','league'].includes(view))return;if(['photos','team'].includes(state.view)&&view!==state.view){forgetImages();state.gallery=[];state.galleryNext=null;}state.view=view;state.error='';render();window.scrollTo({top:0,behavior:'instant'});if(view==='photos')await loadGallery(true);}
function account(){const roleNames={familia:'Família',editor:'Editor',admin:'Administrador'};openModal('El teu espai',`<div class="account-summary"><div class="avatar">${esc(initials(user().nom))}</div><div><h3>${esc(user().nom)}</h3><p>${esc(roleNames[user().rol]||'Família')}</p></div></div><div class="account-links">${actionBtn('install',icon('phone')+' Afegir l’app al mòbil','btn secondary')}${actionBtn('about',icon('info')+' Sobre aquesta app','btn ghost')}${actionBtn('logout',icon('logout')+' Tancar sessió','btn ghost',state.uploading?'disabled':'')}</div><p class="hint" style="margin-top:25px">Versió ${APP_VERSION} · Sessió fins al ${esc(state.session?.expiresAt?dateLabel(state.session.expiresAt.slice(0,10)):'—')}</p>`);}
function about(){openModal('Futbol, família i poble',`<div class="credits"><p>Aquesta és l’app privada de les famílies del CF Vilajuïga. Calendari, resultats i records de la temporada.</p><p><strong>Privacitat</strong><br>Les fotografies són d’ús familiar. No les publiquis ni les comparteixis fora del grup sense autorització.</p><p><strong>Sense connexió</strong><br>Pots consultar les últimes dades guardades de la temporada mentre la sessió sigui vigent. Les fotos i les edicions necessiten connexió.</p><p><strong>Imatges del disseny</strong><br>Foto ambiental: <a href="https://unsplash.com/photos/soccer-ball-rests-in-the-grass-at-sunset-GTxVeJj1UU0" target="_blank" rel="noopener noreferrer">Nikola Tomašić · Unsplash</a>. No és una fotografia del camp de Vilajuïga.<br>Escut publicat a <a href="https://futbol-regional.es/equipo.php?equ=15064" target="_blank" rel="noopener noreferrer">Fútbol Regional Español</a>; pendent de confirmar amb el club que aquesta és la versió actual. La icona de l’app és un monograma propi.</p><p>Tipografia Barlow Condensed: Jeremy Tribby, SIL Open Font License. Versió ${APP_VERSION}.</p></div>`);}
async function install(){
 if(state.installEvent){const e=state.installEvent;state.installEvent=null;await e.prompt();return;}
 openModal('Sempre a mà',`<div class="info-callout">${icon('phone')}<p>Des d’Android: obre el menú del navegador i tria «Instal·lar app» o «Afegir a la pantalla d’inici».<br><br>Des d’iPhone: obre l’app amb Safari, toca «Compartir» i «Afegir a la pantalla d’inici».</p></div><p class="hint">Si el navegador encara no ofereix instal·lació, podràs continuar fent servir l’app des de l’enllaç.</p>`);
}
async function logout(){if(state.uploading)return;const session=state.session;clearLocal();state.pendingEdit=null;state.pendingDownload=null;state.pendingDelete=null;state.privacyRequest=null;state.error='';render();if(session&&navigator.onLine){try{await apiPost(API_URL,{action:'logout',token:session.token,request_id:requestId(),user_agent:navigator.userAgent});}catch{toast('Sessió esborrada d’aquest dispositiu. No s’ha pogut confirmar el tancament al servidor.');}}}
async function action(target){
 const a=target.dataset.action,id=target.dataset.id;
 if(a==='close'){if(!state.uploading)modal.close();return;}
 if(a==='navigate')return navigate(target.dataset.view);
 if(a==='filter'){state.filter=target.dataset.filter;render();return;}
 if(a==='refresh')return refresh();
 if(a==='match')return matchDetails(id);
 if(a==='club')return clubDetails(id);
 if(a==='player')return playerDetails(id);
 if(a==='edit-player')return playerEditor(id);
 if(a==='add-player')return playerEditor();
 if(a==='match-gallery'){modal.close();state.galleryMatch=id;return navigate('photos');}
 if(a==='edit-match')return editor(id);
 if(a==='edit-tab')return editor(state.modalMatch,target.dataset.mode);
 if(a==='toggle-code'){const field=$('code-field');field.hidden=!field.hidden;target.setAttribute('aria-expanded',String(!field.hidden));if(!field.hidden)$('login-code').focus();return;}
 if(a==='upload')return uploadDialog();
 if(a==='retry-uploads')return uploadQueue();
 if(a==='more-photos')return loadGallery(false);
 if(a==='photo')return viewPhoto(id);
 if(a==='download-photo')return downloadConfirm(id);
 if(a==='confirm-download')return downloadPhoto(id,target);
 if(a==='visibility-photo')return photoVisibility(id);
 if(a==='delete-photo')return deleteConfirm(id);
 if(a==='confirm-delete')return deletePhoto(id,target);
 if(a==='account')return account();
 if(a==='about')return about();
 if(a==='install')return install();
 if(a==='logout')return logout();
 if(a==='add-calendar'){const m=matches().find(m=>m.partit_id===id),ics=m&&icsForMatch(m);if(ics)blobDownload(new Blob([ics],{type:'text/calendar;charset=utf-8'}),'CF-Vilajuiga-'+id+'.ics');}
}
document.addEventListener('click',e=>{const target=e.target.closest('[data-action]');if(!target||target.disabled)return;action(target).catch(err=>toast(err.message));});
document.addEventListener('submit',e=>{const form=e.target;const handler={'login-form':login,'privacy-form':acceptPrivacy,'edit-form':saveEdit,'upload-form':beginUpload,'player-form':savePlayer}[form.id];if(handler){e.preventDefault();handler(form).catch(err=>toast(err.message));}});
document.addEventListener('input',e=>{if(e.target.closest('#player-form'))updatePlayerPreview(e.target.closest('#player-form'));});
document.addEventListener('change',e=>{if(e.target.closest('#player-form'))updatePlayerPreview(e.target.closest('#player-form'));if(e.target.id==='gallery-match'){state.galleryMatch=e.target.value;loadGallery(true);}if(e.target.id==='hidden-photos'){state.includeHidden=e.target.checked;loadGallery(true);}if(e.target.id==='match-status'){const played=e.target.value==='jugat';['gols-local','gols-visitant'].forEach(id=>{const input=$(id);input.disabled=!played;input.required=played;});}});
modal.addEventListener('cancel',e=>{if(state.uploading)e.preventDefault();});
modal.addEventListener('close',()=>{state.viewerPhoto=null;state.queue=state.uploading?state.queue:null;});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();state.installEvent=e;});
window.addEventListener('offline',()=>{state.verified=false;forgetImages();state.gallery=[];if(modal.open&&!state.uploading)modal.close();render();});
window.addEventListener('online',()=>refresh());
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state.session&&!state.privacy&&!state.uploading)refresh(false);});
window.addEventListener('storage',e=>{if(e.key===SESSION_KEY){const s=read(SESSION_KEY);if(!s||s.token!==state.session?.token){clearLocal();state.error='La sessió ha canviat en una altra pestanya. Torna a entrar.';render();}}});
window.addEventListener('beforeunload',e=>{if(state.uploading){e.preventDefault();e.returnValue='';}});
setInterval(()=>{if(state.session&&!usableSession(state.session)){clearLocal();state.error='La sessió ha caducat. Torna a entrar.';render();}},30000);
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
render();if(state.session&&!state.privacy)refresh(false);
