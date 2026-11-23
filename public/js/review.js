// Shows the current slider value next to the rating label on the movie page.
const rating = document.querySelector('input[name="rating"]');
const shown = document.querySelector('output[for="rating"]');

if (rating && shown) {
  rating.addEventListener("input", () => {
    shown.textContent = rating.value;
  });
}