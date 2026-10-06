# CF Vilajuïga · La nostra temporada

App de les famílies: partits, resultats, cròniques i fotografies privades, en català i instal·lable al mòbil.

Frontend estàtic preparat per a GitHub Pages. Les dades i fotografies privades es consulten al backend Apps Script amb autenticació; no es publiquen en aquest repositori.

Versió 3.2.0: àlbum de cromos amb nom, dorsal, posició i retrat privat (edició i fotos requereixen actualitzar Apps Script a 2.1.0). També inclou calendari real de 7 jornades d’anada importat al backend i nova secció Lliga amb els 8 equips, camps, rutes i fonts. Els jugadors s’afegiran més endavant.

App publicada: https://almogaver-lgtm.github.io/cf-vilajuiga/

Consulta [les instruccions i els crèdits](README-CA.md).

## Publicació

A Settings → Pages, tria Deploy from a branch → main → / (root) → Save. GitHub mostrarà l’enllaç quan la publicació s’hagi completat.

## Proves

`npm test` per a les proves de domini. `npm run test:browser` per a les proves amb API simulada (requereix Playwright i Python 3).
