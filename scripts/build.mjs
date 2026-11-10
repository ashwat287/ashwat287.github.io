import { readFile, mkdir, writeFile, cp, rm } from 'node:fs/promises';

const site = JSON.parse(await readFile(new URL('../content/site.json', import.meta.url), 'utf8'));
const root = new URL('../', import.meta.url);
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const href = value => {
  if (!/^https?:\/\//.test(value)) throw new Error(`Use an absolute HTTP(S) URL: ${value}`);
  return escape(new URL(value).href);
};
const icons = {
  email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.4 2.1L8.1 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.6 1.9Z"/>',
  linkedin: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 10v7m0-10v.01M11 17v-7m0 3a3 3 0 0 1 6 0v4"/>',
  github: '<path d="M9 19c-4 1-4-2-6-2m12 5v-4a3.5 3.5 0 0 0-1-2.5c3-.3 6-1.5 6-6a4.7 4.7 0 0 0-1.3-3.3 4.3 4.3 0 0 0-.1-3.2s-1.1-.3-3.6 1.3a12.3 12.3 0 0 0-6 0C6.5 2.7 5.4 3 5.4 3a4.3 4.3 0 0 0-.1 3.2A4.7 4.7 0 0 0 4 9.5c0 4.5 3 5.7 6 6a3.5 3.5 0 0 0-1 2.5v4"/>'
};
const labels = { email: 'Email', phone: 'Phone', linkedin: 'LinkedIn', github: 'GitHub' };
const links = Object.entries(site.links).filter(([, value]) => value).map(([key, value]) => {
  let url;
  if (key === 'email') {
    if (!/^[^\s@<>"?&#]+@[^\s@<>"?&#]+\.[^\s@<>"?&#]+$/.test(value)) throw new Error('Invalid contact email');
    url = `mailto:${escape(value)}`;
  } else if (key === 'phone') {
    if (!/^\+?[\d ()-]+$/.test(value)) throw new Error('Invalid contact phone');
    url = `tel:${value.replace(/[ ()-]/g, '')}`;
  } else {
    url = href(value);
  }
  if (!icons[key]) throw new Error(`Unknown contact type: ${key}`);
  return `<a href="${url}" aria-label="${labels[key]}: ${escape(value)}" title="${labels[key]}: ${escape(value)}"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[key]}</svg></a>`;
}).join('');
const photos = [...(site.portrait.src ? [site.portrait] : []), ...site.lifePhotos];
for (const photo of photos) {
  if (!/^\/images\/(?:[\w-]+\/)*[\w-]+\.(?:jpe?g|png|webp|avif)$/i.test(photo.src)) throw new Error('Photos must use a local /images/ path and JPG, PNG, WebP, or AVIF format');
  if (!photo.alt?.trim()) throw new Error('Photos need descriptive alt text');
  await readFile(new URL(`public${photo.src}`, root));
}
const bookList = books => `<ul class="book-list">${books.map(book => `<li class="book"><h4>${escape(book.title)}</h4><p class="book-author">${escape(book.author)}</p>${book.favouriteLine ? `<blockquote><p>“${escape(book.favouriteLine)}”</p></blockquote>${book.quoteSource ? `<a class="quote-source" href="${href(book.quoteSource)}">Read the book</a>` : ''}` : ''}</li>`).join('')}</ul>`;
const page = (title, description, body, active = null) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)} · ${escape(site.name)}</title>
<meta name="description" content="${escape(description)}">
<meta name="theme-color" content="#fffffc">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/style.css">
</head>
<body id="top">
<a class="skip-link" href="#main">Skip to content</a>
<header>
<div class="header-top">
<a class="wordmark" href="/">&lt;${escape(site.name)}&gt;</a>
<div class="contact" role="group" aria-label="Contact and profiles">${links}</div>
</div>
<nav aria-label="Main navigation">${[['', 'About'], ['projects', 'Projects'], ['work', 'Work experience'], ['open-source', 'Open source'], ['education', 'Education']].map(([slug, label]) => `<a href="/${slug ? `${slug}/` : ''}"${active === slug ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav>
</header>
<main id="main">${body}</main>
<footer><span>${escape(site.name)} &middot; A personal notebook</span><a href="#top">Back to top ↑</a></footer>
</body>
</html>`;

await rm(new URL('dist/', root), { recursive: true, force: true });
await mkdir(new URL('dist/', root), { recursive: true });
await cp(new URL('public/', root), new URL('dist/', root), { recursive: true });
const home = `
<section class="about-intro" aria-labelledby="about-heading">
<div><h1 class="section-heading" id="about-heading">A little about me</h1><p class="bio">${escape(site.bio)}</p></div>
<figure class="portrait">${site.portrait.src ? `<img src="${escape(site.portrait.src)}" alt="${escape(site.portrait.alt)}" width="400" height="500" fetchpriority="high">` : '<div class="photo-placeholder"><span class="placeholder-mark" aria-hidden="true">A.</span><span>Portrait coming soon</span></div>'}</figure>
</section>
<section class="life-section" aria-labelledby="life-heading"><h2 class="section-heading" id="life-heading">A glimpse into my life</h2>
<div class="life-gallery">${site.lifePhotos.length ? site.lifePhotos.map(photo => `<figure><img src="${escape(photo.src)}" alt="${escape(photo.alt)}" loading="lazy" width="600" height="450">${photo.caption ? `<figcaption>${escape(photo.caption)}</figcaption>` : ''}</figure>`).join('') : ['01', '02', '03'].map(number => `<div class="photo-placeholder life-placeholder"><span class="placeholder-number" aria-hidden="true">${number}</span><span>Photo coming soon</span></div>`).join('')}</div></section>
<section class="library-section" aria-labelledby="library-heading"><h2 class="section-heading" id="library-heading">My little library</h2>
${site.library.sample ? '<p class="library-note">An example shelf for now. I’ll add my own books and favourite lines soon.</p>' : ''}
<div class="library-columns"><section class="reading-now" aria-labelledby="reading-heading"><p class="eyebrow">On my bedside table</p><h3 id="reading-heading">Currently reading</h3>${site.library.currentlyReading.length ? bookList(site.library.currentlyReading) : '<p class="empty-note">My current read will appear here.</p>'}</section>
<section class="books-read" aria-labelledby="read-heading"><p class="eyebrow">On the shelf</p><h3 id="read-heading">Books I’ve read</h3>${site.library.read.length ? bookList(site.library.read) : '<p class="empty-note">Books I’ve read and favourite lines from them will appear here.</p>'}</section></div></section>`;
await writeFile(new URL('dist/index.html', root), page('About me', site.description, home, ''));
const projects = `<div class="article"><h1>Projects</h1>
${site.projects.map(project => `<article class="project"><h2>${escape(project.name)}</h2><p>${escape(project.description)}</p>${project.url ? `<a class="read-more" href="${href(project.url)}">${escape(project.label || 'View project')} →</a>` : ''}</article>`).join('\n')}</div>`;
const education = `<div class="article"><h1>Education</h1><section class="education"><h2>${escape(site.education.institution)}</h2><p>${escape(site.education.degree)}</p><p class="meta">${escape(site.education.dates)}</p><p>${escape(site.education.result)}</p></section></div>`;
const work = `<div class="article"><h1>Work experience</h1>${site.work.map(job => `<section class="experience"><h2>${escape(job.organization)}</h2><p class="position">${escape(job.role)}<br>${escape(job.team)}</p><p class="meta">${escape(job.dates)} · ${escape(job.location)}</p><dl class="highlights">${job.highlights.map(item => `<dt>${escape(item.title)}</dt><dd>${escape(item.text)}</dd>`).join('')}</dl></section>`).join('')}</div>`;
const openSource = `<div class="article"><h1>Open source</h1>${site.openSource.map(project => `<section class="experience"><h2><a href="${href(project.url)}">${escape(project.name)}</a></h2><p class="position">${escape(project.role)}</p><p class="meta">${escape(project.dates)}</p><p>${escape(project.description)}</p><a class="read-more" href="${href(project.contributionsUrl)}">View merged contributions →</a></section>`).join('')}</div>`;
for (const [slug, title, body] of [['projects', 'Projects', projects], ['work', 'Work experience', work], ['open-source', 'Open source', openSource], ['education', 'Education', education]]) {
  await mkdir(new URL(`dist/${slug}/`, root), { recursive: true });
  await writeFile(new URL(`dist/${slug}/index.html`, root), page(title, `${title} — ${site.name}`, body, slug));
}
await writeFile(new URL('dist/404.html', root), page('Page not found', 'This page could not be found.', '<article class="article"><h1>Page not found.</h1><p>This page may have moved, or the address may be incorrect.</p><a href="/">← Return to the notebook</a></article>'));
console.log(`Built home, projects, work, open source, education, and 404 page in dist/.`);
