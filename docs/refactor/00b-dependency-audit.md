# Dependency & Orphan Audit (Ask-first)

This report flags potentially unused dependencies and orphaned items. No removals performed.

## Tools & raw outputs

- depcheck: detects unused/missing deps
- npm ls --depth=0: installed package tree
- dependency-cruiser: import graph from `src/`
- ts-prune: unused exports

### depcheck (raw)

```
{"dependencies":["@tailwindcss/postcss","class-variance-authority","clsx","esbuild","fdir","nanoid","picocolors","picomatch","react-icons","rollup","shadcn-ui","source-map-js","tailwind-merge","tinyglobby","troika-three-text"],"devDependencies":["@types/react-dom","autoprefixer","postcss","tailwindcss"],"missing":{"eslint-config-prettier":[".eslintrc.json"],"@eslint/js":["eslint.config.js"]},"using":{...}}
```

Notes:
- depcheck commonly flags false positives for config-only deps and CSS frameworks (Needs Approval).

### npm ls --depth=0 (raw)

```
pipeline-visualizer@1.0.0
... (see terminal output)
```

### dependency-cruiser (summary)
- No orphans detected in `src/`; imports resolved.
- `esmSetup.js` imports `three` & `gsap` as expected.

### ts-prune (raw)

```
vite.config.js:5 - default
src/3d/constants/embedBusinessData.js:16 - STAGE_CONFIG
src/3d/constants/embedBusinessData.js:29 - PIPELINE_CONFIG
src/3d/constants/embedBusinessData.js:41 - BUSINESS_METRICS
src/3d/constants/embedProcessContent.js:7 - THOUGHT_BUBBLE_CONTENT
```

These appear unused because embed uses `DEFAULT_BUSINESS_DATA` and `PROCESS_AUTOMATIONS`. Keep unless we drop embed variants.

## Package audit

| Package | Why flagged | Evidence | Risk | Recommendation |
|---|---|---|---|---|
| class-variance-authority | Not imported in `src/` | depcheck unused | Low | Needs Approval: likely unused; remove if no planned use |
| clsx | Not imported | depcheck unused | Low | Needs Approval: remove if not planned |
| react-icons | Not imported | depcheck unused | Low | Needs Approval: remove if not planned |
| shadcn-ui | Not imported (design system placeholder) | depcheck unused | Low | Needs Approval: keep if planned, else remove |
| tailwind-merge | Not imported directly | depcheck unused | Low | Needs Approval: remove if not using Tailwind utilities merging |
| @tailwindcss/postcss | Config-only plugin | depcheck unused | Low | Needs Approval: keep if Tailwind pipeline used; else remove |
| tailwindcss | CSS framework; not wired in templates | depcheck unused | Med | Needs Approval: keep if adopting Tailwind; else remove |
| postcss, autoprefixer | Build-time CSS tooling | depcheck unused | Low | Needs Approval: keep with Tailwind; else remove |
| esbuild, rollup, source-map-js, picocolors, picomatch | Toolchain libs pinned directly | depcheck unused | Med | Needs Approval: typically transitive via Vite; verify before removal |
| tinyglobby, fdir, nanoid | Not imported | depcheck unused | Low | Needs Approval: remove if no planned use |
| troika-three-text | Not imported | depcheck unused | Low | Needs Approval: remove if not planned (we use three-spritetext) |
| eslint-config-prettier | Missing (referenced in .eslintrc.json) | depcheck missing | Low | We migrated to flat config; safe to ignore or install if keeping .eslintrc.json |
| @eslint/js | Missing before init, now present | depcheck missing | Low | Already in use in flat config |

Notes:
- `gsap` and `three` are used via `esmSetup.js` – do not remove.
- `three-spritetext` is used by `Pipeline.js` – do not remove.
- Versions: npm ls shows `gsap@3.13.0` installed.

## Orphaned files & assets

| File/Asset | Evidence | Recommendation |
|---|---|---|
| test_output.html | Not referenced by app | Remove after approval |

No >100KB unreferenced assets found under `public/`.

## Proposed removals (Ask-first)

- class-variance-authority, clsx, react-icons, shadcn-ui, tailwind-merge, tinyglobby, fdir, nanoid, troika-three-text
- Potentially redundant toolchain direct deps: esbuild, rollup, picomatch, picocolors, source-map-js (verify transitive coverage by Vite before removal)
- CSS pipeline (tailwindcss, @tailwindcss/postcss, postcss, autoprefixer) if not planning Tailwind usage soon
- test_output.html (or move to artifacts/)

Please confirm which items to remove. I will then:
- Remove in small commits per category
- Deduplicate/prune
- Rebuild, lint, typecheck, test
- Document results in `/docs/refactor/D-hygiene.md`.
