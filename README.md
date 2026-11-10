# Personal notebook

A small static personal website inspired by antirez.com. Serif headings, monospace text, a responsive reading column, and no JavaScript in the browser.

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
- Replace or remove the two sample post entries and Markdown files. They are visibly labeled as examples.

Add a post by creating `content/posts/my-post.md` and adding an entry to the `posts` array:

```json
{
  "slug": "my-post",
  "title": "My first post",
  "date": "2026-11-10",
  "excerpt": "A short description of the post.",
  "sample": false
}
```

Slugs must be unique lowercase words separated by hyphens and match the Markdown filename. Dates use `YYYY-MM-DD`. Posts appear newest first. Markdown supports headings, lists, code blocks, links, and images; use relative links carefully because articles live at `/posts/<slug>/`. Content files are trusted author input: do not use the build to publish Markdown from untrusted visitors.

Styles live in `public/style.css`. Public files are copied to the output unchanged.

## Photos and books

Put photos in `public/images/` using filenames such as `portrait.jpg` or `weekend-walk.webp`. Set `portrait.src` to `/images/portrait.jpg` and give it descriptive `alt` text. Add gallery entries to `lifePhotos` with `src`, `alt`, and an optional `caption`. JPG, PNG, WebP, and AVIF are supported; missing image files stop the build. Empty photos use clearly labeled placeholders.

Edit `library.currentlyReading` and `library.read` with entries containing `title`, `author`, and optional `favouriteLine` and `quoteSource` (a full HTTP(S) URL). Set `library.sample` to `false` after replacing the example books with your own. The initial example shelf is clearly labeled and does not represent your reading history.

## Verify and publish

```sh
npm test
npm run build
```

Deploy the generated `dist/` directory on a static host at the domain root. It contains the About home page, Writing, Projects, Work experience, Open source, Education, and article pages, stylesheet, favicon, and a `404.html` error page. Configure your host to serve `404.html` for unknown paths; do not use an SPA fallback.

The Sites project identifier is in `.openai/hosting.json`. Personal details and professional history come from the supplied résumé. The two writing samples remain clearly labeled; replace them when ready to publish your own posts. Project source links are omitted until their repository URLs are provided.
