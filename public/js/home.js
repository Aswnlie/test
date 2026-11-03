// This script runs only when the homepage has a movie list.
const list = document.querySelector("#movies");
const status = document.querySelector("#status");
const retry = document.querySelector("#retry");

async function loadMovies() {
  status.textContent = "Loading movies...";
  retry.hidden = true;
  try {
    const response = await fetch("/api/movies");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load movies.");
    list.replaceChildren();
    for (const movie of data.movies) {
      const card = document.querySelector("#movie-card").content.cloneNode(true);
      card.querySelector("h2").textContent = movie.title;
      card.querySelector("[data-year]").textContent = "Year: " + movie.releaseYear;
      card.querySelector("[data-date-label]").textContent = movie.dateLabel + ":";
      card.querySelector("time").textContent = movie.date;
      card.querySelector("time").dateTime = movie.date;
      card.querySelector("a").href = "/movie/" + movie.id;
      const image = card.querySelector("img");
      image.addEventListener("error", function () {
        image.src = "/images/poster-placeholder.svg";
      }, { once: true });
      image.alt = "Poster for " + movie.title;
      image.src = movie.posterPath;
      const button = card.querySelector("button");
      button.hidden = !data.isAdmin;
      button.addEventListener("click", function () {
        deleteMovie(movie, data.csrf, button);
      });
      list.append(card);
    }
    status.textContent = data.movies.length ? "" : "No movies yet.";
  } catch (error) {
    status.textContent = error.message;
    retry.hidden = false;
  }
}

async function deleteMovie(movie, csrf, button) {
  if (!globalThis.confirm('Delete "' + movie.title + '" and all its reviews?')) return;
  button.disabled = true;
  try {
    const response = await fetch("/api/movies/" + movie.id + "/delete", {
      method: "POST",
      body: new URLSearchParams({ csrf }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not delete movie.");
    button.closest("article").remove();
    status.textContent = data.message + (list.children.length ? "" : " No movies yet.");
  } catch (error) {
    status.textContent = error.message;
    button.disabled = false;
  }
}

if (list) {
  retry.addEventListener("click", loadMovies);
  loadMovies();
}
