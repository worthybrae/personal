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
    items: [
      { title: 'Oldboy', by: 'Park Chan-wook', url: 'https://letterboxd.com/film/oldboy/' },
      { title: 'Vertigo', by: 'Alfred Hitchcock', url: 'https://letterboxd.com/film/vertigo/' },
      { title: 'Silence', by: 'Martin Scorsese', url: 'https://letterboxd.com/film/silence/' },
      { title: 'A Clockwork Orange', by: 'Stanley Kubrick', url: 'https://letterboxd.com/film/a-clockwork-orange/' },
      { title: 'Ice Merchants', by: 'João Gonzalez', url: 'https://letterboxd.com/film/ice-merchants/' },
    ],
    allUrl: 'https://letterboxd.com/stingray7/films/',
    allLabel: 'EVERYTHING I’VE WATCHED',
  },
  {
    label: 'TV SHOWS',
    items: [
      { title: 'Scavengers Reign', by: 'Joseph Bennett, Charles Huettner' },
      { title: 'Pantheon', by: 'Craig Silverstein' },
      { title: 'Severance', by: 'Dan Erickson' },
      { title: 'Andor', by: 'Tony Gilroy' },
      { title: 'The Wire', by: 'David Simon' },
    ],
  },
  { label: 'BOOKS', items: [] },
  { label: 'ALBUMS', items: [] },
  { label: 'RESTAURANTS', items: [] },
];
