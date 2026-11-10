# Personal Notebook

A static personal website built with Node.js. It includes an About page, project and experience pages, a photo gallery, and a book shelf.

## Run locally

Requires Node.js 18+ and Python 3.

```sh
npm install
npm run dev
```

Open http://localhost:3000. Restart the command after changing content or styles to rebuild the site.

## Edit content

- Update site text, links, work, projects, photos, and books in `content/site.json`.
- Put images in `public/images/` and reference them with paths such as `/images/portrait.jpg`.
- Update styles in `public/style.css`.

## Verify and build

```sh
npm test
npm run build
```

The generated site is written to `dist/`.