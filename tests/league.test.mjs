import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CLUBS,clubFor,clubMapsUrl} from '../league.mjs';
import {dateLabel,icsForMatch} from '../domain.mjs';
const calendar=JSON.parse(readFileSync(new URL('./fixtures/calendar-2026-27.json',import.meta.url),'utf8'));
test('the eight league clubs resolve PDF names and accents without guessing unknown rivals',()=>{
 assert.equal(CLUBS.length,8);assert.equal(new Set(CLUBS.map(c=>c.id)).size,8);
 assert.equal(CLUBS.filter(c=>c.own).length,1);
 for(const m of calendar){assert.ok(clubFor(m.local));assert.ok(clubFor(m.visitant));}
 assert.equal(clubFor('EFC Palau-Saverdera').id,'palau');assert.equal(clubFor('CF Vilajuiga').id,'vilajuiga');
 assert.equal(clubFor('Club desconegut'),null);
 for(const c of CLUBS){assert.ok(c.field&&c.address&&c.town);assert.ok(c.sources.length);for(const s of c.sources)assert.equal(new URL(s.url).protocol,'https:');}
});
test('calendar transcription preserves all seven dates, local kickoffs and home grounds',()=>{
 assert.deepEqual(calendar.map(m=>[m.jornada,m.data,m.hora,m.local==='CF VILAJUÏGA']),[
  [1,'2026-10-10','10:00',false],[2,'2026-10-18','11:00',true],[3,'2026-10-25','10:00',false],
  [4,'2026-11-01','12:00',false],[5,'2026-11-08','11:00',true],[6,'2026-11-15','12:00',false],[7,'2026-11-22','11:00',true]
 ]);
 for(const m of calendar){const host=clubFor(m.local);assert.equal(m.camp_nom,host.field);assert.equal(m.camp_adreca,host.address);assert.equal(m.estat,'pendent');assert.equal(m.gols_local,'');assert.equal(m.gols_visitant,'');assert.equal(m.visible,true);assert.equal(dateLabel(m.data,'weekday'),m.jornada===1?'dissabte':'diumenge');}
 // The schedule crosses the daylight-saving change; reminders keep Madrid local time.
 assert.match(icsForMatch(calendar[3]),/DTSTART;TZID=Europe\/Madrid:20261101T120000/);
});
test('maps name the field as well as its address, and retain the Navata PDF pin',()=>{
 for(const c of CLUBS){const url=new URL(clubMapsUrl(c));assert.equal(url.protocol,'https:');if(!c.map){assert.ok(url.searchParams.get('destination').includes(c.field));assert.ok(url.searchParams.get('destination').includes(c.address));}}
 assert.equal(clubMapsUrl(clubFor('CF Navata')),'https://maps.app.goo.gl/2aj47hjDicsMrnmKA');
});
