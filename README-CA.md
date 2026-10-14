# CF Vilajuïga · Guia de l’app

PWA en català, frontend `4.1.0` i backend Apps Script `3.1.0`. El repositori només conté codi, recursos públics i dades sintètiques de prova. Els telèfons, sessions, fotografies i registres reals viuen al Sheet, Script Properties i Drive privat.

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

L’accés es fa amb telèfon i un codi de quatre xifres creat per l’administrador. El codi:

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

El servidor torna a comprovar usuari, rol, activació i privacitat a cada petició. Quan queden menys de set dies, la sessió es renova automàticament. Revocar sessions incrementa `sessio_epoch` i invalida tots els dispositius d’aquell usuari.

## Desplegament 4.1.0 / backend 3.1.0

Aquesta versió permet a família, editor i administració editar qualsevol cromo visible, incorpora gir fi del retrat i afegeix l’edició administrativa de famílies. Només administració pot crear cromos o editar-ne d’ocults. Les imatges es processen només en memòria i l’editor local manté els límits de 1200 px i 400 KiB.

1. Executa les quatre suites locals i revisa el diff.
2. Fes una còpia de seguretat del Sheet i executa `installBackend()` perquè afegeixi idempotentment la columna final `fills` a `03_USUARIS`.
3. Publica primer el backend `3.1.0` com una nova versió del desplegament Apps Script existent, conservant la mateixa URL `/exec`.
4. Comprova que `health` retorna `version: "3.1.0"` i `configured: true`, sense consultar dades privades.
5. Prova invitació, consentiment, renovació, logout, edició de famílies i cromos en un entorn de validació.
6. Publica el frontend `4.1.0` a GitHub Pages només després de l’aprovació final.
7. Recarrega les pestanyes ja obertes i torna a obrir l’app instal·lada. El service worker `4.1.0` activa la cache nova, però no substitueix automàticament el JavaScript que una pestanya ja està executant.

El frontend `4.1.0` comprova `features.family_player_edit`, `features.family_user_edit` i `features.family_children` abans d’oferir els controls nous. Amb el backend `3.0.1`, manté alta, invitacions, revocació i activació/desactivació de famílies, però oculta l’edició i el camp `fills` perquè el servidor antic no els pot conservar. El backend `3.1.0` manté temporalment el contracte `saveUser` de la versió 4.0.4 i preserva `fills` quan rep una d’aquestes operacions antigues.

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
