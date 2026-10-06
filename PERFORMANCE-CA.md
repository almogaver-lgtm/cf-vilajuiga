# Rendiment · CF Vilajuïga 3.3.0 / backend 2.2.0

Les millores redueixen operacions repetides sense migrar dades ni publicar les fotografies de Drive. El desplegament del nou `Code.gs` és necessari per activar la part del servidor; el frontend continua funcionant amb els backend 2.0.0 i 2.1.0.

## Mesures amb dades sintètiques

Escenari: una família amb consentiment vigent demana sis miniatures autoritzades del mateix partit. S'han comptat les crides explícites del codi als dobles de Sheets i Drive; no són mil·lisegons ni una mesura de les optimitzacions internes de Google.

| Operació per petició | Abans, backend 2.1.0 | Ara, backend 2.2.0 |
|---|---:|---:|
| `SpreadsheetApp.openById` | 20 | 1 |
| Lectures de files amb `getValues` | 20 | 5 |
| Lectures de capçaleres amb `getValues` | 20 | 5 |
| Cerques de la subcarpeta del partit | 6 | 1 |
| Miniatures autoritzades retornades | 6 | 6 |

La referència anterior és `backend/Code.gs` del commit `52d6fc5e313b7203999181a08fea4cbce87a9174`. Les proves es poden reproduir sense cap telèfon real ni credencial Google:

```bash
npm run test:backend
npm run test:performance
# Comparació amb una còpia local del codi anterior:
node backend/tests/performance.cjs /ruta/al/Code-anterior.gs
```

Altres diferències verificades al navegador amb API simulada:

| Operació | Abans | Ara |
|---|---|---|
| Entrar amb consentiment vigent | `login` + `bootstrap` | `login` amb dades inicials: 1 petició |
| Primer accés amb acceptació | `login` + `acceptPrivacy` + `bootstrap` | 2 peticions; cap dada abans d'acceptar |
| Actualitzar l'àlbum amb retrats vigents | Descarrega de nou tots els retrats | Reutilitza els retrats que el servidor confirma autoritzats |
| Carregar més de sis retrats o miniatures | Paquets successius | Fins a 2 paquets simultanis, de 6 imatges cadascun |

## Controls que es mantenen

- Cada petició HTTP torna a llegir usuaris i permisos, també bootstrap. Les instantànies de files i carpetes només viuen durant aquella petició; no hi ha una còpia compartida entre peticions que pugui ocultar una revocació.
- Les files retornades són còpies. Desar una pestanya invalida la seva instantània, i els errors descarten el context de la petició.
- Cada fitxer conserva els controls de privacitat, nom, parent, MIME i mida. Els retrats es validen directament en bytes, inclosa l'absència de metadades, abans de passar-los a base64.
- Un retrat només es reutilitza amb `fresh_permissions=true`, consentiment vigent, mateix rol i vista, i jugador i versió presents a la resposta actual del servidor. Un backend antic provoca la recàrrega conservadora.
- Es descarten retrats modificats o retirats, i totes les imatges en sortir de la secció, perdre connexió, fallar la revalidació o tancar sessió. Les respostes tardanes no poden tornar a inserir-les.
- Les fotos no s'emmagatzemen a localStorage ni a Cache Storage. El service worker només guarda l'app estàtica.
- Les escriptures conserven el bloqueig, `request_id`, comprovació de versió i recuperació d'auditoria. La cua de pujades continua sent seqüencial; la concurrència nova només afecta lectures d'imatges.

## Validació i límits

41 proves del servidor, 16 proves de domini i càrrega concurrent, i proves de navegador amb consentiment, accés combinat i antic, edició, pujades repetides, rols, revocació, retrats modificats/restringits, errors de connexió, cancel·lació de càrregues i service worker offline.

No s'ha mesurat el temps d'entrada ni de galeria amb un compte real. Les proves públiques del servei des de l'entorn de desenvolupament no permeten atribuir tota la latència a Sheets o Drive. Després de publicar el backend, cal comparar aquestes operacions al mateix mòbil i connexió: entrada, obertura de l'àlbum, actualització sense canvis, galeria i desament d'un cromo. Apps Script i Drive continuen formant part del recorregut; no s'afirma un percentatge de velocitat garantit.

## Activació

1. Substitueix `Code.gs` per [backend/Code.gs](backend/Code.gs), desa'l i executa `installBackend`. És repetible i conserva les dades existents.
2. A **Implementar → Gestionar implementaciones → llapis**, selecciona **Versión: Nueva versión** i prem **Implementar**. Conserva la mateixa URL `/exec`.
3. Tanca totes les pestanyes i l'app instal·lada, i torna-la a obrir. El servei públic ha d'indicar `version: 2.2.0`.

El manifest d'Apps Script no canvia. No cal moure fotos, modificar el Sheet ni crear un altre desplegament.
