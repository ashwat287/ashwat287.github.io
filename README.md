# Personal Notebook

A static personal website built with Node.js. It includes an About page, project and blog pages, experience pages, a photo gallery, and a book shelf.

Add blog posts to the `blogs` array in `content/site.json`, with a `slug`, `title`, `date`, `description`, and matching Markdown file under `content/blogs/`.

## Run locally

Requires Node.js 18+ and Python 3.

```sh
npm install
npm run dev
```

Open http://localhost:3000. Restart the command after changing content or styles to rebuild the site.

## Verify and build

```sh
npm test
npm run build
```

The generated site is written to `dist/`.