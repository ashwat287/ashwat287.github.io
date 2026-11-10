window.addEventListener('pageshow', () => {
  const galleries = [...document.querySelectorAll('.life-section .life-gallery')];
  const photos = galleries.flatMap(gallery => [...gallery.children]);
  for (let i = photos.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [photos[i], photos[j]] = [photos[j], photos[i]];
  }
  photos.forEach((photo, index) => galleries[index < 3 ? 0 : 1].append(photo));
});
