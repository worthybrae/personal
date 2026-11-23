// Film, TV and album covers are copies kept in the portfolio S3 bucket under
// about/, rather than hotlinked from TMDB's and Apple's image CDNs. The
// bucket's CORS rule lets the poster strip read their pixels.
const s3 = (path: string) => `https://portfolio-worthy.s3.us-east-1.amazonaws.com/about/${path}.jpg`;

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
      { title: 'Oldboy', by: 'Park Chan-wook', url: 'https://letterboxd.com/film/oldboy/', image: s3('film/oldboy') },
      { title: 'Vertigo', by: 'Alfred Hitchcock', url: 'https://letterboxd.com/film/vertigo/', image: s3('film/vertigo') },
      { title: 'Silence', by: 'Martin Scorsese', url: 'https://letterboxd.com/film/silence/', image: s3('film/silence') },
      { title: 'A Clockwork Orange', by: 'Stanley Kubrick', url: 'https://letterboxd.com/film/a-clockwork-orange/', image: s3('film/a-clockwork-orange') },
      { title: 'Ice Merchants', by: 'João Gonzalez', url: 'https://letterboxd.com/film/ice-merchants/', image: s3('film/ice-merchants') },
    ],
  },
  {
    label: 'TV',
    items: [
      { title: 'Scavengers Reign', by: 'Joseph Bennett, Charles Huettner', url: 'https://www.themoviedb.org/tv/204154-scavengers-reign', image: s3('tv/scavengers-reign') },
      { title: 'Pantheon', by: 'Craig Silverstein', url: 'https://www.themoviedb.org/tv/195339-pantheon', image: s3('tv/pantheon') },
      { title: 'Severance', by: 'Dan Erickson', url: 'https://www.themoviedb.org/tv/95396-severance', image: s3('tv/severance') },
      { title: 'Andor', by: 'Tony Gilroy', url: 'https://www.themoviedb.org/tv/83867-star-wars-andor', image: s3('tv/andor') },
      { title: 'The Wire', by: 'David Simon', url: 'https://www.themoviedb.org/tv/1438-the-wire', image: s3('tv/the-wire') },
    ],
  },
  {
    // Covers from Open Library, saved small under public/ (its cover server
    // redirects through archive.org and is slow to hotlink).
    label: 'BOOKS',
    items: [
      { title: 'The Three-Body Problem', by: 'Cixin Liu', url: 'https://openlibrary.org/works/OL17267881W', image: '/media/about/books/three-body-problem.jpg' },
      { title: 'Eden', by: 'Stanisław Lem', url: 'https://openlibrary.org/works/OL109515W', image: '/media/about/books/eden.jpg' },
      { title: 'Exhalation', by: 'Ted Chiang', url: 'https://openlibrary.org/works/OL20149336W', image: '/media/about/books/exhalation.jpg' },
      { title: 'Bloodchild and Other Stories', by: 'Octavia E. Butler', url: 'https://openlibrary.org/works/OL35621W', image: '/media/about/books/bloodchild.jpg' },
      { title: 'Ringworld', by: 'Larry Niven', url: 'https://openlibrary.org/works/OL510405W', image: '/media/about/books/ringworld.jpg' },
    ],
  },
  {
    label: 'MUSIC',
    cover: 'square',
    items: [
      { title: 'channel ORANGE', by: 'Frank Ocean', url: 'https://music.apple.com/us/album/channel-orange/1440765580', image: s3('music/channel-orange') },
      { title: 'Faces', by: 'Mac Miller', url: 'https://music.apple.com/us/album/faces/1585686346', image: s3('music/faces') },
      { title: 'AT.LONG.LAST.A$AP', by: 'A$AP Rocky', url: 'https://music.apple.com/us/album/at-long-last-a%24ap/994721471', image: s3('music/at-long-last-asap') },
      { title: 'Days Before Rodeo', by: 'Travis Scott', url: 'https://music.apple.com/us/album/days-before-rodeo/1764164178', image: s3('music/days-before-rodeo') },
      { title: 'Sound & Color', by: 'Alabama Shakes', url: 'https://music.apple.com/us/album/sound-color/1053742064', image: s3('music/sound-and-color') },
    ],
  },
  {
    // Photos are from each restaurant's own website, saved small and square
    // under public/ (Gymkhana's image host refuses requests from other sites).
    label: 'FOOD',
    cover: 'square',
    items: [
      { title: 'Oleana', by: 'Cambridge, MA', url: 'https://www.oleanarestaurant.com', image: '/media/about/restaurants/oleana.jpg' },
      { title: 'Gymkhana', by: 'London', url: 'https://gymkhanalondon.com', image: '/media/about/restaurants/gymkhana.jpg' },
      { title: 'Quintonil', by: 'Mexico City', url: 'https://quintonil.com', image: '/media/about/restaurants/quintonil.jpg' },
      { title: 'Francie', by: 'New York', url: 'https://www.franciebrooklyn.com', image: '/media/about/restaurants/francie.jpg' },
      { title: 'Luthun', by: 'New York', url: 'https://www.luthun.com', image: '/media/about/restaurants/luthun.jpg' },
    ],
  },
];
