// Favourites on the about page. Each shelf shows its numbered items (up to
// five) and, when allUrl is set, a link to the full list. A shelf with no
// items and no link is left off the page.

export interface Favorite {
  title: string;
  /** Director, author, artist or neighbourhood. */
  by?: string;
  url?: string;
}

export interface Shelf {
  label: string;
  items: Favorite[];
  allUrl?: string;
  allLabel?: string;
}

export const SHELVES: Shelf[] = [
  {
    label: 'MOVIES',
    items: [],
    allUrl: 'https://letterboxd.com/stingray7/films/',
    allLabel: 'EVERYTHING I’VE WATCHED',
  },
  { label: 'TV SHOWS', items: [] },
  { label: 'BOOKS', items: [] },
  { label: 'ALBUMS', items: [] },
  { label: 'RESTAURANTS', items: [] },
];
