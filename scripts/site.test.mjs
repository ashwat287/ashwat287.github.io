import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const output = resolve('dist');
async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? files(join(directory, entry.name)) : join(directory, entry.name)))).flat();
}
test('generated pages have valid internal links, anchors, and no browser scripts', async () => {
  const pages = (await files(output)).filter(file => file.endsWith('.html'));
  assert.ok(pages.length >= 2);
  for (const file of pages) {
    const html = await readFile(file, 'utf8');
    assert.match(html, /<html lang="en">/);
    assert.match(html, /<main id="main">/);
    assert.doesNotMatch(html, /<script\b/i);
    for (const [, raw] of html.matchAll(/href="([^"]+)"/g)) {
      if (/^(https?:|mailto:|tel:)/.test(raw)) continue;
      const [path, fragment] = raw.split('#');
      let target = path ? resolve(output, `.${path}`) : file;
      if ((await stat(target)).isDirectory()) target = join(target, 'index.html');
      await stat(target);
      if (fragment) assert.ok((await readFile(target, 'utf8')).includes(`id="${fragment}"`), `${file}: missing ${raw}`);
    }
  }
});
test('personal details, icon contacts, and experience pages are published', async () => {
  const home = await readFile(join(output, 'index.html'), 'utf8');
  assert.match(home, /Ashwat Kumar Singh/);
  assert.match(home, /mailto:ashwatpas@gmail.com/);
  assert.match(home, /tel:\+917759968585/);
  assert.match(home, /aria-label="GitHub: https:\/\/github.com\/ashwat287"/);
  assert.match(home, /aria-label="LinkedIn:/);
  assert.equal((home.match(/<svg /g) || []).length, 4);
  assert.match(home, /<title>About me/);
  assert.match(home, /id="about-heading"/);
  assert.match(home, /explore container internals and self-hosted Kubernetes/);
  assert.doesNotMatch(home, /Minicontainer|Homelab Kubernetes Platform|Indian Institute of Technology|Sample post|post-preview|GitOps &amp; deployments/);
  const projects = await readFile(join(output, 'projects/index.html'), 'utf8');
  assert.match(projects, /Minicontainer/);
  assert.match(projects, /Homelab Kubernetes Platform/);
  const education = await readFile(join(output, 'education/index.html'), 'utf8');
  assert.match(education, /Indian Institute of Technology/);
  for (const [slug, html] of [['', home], ['projects', projects], ['education', education]]) {
    assert.ok(html.includes(`href="/${slug ? `${slug}/` : ''}" aria-current="page"`));
  }
  assert.doesNotMatch(home, /Your name|Contact details coming soon|>Skills</);
  const work = await readFile(join(output, 'work/index.html'), 'utf8');
  assert.match(work, /href="\/work\/" aria-current="page"/);
  assert.match(work, /Amadeus Labs/);
  assert.match(work, /70\+ repositories/);
  assert.match(work, /Prompt-Lint/);
  const openSource = await readFile(join(output, 'open-source/index.html'), 'utf8');
  assert.match(openSource, /href="\/open-source\/" aria-current="page"/);
  assert.match(openSource, /Lima VM/);
  assert.match(openSource, /seven merged pull requests/);
  assert.match(openSource, /author%3Aashwat287/);
});
test('home has a paragraph bio, photo spaces, and an organized sample library', async () => {
  const home = await readFile(join(output, 'index.html'), 'utf8');
  assert.match(home, /<p class="bio">I’m Ashwat/);
  assert.match(home, /Portrait coming soon/);
  assert.match(home, /A glimpse into my life/);
  assert.equal((home.match(/Photo coming soon/g) || []).length, 3);
  assert.match(home, /My little library/);
  assert.match(home, /Currently reading/);
  assert.match(home, /Books I’ve read/);
  assert.match(home, /An example shelf for now/);
  assert.match(home, /Frankenstein/);
  assert.match(home, /<blockquote><p>“You see, but you do not observe.”<\/p><\/blockquote>/);
  assert.doesNotMatch(home, /id="interests-heading"|class="experience"|class="project"/);
});
test('Markdown renders into readable article HTML and samples are labeled', async () => {
  const html = await readFile(join(output, 'posts/keeping-it-simple/index.html'), 'utf8');
  assert.match(html, /<h2>A small publishing routine<\/h2>/);
  assert.match(html, /<pre><code class="language-sh">/);
  assert.match(html, /This is sample writing/);
  const writing = await readFile(join(output, 'writing/index.html'), 'utf8');
  assert.ok(writing.indexOf('a-place-for-small-things') < writing.indexOf('keeping-it-simple'));
  assert.match(writing, /href="\/writing\/" aria-current="page"/);
  assert.match(html, /href="\/writing\/">← All writing/);
});
