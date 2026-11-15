# Testing and debugging

All test scripts use [Playwright](https://playwright.dev) and expect the production build served on port 4173. Run every command from the repository root.

```bash
npm install
npx playwright install chromium     # first time only: downloads the browser
npm run build
npm run preview                     # leave this running in one terminal
```

The scripts launch Chromium with `--use-angle=d3d11 --ignore-gpu-blocklist` so WebGL runs on the GPU under Windows. On macOS or Linux, remove those two flags in the script you are running if the browser fails to start.

## The suites

| Script | What it covers | Run |
|---|---|---|
| `tests/e2e.mjs` | Routing without page reloads, the home scroll story, material morphs, the form (errors, success, server failure, honeypot), no-WebGL and software-renderer fallbacks, a forced-degradation case, axe accessibility on every page, keyboard use, and performance runs under CPU and network throttling. | `npm run test:e2e` |
| `tests/audit.mjs` | Click-through of every link and button on every page, nav hover and dropdown, scroll targets, copy checks. | `node tests/audit.mjs` |

`e2e.mjs` options, set as environment variables:

| Variable | Effect |
|---|---|
| `BASE` | Test another URL instead of `http://127.0.0.1:4173`, for example the deployed site. |
| `ONLY` | A regular expression; only tests whose name matches run, and the slow performance section is skipped. |
| `PERF` | Set together with `ONLY` to keep the performance section. |

```bash
ONLY="form" node tests/e2e.mjs
```

On Windows PowerShell: `$env:ONLY = 'form'; node tests/e2e.mjs`.

### Current status (last full run, 2026-11-15, local preview)

40 checks pass. Five tests fail and have not been fixed yet:

| Failing test | Likely cause (not yet confirmed) |
|---|---|
| `home scroll story` | The suite predates the click-to-enter opener. The home page now holds at the wordmark (scene state 7) until a click, so the test never leaves it. |
| `OS reduce-motion is ignored` | Same: `page.click` times out on the home page while the opener is active. |
| `worst-case matrix` | Same: the hero reports state 7 instead of the crystal. |
| `axe` | Contrast failures at `/` and `/#space` on `.btn-sm` and `.lede` (measured at contrast 1.01) look like the nav and headline being captured while the opener holds them nearly transparent. `label-content-name-mismatch` on the loop step buttons (`button[data-go]`) is a separate finding and is probably real. |
| `perf: home, phone, WebGL off, 6x CPU, 3G` | LCP 11.3 s and CLS 0.107 on the slowest simulated phone with WebGL off. Not investigated. |

The first three need the tests to click or press a key before scrolling. The axe, label-mismatch and performance results are worth looking at before treating them as test problems.

## Diagnostic scripts

`tests/diagnostics/` holds one-off scripts written while tuning motion and performance. They are not part of the regression suite and may need small edits to run again. They write screenshots and traces to `tests/shots/`, which is not tracked by git. Useful ones:

| Script | Purpose |
|---|---|
| `alldots.mjs`, `span.mjs`, `rail.mjs` | Click every scroll dot on every page and screenshot where it lands. |
| `clickopen.mjs`, `rewind.mjs`, `endjit.mjs` | The opener: click-to-morph timing, the replay rewind, and the last frames of the morph. |
| `jank.mjs` | Frame pacing (requestAnimationFrame deltas) through the morph, optionally with a forced tier and CPU slowdown: `node tests/diagnostics/jank.mjs low 4`. |
| `jank3.mjs` | Attributes a long frame with the Long Animation Frames API. |
| `jank4.mjs` | Records a Chrome trace of the morph and lists events longer than 60 ms. |
| `sync.mjs` | Crystal state and page chrome must agree at any scroll speed. |
| `steps.mjs` | Clicking a loop stage lands on its finished state, on desktop and phone, by mouse and keyboard. |
| `sizes.mjs` | Several real laptop viewport sizes and display scalings. |
| `tour2.mjs` | Visual tour of every page with a mid-transition frame. |
| `og.mjs` | Renders the home scene at 1200 x 630 into `public/og.png`. |

## Debug switches

Add these to any URL:

| Parameter | Effect |
|---|---|
| `?debug` | On-screen badge: GPU budget chosen, renderer name, point count, frame time, current scene state. |
| `?tier=off` / `low` / `mid` / `high` | Force a GPU budget. `off` runs the page with no WebGL at all. |
| `?motion=reduce` | The static layout, with no scroll-driven animation. The OS setting is ignored on purpose; this is the only way in. |
| `?safe` | No loader, wipe, smooth scroll, custom cursor or overlays. Use it to isolate a problem on one machine. |

Exposed on `window` for the scripts: `__field` (the renderer and its `state`) and `__tier` (the chosen budget).

## Chasing a stutter

1. Open the page with `?debug` and check the tier, point count and frame time.
2. Reproduce it with `jank.mjs` to get frame deltas and the slowest frames.
3. If one frame is long and not caused by script, record a trace with `jank4.mjs`. A single long frame on the first appearance of an element is usually a GPU shader compile for a CSS effect painted for the first time; the fix is to avoid that effect or paint it once before it is needed (see `warmChrome()` in `src/main.js`).
4. Compare variants in a fresh browser each time. A warm browser hides first-paint costs.
