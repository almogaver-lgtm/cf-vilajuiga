# CF Vilajuïga · La nostra temporada

PWA en català, versió 3.1.0. Frontend estàtic preparat per a GitHub Pages, connectat al backend Apps Script 2.0.0 ja instal·lat. No inclou dades personals, contrasenyes ni fotografies privades al repositori.

## Publicació

1. Crea el repositori públic `cf-vilajuiga` a GitHub. Publica-hi els fitxers d’aquesta carpeta directament a l’arrel (no dins d’una altra carpeta).
2. A **Settings → Pages → Build and deployment**, tria **Deploy from a branch**, branca `main`, carpeta `/ (root)` i **Save**.
3. Obre la URL que mostri GitHub Pages. L’URL no queda confirmada fins que el desplegament s’ha completat.
4. Entra amb el número que has autoritzat a `03_USUARIS`, accepta el compromís de privacitat i comprova el teu compte. Les proves locals han fet servir dades sintètiques; l’accés real amb el teu número queda pendent de comprovar.

L’enllaç d’Apps Script ja és a `config.mjs`. Si canvies el desplegament, actualitza `API_URL`. La URL del servei és pública; els tokens i les dades privades es transmeten només al cos de les peticions.

## Què hi trobaràs

- Inici amb proper partit, últim resultat i estadístiques.
- Calendari amb filtres, detall, crònica, ruta de Google Maps i recordatori `.ics` (durada orientativa de 90 minuts).
- Lliga: fitxes dels 8 equips de l’Aleví masculí, Fase 1, Grup 1, amb municipi, camp, adreça, ruta i fonts consultades. El partit contra cada rival s’enllaça amb el calendari privat.
- Galeria privada per partit, visor, descàrrega amb avís i registre, etiquetes de jugadors i pujada de fotografies d’una en una.
- Compressió local a JPEG, límit de 1.5 MiB, costat màxim 1600 px; miniatures de fins a 480 px i 120 KiB. La reexportació elimina les metadades de la fotografia original.
- Si falla una pujada, es conserven a memòria els mateixos identificadors per reintentar-la sense duplicar-la. Mantén la pestanya oberta; en tancar-la es perd aquesta cua.
- Família: consulta i fotos. Editor: també resultats i cròniques. Administrador: també fotos ocultes, ocultar/mostrar i eliminació permanent amb confirmació. El servidor comprova tots els permisos i les restriccions dels jugadors.
- Sense connexió: consulta de l’última temporada guardada mentre la sessió sigui vigent. No hi ha fotos ni escriptures offline.
- Sortir esborra el token, la còpia local de les dades i les imatges temporals del dispositiu. Una revocació es coneix en recuperar connexió; un dispositiu desconnectat pot consultar la còpia local fins que la sessió caduqui.

El calendari real de la primera fase ja s’ha importat a `01_PARTITS`: 7 jornades d’anada, del 10 d’octubre al 22 de novembre de 2026. Dates i hores contrastades amb les pàgines 2–3 del PDF facilitat (Calendari 220). S’han mantingut els marcadors buits i tots els partits pendents. No s’han afegit jugadors ni usuaris de demostració.

El primer partit és a Palau-saverdera, dissabte 10 d’octubre a les 10:00. Hi ha 3 partits a casa i 4 a fora. La capçalera del PDF arriba al 21 de desembre, però no inclou jornades posteriors al 22 de novembre.

La secció Lliga usa informació pública consultada el 6 d’octubre de 2026; cada fitxa enllaça les fonts. A Palau hi ha una discrepància de numeració (22 al PDF i 24 a la FCF), per això la ruta cerca el camp municipal de la zona esportiva. Per La Finca s’usa la referència del catàleg municipal de Figueres; el PDF no concreta l’accés dins del recinte. Navata conserva el marcador de Maps del PDF, que correspon a Carrer de Figueres, 4. No s’han inventat coordenades, classificacions ni escuts dels rivals: els distintius són abreviacions gràfiques.

## Instal·lació al mòbil

Android: menú del navegador → Instal·lar app / Afegir a la pantalla d’inici.
iPhone: Safari → Compartir → Afegir a la pantalla d’inici.

Si tenies oberta la versió anterior, tanca totes les pestanyes de l’app (i l’app instal·lada) i torna-la a obrir perquè s’activi el nou service worker.

Cal servir l’app amb HTTPS (GitHub Pages ho proporciona) o localhost. Obrir `index.html` amb doble clic no serveix per provar els mòduls ni la PWA. Per provar-la localment: `python3 -m http.server 8080` des de la carpeta, i visita `http://localhost:8080`.

## Validació

`npm test` comprova la transcripció de les 7 jornades, els camps locals, els 8 equips, les rutes i dates de Madrid, selecció de partits, resultats, mapes, escapament del calendari i caducitat de sessió.

Per repetir les proves de navegador: `npm install`, `npx playwright install chromium`, `npm run test:browser` (també cal Python 3). Si disposes d’un Chromium instal·lat, pots especificar `CHROMIUM_EXECUTABLE`.

Proves addicionals executades en Chromium amb API simulada: consentiment abans de persistir sessió, mòbil/ordinador sense desbordament, edició de marcador, miniatures i visor, descàrrega, reintent de pujada amb els mateixos UUID, consulta offline, neteja en sortir, permisos de família, revocació de sessió i temporada buida. També s’ha comprovat la secció Lliga en 390 i 360 px, les fonts i l’accés des de la fitxa del rival al partit corresponent. El service worker només emmagatzema la llista tancada de fitxers estàtics; no intercepta les peticions del backend ni guarda fotos privades.

## Disseny i crèdits

Blau i blanc, titulars esportius i navegació inferior al mòbil. La fotografia de portada és ambiental i no representa el camp de Vilajuïga.

- Foto: Nikola Tomašić, Unsplash, https://unsplash.com/photos/soccer-ball-rests-in-the-grass-at-sunset-GTxVeJj1UU0 (llicència Unsplash).
- Escut: publicat a https://futbol-regional.es/equipo.php?equ=15064, imatge https://futbol-regional.es/media/historico/escudos/17896.jpg. Cal confirmar amb el club que és la versió actual. És una marca del club, no un recurs declarat de domini públic.
- Icona d’app: monograma V creat per a aquesta interfície.
- Barlow Condensed: The Barlow Project Authors / Jeremy Tribby. SIL Open Font License 1.1, inclosa a `assets/OFL.txt`; font distribuïda per Google Fonts.
