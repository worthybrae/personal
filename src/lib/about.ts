// Posters come from TMDB's image CDN, which allows embedding and canvas use.
const tmdb = (path: string) => `https://image.tmdb.org/t/p/w185/${path}.jpg`;

// Favourites on the about page. Each shelf shows the cover art of up to five
// items, each linking out, and, when allUrl is set, a link to the full list. A shelf with no
// items and no link is left off the page.

export interface Favorite {
  title: string;
  /** Director, author, artist or neighbourhood. */
  by?: string;
  url?: string;
  /** Cover art, shown in the shelf's poster strip. */
  image?: string;
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
      { title: 'Oldboy', by: 'Park Chan-wook', url: 'https://letterboxd.com/film/oldboy/', image: tmdb('pWDtjs568ZfOTMbURQBYuT4Qxka') },
      { title: 'Vertigo', by: 'Alfred Hitchcock', url: 'https://letterboxd.com/film/vertigo/', image: tmdb('15uOEfqBNTVtDUT7hGBVCka0rZz') },
      { title: 'Silence', by: 'Martin Scorsese', url: 'https://letterboxd.com/film/silence/', image: tmdb('x5T0cQDYws0xRBVG4Q3wpcrcmax') },
      { title: 'A Clockwork Orange', by: 'Stanley Kubrick', url: 'https://letterboxd.com/film/a-clockwork-orange/', image: tmdb('4sHeTAp65WrSSuc05nRBKddhBxO') },
      { title: 'Ice Merchants', by: 'João Gonzalez', url: 'https://letterboxd.com/film/ice-merchants/', image: tmdb('uDoiGF4KqyNglxaIJlRWdFQ4WJT') },
    ],
    allUrl: 'https://letterboxd.com/stingray7/films/',
    allLabel: 'EVERYTHING I’VE WATCHED',
  },
  {
    label: 'TV SHOWS',
    items: [
      { title: 'Scavengers Reign', by: 'Joseph Bennett, Charles Huettner', url: 'https://www.themoviedb.org/tv/204154-scavengers-reign', image: tmdb('bFlVZV8TQbs8hcIY7PVYonYFMgK') },
      { title: 'Pantheon', by: 'Craig Silverstein', url: 'https://www.themoviedb.org/tv/195339-pantheon', image: tmdb('28xQt18ryWRcx9tBkK0MBsNNRw5') },
      { title: 'Severance', by: 'Dan Erickson', url: 'https://www.themoviedb.org/tv/95396-severance', image: tmdb('pPHpeI2X1qEd1CS1SeyrdhZ4qnT') },
      { title: 'Andor', by: 'Tony Gilroy', url: 'https://www.themoviedb.org/tv/83867-star-wars-andor', image: tmdb('khZqmwHQicTYoS7Flreb9EddFZC') },
      { title: 'The Wire', by: 'David Simon', url: 'https://www.themoviedb.org/tv/1438-the-wire', image: tmdb('4lbclFySvugI51fwsyxBTOm4DqK') },
    ],
  },
  { label: 'BOOKS', items: [] },
  { label: 'ALBUMS', items: [] },
  { label: 'RESTAURANTS', items: [] },
];
