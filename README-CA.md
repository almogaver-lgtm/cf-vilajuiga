# CF Vilajuïga · Guia de l’app

PWA en català, frontend `4.2.0` i backend Apps Script `3.2.0`. El repositori només conté codi, recursos públics i dades sintètiques de prova. Els telèfons, sessions, fotografies i registres reals viuen al Sheet, Script Properties i Drive privat.

## Funcions

- Inici amb proper partit, últim resultat i estadístiques del CF Vilajuïga.
- Calendari amb filtres, detall, crònica, ruta de Maps i recordatori `.ics`.
- Galeria privada amb miniatures, visor, descàrrega registrada i administració.
- Pujada JPEG preparada al dispositiu, sense metadades i amb etiquetatge obligatori dels jugadors o confirmació «Cap jugador identificable».
- Àlbum ordenat per dorsal, amb retrats privats, gir fi i edició col·laborativa dels cromos visibles.
- Secció Lliga amb els vuit equips, camps, rutes i fonts públiques.
- Secció Famílies per crear i editar usuaris, informar els noms de pila dels fills, enviar invitacions, revocar sessions i desactivar accessos.
- Consulta offline de l’última temporada desada mentre la sessió sigui vigent. Les fotos i escriptures sempre necessiten connexió.

## Accés i permisos

L’activació inicial es fa amb telèfon i un codi de quatre xifres creat per l’administrador. Després, cada navegador conserva una credencial aleatòria pròpia, sense caducitat de calendari, que renova silenciosament les sessions tècniques. El servidor només en desa el verificador. Un dispositiu connectat pot generar un codi de vuit xifres, vàlid durant deu minuts i d’un sol ús, per connectar un altre navegador sense una invitació nova.

El codi inicial:

- és d’un sol ús;
- caduca al cap de 48 hores per defecte;
- queda bloquejat després de cinc intents incorrectes;
- es desa hashejat i només es mostra una vegada;
- no apareix al registre d’auditoria.

Rols:

| Acció | Família | Editor | Admin |
|---|:---:|:---:|:---:|
| Consultar temporada, cromos i fotos autoritzades | Sí | Sí | Sí |
| Pujar i descarregar fotos | Sí | Sí | Sí |
| Editar resultats i cròniques | — | Sí | Sí |
| Editar cromos visibles | Sí | Sí | Sí |
| Crear cromos i gestionar cromos ocults | — | — | Sí |
| Gestionar fotos ocultes i famílies | — | — | Sí |

El servidor torna a comprovar usuari, rol, activació, dispositiu i privacitat a cada petició. Quan queden menys de set dies, la sessió tècnica es renova automàticament. «Tancar sessió» revoca només aquell dispositiu; revocar totes les sessions, desactivar o canviar el telèfon incrementa `sessio_epoch` i invalida tots els dispositius i codis de vinculació de l’usuari.

## Versió de proves 4.2.0 / backend 3.2.0

Aquesta versió afegeix accés recordat indefinidament fins a revocació explícita, vinculació mòbil–PC, reacceptació de privacitat sense invitació i un circuit de proves completament separat. Els tokens tècnics continuen sent temporals; no es converteixen en tokens permanents.

1. Executa les quatre suites locals i revisa el diff.
2. Abans del primer `npm run preview:setup`, defineix només per a aquella ordre `CFV_PREVIEW_PHONE`, `CFV_PRODUCTION_SCRIPT_ID`, `CFV_PRODUCTION_SHEET_ID` i `CFV_PRODUCTION_DRIVE_ROOT_ID`. L’identificador del desplegament productiu es deriva de l’URL configurada.
3. Executa `npm run preview:setup` una sola vegada amb GitHub CLI i clasp autenticats. Crea o reutilitza `cf-vilajuiga-proves`, un projecte Apps Script separat, un Sheet privat i una carpeta privada amb fixtures sintètiques. Abans de cada `clasp push` comprova el projecte, el desplegament i la separació dels identificadors productius.
4. Executa `npm run preview:publish` per validar, publicar backend i frontend de proves i verificar l’enllaç.
5. Executa `npm run release:prepare` només després de l’acceptació; prepara la promoció del mateix commit però no toca producció.

El frontend comprova `features.remembered_devices` i `features.device_linking`. Amb un backend anterior manté el flux temporal existent i no mostra la vinculació; les sessions antigues vàlides es migren una sola vegada quan el backend 3.2.0 ja està disponible.

## Administració

- `adminInvite(telefon)`: crea la primera invitació o recupera l’accés de l’administrador des de l’editor.
- `addUser(telefon, nom, rol)`: crea manualment un usuari abans de convidar-lo.
- `maintenance()`: neteja revocacions caducades i invitacions finalitzades de més de 30 dies.
- `purgaRegistre(dies)`: elimina manualment registres més antics que la retenció indicada; per defecte, 120 dies.
- `recoverPendingMatchAudits()`: completa auditories pendents d’una edició de partit.
- `recoverPendingUserUpdates()`: reprèn altes i canvis d’usuari interromputs després d’una escriptura parcial.

Programa `maintenance()` amb un activador setmanal. En acabar la temporada, conserva només les dades personals necessàries.

## Desenvolupament local

No obris `index.html` amb doble clic. Serveix el projecte per HTTP:

```bash
# Windows
py -m http.server 8080

# macOS / Linux
python3 -m http.server 8080
```

Després visita `http://localhost:8080`.

## Validació

```bash
npm test
npm run test:backend
npm run test:performance
npm run test:browser
```

Abans de convidar famílies, repeteix les proves principals contra el Sheet i Drive reals. Les proves locals utilitzen serveis simulats i no validen quotes, permisos heretats, CORS o latència real de Google.

## Crèdits

- Foto ambiental: Nikola Tomašić, Unsplash.
- Escut: marca del club; confirma que la versió publicada continua vigent.
- Barlow Condensed: The Barlow Project Authors / Jeremy Tribby, SIL Open Font License 1.1.
