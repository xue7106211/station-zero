import { getMovieFromStore, getMovieSlugsFromStore, getMoviesFromStore } from "./movie-store";

export async function getMovies() {
  return getMoviesFromStore();
}

export async function getMovie(slug: string) {
  return getMovieFromStore(slug);
}

export async function getMovieSlugs() {
  return getMovieSlugsFromStore();
}
