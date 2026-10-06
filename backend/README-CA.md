# CF VILAJUÏGA · FASE 2 · Backend Apps Script

Versió 2.2.0 · 6 d’octubre de 2026.

Backend instal·lable per al teu compte **almogaver@gmail.com**, amb login inicial per telèfon, preparat per passar a telèfon + codi. No hi ha cap secret ni telèfon real dins d’aquest paquet.

**Estat real:** codi escrit i 35 proves locals superades amb serveis Google simulats. No s’ha creat ni desplegat cap projecte Apps Script en aquest compte. L’OAuth de Drive ha confirmat el compte correcte; el connector disponible no permet crear ni publicar Apps Script. Encara falta la prova amb Google real i des del domini del frontend. No és una PWA publicada: és la FASE 2.

## Fitxers

| Fitxer | Funció |
|---|---|
| `Code.gs` | Backend complet, instal·lació i eines del propietari |
| `appsscript.json` | Manifest V8 i servei avançat Drive v3 |
| `api-client.mjs` | Transport de l’API i preparació JPEG amb canvas |
| `Prova-API.html` | Login, consentiment i consulta per comprovar l’API i CORS |
| `calendari-buit.csv` | Capçalera del CSV, sense calendari inventat |
| `tests/backend.test.cjs` | 30 proves del servidor |
| `tests/client.test.mjs` | 5 proves del transport |

## Instal·lació una sola vegada

1. Obre **https://script.google.com/** amb `almogaver@gmail.com` i crea un projecte independent: **CF Vilajuïga Backend**.
2. Substitueix el contingut de `Code.gs` pel fitxer d’aquest paquet.
3. A **Configuració del projecte**, activa **Mostra el fitxer de manifest appsscript.json a l’editor**. Substitueix-lo pel manifest inclòs. El manifest habilita **Drive API v3**, que s’utilitza per eliminar fitxers definitivament. Si uses un projecte Google Cloud estàndard en lloc del predeterminat, habilita també Drive API a aquell projecte.
4. Desa i executa **`installBackend`** des de l’editor. Accepta l’autorització de Google amb el compte indicat.
5. Mira el registre d’execució: hi apareixeran els enllaços al Sheet i a la carpeta de fotos. La funció desa els IDs i el secret a Script Properties, sense mostrar el secret.
6. Comprova a Drive que el Sheet i totes les carpetes tenen accés **Restringit**, sense altres col·laboradors. La instal·lació ho verifica i s’atura si detecta permisos compartits.
7. Al Sheet, omple `03_USUARIS` amb el teu **telèfon real** i rol `admin`. No hi ha cap administrador de mostra. El telèfon ha de ser text en format `+34…`; conserva’l com a text pla. Omple nom, `actiu=TRUE`, `creat_at` amb una data ISO actual. Deixa `codi`, `privacitat_version` i `privacitat_at` buits. El primer login demanarà acceptar el compromís.
8. Omple `05_JUGADORS` si vols etiquetar fotos: només noms, ID estable, dorsal opcional i booleans explícits `no_mostrar=FALSE`, `actiu=TRUE`. La galeria funciona també sense jugadors, amb `jugadors_ids: []`.
9. Importa el calendari real més endavant. No cal per provar el login o obtenir un bootstrap amb partits buits.
10. Tria **Desplega → Desplegament nou → Aplicació web**: **Executar com jo**, **Accés: Qualsevol persona**. L’accés públic al punt d’entrada és necessari perquè les famílies no hagin d’iniciar sessió amb Google; les dades exigeixen el token de l’app. Copia la URL acabada en **`/exec`**.
11. Obre la URL amb `?action=health`: ha de retornar JSON amb `configured: true`. Això només comprova que existeixen les propietats bàsiques; no substitueix una prova de Sheets, Drive i permisos.
12. Serveix `Prova-API.html` i `api-client.mjs` des del futur domini del frontend. Introdueix URL i telèfon, entra, accepta el compromís i consulta els partits. No executis la prova amb doble clic `file://`: serveix-la per HTTP/HTTPS. Per una prova local pots usar `python3 -m http.server 8080` des de la carpeta del paquet; la validació final s’ha de repetir al domini real.

`installBackend` és repetible: reutilitza els recursos associats a Script Properties i no sobreescriu files existents. Crea les sis pestanyes acordades, la configuració inicial i `CF VILAJUIGA APP / 2026-27 / fotos`. Les carpetes de partit es creen en la primera pujada. El Sheet es crea a My Drive; les fotos, a l’arbre indicat.

Per actualizar el codi d’una aplicació ja publicada, desa’l i actualitza **Gestiona els desplegaments → Edita → Versió nova**. Desar l’editor no actualitza automàticament la versió de `/exec`.

## Opcions del propietari

Aquestes funcions només es criden des de l’editor. No existeix cap acció pública de l’API per executar-les.

```javascript
// Exemple d’ús: substitueix les variables pels valors reals en un script privat.
addUser(telefonReal, nomAdult, 'admin');
setUserCode(telefonReal, codiPersonal);
setLoginMode('telefon+codi');
```

El selector d’Apps Script no permet passar arguments: per usar-les crea una funció temporal que les cridi, executa-la i després elimina aquella funció, especialment si conté un codi. També pots gestionar usuaris al Sheet; els codis s’han de generar amb `setUserCode`, sense escriure’ls en text pla.

Abans d’activar `telefon+codi`, tots els usuaris actius necessiten un codi de **6 a 12 xifres**. Es desa com a HMAC amb el secret privat, no com a codi llegible. Canviar mode o codi invalida les sessions afectades. Tornar a `telefon` també invalida sessions anteriors.

Altres funcions:

- `invalidateUserCache()`: aplica immediatament canvis manuals d’usuaris a les lectures que usen cache.
- `maintenance()`: elimina revocacions de sessió ja caducades i invalida el cache d’usuaris.
- `recoverPendingMatchAudits()`: completa el registre d’un resultat o crònica que ja s’ha guardat si es va perdre la sessió abans de poder reintentar. Si les dades actuals no coincideixen amb el canvi pendent, retorna `needs_review` i conserva el cas per revisar-lo.
- `importCalendar(csvText)`: valida el CSV complet abans d’afegir partits nous. No sobreescriu IDs existents. La lectura CSV usa `Utilities.parseCsv`, que accepta camps entre cometes i comes dins dels camps.

No modifiquis directament els fitxers de fotos a Drive. Si elimines un fitxer manualment, l’API pot deixar la seva eliminació com a pendent perquè no interpreta un error de permisos o de Google com a prova que s’ha esborrat. Revisa el fitxer i les metadades des del compte propietari abans de reparar-les.

## Permisos

| Acció | família | editor | admin |
|---|:---:|:---:|:---:|
| Veure partits, estadístiques i fotos disponibles | Sí | Sí | Sí |
| Pujar fotos i descarregar-ne amb avís | Sí | Sí | Sí |
| Editar marcador i crònica | — | Sí | Sí |
| Consultar fotos ocultes amb `include_hidden: true` | — | — | Sí |
| Ocultar, mostrar i eliminar fotos | — | — | Sí |
| Gestionar usuaris, codis i configuració | Editor del projecte o Sheet propietari | Editor del projecte o Sheet propietari | Editor del projecte o Sheet propietari |

El rol `admin` de la PWA no dona accés a l’editor d’Apps Script o al Sheet. Només el propietari de Google hi treballa.

## Contracte de l’API

Totes les accions autenticades són **POST** amb JSON dins d’un cos `text/plain;charset=utf-8`. El token va al cos. No hi ha secrets a les URL, JSONP, ni autenticació per capçalera `Authorization`.

```javascript
import {apiPost, requestId} from './api-client.mjs';
const login = await apiPost(API_URL, {
  action: 'login', telefon: telefonIntroduit
});
const token = login.token;
// Només si el login retorna user.privacyAccepted = false:
await apiPost(API_URL, {
  action: 'acceptPrivacy', token, request_id: requestId(),
  accepted: true, version: login.privacy.version
});
const temporada = await apiPost(API_URL, {action:'bootstrap', token});
```

Respostes:

```json
{"ok":true,"data":{}}
```

```json
{"ok":false,"error":{"code":"FORBIDDEN","message":"No tens permís per fer aquesta acció."}}
```

ContentService no ofereix el control habitual dels codis HTTP d’un servidor Express: comprova sempre `ok` i `error.code`, encara que l’HTTP sigui 200. El client inclòs ho fa. `user_agent` és opcional i declarat pel client; serveix com a pista d’auditoria, no com a identificació fiable del dispositiu.

| `action` | Camps addicionals | Retorn principal |
|---|---|---|
| `login` | `telefon`, `codi` si està activat | token, caducitat, usuari propi, compromís de privacitat |
| `acceptPrivacy` | token, request_id, `accepted: true`, `version` actual | acceptació |
| `logout` | token, request_id | sessió revocada |
| `bootstrap` | token | configuració pública, usuari propi, partits, estadístiques, jugadors autoritzats |
| `updateResult` | token, request_id, partit_id, expected_updated_at, estat, gols_local, gols_visitant | partit actualitzat |
| `updateChronicle` | token, request_id, partit_id, expected_updated_at, cronica | partit actualitzat |
| `listPhotos` | token, partit_id; limit 1–50, after opcional | fotos i nextCursor |
| `getThumbnails` | token, foto_ids de 1–6 elements | resultat individual i JPEG base64 per ID |
| `getPhoto` | token, foto_id | JPEG base64 |
| `uploadPhoto` | token, request_id, foto_id UUID, partit_id, photo_base64, thumb_base64, jugadors_ids array, peu opcional | metadades de la foto |
| `downloadPhoto` | token, request_id, foto_id, `private_use_ack: true` | foto i avís, després de registrar la petició |
| `hidePhoto` | token, request_id, foto_id, motiu opcional | metadades d’ocultació |
| `showPhoto` | token, request_id, foto_id | metadades de visibilitat |
| `deletePhoto` | token, request_id, foto_id, `confirm_permanent: true` | deleted o pending |

`include_hidden: true` només té efecte per a admin, a `listPhotos`, `getPhoto`, `getThumbnails` i `downloadPhoto`. Sense aquest camp també veu la galeria normal. Les fotos eliminades són inaccessibles per tots els rols.

`expected_updated_at` és el valor rebut al bootstrap o a l’última resposta del partit, inclosa una cadena buida si encara no s’ha editat. Permet detectar que un altre editor ha canviat el partit. Si reps `CONFLICT`, actualitza dades abans de decidir què escriure.

Per un partit `jugat`, els gols són enters 0–99. Per `pendent`, `ajornat` o `cancel·lat`, envia els dos gols com `null` o cadena buida. No hi ha una classificació de tota la lliga: les estadístiques són PJ, V, E, D, GF, GC i DG del **CF VILAJUÏGA**, calculades amb partits visibles i jugats.

`request_id` ha de ser un UUID nou per cada acció de l’usuari. **Conserva’l amb el mateix cos quan reintentes una petició amb resultat desconegut**. La pujada també conserva `foto_id`. Un timeout o error CORS pot passar després que el servidor ja hagi escrit; no significa que l’acció no s’hagi executat. El client no reintenta automàticament. Un nou `request_id` és una nova acció; les comprovacions detecten IDs ja emprats en altres accions o sessions.

`logout` revoca el token concret fins a la seva caducitat. Si es repeteix després que s’hagi completat, respon `UNAUTHORIZED`; el frontend pot donar la sessió local per tancada.

## Fotografies

- Drive privat, sense URL de descàrrega pública ni IDs de Drive al frontend.
- JPEG de màxim **1.572.864 bytes** i **1600 px** de costat. Miniatura de màxim **122.880 bytes** i **480 px**. El JPEG descarregable és aquesta còpia preparada, no l’original complet del mòbil.
- `prepareUpload` recodifica amb canvas i ajusta qualitat/dimensions fins complir límits. No copia EXIF ni GPS. Si el navegador no pot descodificar un format com HEIC, ho explica i demana JPEG o PNG.
- El servidor valida base64, mida, marcadors JPEG i dimensions declarades dins del JPEG; rebutja EXIF/XMP, IPTC i comentaris. No és un descodificador JPEG complet.
- Una foto per POST. A la FASE 3, la PWA farà una cua seqüencial i mostrarà progrés. Demana miniatures en blocs de fins a sis; carrega la foto gran només en obrir-la.
- `no_mostrar` o qualsevol jugador etiquetat amb `no_mostrar=TRUE` impedeix que l’API serveixi la foto als usuaris normals. Els valors de privacitat buits o desconeguts es tracten com bloquejats. No hi ha detecció facial: cal etiquetar o ocultar manualment les fotos afectades; una foto sense etiquetes no permet saber qui hi apareix.
- `showPhoto` no anul·la una restricció de jugador. Admin pot inspeccionar les fotos ocultes expressament.
- Es comproven carpeta, nom, MIME, permisos i mida abans de servir el fitxer.
- Una pujada amb `foto_id` ja guardat per la mateixa persona i partit retorna la foto existent; no crea més fitxers. Un error entre els fitxers i el Sheet intenta netejar-los. Una execució terminada abruptament pot deixar fitxers orfes, que el reintent amb el mateix ID substitueix. No hi ha un escombrador automàtic global d’orfes.

Les descàrregues iniciades amb el botó de l’app queden registrades. Això **no permet detectar** captures de pantalla ni que algú desi una imatge que ja ha vist amb les eines del navegador. Tampoc es pot retirar una còpia ja descarregada. El compromís inicial regula aquest ús, però no constitueix per si sol el consentiment dels tutors per fer o difondre fotografies.

## Concurrència, registre i recuperació

Les escriptures, login i descàrregues registrades utilitzen `LockService`. El propietari encara pot editar el Sheet manualment al marge d’aquest lock; evita fer-ho mentre una acció està en curs.

L’auditoria és append-only des de l’API. LOGIN es registra com a màxim una vegada per usuari i dia a Europe/Madrid; les altres accions s’identifiquen pel seu UUID. El propietari pot modificar el Sheet: no és un registre immutable davant del propietari.

Les edicions de marcador i crònica guarden snapshots temporals a Script Properties abans d’escriure. Si l’escriptura es completa però falla l’auditoria, la mateixa petició completa el registre. El partit bloqueja noves edicions fins que es resol aquella operació. L’eina del propietari `recoverPendingMatchAudits()` també pot completar el registre de canvis ja aplicats.

L’eliminació primer marca la foto com eliminada al Sheet i la fa inaccessible; després esborra físicament els dos fitxers amb `Drive.Files.remove`. Si un falla, retorna `pending: true` i conserva l’ID pendent. Repetir la mateixa petició intenta acabar. `DELETE_PHOTO` registra la petició i `DELETE_PHOTO_COMPLETE` la finalització. Si l’execució s’interromp just després de l’eliminació física i abans de netejar-ne l’ID al Sheet, pot caldre reconciliació manual; l’API prefereix declarar pendent a assegurar una eliminació no comprovada.

Sheets, Script Properties i Drive no formen una transacció única. Consentiment i ocultació poden quedar aplicats abans d’una fallada d’auditoria; un reintent completa el registre, però el valor anterior pot reflectir ja el canvi. Cal revisar les accions amb error persistent. No hi ha garantia d’auditoria perfecta davant d’un tall en qualsevol instrucció.

## Sessions i configuració

- Token HMAC-SHA256 amb telèfon, inici, caducitat, UUID de sessió i vincle amb el mode/codi actuals. No es desa cap taula de sessions al Sheet.
- Vigència màxima 30 dies. El rol s’obté de l’usuari actual, no d’un rol dins del token.
- Totes les peticions HTTP, inclòs bootstrap, llegeixen usuaris actuals. Les lectures repetides dins de la mateixa petició comparteixen una instantània; no es guarda entre peticions.
- Un canvi manual de `actiu`, rol o usuari s’aplica a la següent petició HTTP. El cache orientatiu d’usuaris només es conserva per a funcions locals de l’editor; no autoritza l’API.
- Per deixar sense efecte totes les sessions, substitueix `SESSION_SECRET` per un secret nou al projecte. Això també invalida els HMAC dels codis; caldrà tornar a assignar-los. No reutilitzis el secret al frontend.
- Script Properties també conté `DRIVE_APP_FOLDER_ID`, revocacions `revoked:*` i registres temporals `pendingMatch:*`, a més de les propietats principals. Són necessaris per repetir instal·lació, fer logout efectiu i recuperar escriptures.
- Limitació d’intents per telèfon: 5 en 15 minuts; global: 100 per minut. És una protecció orientativa amb CacheService, que pot expulsar entrades abans del TTL. Apps Script no proporciona la IP a aquest `doPost`; no es promet una defensa forta contra força bruta o denegació de servei.
- Amb `login_mode=telefon`, qualsevol persona que conegui un telèfon autoritzat es pot identificar com aquell usuari. És el mode de prova que has escollit; el suport de codi ja està implementat.

A la FASE 3, caldrà buidar les dades locals en tancar sessió o revocar-la i separar-les per usuari; el service worker només ha de guardar l’app shell. No ha de guardar ni POST, ni tokens, ni fotos. El backend no pot revocar dades que un dispositiu ja havia desat fora de la seva connexió.

## Proves i límits verificats

Executa des de la carpeta del paquet amb Node.js:

```bash
node tests/backend.test.cjs

```

Resultat: **41/41 servidor**. Cobreixen instal·lació repetible, consentiment, tokens manipulats i caducats, revocació, canvi de mode/codi, rols, conflictes, estadístiques, privacitat de fotos/jugadors, validació JPEG, pujades repetides, errors de Drive i Sheet, recuperació d’auditoria, eliminació parcial i transport. El CSV es prova amb un doble simplificat; la sintaxi real de camps entre cometes depèn del parser oficial de Google.

Aquestes proves no mesuren temps de resposta real, quotes, CORS del desplegament, autorització Google, compatibilitat real de canvas ni comportament de permisos heretats a Drive. Cal provar-los després d’instal·lar. No s’han fet servir fotos ni telèfons de les famílies.

Google documenta redireccions de ContentService: el client usa `redirect: follow`. `text/plain` evita el preflight d’aquesta petició simple; no és una garantia general de resposta CORS des de qualsevol domini. Si la prova falla, primer comprova la URL `/exec`, accés anònim i JSON retornat; no ho solucionis amb `mode: no-cors`, perquè la resposta és opaca i no es pot llegir. Cal decidir un altre transport o hosting si falla des del domini real.

Els límits oficials inclouen 6 minuts per execució, 30 execucions simultànies per usuari, 9 KB per valor de Script Properties i 500 KB totals. El cache té 100 KB per entrada i fins a sis hores de TTL. Les fotos no es desen al cache. No s’afirma cap límit documentat de 50 MB per al POST entrant; el paquet imposa límits propis.

Referències oficials consultades:

- https://developers.google.com/apps-script/guides/web
- https://developers.google.com/apps-script/guides/content
- https://developers.google.com/apps-script/guides/services/quotas
- https://developers.google.com/apps-script/reference/cache/cache
- https://developers.google.com/apps-script/reference/lock/lock
- https://developers.google.com/apps-script/reference/utilities/utilities
- https://developers.google.com/apps-script/advanced/drive
- https://developers.google.com/drive/api/reference/rest/v3/files/delete

## Pas següent

La PWA ja està publicada a GitHub Pages. Les proves automatitzades utilitzen dades sintètiques; el propietari comprova l’accés real al seu dispositiu. Per activar aquesta actualització, substitueix `Code.gs`, executa `installBackend` i edita la implementació existent seleccionant **Nueva versión**.

## Cromos i retrats (2.1.0)

`installBackend` amplia `05_JUGADORS` de 5 a 11 columnes sense modificar les cinc originals ni les files existents. Refusa capçaleres noves incompatibles. Crea o reutilitza `jugadors` dins la carpeta privada de fotos. La URL de la implementació actual es conserva actualitzant-la a una nova versió.

- `savePlayer`: només admin; `jugador_id`, `nom`, `dorsal` (0–99 o buit), `posicio` (Porter/Defensa/Migcampista/Davanter o buit), `expected_updated_at`, `request_id`. Opcionalment `photo_base64` i `foto_id`. Conserva `actiu` i `no_mostrar` dels jugadors existents. Un jugador nou queda actiu i visible dins del grup privat. Un conflicte no sobreescriu un canvi posterior. Els reintents reutilitzen els mateixos UUID i es validen amb un resum HMAC.
- `getPlayerPortraits`: màxim 6 `jugador_ids`; autenticació i privacitat acceptada. Verifica activitat, restriccions, carpeta, nom, MIME, permisos i límits abans de retornar JPEG base64. Només admin amb `include_hidden=true` pot consultar retrats restringits.
- `bootstrap.features.player_cards=true` activa l’editor del frontend. Cap ID de Drive ni URL pública del retrat s’exposa al client.
- Retrats: JPEG reexportat per canvas, 400 KiB, 1200 px. No s’admeten EXIF/XMP/IPTC/comentaris. No es guarden a Cache Storage ni a localStorage.

Els retrats substituïts es conserven privats a Drive com a versions anteriors. L’app només permet llegir el retrat que actualment referencia el jugador.

## Optimitzacions (2.2.0)

- Una obertura del spreadsheet i una lectura de cada pestanya necessària per petició; les capçaleres també es comproven una vegada. Cada petició posterior torna a comprovar usuaris, dades i permisos. Les files retornades són còpies, i una escriptura invalida la instantània de la pestanya afectada.
- La carpeta arrel i cada subcarpeta de Drive es verifiquen una vegada per petició. Les comprovacions del fitxer, parent, nom, MIME, mida i privacitat es mantenen per a cada fotografia.
- `login` i `acceptPrivacy` admeten `include_bootstrap:true`. Només retornen `bootstrap` després d’una acceptació vigent; els clients antics conserven la resposta original.
- `bootstrap.features.fresh_permissions=true` indica que la llista de jugadors reflecteix autorització acabada de comprovar. El frontend pot reutilitzar un retrat ja carregat que segueixi autoritzat i conservi `retrat_version`, dins la mateixa vista i rol.
- El retrat llegit de Drive es valida directament en bytes abans de convertir-lo a base64; no es codifica i descodifica dues vegades.

Consulteu [les mesures del conjunt](../PERFORMANCE-CA.md). No s’han eliminat controls de privacitat ni s’han publicat fotos de Drive.
