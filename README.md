# CF Vilajuïga · La nostra temporada

PWA privada per a les famílies del CF Vilajuïga: calendari, resultats, cròniques, cromos i fotografies de la temporada 2026/27.

- Frontend `4.0.0`: JavaScript natiu, PWA estàtica i GitHub Pages.
- Backend `3.0.0`: Google Apps Script, Sheets i Drive privat.
- Accés: invitacions de quatre xifres, d’un sol ús i amb caducitat.
- Privacitat: permisos comprovats al servidor, etiquetatge obligatori de fotos i cap imatge privada al repositori o al service worker.

App publicada: https://almogaver-lgtm.github.io/cf-vilajuiga/

Consulta [la guia funcional i de desplegament](README-CA.md) i [la guia del backend](backend/README-CA.md).

## Proves

```bash
npm test
npm run test:backend
npm run test:performance
npm run test:browser
```

Les proves de navegador requereixen Playwright i Chromium.
