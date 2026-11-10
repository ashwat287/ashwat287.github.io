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
  assert.match(home, /src="\/images\/ashwat-profile.png" alt="Portrait of Ashwat Kumar Singh"/);
  assert.doesNotMatch(home, /Portrait coming soon/);
  const portrait = await readFile(join(output, 'images/ashwat-profile.png'));
  assert.equal(portrait.subarray(1, 4).toString(), 'PNG');
  assert.match(home, /A glimpse into my life/);
  assert.doesNotMatch(home, /Photo coming soon/);
  assert.equal((home.match(/class="gallery-photo/g) || []).length, 10);
  const gallery = home.split('<section class="life-section"')[1].split('</section>')[0];
  const [preview, expanded] = gallery.split('<details class="gallery-expansion">');
  assert.equal((preview.match(/class="gallery-photo/g) || []).length, 3);
  assert.equal((expanded.match(/class="gallery-photo/g) || []).length, 7);
  assert.doesNotMatch(gallery, /<a\b|<details[^>]*\bopen\b/);
  assert.match(expanded, /Show all 10 photos/);
  assert.match(expanded, /Show fewer photos/);
  const site = JSON.parse(await readFile('content/site.json', 'utf8'));
  for (const photo of site.lifePhotos) {
    assert.ok(home.includes(`src="${photo.src}"`));
    assert.ok(home.includes(`alt="${photo.alt}"`));
    const data = await readFile(join(output, photo.src));
    assert.equal(data.subarray(1, 4).toString(), 'PNG');
    assert.equal(data.readUInt32BE(16), photo.width);
    assert.equal(data.readUInt32BE(20), photo.height);
  }
  assert.match(home, /My little library/);
  assert.match(home, /Currently reading/);
  assert.match(home, /Books I’ve read/);
  assert.match(home, /An example shelf for now/);
  assert.match(home, /Frankenstein/);
  assert.match(home, /<blockquote><p>“You see, but you do not observe.”<\/p><\/blockquote>/);
  assert.doesNotMatch(home, /id="interests-heading"|class="experience"|class="project"/);
});
test('writing navigation and article output are removed', async () => {
  for (const file of (await files(output)).filter(file => file.endsWith('.html'))) {
    assert.doesNotMatch(await readFile(file, 'utf8'), /href="\/(writing|posts)\/|>Writing<|Sample post/);
  }
  await assert.rejects(stat(join(output, 'writing')), { code: 'ENOENT' });
  await assert.rejects(stat(join(output, 'posts')), { code: 'ENOENT' });
});
