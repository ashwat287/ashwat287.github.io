import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const site = JSON.parse(await readFile(new URL('content/site.json', root), 'utf8'));
const imagePathPattern = /^\/images\/(?:[\w-]+\/)*[\w-]+\.(?:jpe?g|png|webp|avif)$/i;

const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[character]));

const externalHref = value => {
  if (!/^https?:\/\//.test(value)) throw new Error(`Use an absolute HTTP(S) URL: ${value}`);
  return escapeHtml(new URL(value).href);
};

const contactIcons = {
  email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.4 2.1L8.1 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.6 1.9Z"/>',
  linkedin: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 10v7m0-10v.01M11 17v-7m0 3a3 3 0 0 1 6 0v4"/>',
  github: '<path d="M9 19c-4 1-4-2-6-2m12 5v-4a3.5 3.5 0 0 0-1-2.5c3-.3 6-1.5 6-6a4.7 4.7 0 0 0-1.3-3.3 4.3 4.3 0 0 0-.1-3.2s-1.1-.3-3.6 1.3a12.3 12.3 0 0 0-6 0C6.5 2.7 5.4 3 5.4 3a4.3 4.3 0 0 0-.1 3.2A4.7 4.7 0 0 0 4 9.5c0 4.5 3 5.7 6 6a3.5 3.5 0 0 0-1 2.5v4"/>'
};
const contactLabels = { email: 'Email', phone: 'Phone', linkedin: 'LinkedIn', github: 'GitHub' };

function renderContactLink([type, value]) {
  if (!value) return '';
  let url;
  if (type === 'email') {
    if (!/^[^\s@<>"?&#]+@[^\s@<>"?&#]+\.[^\s@<>"?&#]+$/.test(value)) throw new Error('Invalid contact email');
    url = `mailto:${escapeHtml(value)}`;
  } else if (type === 'phone') {
    if (!/^\+?[\d ()-]+$/.test(value)) throw new Error('Invalid contact phone');
    url = `tel:${value.replace(/[ ()-]/g, '')}`;
  } else {
    url = externalHref(value);
  }
  if (!contactIcons[type]) throw new Error(`Unknown contact type: ${type}`);

  const label = contactLabels[type];
  return `<a href="${url}" aria-label="${label}: ${escapeHtml(value)}" title="${label}: ${escapeHtml(value)}"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${contactIcons[type]}</svg></a>`;
}

async function validateImage(path, description) {
  if (!imagePathPattern.test(path)) {
    throw new Error(`${description} must use a local /images/ path and JPG, PNG, WebP, or AVIF format`);
  }
  await readFile(new URL(`public${path}`, root));
}

async function validateAssets() {
  const photos = [...(site.portrait.src ? [site.portrait] : []), ...site.lifePhotos];
  for (const photo of photos) {
    await validateImage(photo.src, 'Photos');
    if (!photo.alt?.trim()) throw new Error('Photos need descriptive alt text');
  }

  const books = [...site.library.currentlyReading, ...site.library.read];
  for (const book of books) {
    if (!book.cover) continue;
    await validateImage(book.cover, 'Book covers');
    if (!book.coverSource) throw new Error(`Book cover needs a source URL: ${book.title}`);
  }
}

function renderBook(book) {
  const cover = book.cover
    ? `<a class="book-cover" href="${externalHref(book.coverSource)}" aria-label="View ${escapeHtml(book.title)} at Open Library"><img src="${escapeHtml(book.cover)}" alt="Cover of ${escapeHtml(book.title)}" loading="lazy" decoding="async"></a>`
    : '';
  const quote = book.favouriteLine
    ? `<blockquote><p>“${escapeHtml(book.favouriteLine)}”</p></blockquote>${book.quoteSource ? `<a class="quote-source" href="${externalHref(book.quoteSource)}">Read the book</a>` : ''}`
    : '';

  return `<li class="book">${cover}<div class="book-info"><h4>${escapeHtml(book.title)}</h4><p class="book-author">${escapeHtml(book.author)}</p>${quote}</div></li>`;
}

const renderBookList = (books, className = '') =>
  `<ul class="book-list${className ? ` ${className}` : ''}">${books.map(renderBook).join('')}</ul>`;

function renderReadShelf(books) {
  if (!books.length) return '<p class="empty-note">Books I’ve read and favourite lines from them will appear here.</p>';
  const previewCount = Math.min(4, books.length);
  const preview = renderBookList(books.slice(0, previewCount), 'book-preview');
  if (books.length <= previewCount) return preview;

  const remainder = renderBookList(books.slice(previewCount), 'book-remainder');
  return `${preview}
<details class="book-expansion">
<summary><span class="when-closed">Show all ${books.length} books</span><span class="when-open">Show fewer books</span></summary>
${remainder}
</details>`;
}

function renderPhoto(photo) {
  const rotation = photo.rotate ? ' rotate-photo' : '';
  const caption = photo.caption ? `<figcaption>${escapeHtml(photo.caption)}</figcaption>` : '';
  return `<figure><div class="gallery-photo${rotation}"><img src="${escapeHtml(photo.src)}" alt="${escapeHtml(photo.alt)}" loading="lazy" decoding="async" width="${Number(photo.width)}" height="${Number(photo.height)}"></div>${caption}</figure>`;
}

function renderPage(title, description, body, activePage = null) {
  const navigation = [
    ['', 'About'],
    ['work', 'Work experience'],
    ['projects', 'Projects'],
    ['blogs', 'Blogs'],
    ['open-source', 'Open source'],
    ['education', 'Education']
  ];
  const navigationLinks = navigation.map(([slug, label]) => {
    const path = slug ? `/${slug}/` : '/';
    const current = activePage === slug ? ' aria-current="page"' : '';
    return `<a href="${path}"${current}>${label}</a>`;
  }).join('');
  const contactLinks = Object.entries(site.links).map(renderContactLink).join('');
  const galleryScript = activePage === '' ? '<script src="/gallery.js" defer></script>' : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} · ${escapeHtml(site.name)}</title>
<meta name="description" content="${escapeHtml(description)}">
<meta name="theme-color" content="#fffffc">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/style.css">
</head>
<body id="top">
<a class="skip-link" href="#main">Skip to content</a>
<header>
<div class="header-top">
<a class="wordmark" href="/">&lt;${escapeHtml(site.name)}&gt;</a>
<div class="contact" role="group" aria-label="Contact and profiles">${contactLinks}</div>
</div>
<nav aria-label="Main navigation">${navigationLinks}</nav>
</header>
<main id="main">${body}</main>
<footer><span>${escapeHtml(site.name)} &middot; A personal notebook</span><a href="#top">Back to top ↑</a></footer>
${galleryScript}
</body>
</html>`;
}

async function prepareOutput() {
  await rm(new URL('dist/', root), { recursive: true, force: true });
  await mkdir(new URL('dist/', root), { recursive: true });
  await cp(new URL('public/', root), new URL('dist/', root), { recursive: true });
}

function renderHome() {
  const bio = site.bio.map(section => {
    const lead = section.lead ? `<strong>${escapeHtml(section.lead)}</strong> ` : '';
    return `<p class="bio">${lead}${escapeHtml(section.text)}</p>`;
  }).join('');
  const portrait = site.portrait.src
    ? `<img src="${escapeHtml(site.portrait.src)}" alt="${escapeHtml(site.portrait.alt)}" width="800" height="800" fetchpriority="high">`
    : '<div class="photo-placeholder"><span class="placeholder-mark" aria-hidden="true">A.</span><span>Portrait coming soon</span></div>';
  const photoPlaceholders = ['01', '02', '03'].map(number =>
    `<div class="photo-placeholder life-placeholder"><span class="placeholder-number" aria-hidden="true">${number}</span><span>Photo coming soon</span></div>`
  ).join('');
  const photoPreview = site.lifePhotos.length
    ? site.lifePhotos.slice(0, 3).map(renderPhoto).join('')
    : photoPlaceholders;
  const photoExpansion = site.lifePhotos.length > 3
    ? `<details class="gallery-expansion">
<summary><span class="when-closed">Show all ${site.lifePhotos.length} photos</span><span class="when-open">Show fewer photos</span></summary>
<div class="life-gallery">${site.lifePhotos.slice(3).map(renderPhoto).join('')}</div>
</details>`
    : '';
  const currentlyReading = site.library.currentlyReading.length
    ? renderBookList(site.library.currentlyReading)
    : '<p class="empty-note">My current read will appear here.</p>';
  const sampleNote = site.library.sample
    ? '<p class="library-note">An example shelf for now. I’ll add my own books and favourite lines soon.</p>'
    : '';

  return `
<section class="about-intro" aria-labelledby="about-heading">
<div><h1 class="section-heading" id="about-heading">A little about me</h1>${bio}</div>
<figure class="portrait">${portrait}</figure>
</section>
<section class="life-section" aria-labelledby="life-heading"><h2 class="section-heading" id="life-heading">A glimpse into my life</h2>
<div class="life-gallery">${photoPreview}</div>
${photoExpansion}</section>
<section class="library-section" aria-labelledby="library-heading"><h2 class="section-heading" id="library-heading">My little library</h2>
${sampleNote}
<div class="library-columns">
<section class="reading-now" aria-labelledby="reading-heading"><p class="eyebrow">On my bedside table</p><h3 id="reading-heading">Currently reading</h3>${currentlyReading}</section>
<section class="books-read" aria-labelledby="read-heading"><p class="eyebrow">On the shelf</p><h3 id="read-heading">Books I’ve read</h3>${renderReadShelf(site.library.read)}</section>
</div>
</section>`;
}

function renderProjects() {
  const projects = site.projects.map(project => `
<article class="project">
<div class="project-heading">
<h2>${escapeHtml(project.name)}</h2>
${project.url ? `<a class="read-more" href="${externalHref(project.url)}">${escapeHtml(project.label || 'View project')} →</a>` : ''}
</div>
${project.description.split(/\n\s*\n/).map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('\n')}
</article>`).join('');
  return `<div class="article"><h1>Projects</h1>${projects}</div>`;
}

function renderBlogs() {
  if (!site.blogs.length) {
    return '<div class="article"><h1>Blogs</h1><p class="empty-note">No blog posts yet. New posts will appear here.</p></div>';
  }
  const blogs = site.blogs.map(blog => {
    return `<article class="blog-post">
<h2><a href="/blogs/${escapeHtml(blog.slug)}/">${escapeHtml(blog.title)}</a></h2>
<p class="meta">${escapeHtml(blog.date)}</p>
<p>${escapeHtml(blog.description)}</p>
</article>`;
  }).join('');
  return `<div class="article"><h1>Blogs</h1>${blogs}</div>`;
}

function renderInlineMarkdown(text) {
  const markdownPattern = /(!?)\[([^\]]+)\]\(([^)\s]+)\)|\*([^*]+)\*/g;
  let html = '';
  let previousIndex = 0;
  for (const match of text.matchAll(markdownPattern)) {
    html += escapeHtml(text.slice(previousIndex, match.index));
    if (match[1]) {
      let source;
      if (match[3].startsWith('/images/')) {
        if (!imagePathPattern.test(match[3])) throw new Error(`Invalid local blog image path: ${match[3]}`);
        source = escapeHtml(match[3]);
      } else {
        source = externalHref(match[3]);
      }
      html += `<img src="${source}" alt="${escapeHtml(match[2])}" loading="lazy" decoding="async">`;
    } else if (match[2]) {
      html += `<a href="${externalHref(match[3])}">${escapeHtml(match[2])}</a>`;
    } else {
      html += `<em>${escapeHtml(match[4])}</em>`;
    }
    previousIndex = match.index + match[0].length;
  }
  return html + escapeHtml(text.slice(previousIndex));
}

function renderMarkdown(markdown, title) {
  const lines = markdown.split(/\r?\n/);
  const html = [];
  let paragraph = [];
  let code = [];
  let inCode = false;
  let titleSkipped = false;

  const flushParagraph = () => {
    if (paragraph.length) {
      html.push(`<p>${renderInlineMarkdown(paragraph.join(' '))}</p>`);
      paragraph = [];
    }
  };
  const renderTableRow = line =>
    line.trim().replace(/^\||\|$/g, '').split('|').map(cell => renderInlineMarkdown(cell.trim()));

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (line.startsWith('```')) {
      flushParagraph();
      if (inCode) {
        html.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
        code = [];
        inCode = false;
      } else {
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      code.push(line);
      continue;
    }
    if (!titleSkipped && line === `# ${title}`) {
      titleSkipped = true;
      flushParagraph();
      continue;
    }
    if (!line.trim()) {
      flushParagraph();
      continue;
    }
    const heading = line.match(/^#{1,6}\s+(.+)$/);
    if (heading) {
      flushParagraph();
      html.push(`<h2>${renderInlineMarkdown(heading[1])}</h2>`);
      continue;
    }
    if (line.startsWith('![')) {
      flushParagraph();
      html.push(`<p class="blog-image">${renderInlineMarkdown(line)}</p>`);
      continue;
    }
    if (index + 1 < lines.length && /^\|?(?:\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?$/.test(lines[index + 1])) {
      flushParagraph();
      const headers = renderTableRow(line);
      index += 2;
      const rows = [];
      while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
        rows.push(renderTableRow(lines[index]));
        index++;
      }
      index--;
      html.push(`<div class="table-wrap"><table><thead><tr>${headers.map(cell => `<th scope="col">${cell}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    paragraph.push(line.trim());
  }
  flushParagraph();
  if (inCode) html.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
  return html.join('\n');
}

async function renderBlogPage(blog) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(blog.slug)) {
    throw new Error(`Invalid blog slug: ${blog.slug}`);
  }
  if (blog.content !== `blogs/${blog.slug}.md`) {
    throw new Error(`Blog content path must match its slug: ${blog.slug}`);
  }
  const markdown = await readFile(new URL(`content/${blog.content}`, root), 'utf8');
  for (const [, imagePath] of markdown.matchAll(/!\[[^\]]+\]\((\/images\/[^)\s]+)\)/g)) {
    await validateImage(imagePath, `Blog image in ${blog.slug}`);
  }
  const body = `<article class="article blog-article">
<a class="back-to-blogs" href="/blogs/">← Back to all blogs</a>
<h1>${escapeHtml(blog.title)}</h1>
<p class="meta">${escapeHtml(blog.date)}</p>
${renderMarkdown(markdown, blog.title)}
</article>`;
  await writePage(
    `dist/blogs/${blog.slug}/`,
    blog.title,
    blog.description,
    body,
    'blogs'
  );
}

function renderEducation() {
  const education = site.education;
  return `<div class="article"><h1>Education</h1>
<section class="education">
<h2>${escapeHtml(education.institution)}</h2>
<p>${escapeHtml(education.degree)}</p>
<p class="meta">${escapeHtml(education.dates)}</p>
<p>${escapeHtml(education.result)}</p>
</section>
</div>`;
}

function renderWork() {
  const jobs = site.work.map(job => {
    const highlights = job.highlights.map(item =>
      `<dt>${escapeHtml(item.title)}</dt><dd>${escapeHtml(item.text)}</dd>`
    ).join('');
    return `<section class="experience">
<h2>${escapeHtml(job.organization)}</h2>
<p class="position">${escapeHtml(job.role)}<br>${escapeHtml(job.team)}</p>
<p class="meta">${escapeHtml(job.dates)} · ${escapeHtml(job.location)}</p>
<dl class="highlights">${highlights}</dl>
</section>`;
  }).join('');
  return `<div class="article"><h1>Work experience</h1>${jobs}</div>`;
}

function renderOpenSource() {
  const projects = site.openSource.map(project => `
<section class="experience">
<h2><a href="${externalHref(project.url)}">${escapeHtml(project.name)}</a></h2>
<p class="position">${escapeHtml(project.role)}</p>
<p>${escapeHtml(project.description)}</p>
<a class="read-more" href="${externalHref(project.contributionsUrl)}">View merged contributions →</a>
</section>`).join('');
  return `<div class="article"><h1>Open source</h1>${projects}</div>`;
}

async function writePage(path, title, description, body, activePage = null) {
  await mkdir(new URL(path, root), { recursive: true });
  await writeFile(
    new URL(`${path}index.html`, root),
    renderPage(title, description, body, activePage)
  );
}

await validateAssets();
await prepareOutput();
await writeFile(
  new URL('dist/index.html', root),
  renderPage('About me', site.description, renderHome(), '')
);

const pages = [
  ['projects/', 'Projects', renderProjects()],
  ['blogs/', 'Blogs', renderBlogs()],
  ['work/', 'Work experience', renderWork()],
  ['open-source/', 'Open source', renderOpenSource()],
  ['education/', 'Education', renderEducation()]
];
for (const [path, title, body] of pages) {
  await writePage(`dist/${path}`, title, `${title} — ${site.name}`, body, path.slice(0, -1));
}
for (const blog of site.blogs) await renderBlogPage(blog);

await writeFile(
  new URL('dist/404.html', root),
  renderPage(
    'Page not found',
    'This page could not be found.',
    '<article class="article"><h1>Page not found.</h1><p>This page may have moved, or the address may be incorrect.</p><a href="/">← Return to the notebook</a></article>'
  )
);
console.log('Built home, projects, blogs, work, open source, education, and 404 pages in dist/.');
