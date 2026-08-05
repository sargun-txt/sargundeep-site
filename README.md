# sargundeep-site

Version 1 of a personal site: homepage with an animated Signal Core, a
direct/explore mode toggle, three case-study "work" pages, an MDX-powered
writing section, an about page, and a hidden terminal easter egg (press
`` ` ``).

## Stack

Next.js (App Router, static export) + TypeScript + Tailwind CSS + MDX.

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

Outputs a static site to `out/`, ready for GitHub Pages.

## Deploy

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds and
publishes `out/` to GitHub Pages. In the repo settings, set
**Settings → Pages → Source** to "GitHub Actions" once the repo exists on
GitHub.

If this ends up served from a custom domain instead of
`<user>.github.io/sargundeep-site`, drop a `public/CNAME` file with the
domain and remove the `basePath`/`assetPrefix` logic in `next.config.ts`
(project-page basePath isn't needed for a custom domain).

## TODO before this replaces the live site

- Add a real `public/resume.pdf` (currently linked but not present)
- Replace placeholder project copy in `src/lib/projects.ts` with verified
  details/metrics from each project
- Add real content to `/lab` and `/music` (currently "coming soon" stubs)
