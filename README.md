# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

## HCR collection data

HCR collection records are maintained manually in `src/hcrCollections.json`. Add entries to the JSON array; no server or browser storage is used for HCR data. Each entry uses this shape:

```json
{
  "id": "2026-11-02-race-1",
  "week": "2026-11-02",
  "race": "Race name",
  "collector": "Collector name",
  "amount": 1.25,
  "unitValue": 10.00
}
```

`week` is the Monday date in `YYYY-MM-DD` format, `amount` is the HCR quantity, and `unitValue` is optional USD value per HCR (use `null` if unknown). After editing the JSON, rebuild and redeploy the site for the changes to appear.
