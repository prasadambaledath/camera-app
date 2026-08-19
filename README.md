# Camera App

A small demo for comparing how photo capture behaves across devices and browsers.

Use it to check native camera handoff versus an in-page live preview — permissions, facing mode, and what actually comes back after capture.

**Live demo:** [prasadambaledath.github.io/camera-app](https://prasadambaledath.github.io/camera-app/)

## Capture modes

- **Device Camera** — Opens the phone’s native camera app through a file input (`accept="image/*"` + `capture="environment"`). After you take a photo, the image is returned to the page.
- **In-App Camera** — Starts a live preview in the browser with `getUserMedia`. You can capture a frame, flip between rear and front cameras, or cancel without leaving the page.

Captured photos appear in a session gallery and can be deleted. Nothing is uploaded or stored after you leave the page.

## Run locally

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`). Localhost counts as a secure context, so in-app camera should work there.

```bash
npm run build    # production build
npm run preview  # serve the built app
npm run lint     # ESLint
```
## Stack

React, TypeScript, Vite, and React Router. No backend — images stay in memory as object URLs or data URLs for the current session.
