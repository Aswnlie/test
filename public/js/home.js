// Forms and links work without JavaScript. JS adds a confirmation before deletion.
document.querySelectorAll(".delete-movie").forEach(function (form) {
  form.addEventListener("submit", function (event) {
    const title = form.dataset.title;
    if (!globalThis.confirm('Delete "' + title + '" and all its reviews?')) {
      event.preventDefault();
    }
  });
});

// A missing upload should not leave a broken image icon.
document.querySelectorAll("img").forEach(function (image) {
  function showPlaceholder() {
    image.src = "/images/poster-placeholder.svg";
  }
  image.addEventListener("error", showPlaceholder, { once: true });
  if (image.complete && image.naturalWidth === 0) showPlaceholder();
});
