import type { SyntheticEvent } from 'react';

// Media on a page fades in once it has something to show, instead of
// popping in after the page itself has already faded in (a slow first
// visit). Pair with the .media-fade class in index.css: use as onLoad for
// images and onLoadedData for videos.
export function markLoaded(e: SyntheticEvent<HTMLElement>) {
  e.currentTarget.classList.add('is-loaded');
}
