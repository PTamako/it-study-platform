# 知学 · Personal Study Space

A mobile-first personal learning PWA built with Vue 3, TypeScript, Vite and Cloudflare Workers/D1.

## Modules

- **Exam prep:** extensible tracks for SG, FE, AP and other qualifications. Official questions and generated practice questions must be labelled separately.
- **Japanese & English:** same six learning categories, with language-specific grammar and pronunciation support.
- **Dictionary & IT glossary:** Chinese/Japanese/English terminology, examples and a personal vocabulary notebook.

## Local development

Requirements: Node.js 20+.

```sh
npm install
npm run dev
npm run typecheck
npm run build
```

## PWA

Deploy over HTTPS, then open the site in Safari on iPhone → Share → Add to Home Screen. PWA support and offline behavior vary by browser; the first offline shell is intentionally basic.

## Cloudflare (next setup stage)

The initial D1 schema is in `migrations/0001_initial.sql`; Worker configuration is in `wrangler.toml`. Create your own D1 database and replace the placeholder `database_id` before deployment. Do not commit API tokens or passwords. Put local secrets in `.dev.vars` (ignored by Git) and production secrets in Cloudflare Worker secrets.

## Data integrity

No fake official exam questions are included. Question records include a source type and source reference. The first release uses a small clearly labelled practice example only for demonstrating the interaction.

## Security

- `.env*` and `.dev.vars` are ignored by Git.
- Never put credentials in client-side Vue code.
- Review source licenses and official exam reproduction rules before importing real questions.
- Run type checking and production build before deployment.
