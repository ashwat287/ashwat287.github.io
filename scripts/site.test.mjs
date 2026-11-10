import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { runInNewContext } from 'node:vm';

const outputDirectory = resolve('dist');

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nestedFiles = await Promise.all(entries.map(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? listFiles(path) : path;
  }));
  return nestedFiles.flat();
}

test('generated pages have valid internal links, anchors, and gallery script', async () => {
  const pages = (await listFiles(outputDirectory)).filter(file => file.endsWith('.html'));
  assert.ok(pages.length >= 2);
  for (const file of pages) {
    const html = await readFile(file, 'utf8');
    assert.match(html, /<html lang="en">/);
    assert.match(html, /<main id="main">/);
    if (file === join(outputDirectory, 'index.html')) {
      assert.match(html, /<script src="\/gallery.js" defer><\/script>/);
      await stat(join(outputDirectory, 'gallery.js'));
    } else {
      assert.doesNotMatch(html, /<script\b/i);
    }
    for (const [, raw] of html.matchAll(/href="([^"]+)"/g)) {
      if (/^(https?:|mailto:|tel:)/.test(raw)) continue;
      const [path, fragment] = raw.split('#');
      let target = path ? resolve(outputDirectory, `.${path}`) : file;
      if ((await stat(target)).isDirectory()) target = join(target, 'index.html');
      await stat(target);
      if (fragment) assert.ok((await readFile(target, 'utf8')).includes(`id="${fragment}"`), `${file}: missing ${raw}`);
    }
  }
});
test('each page visit reshuffles photos and read books while keeping their previews', async () => {
  const createShelves = (items, previewCount) => {
    const shelves = [items.slice(0, previewCount), items.slice(previewCount)].map(children => {
      return {
        children,
        append(item) {
          for (const shelf of shelves) {
            const itemIndex = shelf.children.indexOf(item);
            if (itemIndex !== -1) shelf.children.splice(itemIndex, 1);
          }
          this.children.push(item);
        }
      };
    });
    return shelves;
  };
  const photos = Array.from({ length: 10 }, (_, itemId) => ({ itemId }));
  const books = Array.from({ length: 9 }, (_, itemId) => ({ itemId }));
  const galleries = createShelves(photos, 3);
  const bookShelves = createShelves(books, 4);
  let onPageVisit;
  runInNewContext(await readFile(join(outputDirectory, 'gallery.js'), 'utf8'), {
    window: { addEventListener(event, callback) { assert.equal(event, 'pageshow'); onPageVisit = callback; } },
    document: { querySelectorAll: selector => selector.includes('life-section') ? galleries : bookShelves },
    Math: { floor: Math.floor, random: () => 0 }
  });
  for (let visit = 0; visit < 2; visit++) {
    const beforePhotos = galleries.flatMap(gallery => gallery.children);
    const beforeBooks = bookShelves.flatMap(shelf => shelf.children);
    onPageVisit();
    const afterPhotos = galleries.flatMap(gallery => gallery.children);
    const afterBooks = bookShelves.flatMap(shelf => shelf.children);
    assert.notDeepEqual(afterPhotos, beforePhotos);
    assert.notDeepEqual(afterBooks, beforeBooks);
    assert.equal(galleries[0].children.length, 3);
    assert.equal(galleries[1].children.length, 7);
    assert.equal(bookShelves[0].children.length, 4);
    assert.equal(bookShelves[1].children.length, 5);
    assert.deepEqual(afterPhotos.map(item => item.itemId).sort((a, b) => a - b), photos.map(item => item.itemId));
    assert.deepEqual(afterBooks.map(item => item.itemId).sort((a, b) => a - b), books.map(item => item.itemId));
  }
});
test('personal details, icon contacts, and experience pages are published', async () => {
  const home = await readFile(join(outputDirectory, 'index.html'), 'utf8');
  assert.match(home, /Ashwat Kumar Singh/);
  assert.match(home, /mailto:ashwatpas@gmail.com/);
  assert.match(home, /tel:\+917759968585/);
  assert.match(home, /aria-label="GitHub: https:\/\/github.com\/ashwat287"/);
  assert.match(home, /aria-label="LinkedIn:/);
  assert.equal((home.match(/<svg /g) || []).length, 4);
  assert.match(home, /<title>About me/);
  assert.match(home, /id="about-heading"/);
  assert.match(home, /spend their time shipping/);
  assert.doesNotMatch(home, /Minicontainer|Homelab Kubernetes Platform|Indian Institute of Technology|Sample post|post-preview|GitOps &amp; deployments/);
  const projects = await readFile(join(outputDirectory, 'projects/index.html'), 'utf8');
  assert.match(projects, /Minicontainer/);
  assert.match(projects, /Homelab Kubernetes Platform/);
  const education = await readFile(join(outputDirectory, 'education/index.html'), 'utf8');
  assert.match(education, /Indian Institute of Technology/);
  for (const [slug, html] of [['', home], ['projects', projects], ['education', education]]) {
    assert.ok(html.includes(`href="/${slug ? `${slug}/` : ''}" aria-current="page"`));
  }
  assert.doesNotMatch(home, /Your name|Contact details coming soon|>Skills</);
  const work = await readFile(join(outputDirectory, 'work/index.html'), 'utf8');
  assert.match(work, /href="\/work\/" aria-current="page"/);
  assert.match(work, /Amadeus Labs/);
  assert.match(work, /70\+ repositories/);
  assert.match(work, /Prompt-Lint/);
  const openSource = await readFile(join(outputDirectory, 'open-source/index.html'), 'utf8');
  assert.match(openSource, /href="\/open-source\/" aria-current="page"/);
  assert.match(openSource, /Lima VM/);
  assert.match(openSource, /seven merged pull requests/);
  assert.match(openSource, /author%3Aashwat287/);
});
test('home has a paragraph bio, photo spaces, and the personal library', async () => {
  const home = await readFile(join(outputDirectory, 'index.html'), 'utf8');
  assert.match(home, /<p class="bio"><strong>[^<]*Hi, I’m Ashwat\.<\/strong>/);
  assert.match(home, /<strong>[^<]*Away from the keyboard \(well, mostly\)<\/strong>/);
  assert.match(home, /<strong>[^<]*Off the grid<\/strong>/);
  assert.match(home, /This is my little corner of the web/);
  assert.match(home, /src="\/images\/ashwat-profile.png" alt="Portrait of Ashwat Kumar Singh"/);
  assert.doesNotMatch(home, /Portrait coming soon/);
  const portrait = await readFile(join(outputDirectory, 'images/ashwat-profile.png'));
  assert.equal(portrait.subarray(1, 4).toString(), 'PNG');
  assert.match(home, /A glimpse into my life/);
  assert.doesNotMatch(home, /Photo coming soon/);
  assert.equal((home.match(/class="gallery-photo/g) || []).length, 12);
  const gallery = home.split('<section class="life-section"')[1].split('</section>')[0];
  const [preview, expanded] = gallery.split('<details class="gallery-expansion">');
  assert.equal((preview.match(/class="gallery-photo/g) || []).length, 3);
  assert.equal((expanded.match(/class="gallery-photo/g) || []).length, 9);
  assert.doesNotMatch(gallery, /<a\b|<details[^>]*\bopen\b/);
  assert.match(expanded, /Show all 12 photos/);
  assert.match(expanded, /Show fewer photos/);
  const site = JSON.parse(await readFile('content/site.json', 'utf8'));
  for (const photo of site.lifePhotos) {
    assert.ok(home.includes(`src="${photo.src}"`));
    assert.ok(home.includes(`alt="${photo.alt}"`));
    const data = await readFile(join(outputDirectory, photo.src));
    assert.equal(data.subarray(1, 4).toString(), 'PNG');
    assert.equal(data.readUInt32BE(16), photo.width);
    assert.equal(data.readUInt32BE(20), photo.height);
  }
  assert.match(home, /My little library/);
  assert.match(home, /Currently reading/);
  assert.match(home, /Books I’ve read/);
  assert.equal(site.library.sample, false);
  assert.equal(site.library.currentlyReading.length, 1);
  assert.equal(site.library.read.length, 9);
  assert.match(home, /A Fine Balance/);
  assert.match(home, /Rohinton Mistry/);
  const readShelf = home.split('<section class="books-read"')[1].split('</section>')[0];
  const [bookPreview, bookExpansion] = readShelf.split('<details class="book-expansion">');
  assert.equal((bookPreview.match(/class="book"/g) || []).length, 4);
  assert.equal((bookExpansion.match(/class="book"/g) || []).length, 5);
  assert.match(bookExpansion, /Show all 9 books/);
  assert.match(bookExpansion, /Show fewer books/);
  assert.doesNotMatch(bookExpansion, /<details[^>]*\bopen\b/);
  for (const book of [...site.library.currentlyReading, ...site.library.read]) {
    assert.ok(home.includes(book.title));
    assert.ok(home.includes(book.author));
    assert.ok(home.includes(`src="${book.cover}" alt="Cover of ${book.title}"`));
    assert.ok(home.includes(`href="${book.coverSource}"`));
    const cover = await readFile(join(outputDirectory, book.cover));
    assert.equal(cover[0], 0xff);
    assert.equal(cover[1], 0xd8);
  }
  assert.doesNotMatch(home, /id="interests-heading"|class="experience"|class="project"/);
});
test('writing navigation and article output are removed', async () => {
  for (const file of (await listFiles(outputDirectory)).filter(file => file.endsWith('.html'))) {
    assert.doesNotMatch(await readFile(file, 'utf8'), /href="\/(writing|posts)\/|>Writing<|Sample post/);
  }
  await assert.rejects(stat(join(outputDirectory, 'writing')), { code: 'ENOENT' });
  await assert.rejects(stat(join(outputDirectory, 'posts')), { code: 'ENOENT' });
});
