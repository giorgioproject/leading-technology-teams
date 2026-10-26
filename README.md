# CommonGround

CommonGround is a browser-only tool for UCSB MTM Leading Technology Teams. A team pastes its charter, runs a short meaning survey, and adds a meeting transcript. The report shows where charter words mean different things, who is speaking, and whose ideas others pick up.

Nothing is sent to a server. Team data stays in this browser under the `localStorage` key `commonground:v1`.

## Run locally

You need Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:5173.

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the local app |
| `npm test` | Run the unit tests |
| `npm run build` | Typecheck and write the production site to `dist/` |
| `npm run preview` | Serve the built site locally |

## Deploy on Vercel

`vercel.json` rewrites every path to `/index.html`. That keeps routes such as `/take?s=...` working when someone refreshes or opens a survey link directly. Vercel still serves real files (JavaScript, CSS, the favicon) before that rewrite.

1. Push this project to a GitHub repository.
2. Sign in at [vercel.com](https://vercel.com) with GitHub.
3. Choose **Add New Project**, select the repository, and click **Deploy**. Vercel detects Vite: the build command is `npm run build` and the output folder is `dist`.
4. Open the `*.vercel.app` link. Load the demo team, then open a meaning-survey link in a private window and refresh it.

## Deploy by dropping the build on Netlify

`public/_redirects` is copied into `dist/` and sends every path to `index.html` with status 200, which is the same refresh behavior as the Vercel rewrite.

```bash
npm run build
```

Drag the `dist` folder onto [app.netlify.com/drop](https://app.netlify.com/drop).
