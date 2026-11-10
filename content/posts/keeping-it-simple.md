A personal website can be a handful of pages that are easy to read and easy to maintain. For this notebook, that is the starting point.

## A small publishing routine

Each post lives in a Markdown file. Its title, date, and excerpt live in `content/site.json`. The build turns those files into ordinary HTML pages.

```sh
npm install
npm run build
npm run dev
```

The result needs no JavaScript in the browser. Links are links, the layout adapts to the screen, and the content is available as soon as the page loads.

## Let the content set the pace

A search box can wait until there is enough writing to search. A complex publishing system can wait until editing text files becomes a problem.

For now, a title, a few paragraphs, and a working link are a good place to begin.
