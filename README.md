# CF Vilajuïga · La nostra temporada

App de les famílies: partits, resultats, cròniques i fotografies privades, en català i instal·lable al mòbil.

Frontend estàtic preparat per a GitHub Pages. Les dades i fotografies privades es consulten al backend Apps Script amb autenticació; no es publiquen en aquest repositori.

La temporada comença buida fins que s’hi afegeixin els partits i jugadors reals.

Consulta [les instruccions i els crèdits](README-CA.md).

## Publicació

A Settings → Pages, tria Deploy from a branch → main → / (root) → Save. GitHub mostrarà l’enllaç quan la publicació s’hagi completat.

## Proves

`npm test` per a les proves de domini. `npm run test:browser` per a les proves amb API simulada (requereix Playwright i Python 3).
