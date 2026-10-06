# CF Vilajuïga · La nostra temporada

App de les famílies: partits, resultats, cròniques i fotografies privades, en català i instal·lable al mòbil.

Frontend estàtic preparat per a GitHub Pages. Les dades i fotografies privades es consulten al backend Apps Script amb autenticació; no es publiquen en aquest repositori.

Versió 3.3.0: àlbum de cromos amb nom, dorsal, posició i retrat privat (edició i fotos requereixen actualitzar Apps Script a 2.1.0 o posterior). També inclou calendari real de 7 jornades d’anada importat al backend i nova secció Lliga amb els 8 equips, camps, rutes i fonts. El backend 2.2.0 redueix lectures repetides, uneix accés i càrrega inicial, i permet reutilitzar retrats autoritzats. Vegeu [les mesures i la validació](PERFORMANCE-CA.md).

App publicada: https://almogaver-lgtm.github.io/cf-vilajuiga/

Consulta [les instruccions i els crèdits](README-CA.md).

## Publicació

A Settings → Pages, tria Deploy from a branch → main → / (root) → Save. GitHub mostrarà l’enllaç quan la publicació s’hagi completat.

## Proves

`npm test` per a les proves de domini i càrrega concurrent. `npm run test:backend` per al servidor simulat. `npm run test:browser` per a les proves amb API simulada (requereix Playwright i Python 3).
