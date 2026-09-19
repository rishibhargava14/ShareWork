<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Repo specifics

Fresh `create-next-app` scaffold (Next 16, React 19, App Router in `src/`). No tests, no CI, no release tooling.

## Commands

- `npm run dev` / `npm run build` / `npm run start` / `npm run lint`
- There is **no** `typecheck` or `test` script. To typecheck run `npx tsc --noEmit`; `npm run lint` (`eslint` with `eslint.config.mjs`) is the only behavioral check.
- Verify changes with `npm run lint` + `npx tsc --noEmit`.

## Conventions & quirks

- Tailwind CSS v4: **no `tailwind.config.js`**. Theme (colors/fonts) is defined via `@theme` inside `src/app/globals.css` using CSS variables; extend it there, not in a config file.
- `reactCompiler: true` is set in `next.config.ts` — the React Compiler is on; don't hand-optimize with `useMemo`/`useCallback` unless profiling shows a need.
- Path alias `@/*` maps to `src/*` (see `tsconfig.json`).
- Fonts: Geist / Geist Mono are loaded once in `src/app/layout.tsx` via `next/font/google` and mapped to Tailwind tokens `font-sans` / `font-mono`.

## Docs

This is Next.js 16 — APIs differ from training data. The authoritative local docs live in `node_modules/next/dist/docs/` (App Router under `01-app/`); read the relevant guide before writing framework code.
