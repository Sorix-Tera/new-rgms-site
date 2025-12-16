# TangledSpore's RGMs! (Eleventy refactor)

This is a refactor of the original static HTML/CSS/JS site into an **Eleventy (11ty)** project.
The generated output remains a static site (client-side Supabase + Chart.js).

## Local development

```bash
npm install
npm run dev
```

Eleventy will build to `dist/` and serve a local dev server.

## Netlify

Netlify settings (already in `netlify.toml`):
- Build command: `npm run build`
- Publish directory: `dist`

## Pages

- `index.html` — Latest updates feed
- `leaderboard.html` — CR/TS/NC leaderboards via `?mode=<slug>`
- `details.html` — Player details via `?mode=...&field=...&key=...`

## Notes

- Header/footer are defined once in `_includes/`.
- CR/TS/NC are consolidated into the single `leaderboard.html` page.

## GitHub Pages (optional)
This project is an Eleventy site. GitHub Pages will not run the Eleventy build by itself.

If you want to test on GitHub Pages, this repo includes a GitHub Actions workflow that builds the site and publishes the **dist/** folder to the **gh-pages** branch.

Steps:
1) Push to `main`
2) In your GitHub repo settings: **Pages → Build and deployment → Source: Deploy from a branch**
3) Select branch **gh-pages** and folder **/(root)**
