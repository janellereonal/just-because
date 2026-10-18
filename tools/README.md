# Tools: screenshots and demo media

Not part of the app or the build. These are the scripts used to check pages in a real browser and
to make the example-gift media in `public/demo/`.

## Setup (cloud workspace or Mac)

```bash
cd tools/screens && npm install          # playwright-core + @sparticuz/chromium
mkdir -p ../op                            # screenshots land in tools/op (git-ignored)
```

`@sparticuz/chromium` is used because the normal Playwright browser download is blocked in the
cloud workspace. WebGL works through SwiftShader (slow but fine).

Fonts: the sandbox can't reach Google Fonts, so screenshots fall back to system fonts unless the
theme fonts are installed locally. Install them from npm and copy the .ttf files into `~/.fonts`:
`npm i @fontsource/fraunces @fontsource/caprasimo @fontsource/gloock @fontsource/young-serif
@fontsource/cormorant-garamond @fontsource/bricolage-grotesque @fontsource/space-mono
@fontsource/instrument-sans @fontsource/inter-tight @fontsource/dm-sans` (Fontshare fonts like
Satoshi, Clash and Cabinet aren't on npm, so those still fall back).

The dev server must be running on http://localhost:8080 (`bun run dev`, see docs/NEXT-SESSION.md).

## Screenshot scripts (`tools/screens`, run from that folder)

| Script | What it does |
|---|---|
| `node scrolls.js "/example/ana?open=1" ana 390 844` | Scrolls a page, saves a contact sheet `op/ana-sheet.png` |
| `node shot.js <url> <out.png> [w] [h] [waitMs] [js] [full]` | One screenshot. `STATE=../state.json` for a signed-in session |
| `node gestures.cjs [base]` | Performs all 13 engine gestures on `/dev/themes?tab=gestures` by mouse, then keyboard, and prints which completed |
| `node multi.js plan.json` | Several screenshots in one browser. Plan: `{state, outDir, shots: [{name, url, w, h, wait, js, until, full}]}`; shots with the same url and size reuse the page, so `js` can click through an editor |
| `node booth.cjs <contribute-url> <outDir> [w] [h] [fake.y4m]` | Walks through the photobooth with Chrome's fake camera (a looping `.y4m`, e.g. made with ffmpeg from one of `public/clay/people`) and screenshots every frame. `SEND=1` also sends the photo and shows it in the gift |
| `node tour.js` | Landing hero: opens Ana's gift and captures the guided tour + bento tiles |
| `node gal.js` | Themes gallery card loop and the full-screen opening |
| `node portal.js /example/sam sam` | Frames of the opening-to-gift portal reveal |
| `node hole.js` | Logs the portal mask animation values over time |
| `node trysec.js` / `node trym.js` | Theme page "Try the sections" (desktop / phone) |
| `node cr.js` | Create page section previews (needs `../state.json`) |
| `node openings.js <outdir> [kinds] [label]` | Every theme's opening at rest and late in its story, phone and desktop (`SIZES=phone`, `ONLY=rest` or `ONLY=open` to narrow). Uses the dev-only `/dev/openings` page |
| `node stills.js <outdir> kind:bg:primary:accent ...` | Theme 3D stills as PNGs (convert to `public/themes3d/<kind>.webp`, bump `STILL_VERSION`) |
| `python3 sheet.py <out.png> <cols> <width> <imgs...>` | Contact sheet of screenshots, labelled |
| `node render.js <html> <outdir>` | Renders every `.scene` element of an HTML file to webp |
| `node frames.js <html> <scene> <secs> <outdir>` | Renders video frames via `window.render(name, t)` |

`state.json` is a Playwright storage state for a local test user (sign up at `/auth` on the local
server, then save `context.storageState()`). It is git-ignored; never commit it.

Example gifts open straight to the notes with `?open=1` (the "Skip intro" click is unreliable in
headless Chrome).

## Demo media (`tools/media`)

- `scenes.html`: every illustrated "photo" (beach, tram, hike, karaoke, picnic, cake, rooftop,
  window, desk, dog park, dog beach, dog nap, venue, dance, bouquet, rings). Render with
  `node ../screens/render.js scenes.html out` and copy the webp files to `public/demo/`.
- `doodles.html`: the guestbook doodles (`doodle-*.png`).
- `video.html`: the short clips. Scenes: `ana`, `sam`, `milo`, `wedding`, `generic`.
  ```bash
  node ../screens/frames.js video.html generic 6 ../vgen
  ffmpeg -framerate 24 -i ../vgen/%04d.png -c:v libx264 -pix_fmt yuv420p -crf 26 -movflags +faststart ../../public/demo/video-generic.mp4
  ```
- `voice.py`: synthesized hummed voice notes (numpy + scipy) → wav, then
  `ffmpeg -i x.wav -b:a 64k public/demo/voice-x.mp3`.

## Theme performance (`tools/perf`)

| Script | What it does |
|---|---|
| `bun tools/perf/theme-budget.ts [id]` (or `bun run perf:themes`) | Gzipped size of the engine plus each engine theme's object and assets. Fails over 400 KB |
| `node tools/perf/theme-fps.cjs <base> <id[,id]>` | Frame times for a theme's opening with 4x CPU throttling and slow 4G at 390x844. Needs the `/dev/themes` playground (dev server, or a production build made with `VITE_DEV_TOOLS=1`). Fails if janky. Works for current openings too (`birthday`, `wedding`...) |

`bun test` runs the engine's unit tests (gesture maths, slots, theme validation, strings).
