# NuIIX.github.io

Personal portfolio of **NuIIX** (ML Engineer / AI Developer): <https://nuiix.github.io>

Static site, no build step and no runtime dependencies: plain HTML, CSS and a little vanilla JS.
Hosted for free on GitHub Pages.

## Structure

| Path | Purpose |
|---|---|
| `index.html` | Russian version (`/`) |
| `en/index.html` | English version (`/en/`) |
| `zh/index.html` | Simplified Chinese version (`/zh/`) |
| `404.html` | Not-found page served by GitHub Pages |
| `assets/css/style.css` | Design tokens, dark/light themes, components |
| `assets/js/main.js` | Theme toggle, mobile menu, scroll reveal (progressive enhancement) |
| `assets/og-template.html` → `assets/og.png` | Social preview (1200×630) |
| `robots.txt`, `sitemap.xml` | SEO |
| `.nojekyll` | Disable Jekyll processing |
| `scripts/check-site.mjs` | Link, anchor, SEO-tag and sitemap integrity check |

## Local development

```bash
npx http-server . -p 8765 -c-1   # open http://localhost:8765
node scripts/check-site.mjs      # integrity check (also runs in CI)
```

Regenerate the social preview after editing `assets/og-template.html`:

```bash
chrome --headless=new --hide-scrollbars --force-device-scale-factor=1 \
  --window-size=1200,630 --screenshot=assets/og.png file:///abs/path/assets/og-template.html
```

## Deployment

Settings → Pages → **Deploy from a branch** → `main` / `/ (root)`.
The repository must be public and named exactly `NuIIX.github.io`.

## License

MIT, see [LICENSE](LICENSE).
