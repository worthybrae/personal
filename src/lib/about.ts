// Posters come from TMDB's image CDN and album covers from Apple's; both
// allow embedding and canvas use.
const tmdb = (path: string) => `https://image.tmdb.org/t/p/w185/${path}.jpg`;
const apple = (path: string) => `https://is1-ssl.mzstatic.com/image/thumb/${path}/300x300bb.jpg`;

// Favourites on the about page. Each shelf shows the cover art of up to five
// items, each linking out. A shelf with no items is left off the page.

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
  /** Cover shape: film posters are 2:3; album covers and photos square. */
  cover?: 'poster' | 'square';
}

export const SHELVES: Shelf[] = [
  {
    label: 'FILM',
    items: [
      { title: 'Oldboy', by: 'Park Chan-wook', url: 'https://letterboxd.com/film/oldboy/', image: tmdb('pWDtjs568ZfOTMbURQBYuT4Qxka') },
      { title: 'Vertigo', by: 'Alfred Hitchcock', url: 'https://letterboxd.com/film/vertigo/', image: tmdb('15uOEfqBNTVtDUT7hGBVCka0rZz') },
      { title: 'Silence', by: 'Martin Scorsese', url: 'https://letterboxd.com/film/silence/', image: tmdb('x5T0cQDYws0xRBVG4Q3wpcrcmax') },
      { title: 'A Clockwork Orange', by: 'Stanley Kubrick', url: 'https://letterboxd.com/film/a-clockwork-orange/', image: tmdb('4sHeTAp65WrSSuc05nRBKddhBxO') },
      { title: 'Ice Merchants', by: 'João Gonzalez', url: 'https://letterboxd.com/film/ice-merchants/', image: tmdb('uDoiGF4KqyNglxaIJlRWdFQ4WJT') },
    ],
  },
  {
    label: 'TV',
    items: [
      { title: 'Scavengers Reign', by: 'Joseph Bennett, Charles Huettner', url: 'https://www.themoviedb.org/tv/204154-scavengers-reign', image: tmdb('bFlVZV8TQbs8hcIY7PVYonYFMgK') },
      { title: 'Pantheon', by: 'Craig Silverstein', url: 'https://www.themoviedb.org/tv/195339-pantheon', image: tmdb('28xQt18ryWRcx9tBkK0MBsNNRw5') },
      { title: 'Severance', by: 'Dan Erickson', url: 'https://www.themoviedb.org/tv/95396-severance', image: tmdb('pPHpeI2X1qEd1CS1SeyrdhZ4qnT') },
      { title: 'Andor', by: 'Tony Gilroy', url: 'https://www.themoviedb.org/tv/83867-star-wars-andor', image: tmdb('khZqmwHQicTYoS7Flreb9EddFZC') },
      { title: 'The Wire', by: 'David Simon', url: 'https://www.themoviedb.org/tv/1438-the-wire', image: tmdb('4lbclFySvugI51fwsyxBTOm4DqK') },
    ],
  },
  { label: 'BOOKS', items: [] },
  {
    label: 'MUSIC',
    cover: 'square',
    items: [
      { title: 'channel ORANGE', by: 'Frank Ocean', url: 'https://music.apple.com/us/album/channel-orange/1440765580', image: apple('Music125/v4/04/f8/63/04f863fc-2852-604f-c910-a97ac069506b/12UMGIM40339.rgb.jpg') },
      { title: 'Faces', by: 'Mac Miller', url: 'https://music.apple.com/us/album/faces/1585686346', image: apple('Music115/v4/83/77/5b/83775bbf-8f36-f373-6af9-cb7c0bfa2d49/093624879787.jpg') },
      { title: 'AT.LONG.LAST.A$AP', by: 'A$AP Rocky', url: 'https://music.apple.com/us/album/at-long-last-a%24ap/994721471', image: apple('Music221/v4/9f/9b/4c/9f9b4cbc-5910-51fb-8486-adf3b89bc973/886444594837.jpg') },
      { title: 'Days Before Rodeo', by: 'Travis Scott', url: 'https://music.apple.com/us/album/days-before-rodeo/1764164178', image: apple('Music211/v4/7c/35/78/7c3578d6-be58-b198-73e4-01e8630e78bb/196871381437.jpg') },
      { title: 'Sound & Color', by: 'Alabama Shakes', url: 'https://music.apple.com/us/album/sound-color/1053742064', image: apple('Music62/v4/6c/30/aa/6c30aa11-b842-105c-da48-d569c45604fc/mzm.rrxxfbbw.jpg') },
    ],
  },
  {
    // Photos are from each restaurant's own website, saved small and square
    // under public/ (Gymkhana's image host refuses requests from other sites).
    label: 'RESTAURANTS',
    cover: 'square',
    items: [
      { title: 'Oleana', by: 'Cambridge, MA', url: 'https://www.oleanarestaurant.com', image: '/media/about/restaurants/oleana.jpg' },
      { title: 'Gymkhana', by: 'London', url: 'https://gymkhanalondon.com', image: '/media/about/restaurants/gymkhana.jpg' },
      { title: 'Monkey Bar', by: 'New York', url: 'https://www.nycmonkeybar.com', image: '/media/about/restaurants/monkey-bar.jpg' },
      { title: 'Francie', by: 'New York', url: 'https://www.franciebrooklyn.com', image: '/media/about/restaurants/francie.jpg' },
      { title: 'Dirt Candy', by: 'New York', url: 'https://www.dirtcandynyc.com', image: '/media/about/restaurants/dirt-candy.jpg' },
    ],
  },
];
