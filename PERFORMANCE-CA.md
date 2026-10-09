# Rendiment · CF Vilajuïga 4.0.2 / backend 3.0.1

La versió 3.0.1 redueix operacions de Drive sense treure controls d'accés. La versió 4.0.2 reutilitza retrats i miniatures en memòria després de revalidar-ne la visibilitat; les imatges privades no es desen a `localStorage`, Cache Storage ni al service worker.

## Mesura reproduïble amb dades sintètiques

`npm run test:performance` executa quatre escenaris amb Sheets i Drive simulats:

- `bootstrap`;
- `getPlayerPortraits` amb dos retrats;
- `listPhotos` en un partit sense fotografies;
- `getThumbnails` amb sis miniatures.

Els resultats són comptadors de crides als dobles locals, no mil·lisegons ni latència real de Google.

| Escenari | Mesura | Backend 3.0.0 | Backend 3.0.1 |
|---|---|---:|---:|
| `bootstrap` | Obertures / lectures de dades / capçaleres | 1 / 4 / 4 | 1 / 4 / 4 |
| Dos retrats | Operacions Drive instrumentades totals | 28 | 14 |
| Dos retrats | Metadades / ACL / parents / blobs | 8 / 12 / 2 / 2 | 0 / 6 / 0 / 2 |
| Dos retrats | Consultes agrupades `Drive.Files.get` | 0 | 2 |
| Galeria buida | Lectures de dades / capçaleres | 4 / 5 | 3 / 4 |
| Sis miniatures | Operacions Drive instrumentades totals | 68 | 26 |
| Sis miniatures | Metadades / ACL / parents / blobs | 24 / 24 / 6 / 6 | 0 / 6 / 0 / 6 |
| Sis miniatures | Consultes agrupades `Drive.Files.get` | 0 | 6 |

El total Drive suma les cerques de carpeta, lectures de carpeta i fitxer, metadades, ACL, parents, blobs i la consulta agrupada. La reducció prové de consultar les metadades v2 una vegada per fitxer; no s'han eliminat les comprovacions de compartició, paperera, MIME, nom, mida o carpeta pare.

Al navegador simulat:

| Operació després d'una navegació entre seccions | 4.0.1 | 4.0.2 |
|---|---:|---:|
| Tornar a una galeria sense canvis | torna a descarregar la miniatura | reutilitza el mateix `blob:` després de `listPhotos` |
| Tornar als cromos sense canvis | torna a descarregar el retrat | reutilitza el mateix `blob:` després de `bootstrap` |

Les respostes tardanes continuen cancel·lades amb la generació de vista i la identitat de sessió.

## Mesura opcional del backend real

Les lectures `bootstrap`, `getPlayerPortraits`, `listPhotos` i `getThumbnails` accepten `"diagnostics": true`. La resposta incorpora:

```json
{"diagnostics":{"server_ms":1234}}
```

El diagnòstic no escriu logs ni inclou tokens, telèfons o dades personals addicionals. Només s'ha d'utilitzar en una prova autoritzada i comparable, amb el mateix compte, dispositiu, xarxa i conjunt sintètic o controlat.

No s'ha contactat el servei real en aquesta implementació. Per tant, no s'afirma que els 9,63 segons observats baixin per sota de 3 segons fins que el backend 3.0.1 es publiqui i es mesuri. Apps Script, Drive i la mida/base64 de les imatges continuen imposant latència externa.

## Controls preservats

- Cada petició autentica de nou l'usuari actiu, el rol, la sessió i el consentiment.
- `no_mostrar`, eliminacions, partits ocults i accés administratiu continuen comprovats al servidor.
- Cada fitxer valida permisos privats, paperera, nom, MIME, mida i carpeta pare abans de llegir-ne els bytes.
- Els JPEG continuen validant mida, dimensions, estructura i absència de metadades sensibles.
- Canviar de compte, tancar sessió, quedar offline o fallar la revalidació revoca tots els URL `blob:`.
- Les miniatures retirades durant `listPhotos` es revoquen abans de poder-se tornar a mostrar.
- Les escriptures, bloquejos, `request_id` i auditories no han canviat.

## Activació

1. Revisa el diff i executa les quatre suites.
2. Publica `backend/Code.gs` com una nova versió Apps Script amb la mateixa URL `/exec`; no cal migrar el Sheet ni Drive.
3. Verifica `health`: backend `3.0.1`, `configured: true`.
4. Mesura els quatre escenaris amb `diagnostics: true` només amb autorització.
5. Publica el frontend `4.0.2` i comprova la cache PWA `v4.0.2`.
