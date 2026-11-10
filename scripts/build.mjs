import { readFile, mkdir, writeFile, cp, rm } from 'node:fs/promises';
import { marked } from 'marked';

const site = JSON.parse(await readFile(new URL('../content/site.json', import.meta.url), 'utf8'));
const root = new URL('../', import.meta.url);
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const date = value => new Date(`${value}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const href = value => {
  if (!/^https?:\/\//.test(value)) throw new Error(`Use an absolute HTTP(S) URL: ${value}`);
  return escape(new URL(value).href);
};
const links = Object.entries(site.links).filter(([, value]) => value).map(([key, value]) => {
  if (key === 'email') {
    if (!/^[^\s@<>"?&#]+@[^\s@<>"?&#]+\.[^\s@<>"?&#]+$/.test(value)) throw new Error('Invalid contact email');
    return `<a href="mailto:${escape(value)}">Email</a>`;
  }
  return `<a href="${href(value)}">${key === 'github' ? 'GitHub' : 'LinkedIn'}</a>`;
}).join('');
const posts = [...site.posts].sort((a, b) => b.date.localeCompare(a.date));
const slugs = new Set();
for (const post of posts) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug) || slugs.has(post.slug)) throw new Error('Post slugs must be unique lowercase words separated by hyphens');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(post.date) || !Number.isFinite(Date.parse(post.date)) || new Date(post.date).toISOString().slice(0, 10) !== post.date) throw new Error(`Invalid date for ${post.slug}`);
  slugs.add(post.slug);
}
const metadata = post => `<p class="meta"><time datetime="${post.date}">${date(post.date)}</time>${post.sample ? ' &middot; Sample post' : ''}</p>`;
const page = (title, description, body) => `<!doctype html>
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
<a class="wordmark" href="/">&lt;${escape(site.name)}&gt;</a>
<nav aria-label="Main navigation"><a href="/#writing">Writing</a><a href="/#projects">Projects</a><a href="/#about">About</a></nav>
</header>
<main id="main">${body}</main>
<footer><span>${escape(site.name)} &middot; A personal notebook</span><a href="#top">Back to top ↑</a></footer>
</body>
</html>`;

await rm(new URL('dist/', root), { recursive: true, force: true });
await mkdir(new URL('dist/', root), { recursive: true });
await cp(new URL('public/', root), new URL('dist/', root), { recursive: true });
const home = `
<div class="intro"><h1 class="eyebrow">Software engineer / personal notebook</h1><p>${escape(site.intro)}</p></div>
<section id="writing" aria-labelledby="writing-heading">
<h2 class="section-heading" id="writing-heading">Writing</h2>
${posts.length ? posts.map(post => `<article class="post-preview"><h2><a href="/posts/${post.slug}/">${escape(post.title)}</a></h2>${metadata(post)}<p>${escape(post.excerpt)}</p><a class="read-more" href="/posts/${post.slug}/" aria-label="Read ${escape(post.title)}">Read the full post →</a></article>`).join('\n') : '<p class="muted">Nothing published yet. Notes will find their way here soon.</p>'}
</section>
<section id="projects" aria-labelledby="projects-heading">
<h2 class="section-heading" id="projects-heading">Selected projects</h2>
${site.projects.map(project => `<article class="project"><h3>${escape(project.name)}</h3><p>${escape(project.description)}</p>${project.url ? `<a class="read-more" href="${href(project.url)}">${escape(project.label || 'View project')} →</a>` : ''}</article>`).join('\n')}
</section>
<section id="about" aria-labelledby="about-heading">
<h2 class="section-heading" id="about-heading">A little about me</h2>
<p>${escape(site.about)}</p>
${links ? `<div class="contact" aria-label="Contact links">${links}</div>` : '<p class="muted">Contact details coming soon.</p>'}
</section>`;
await writeFile(new URL('dist/index.html', root), page('Writing & projects', site.description, home));
for (const post of posts) {
  const markdown = await readFile(new URL(`content/posts/${post.slug}.md`, root), 'utf8');
  const body = `<article class="article"><a class="back" href="/#writing">← All writing</a><h1>${escape(post.title)}</h1>${metadata(post)}${post.sample ? '<p class="sample-note">This is sample writing included with the website. Replace it with your own post.</p>' : ''}${marked.parse(markdown)}</article>`;
  await mkdir(new URL(`dist/posts/${post.slug}/`, root), { recursive: true });
  await writeFile(new URL(`dist/posts/${post.slug}/index.html`, root), page(post.title, post.excerpt, body));
}
await writeFile(new URL('dist/404.html', root), page('Page not found', 'This page could not be found.', '<article class="article"><h1>Page not found.</h1><p>This page may have moved, or the address may be incorrect.</p><a href="/">← Return to the notebook</a></article>'));
console.log(`Built home, ${posts.length} posts, and 404 page in dist/.`);
