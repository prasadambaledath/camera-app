# Camera App

A demo for comparing how photo capture behaves across devices and browsers — and for reproducing a field OOM we saw in iTrac.

**Incident:** [ALP-2004 / INC-1776649](https://linear.app/convergint/issue/ALP-2004/inc-1776649)  
**Live demo:** [prasadambaledath.github.io/camera-app](https://prasadambaledath.github.io/camera-app/)

iTrac ([itrac-client](https://github.com/convergint/itrac-client)) can reload the tab with “Unable to complete previous operation due to low memory” after native camera handoff. This app started as a light Vite/React page so we could isolate whether the **camera API** was broken, or whether Chrome was reclaiming a **heavy backgrounded tab**.

The light app stays up. Next we add iTrac-like weight **one variable at a time**.

## Capture modes

- **Device Camera** — Opens the phone’s native camera (`<input capture="environment">`). The browser tab is backgrounded while the OS camera runs. This is the iTrac kill path.
- **In-App Camera** — Live preview with `getUserMedia`. The tab stays in the foreground.

Captured photos stay in a session gallery only. Nothing is uploaded.

## Memory load (current experiment)

iTrac forms themselves are not unusually heavy. The risk is **photos as base64 in JS memory**, sitting in a still-alive SPA, then native Camera backgrounds that tab.

This panel models that — not 200MB empty typed arrays:

| Level | JPEG data URLs in React state (~1–2 MB each) | Fake checklist fields |
| --- | --- | --- |
| Off | — | — |
| Low | 5 | 6 |
| Medium | 12 | 12 |
| High | 20 | 18 |

Each photo is kept as `data:image/jpeg;base64,...` and rendered with `<img src={...}>`, same as UDF / test-note images in iTrac. JS strings are UTF-16, so heap cost is larger than the JPEG bytes.

Load stays applied when you switch Device Camera ↔ In-App Camera. Chrome heap is shown when `performance.memory` is available.

If Chrome kills the tab during native handoff, the next load shows a **reload** banner (pending handoff + navigation type `reload`).

### Test matrix (same Samsung / Chrome)

1. Load = Off → Device Camera  
2. Load = High → Device Camera (20 in-memory photos, then native handoff)  
3. Load = High → In-App Camera  

If (2) reloads and (3) does not, that confirms: native camera backgrounds a tab that already holds images in memory. The camera API itself is not the bug.

Change **one** thing per build. Use **Copy log** after each trial (device, heap, mode, load, PWA Y/N, reload Y/N).

## What we are not adding yet

PWA / service worker is later. It is useful for installed vs browser-tab, but it is the wrong first variable on this small app.


## Run locally

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`). Localhost is a secure context, so in-app camera should work.

```bash
npm run build    # production build
npm run preview  # serve the built app
npm run lint     # ESLint
```

Pushes to `main` deploy `dist/` to GitHub Pages. Production base path is `/camera-app/`.

## Stack

React, TypeScript, Vite, and React Router. No backend. Experiment photos are held as JPEG data URLs in React state (and rendered) so they are not garbage-collected when you switch camera modes.
