# Deploying the site

The site is static. Visitors never run a server: the host serves the files in `dist/`. Nothing is deployed from this repository automatically; the repository being public does not publish the site.

## Build

```bash
npm install
npm run build      # writes the finished site to dist/
```

`dist/` is everything a host needs: seven pages (`index`, `technology`, `products`, `nexcon`, `kronig`, `about`, `contact`), `assets/`, `favicon.svg`, `og.png`, `robots.txt` and `sitemap.xml`. Use Node 20 or newer.

## Cloudflare Pages (recommended: free, global, clean URLs by default)

1. Pages, then Create a project, then Connect to Git and pick this repository (or "Upload assets" and drag the `dist` folder).
2. Build command `npm run build`, output directory `dist`, Node 20 or newer.
3. Add the custom domain `novatomlabs.com`. `public/_headers` already sets long caching for `/assets/*`.

## Netlify

Build command `npm run build`, publish directory `dist`. Clean URLs (`/technology`) work by default, and `public/_headers` is honoured.

## Vercel

Framework preset "Other", build command `npm run build`, output directory `dist`. `vercel.json` turns on clean URLs and sets caching and security headers.

## Before pointing the domain at it

- **Form.** The contact form posts to the existing Formspree endpoint (`mojoyejy`), the same one the previous site used. Check that submissions still arrive and that the notification address in the Formspree dashboard is the one you want.
- **Partner logos.** The partner logos on the previous live site returned 404, so this version shows the partners as text. Add logos only once you have the files and permission to use them.
- **Redirects.** Routes changed from an earlier draft: `/materials` is now `/nexcon`, `/devices` is now `/kronig`, and `/company` is now `/about`. Add redirects on the host if those URLs were ever shared.
- **Share image and numbers.** Check `public/og.png` and the statistics carried over from the previous site (6 to 10 years, $50M+, 10^8) and make sure each has a source you are happy to cite.
- **Sitemap and robots.** `public/sitemap.xml` and `public/robots.txt` assume the domain `novatomlabs.com`.

## After deploying

Open the live URL on a normal browser profile and on a phone. Append `?debug` to see which GPU budget the browser chose. To run the end-to-end suite against the live site:

```bash
BASE=https://novatomlabs.com node tests/e2e.mjs
```

On Windows PowerShell: `$env:BASE = 'https://novatomlabs.com'; node tests/e2e.mjs`.

`START-WEBSITE.bat` is only for previewing on your own computer.
