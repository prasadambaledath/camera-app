# Camera App

A demo for comparing how photo capture behaves across devices and browsers — and for reproducing a field OOM we saw in iTrac.

**Incident:** [ALP-2004 / INC-1776649](https://linear.app/convergint/issue/ALP-2004/inc-1776649)  
**Live demo:** [prasadambaledath.github.io/camera-app](https://prasadambaledath.github.io/camera-app/)

iTrac ([itrac-client](https://github.com/convergint/itrac-client)) can reload the tab with “Unable to complete previous operation due to low memory” after native camera handoff. This app started as a light Vite/React page so we could isolate whether the **camera API** was broken, or whether Chrome was reclaiming a **heavy backgrounded tab**.

## Capture modes

- **Device Camera** — Opens the phone’s native camera (`<input capture="environment">`). The browser tab is backgrounded while the OS camera runs. This is the iTrac kill path.
- **In-App Camera** — Live preview with `getUserMedia`. The tab stays in the foreground.

Captured photos stay in a session gallery only. Nothing is uploaded.

## Memory load (experiment 1)

The risk is **photos as base64 in JS memory**, sitting in a still-alive SPA, then native Camera backgrounds that tab.

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

## Resize on Device Camera (experiment 2)

After the native camera returns a file, Device Camera can run `processFile()` / `resizeAndCompressUntilLimit`:

1. `createImageBitmap` downscale toward 1920×1080
2. Draw once onto a canvas
3. `toBlob` JPEG quality 100 → 10 until ≤ 2 MB
4. `arrayBuffer` → binary string → `btoa` data URL
5. Keep the base64 string in gallery state (`format64` / `blobValue` style)

The checkbox **resize after capture** defaults **on**. Turn it off to keep the raw `File` and preview it with `URL.createObjectURL` (no canvas, no quality loop, no base64).

Pending-handoff stays set until resize finishes, so a kill during `processFile` still shows the reload banner.

### Finding

- **Resize on** → page reload (same class of failure as the incident).
- **Resize off** → no reload; capture works.

That isolates a main root cause: **post-capture resize / compress / base64**, not a broken native camera API.

### Test matrix (same Samsung / Chrome)

1. Load = Off → Device Camera  
2. Load = High → Device Camera, resize **off**  
3. Load = High → Device Camera, resize **on**  
4. Load = High → In-App Camera  

If (2) survives and (3) reloads after the photo returns, the capture-time resize spike is involved. If the tab dies while still in the OS camera, that is the backgrounded-tab path.

Use **Copy log** (device, heap, mode, load, resize Y/N, PWA Y/N, reload Y/N).

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
