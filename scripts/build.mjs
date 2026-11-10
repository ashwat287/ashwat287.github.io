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
const posts = [...site.posts].sort((a, b) => b.date.localeCompare(a.date));
const slugs = new Set();
for (const post of posts) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug) || slugs.has(post.slug)) throw new Error('Post slugs must be unique lowercase words separated by hyphens');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(post.date) || !Number.isFinite(Date.parse(post.date)) || new Date(post.date).toISOString().slice(0, 10) !== post.date) throw new Error(`Invalid date for ${post.slug}`);
  slugs.add(post.slug);
}
const metadata = post => `<p class="meta"><time datetime="${post.date}">${date(post.date)}</time>${post.sample ? ' &middot; Sample post' : ''}</p>`;
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
<nav aria-label="Main navigation">${[['', 'About'], ['writing', 'Writing'], ['projects', 'Projects'], ['work', 'Work experience'], ['open-source', 'Open source'], ['education', 'Education']].map(([slug, label]) => `<a href="/${slug ? `${slug}/` : ''}"${active === slug ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav>
</header>
<main id="main">${body}</main>
<footer><span>${escape(site.name)} &middot; A personal notebook</span><a href="#top">Back to top ↑</a></footer>
</body>
</html>`;

await rm(new URL('dist/', root), { recursive: true, force: true });
await mkdir(new URL('dist/', root), { recursive: true });
await cp(new URL('public/', root), new URL('dist/', root), { recursive: true });
const home = `
<div class="intro"><h1 class="eyebrow">${escape(site.role)}</h1><p>${escape(site.intro)}</p></div>
<section aria-labelledby="about-heading"><h2 class="section-heading" id="about-heading">A little about me</h2><p>${escape(site.about)}</p></section>
<section aria-labelledby="interests-heading"><h2 class="section-heading" id="interests-heading">Interests</h2><p>${escape(site.interests)}</p></section>`;
await writeFile(new URL('dist/index.html', root), page('About me', site.description, home, ''));
const writing = `<div class="article"><h1>Writing</h1>
${posts.length ? posts.map(post => `<article class="post-preview"><h2><a href="/posts/${post.slug}/">${escape(post.title)}</a></h2>${metadata(post)}<p>${escape(post.excerpt)}</p><a class="read-more" href="/posts/${post.slug}/" aria-label="Read ${escape(post.title)}">Read the full post →</a></article>`).join('\n') : '<p class="muted">Nothing published yet. Notes will find their way here soon.</p>'}</div>`;
const projects = `<div class="article"><h1>Projects</h1>
${site.projects.map(project => `<article class="project"><h2>${escape(project.name)}</h2><p>${escape(project.description)}</p>${project.url ? `<a class="read-more" href="${href(project.url)}">${escape(project.label || 'View project')} →</a>` : ''}</article>`).join('\n')}</div>`;
const education = `<div class="article"><h1>Education</h1><section class="education"><h2>${escape(site.education.institution)}</h2><p>${escape(site.education.degree)}</p><p class="meta">${escape(site.education.dates)}</p><p>${escape(site.education.result)}</p></section></div>`;
const work = `<div class="article"><h1>Work experience</h1>${site.work.map(job => `<section class="experience"><h2>${escape(job.organization)}</h2><p class="position">${escape(job.role)}<br>${escape(job.team)}</p><p class="meta">${escape(job.dates)} · ${escape(job.location)}</p><dl class="highlights">${job.highlights.map(item => `<dt>${escape(item.title)}</dt><dd>${escape(item.text)}</dd>`).join('')}</dl></section>`).join('')}</div>`;
const openSource = `<div class="article"><h1>Open source</h1>${site.openSource.map(project => `<section class="experience"><h2><a href="${href(project.url)}">${escape(project.name)}</a></h2><p class="position">${escape(project.role)}</p><p class="meta">${escape(project.dates)}</p><p>${escape(project.description)}</p><a class="read-more" href="${href(project.contributionsUrl)}">View merged contributions →</a></section>`).join('')}</div>`;
for (const [slug, title, body] of [['writing', 'Writing', writing], ['projects', 'Projects', projects], ['work', 'Work experience', work], ['open-source', 'Open source', openSource], ['education', 'Education', education]]) {
  await mkdir(new URL(`dist/${slug}/`, root), { recursive: true });
  await writeFile(new URL(`dist/${slug}/index.html`, root), page(title, `${title} — ${site.name}`, body, slug));
}
for (const post of posts) {
  const markdown = await readFile(new URL(`content/posts/${post.slug}.md`, root), 'utf8');
  const body = `<article class="article"><a class="back" href="/writing/">← All writing</a><h1>${escape(post.title)}</h1>${metadata(post)}${post.sample ? '<p class="sample-note">This is sample writing included with the website. Replace it with your own post.</p>' : ''}${marked.parse(markdown)}</article>`;
  await mkdir(new URL(`dist/posts/${post.slug}/`, root), { recursive: true });
  await writeFile(new URL(`dist/posts/${post.slug}/index.html`, root), page(post.title, post.excerpt, body, 'writing'));
}
await writeFile(new URL('dist/404.html', root), page('Page not found', 'This page could not be found.', '<article class="article"><h1>Page not found.</h1><p>This page may have moved, or the address may be incorrect.</p><a href="/">← Return to the notebook</a></article>'));
console.log(`Built home, writing, projects, work, open source, education, ${posts.length} posts, and 404 page in dist/.`);
