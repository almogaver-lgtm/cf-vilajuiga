# CF Vilajuïga · Guia de l’app

PWA en català, frontend `4.0.2` i backend Apps Script `3.0.1`. El repositori només conté codi, recursos públics i dades sintètiques de prova. Els telèfons, sessions, fotografies i registres reals viuen al Sheet, Script Properties i Drive privat.

## Funcions

- Inici amb proper partit, últim resultat i estadístiques del CF Vilajuïga.
- Calendari amb filtres, detall, crònica, ruta de Maps i recordatori `.ics`.
- Galeria privada amb miniatures, visor, descàrrega registrada i administració.
- Pujada JPEG preparada al dispositiu, sense metadades i amb etiquetatge obligatori dels jugadors o confirmació «Cap jugador identificable».
- Àlbum de cromos amb retrats privats i edició exclusiva d’administració.
- Secció Lliga amb els vuit equips, camps, rutes i fonts públiques.
- Secció Famílies per crear usuaris, enviar invitacions, revocar sessions i desactivar accessos.
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
| Gestionar cromos, fotos ocultes i famílies | — | — | Sí |

El servidor torna a comprovar usuari, rol, activació i privacitat a cada petició. Quan queden menys de set dies, la sessió es renova automàticament. Revocar sessions incrementa `sessio_epoch` i invalida tots els dispositius d’aquell usuari.

## Desplegament 4.0.2 / backend 3.0.1

Aquesta versió redueix les operacions de Drive en retrats i miniatures, evita lectures innecessàries en galeries buides i reutilitza imatges privades només en memòria després de revalidar-ne la visibilitat. No modifica l’esquema de dades.

1. Executa les quatre suites locals i revisa el diff.
2. Publica primer el backend `3.0.1` com una nova versió del desplegament Apps Script existent, conservant la mateixa URL `/exec`.
3. Comprova que `health` retorna `version: "3.0.1"` i `configured: true`, sense consultar dades privades.
4. Prova invitació, consentiment, renovació, logout, galeria i cromos en un entorn de validació.
5. Publica el frontend `4.0.2` a GitHub Pages només després de l’aprovació final.
6. Recarrega les pestanyes ja obertes i torna a obrir l’app instal·lada. El service worker `4.0.2` activa la cache nova, però no substitueix automàticament el JavaScript que una pestanya ja està executant.

El frontend `4.0.2` continua sent funcional amb el backend `3.0.0`, però les reduccions d’operacions de Drive requereixen publicar el backend `3.0.1`.

## Administració

- `adminInvite(telefon)`: crea la primera invitació o recupera l’accés de l’administrador des de l’editor.
- `addUser(telefon, nom, rol)`: crea manualment un usuari abans de convidar-lo.
- `maintenance()`: neteja revocacions caducades i invitacions finalitzades de més de 30 dies.
- `purgaRegistre(dies)`: elimina manualment registres més antics que la retenció indicada; per defecte, 120 dies.
- `recoverPendingMatchAudits()`: completa auditories pendents d’una edició de partit.

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
