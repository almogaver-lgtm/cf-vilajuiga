import {TIME_ZONE,TEAM_NAME} from './config.mjs';
export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function localNow(date=new Date()) {
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
 const get=k=>parts.find(p=>p.type===k).value;return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`;
}
export function sortedMatches(matches=[]) {return [...matches].sort((a,b)=>`${a.data} ${a.hora||'23:59'}`.localeCompare(`${b.data} ${b.hora||'23:59'}`)||String(a.partit_id).localeCompare(String(b.partit_id)));}
export function nextMatch(matches,now=localNow()) {return sortedMatches(matches).find(m=>m.estat==='pendent'&&`${m.data} ${m.hora||'23:59'}`>=now)||null;}
export function lastMatch(matches) {return sortedMatches(matches).filter(m=>m.estat==='jugat').at(-1)||null;}
export function opponent(m,team=TEAM_NAME) {return m.local===team?m.visitant:m.local;}
export function result(m,team=TEAM_NAME) {
 if(m.estat!=='jugat'||!Number.isInteger(m.gols_local)||!Number.isInteger(m.gols_visitant))return null;
 const gf=m.local===team?m.gols_local:m.gols_visitant,gc=m.local===team?m.gols_visitant:m.gols_local;
 return {gf,gc,type:gf>gc?'win':gf===gc?'draw':'loss',label:gf>gc?'Victòria':gf===gc?'Empat':'Derrota'};
}
export function dateLabel(iso,style='full') {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(iso)))return 'Data pendent';
 const options=style==='short'?{day:'numeric',month:'short'}:style==='month'?{month:'long',year:'numeric'}:{weekday:'long',day:'numeric',month:'long'};
 return new Intl.DateTimeFormat('ca-ES',{...options,timeZone:TIME_ZONE}).format(new Date(iso+'T12:00:00Z'));
}
export function mapsUrl(m) {
 const gps=m.camp_lat!==''&&m.camp_lng!==''&&m.camp_lat!=null&&m.camp_lng!=null&&Number.isFinite(Number(m.camp_lat))&&Number.isFinite(Number(m.camp_lng));
 const destination=gps?`${m.camp_lat},${m.camp_lng}`:(m.camp_adreca||m.camp_nom);
 return destination?'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(destination):null;
}
export function filterMatches(matches,filter) {return sortedMatches(matches).filter(m=>filter==='played'?m.estat==='jugat':filter==='upcoming'?m.estat!=='jugat'&&m.estat!=='cancel·lat':true);}
export function icsForMatch(m) {
 if(!m.data||!/^\d\d:\d\d$/.test(m.hora||''))return null;
 const clean=v=>String(v||'').replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
 const start=m.data.replaceAll('-','')+'T'+m.hora.replace(':','')+'00';
 // Duration is a reminder estimate, not a claimed official end time.
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//CF Vilajuiga//Temporada//CA','BEGIN:VEVENT',`UID:${clean(m.partit_id)}@cf-vilajuiga.local`,
  `DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+Z/,'Z')}`,`DTSTART;TZID=${TIME_ZONE}:${start}`,'DURATION:PT90M',
  `SUMMARY:${clean(m.local+' – '+m.visitant)}`,`LOCATION:${clean(m.camp_adreca||m.camp_nom)}`,'END:VEVENT','END:VCALENDAR',''].join('\r\n');
}
export function usableSession(session,now=Date.now()) {return !!(session&&typeof session.token==='string'&&typeof session.cacheKey==='string'&&Number.isFinite(Date.parse(session.expiresAt))&&Date.parse(session.expiresAt)>now);}
