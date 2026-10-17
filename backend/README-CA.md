# CF Vilajuïga · Backend Apps Script 3.2.0

Backend privat basat en Google Apps Script, Sheets i Drive. No hi ha secrets, telèfons reals ni fotografies al repositori.

## Instal·lació i migració

1. Fes una còpia del Sheet real.
2. Copia `Code.gs` i `appsscript.json` al projecte Apps Script existent.
3. Executa `installBackend()`.
4. Verifica que existeixen les nou pestanyes `01_PARTITS` a `09_VINCULACIONS`.
5. Comprova que el Sheet i la carpeta de fotos continuen amb accés restringit.
6. Executa `adminInvite(telefon)` des d’una funció temporal per obtenir la primera invitació.
7. Publica una **Nova versió** del desplegament existent, amb la mateixa URL `/exec`.

`installBackend()` és repetible. Conserva les migracions anteriors i crea `08_DISPOSITIUS` i `09_VINCULACIONS` sense alterar usuaris, secrets o dades existents.

## Pestanyes

- `01_PARTITS`: calendari, resultats i cròniques.
- `02_CONFIG`: configuració validada del servei.
- `03_USUARIS`: telèfon, rol, estat, privacitat, `sessio_epoch` i el camp administratiu opcional `fills`.
- `04_FOTOS`: metadades privades de fotografies.
- `05_JUGADORS`: cromos, restriccions i retrats.
- `06_REGISTRE`: auditoria d’accessos i escriptures.
- `07_INVITACIONS`: invitacions hashejades, caducitat, intents i estat.
- `08_DISPOSITIUS`: verificadors de credencials recordades, generació de revocació i estat; mai secrets en clar.
- `09_VINCULACIONS`: codis temporals hashejats per connectar navegadors.

## API

Totes les accions privades són `POST` amb JSON com a `text/plain;charset=utf-8`. Els tokens viatgen al cos, mai a la URL.

Accions públiques:

- `redeemInvite`: bescanvia telèfon i codi d’un sol ús.
- `resumeDevice`: obté una sessió tècnica nova des d’una credencial recordada vigent.
- `redeemDeviceLink`: connecta un navegador amb un codi temporal d’un altre dispositiu.

Lectures autenticades:

- `bootstrap`, `listPhotos`, `getPhoto`, `getThumbnails`, `getPlayerPortraits`.
- `listUsers`, només per a administració.

Escriptures autenticades:

- `acceptPrivacy`, `logout`, `registerDevice`, `createDeviceLink`, `updateResult`, `updateChronicle`.
- `uploadPhoto`, `downloadPhoto`, `hidePhoto`, `showPhoto`, `deletePhoto`.
- `savePlayer`, `createInvite`, `saveUser`, `updateUser`, `revokeSessions`.

`saveUser` amb `request_id` només crea famílies noves. `updateUser` modifica una fila existent amb control de versió i reintents idempotents; un canvi de telèfon reserva temporalment origen i destí, bloqueja altres escriptures de la família i invalida les sessions i invitacions antigues. Per permetre el desplegament backend-primer, `saveUser` sense `request_id` conserva temporalment l’operació de la versió frontend 4.0.4 i mai esborra el camp `fills` existent. `bootstrap` anuncia `family_user_edit` i `family_children` perquè el frontend només mostri camps que el backend pot conservar. Els rols família i editor només poden editar cromos visibles existents; només administració pot crear cromos o editar-ne d’ocults.

La resposta sempre és una d’aquestes formes:

```json
{"ok":true,"data":{}}
```

```json
{"ok":false,"error":{"code":"FORBIDDEN","message":"No tens permís per fer aquesta acció."}}
```

Les lectures `bootstrap`, `getPlayerPortraits`, `listPhotos` i `getThumbnails` accepten opcionalment `"diagnostics": true`. La resposta afegeix només `diagnostics.server_ms`; no registra ni retorna tokens, telèfons o contingut privat addicional. Serveix per comparar el mateix escenari abans i després d’un desplegament autoritzat.

## Invitacions i sessions

- Codi aleatori de quatre xifres, d’un sol ús i caducitat configurable d’1 a 168 hores.
- Cinc intents per invitació; després queda `cremada`.
- Crear una invitació anul·la qualsevol invitació pendent anterior del mateix usuari.
- `SESSION_SECRET` signa invitacions i tokens; mai surt de Script Properties.
- `sessio_epoch` invalida totes les sessions d’un usuari sense afectar els altres.
- `bootstrap` renova la sessió quan queden menys de set dies.
- Les credencials de dispositiu no caduquen per calendari, però són revocables i lligades a `sessio_epoch`.
- Els codis de vinculació són de vuit xifres, duren deu minuts, tenen cinc intents i són d’un sol ús.
- El logout individual revoca el dispositiu actual; la revocació global, desactivació i canvi de telèfon invaliden tots els dispositius i vinculacions.

## Fotografies

- Drive privat, sense URL pública ni IDs de Drive exposats al client.
- Les metadades v2 de Drive agrupen en una sola consulta per fitxer la comprovació de permisos, nom, MIME, mida, paperera i carpeta pare.
- JPEG màxim de 1,5 MiB i 1600 px; miniatura màxima de 120 KiB i 480 px.
- Cada pujada exigeix etiquetes de jugadors o `sense_jugadors: true`.
- Les restriccions `no_mostrar` s’apliquen retroactivament a fotos i retrats.
- Les descàrregues requereixen acceptació explícita i queden auditades.
- L’eliminació marca primer la foto com inaccessible i després elimina els fitxers.

## Eines de propietari

- `addUser(telefon, nom, rol)`
- `installPreviewBackend(telefon, productionIds)`, invocada temporalment per `preview:setup` exclusivament en un projecte nou; rebutja explícitament els identificadors de Sheet i Drive de producció.
- `adminInvite(telefon)`
- `invalidateUserCache()`
- `recoverPendingMatchAudits()`
- `recoverPendingUserUpdates()`
- `maintenance()`
- `purgaRegistre(dies)`
- `importCalendar(csvText)`

Aquestes funcions no es despatxen per l’API pública.

## Operació segura

- Programa `maintenance()` setmanalment.
- No editis fotos directament a Drive.
- Evita editar el Sheet mentre hi ha escriptures de l’app.
- Mantén Sheet i carpetes sense editors ni lectors addicionals.
- Després de cada canvi de codi, crea una **Nova versió** del desplegament; desar l’editor no actualitza `/exec`.

## Proves

```bash
npm run test:backend
npm run test:performance
```

Les proves locals simulen Google. Abans d’obrir l’app a les famílies, valida calendari, invitacions, rols, fotos, auditoria i permisos contra el compte real.
