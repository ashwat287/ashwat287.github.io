window.addEventListener('pageshow', () => {
  const shuffle = (shelves, previewCount) => {
    const items = shelves.flatMap(shelf => [...shelf.children]);
    for (let index = items.length - 1; index > 0; index--) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [items[index], items[randomIndex]] = [items[randomIndex], items[index]];
    }
    items.forEach((item, index) => shelves[index < previewCount ? 0 : 1].append(item));
  };

  shuffle([...document.querySelectorAll('.life-section .life-gallery')], 3);
  const bookShelves = [...document.querySelectorAll('.books-read .book-list')];
  if (bookShelves.length > 1) {
    shuffle(bookShelves, 4);
  }
});
