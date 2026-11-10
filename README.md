# Personal notebook

A small static personal website inspired by antirez.com. Serif headings, monospace text, a responsive reading column, and a small browser script to shuffle the gallery on each page visit.

## Run locally

Requires Node.js 18+ and Python 3 for the preview server.

```sh
npm install
npm run dev
```

Open http://localhost:3000. After editing content or styles, stop the server and run `npm run dev` again to rebuild. There is no live reload.

## Make it yours

Edit `content/site.json`:

- Update your name, role, description, and `bio`. The home page has a paragraph bio beside your portrait, a life photo gallery, a library, and header contact icons.
- Update your GitHub and LinkedIn URLs, email address, and phone number. Empty links are hidden; populated links appear as accessible icons in the header.
- Edit `work` and `openSource` for the separate Work experience and Open source pages, and `education` for the Education page.
- Add projects with a name, description, optional full HTTP(S) URL, and link label.

Styles live in `public/style.css`. Public files are copied to the output unchanged.

## Photos and books

Put photos in `public/images/` using filenames such as `portrait.jpg` or `weekend-walk.webp`. Set `portrait.src` to `/images/portrait.jpg` and give it descriptive `alt` text. Add gallery entries to `lifePhotos` with `src`, `alt`, image pixel `width` and `height`, and an optional `caption`. Set `rotate` to `true` for a sideways photo that should display rotated 90° counterclockwise. Gallery images use portrait crops in a compact collage. Three photos appear initially; a native expand/collapse control reveals the rest. Photos are not clickable. Their order is randomized on each visit, including when returning with the browser Back button. With JavaScript disabled, the original order is used. JPG, PNG, WebP, and AVIF are supported; missing image files stop the build. Empty photos use clearly labeled placeholders.

Edit `library.currentlyReading` and `library.read` with entries containing `title`, `author`, and optional `favouriteLine` and `quoteSource` (a full HTTP(S) URL). Set `library.sample` to `false` after replacing the example books with your own. The initial example shelf is clearly labeled and does not represent your reading history.

## Verify and publish

```sh
npm test
npm run build
```

Deploy the generated `dist/` directory on a static host at the domain root. It contains the About home page, Projects, Work experience, Open source, and Education pages, stylesheet, favicon, and a `404.html` error page. Configure your host to serve `404.html` for unknown paths; do not use an SPA fallback.

The Sites project identifier is in `.openai/hosting.json`. Personal details and professional history come from the supplied résumé. Project source links are omitted until their repository URLs are provided.
