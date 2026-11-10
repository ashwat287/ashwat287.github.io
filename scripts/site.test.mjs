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
      if (/^(https?:|mailto:)/.test(raw)) continue;
      const [path, fragment] = raw.split('#');
      let target = path ? resolve(output, `.${path}`) : file;
      if ((await stat(target)).isDirectory()) target = join(target, 'index.html');
      await stat(target);
      if (fragment) assert.ok((await readFile(target, 'utf8')).includes(`id="${fragment}"`), `${file}: missing ${raw}`);
    }
  }
});
test('Markdown renders into readable article HTML and samples are labeled', async () => {
  const html = await readFile(join(output, 'posts/keeping-it-simple/index.html'), 'utf8');
  assert.match(html, /<h2>A small publishing routine<\/h2>/);
  assert.match(html, /<pre><code class="language-sh">/);
  assert.match(html, /This is sample writing/);
  const home = await readFile(join(output, 'index.html'), 'utf8');
  assert.ok(home.indexOf('a-place-for-small-things') < home.indexOf('keeping-it-simple'));
});
