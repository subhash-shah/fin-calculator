# Deployment

The app is a static site: a bundle (`dist/app.js`), one HTML file (`index.html`), and
one stylesheet (`styles.css`). It runs entirely in the browser — no server, no backend,
no build-time environment. Any static host can serve it.

**Important:** `index.html` sits at the repository **root** and references
`dist/app.js` + `styles.css` — so the deploy root is the repo root, not a subfolder.

Prerequisites before any of these: the repo is not a git repository yet,
so start with:

```bash
cd /Users/shahs/projects/finance-tools/calculator
git init
git add .
git commit -m "Initial financial calculator app"
```

---

## Option 1 — GitHub Pages (recommended: free, versioned, public)

1. Create a repo on GitHub, push this repo to it.
2. Push the built bundle too (add an empty `.nojekyll` file so Pages doesn't mangle `dist/`):

   ```bash
   touch .nojekyll && git add .nojekyll && git commit -m "Add .nojekyll"
   ```

   (The current `.gitignore` excludes `dist/` — if you want Pages to serve a pre-built
   bundle, remove `dist/` from `.gitignore`. Otherwise use a build action, below.)
3. GitHub → repo → **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Use this workflow (`.github/workflows/deploy.yml`) — builds on every push to `main`:

   ```yaml
   name: Deploy to Pages
   on:
     push:
       branches: [main]
     workflow_dispatch:
   permissions:
     contents: read
     pages: write
     id-token: write
   concurrency:
     group: pages
     cancel-in-progress: true
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with: { node-version: 24 }
         - run: npm ci && npm run build && npm test
         - uses: actions/configure-pages@v5
         - uses: actions/upload-pages-artifact@v3
           with: { path: '.' }
         - uses: actions/deploy-pages@v4
   ```

   The app is then live at `https://<user>.github.io/<repo>/`.

---

## Option 2 — Vercel (zero-config, instant)

1. Push to GitHub/GitLab.
2. vercel.com → **Add New Project** → import the repo.
3. Settings:
   - Build command: `npm run build`
   - Output directory: `.`  (repo root — where `index.html` lives)
   - Nothing else. Deploy.
4. Live at `https://<project>.vercel.app`; HTTPS, CDN, and deploys-on-push included.

CLI alternative: `npx vercel` from the repo root (first run walks you through it).

---

## Option 3 — Netlify (same idea)

1. netlify.com → **Add new site** → import the repo.
2. Build command: `npm run build` · Publish directory: `.`
3. Or drag-and-drop the folder onto the Netlify dashboard for a one-off deploy.

---

## Option 4 — Any static file host (S3+CloudFront, nginx, etc.)

Files needed in the served root:

```
index.html
styles.css
dist/app.js
```

- **AWS**: `aws s3 sync . s3://<bucket> --exclude 'node_modules/*' --exclude 'docs/*'` +
  CloudFront pointing at the bucket (enable "Origin access control", index.html default
  root object).
- **nginx**: copy the three files into `/var/www/calc/`; the app needs no rewrites since
  it's a single page.

---

## Notes

- **Rebuild before pushing**: `npm run build` regenerates `dist/app.js`; deploy what you
  committed. The GitHub Actions option above rebuilds for you; others use the committed
  bundle.
- **Caching**: if you cache `dist/app.js` aggressively, cache-bust by versioning the
  filename (e.g., `dist/app.v1.js`). Style/CSS can share the same treatment.
- The app reads/writes only `localStorage` (theme) — no cookies, no backend calls, so no
  CORS or environment config anywhere.