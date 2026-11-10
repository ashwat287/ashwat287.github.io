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

- Replace `Your name`, the introduction, description, and about text.
- Add your full GitHub and LinkedIn URLs, and your email address. Empty links are hidden.
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

## Verify and publish

```sh
npm test
npm run build
```

Deploy the generated `dist/` directory on a static host at the domain root. It contains the home page, article pages, stylesheet, favicon, and a `404.html` error page. Configure your host to serve `404.html` for unknown paths; do not use an SPA fallback.

The Sites project identifier is in `.openai/hosting.json`. No contact details or professional history have been invented; personalize the clearly marked starter content before making the site public.
