import {mapsUrl} from './domain.mjs';

// Public information only. Match dates and family data come from the private API.
export const LEAGUE={name:'Aleví masculí',phase:'Fase 1 · Grup 1',season:'2026/27',format:'Anada · 7 jornades',checked:'2026-10-06',organizer:'Consell Esportiu de l’Alt Empordà'};
export const CLUBS=[
 {id:'vilajuiga',name:'CF Vilajuïga',aliases:['CF VILAJUÏGA'],town:'Vilajuïga',short:'V',own:true,
  field:'Camp Municipal de Vilajuïga · Mas Bartret',address:'Zona d’equipaments de Mas Bartret, 17497 Vilajuïga',
  description:'El nostre equip. El camp municipal forma part de la zona d’equipaments de Mas Bartret.',
  sources:[{label:'Ajuntament de Vilajuïga · Equipaments',url:'https://www.vilajuiga.cat/ca/guia-del-poble/equipaments-publics/'}]},
 {id:'palau',name:'EFC Palau Saverdera',aliases:['EFC PALAU SAVERDERA','EFC PALAU-SAVERDERA'],town:'Palau-saverdera',short:'PS',
  field:'Camp Municipal de Palau-saverdera',address:'Avinguda Mas Oriol, zona esportiva, 17495 Palau-saverdera',
  description:'Elit Futbol Club Palau-saverdera. El camp de la zona esportiva té gespa artificial.',
  note:'El PDF indica Mas Oriol, 22, i la fitxa FCF, el 24. El mapa cerca el camp municipal de la zona esportiva.',
  sources:[{label:'Ajuntament · Camp de futbol',url:'https://www.palau-saverdera.cat/equipaments-municipals/'},{label:'FCF · Fitxa del camp',url:'https://www.fcf.cat/camp/535'}]},
 {id:'llers',name:'CF Llers (A) aleví',aliases:['CF LLERS (A) ALEVÍ','CF LLERS'],town:'Llers',short:'LL',
  field:'Camp Municipal de Llers',address:'Carrer de l’Església, 22, 17730 Llers',
  description:'El CF Llers té un equip aleví del Consell. El camp municipal és a la zona esportiva del carrer de l’Església.',
  sources:[{label:'CF Llers · Web del club',url:'https://cfllers.com/club/'},{label:'Ajuntament · Camp de futbol',url:'https://esportsllers.blogspot.com/p/camp-de-futbol.html'}]},
 {id:'esplais',name:'CF Esplais',aliases:['CF ESPLAIS','ESPLAIS CF'],town:'Castelló d’Empúries',short:'ES',
  field:'Camp Municipal del Centre Històric',address:'Carrer de Pau Casals, 1, 17486 Castelló d’Empúries',
  description:'Equip de Castelló d’Empúries. El calendari situa els seus partits al camp del Centre Històric.',
  sources:[{label:'Ajuntament · Equipaments esportius',url:'https://www.castello.cat/per-temes/esports-i-lleure/equipaments-esportius/'},{label:'FCF · Referència del camp',url:'https://www.fcf.cat/acta/2526/femeni-amateur-f-7/infantil-segona-divisio-s14/grup-5/2i14/esplais-cf-a/2i14/monells-ae-b'}]},
 {id:'finca',name:'CE La Finca',aliases:['CE LA FINCA'],town:'Figueres',short:'LF',
  field:'Camp de La Finca de La Salle',address:'Carrer de l’Aigüeta s/n, 17600 Figueres',
  description:'Equip de Figueres inscrit com a CE La Finca. El calendari indica el camp «La Finca».',
  note:'La ubicació correspon al camp de La Finca de La Salle del catàleg municipal de Figueres. El PDF no concreta l’accés dins del recinte.',
  sources:[{label:'Consell · CE La Finca (Figueres)',url:'https://www.lareserva.cat/consell/inscripcions/altaparticipant.php?id=692'},{label:'Ajuntament · Catàleg de camps (PDF)',url:'https://www.figueres.cat/tramits/normativa/plia/copy_of_pdvu/doc3_propostes/%40%40download/file/miem_annex_1_actualitzaci%C3%93%20mapa%20instal%C2%B7lacions%20i%20equipaments%20esportius%20municipals%20figueres.pdf'}]},
 {id:'cadaques',name:'UE Cadaqués',aliases:['UE CADAQUÉS','UE CADAQUES'],town:'Cadaqués',short:'CQ',
  field:'Camp Municipal Sa Guarda',address:'Carrer de Lluís Aznares s/n, 17488 Cadaqués',
  description:'Unió Esportiva Cadaqués. El club situa les seves instal·lacions al Camp Municipal Sa Guarda.',
  sources:[{label:'UE Cadaqués · Instal·lacions',url:'https://www.unioesportivacadaques.com/Club/Instalaciones/'}]},
 {id:'navata',name:'CF Navata',aliases:['CF NAVATA','NAVATA CF'],town:'Navata',short:'NV',
  field:'Camp Municipal de Navata',address:'Carrer de Figueres, 4, 17744 Navata',map:'https://maps.app.goo.gl/2aj47hjDicsMrnmKA',
  description:'El CF Navata es va fundar el 1969. La zona esportiva disposa de camps de futbol 7 i futbol 11.',
  sources:[{label:'Ajuntament · Serveis municipals',url:'https://www.navata.cat/municipi/equipaments/equipaments/'},{label:'Ubicació enllaçada al calendari',url:'https://maps.app.goo.gl/2aj47hjDicsMrnmKA'}]},
 {id:'bascara',name:'FC Bàscara',aliases:['FC BÀSCARA','FC BASCARA'],town:'Bàscara',short:'BA',
  field:'Camp Municipal de Bàscara',address:'Carrer de les Lletanies s/n, 17483 Bàscara',
  description:'Equip de Bàscara. El camp municipal és al carrer de les Lletanies, tal com indica la ubicació del calendari.',
  sources:[{label:'Ajuntament · FC Bàscara',url:'https://bascara.cat/presentacio-equips-f-c-bascara/'},{label:'Lliga de Futbol d’Empreses · Camp municipal',url:'https://www.futbolempresesgirona.com/index.php/dadas-dels-equipo-grup-b/'}]}
];
const normalize=value=>String(value||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
export function clubFor(name){const key=normalize(name);return CLUBS.find(c=>normalize(c.name)===key||c.aliases.some(a=>normalize(a)===key))||null;}
export function clubMapsUrl(club){return club.map||mapsUrl({camp_nom:club.field,camp_adreca:club.field+', '+club.address});}
