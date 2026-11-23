// Карточки уже пришли с сервера. JavaScript нужен только для удобства.
for (const form of document.querySelectorAll("form[data-delete-title]")) {
  form.addEventListener("submit", function (event) {
    const title = form.dataset.deleteTitle;
    const confirmed = globalThis.confirm('Delete "' + title + '" and all its reviews?');
    if (!confirmed) event.preventDefault();
  });
}

// Если загруженный постер отсутствует, показываем стандартную картинку.
for (const image of document.querySelectorAll("article img")) {
  const showPlaceholder = function () {
    image.src = "/images/poster-placeholder.svg";
  };
  image.addEventListener("error", showPlaceholder, { once: true });
  if (image.complete && image.naturalWidth === 0) showPlaceholder();
}
