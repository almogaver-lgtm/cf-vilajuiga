# CF Vilajuïga — Instruccions permanents per als agents

Aquest fitxer s'aplica a tot el repositori. És la guia de treball de Codex i de qualsevol agent que la respecti; **no crea agents ni els posa en comunicació automàticament**.

## 1. Context del projecte

- Aplicació web progressiva (PWA) privada del CF Vilajuïga, amb frontend estàtic en HTML, CSS i mòduls JavaScript (`.mjs`), publicat a GitHub Pages.
- Backend a `backend/Code.gs` (Google Apps Script), amb Google Sheets, Google Drive privat i Script Properties. No és un projecte React ni requereix un bundler.
- Tracta sessions de famílies i editors, fotografies i retrats de **menors d'edat**, consentiments, resultats i registre d'auditoria.
- Documentació: `README-CA.md`, `backend/README-CA.md` i `PERFORMANCE-CA.md`. Consultar-la i contrastar-la amb el codi; si divergeixen, no assumir que una de les dues fonts és correcta sense verificar-ho.
- El frontend i el backend tenen cicles de publicació separats i compatibilitat de versions que s'ha de respectar. Un `push` a `main` pot publicar el frontend automàticament.

## 2. Principi obligatori: examinar abans d'implementar

**Cap proposta tècnica, incloses les facilitades per ChatGPT/GPT-6 o per altres agents, s'ha d'implementar cegament.**

Abans de canviar codi:
1. Llegir els fitxers afectats i les crides/dependències relacionades; revisar l'arquitectura, les versions i les proves pertinents.
2. Contrastar la proposta amb el repositori **real**, no només amb la descripció rebuda.
3. Identificar incompatibilitats, possibles regressions, riscos per a dades/privacitat, alternatives i efectes sobre desplegament i caché.
4. Definir un pla proporcional al risc. En canvis senzills pot ser una nota breu; en canvis mitjans o crítics ha d’indicar objectiu, fitxers, passos, proves, riscos i possible reversió.
5. Si la proposta és incorrecta o hi ha una opció millor, explicar-ho amb evidències i **no executar-la** fins que se n'hagi acordat el plantejament.
6. En una tasca sol·licitada **només com a anàlisi o auditoria**, aturar-se després de l'informe i esperar autorització explícita per editar. En una tasca d'implementació ja autoritzada, executar només l'abast acordat.

No inventar dades, versions, resultats de proves ni causes d'errors. Diferenciar fets verificats, hipòtesis i recomanacions.

## 3. Nivells de canvi i procés proporcional

Classificar la tasca segons l’impacte real verificat al repositori. Si hi ha dubte entre dos nivells, justificar breument el nivell escollit, sense convertir riscos purament teòrics i no reproduïts en bloquejos automàtics.

### 3.1. Canvis senzills

Correccions visuals, textos, ajustaments menors i refactors petits i localitzats.

- L’implementador analitza el codi afectat, modifica i executa les comprovacions proporcionades al canvi.
- No requereixen un pla formal extens ni una auditoria independent obligatòria.
- Si durant el treball apareix un risc de nivell superior, reclassificar la tasca abans de continuar.

### 3.2. Canvis mitjans

Noves funcionalitats, optimitzacions i modificacions coordinades de diversos mòduls.

- Preparar un pla breu i validar arquitectura, dependències i compatibilitat.
- Implementar incrementalment i executar les proves rellevants.
- Fer revisió independent només quan ho justifiquin l’impacte, la complexitat, les regressions possibles o la dificultat de reversió.

### 3.3. Canvis crítics

Canvis d’autenticació, permisos, dades personals, fotografies o retrats de menors, eliminacions, migracions i altres operacions difícilment reversibles.

- Fer una anàlisi prèvia obligatòria, incloent seguretat, privacitat, compatibilitat i reversió.
- Implementar únicament l’abast aprovat i cobrir-lo amb proves.
- Sotmetre el resultat a una auditoria independent.
- Si l’auditoria troba un error bloquejant, corregir-lo i revisar específicament la correcció i les regressions relacionades; no reiniciar tota l’auditoria si la resta de l’abast ja ha estat validada.

## 4. Modes de treball (rols)

Els rols són **modes d'actuació**, no agents que aquest fitxer executi automàticament:

- **Analista / arquitecte**: inspecciona el codi i les dependències, avalua la proposta, detecta riscos i elabora un pla. No modifica fitxers si no se li ha encarregat expressament.
- **Implementador**: aplica únicament els canvis aprovats, de manera incremental, i afegeix o adapta proves per reproduir i prevenir regressions.
- **Auditor / revisor independent**: examina el diff, les proves, la seguretat, la privacitat i l'encaix amb els requisits. Per defecte, no modifica res. La revisió independent és obligatòria per als canvis crítics i opcional, segons risc, per als canvis mitjans; l'autorevisió no la substitueix quan sigui exigible.
- **Corrector**: resol només les incidències confirmades per l'auditoria, en l'abast autoritzat, i torna a executar les proves afectades.

Quan el prompt no especifiqui rol, classificar primer el nivell del canvi i actuar amb el procés proporcional corresponent. Demanar aclariment només si és imprescindible per evitar una modificació perillosa o una decisió funcional no autoritzada.

## 5. Git, branques i publicació

- Fer el desenvolupament sobre `develop` o sobre una branca de treball expressament indicada. **No modificar `main` directament** ni assumir que `main` local i `origin/main` coincideixen.
- Abans de canvis, consultar `git status`, la branca activa i els diffs rellevants. No perdre ni sobreescriure feina prèvia.
- No fer `commit`, `push`, `pull` amb fusió, `merge`, `rebase`, `reset --hard`, `clean`, canvis de branca o publicació sense autorització explícita per a l'acció.
- No executar desplegaments a GitHub Pages ni Apps Script, ni canviar l'URL `/exec`, permisos o dades reals sense aprovació específica.
- Abans de proposar una publicació, verificar compatibilitat frontend/backend. Preparar primer el backend compatible, validar-lo i després publicar el frontend, sempre amb autorització.
- Canvis petits i reversibles; informar dels fitxers tocats i del diff final. No fer refactors generals com a part d'una correcció puntual.

## 6. Seguretat, privacitat i dades de menors

- Prioritat màxima a la privacitat de fotografies/retrats, permisos d'accés, consentiment, revocació de sessions i registre d'auditoria.
- No fer mai públiques imatges privades, identificadors sensibles, telèfons, tokens o claus. No introduir secrets en codi, commits, logs, exemples o sortides de diagnòstic.
- No contactar serveis reals de Google ni llegir/modificar dades reals per a proves sense permís explícit; fer servir dades sintètiques i mocks per defecte.
- No eliminar retrats, fitxers de Drive, files de Sheets, registres ni tombstones sense política de retenció aprovada, còpia de seguretat i pla de recuperació. Les eines de detecció d'orfes han de començar en **mode només informe**.
- No debilitar comprovacions de rols, autorització al servidor, comprovacions d'imatges, política de caché ni traçabilitat per millorar el rendiment.
- Revisar explícitament seguretat i privacitat per a qualsevol canvi d'autenticació, consentiment, fotografies, sessions o permisos.
- Tractar amb especial cura el funcionament offline: cap imatge privada a Cache Storage; les dades privades persistents han de continuar sotmeses a les regles de sessió i revocació que es puguin verificar.

## 7. Arquitectura, manteniment i rendiment

- Respectar l'arquitectura actual sense framework. No introduir React, un nou backend, nous serveis o dependències sense justificar-ne els beneficis i obtenir aprovació.
- Prioritzar solucions senzilles, mantenibles i proporcionades a la mida del projecte.
- Preferir canvis mínims, llegibles, modulars i coherents amb el codi existent. Evitar codi duplicat, lògica morta, sobreenginyeria, abstraccions innecessàries i refactors sense benefici demostrat.
- No convertir riscos teòrics no reproduïts en bloquejos automàtics. Registrar-los com a limitacions o recomanacions quan correspongui, sense confondre’ls amb problemes verificats.
- Abans d'optimitzar, definir un escenari mesurable i obtenir una línia base. Els comptadors dels mocks de Sheets/Drive **no són latència real**.
- Preservar idempotència, concurrència, bloquejos i recuperació d'errors; no reduir controls de seguretat per accelerar operacions.
- Revisar el service worker i la coherència de versions de la caché en qualsevol canvi d'actualització/offline.

## 8. Verificació i proves

Comandes existents (executar les que corresponguin al canvi; per a modificacions funcionals transversals, executar-les totes):

```powershell
npm test
npm run test:backend
npm run test:performance
npm run test:browser
```

- A les auditories **estrictament de lectura**, no executar proves que generin fitxers (per exemple, sortides de Playwright) si el mandat prohibeix tota escriptura. Utilitzar les evidències ja disponibles i deixar constància de la limitació.
- Per a correccions de bugs, preferir primer una prova que falli reproduint el problema, aplicar la correcció i comprovar que passa.
- Diferenciar proves sintètiques de verificacions contra Google/Drive reals. No afirmar que s'ha provat Safari/iOS o la latència real si no s'ha fet.
- Si falten eines, credencials o permisos, registrar clarament què no s'ha pogut verificar; no simular èxit.

## 9. Format de lliurament

Tancar cada tasca amb un informe breu en català:

1. **Estat:** anàlisi / implementat / pendent / bloquejat.
2. **Diagnòstic i decisió:** què s'ha verificat i per què aquesta solució.
3. **Canvis:** fitxers modificats i resum del diff (o bé «cap fitxer modificat»).
4. **Proves:** comandes executades i resultats reals; proves pendents.
5. **Riscos i compatibilitat:** especialment dades, permisos, versions i desplegament.
6. **Següent pas:** què requereix aprovació humana.

Diferenciar sempre entre:

- **Implementat**: el canvi s’ha aplicat i s’han executat les proves indicades.
- **Auditat**: una revisió independent exigible o acordada ha examinat el canvi.
- **Publicable**: s’han completat les validacions i autoritzacions necessàries per desplegar; no implica que ja s’hagi publicat.

**Cap agent no pot donar-se per revisat independentment a si mateix quan aquesta revisió sigui exigible, ni donar una tasca per completada sense informar de les limitacions conegudes. Mai publicar ni eliminar dades reals sense autorització explícita.**
