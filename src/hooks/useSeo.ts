import { useEffect } from 'react';
import { SITE, routeMeta, type RouteMeta } from '@/lib/seo';

function setMeta(selector: string, attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = href;
}

/**
 * Keeps <title>, description, canonical and the Open Graph tags in sync with
 * the current route.
 *
 * The server injects the same tags into index.html before it goes out (see
 * backend/main.py) so link unfurlers and non-rendering crawlers get them
 * without executing JS. This hook covers what happens after: client-side
 * navigations, which never hit the server.
 */
export function useSeo(override: Partial<RouteMeta> = {}) {
  const { path: overridePath, title, description, type, image } = override;
  const path = overridePath ?? (typeof window !== 'undefined' ? window.location.pathname : '/');

  useEffect(() => {
    const base = routeMeta(path);
    const meta: RouteMeta = {
      ...base,
      path,
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      ...(type ? { type } : {}),
      ...(image ? { image } : {}),
    };
    const url = `${SITE.url}${meta.path === '/' ? '' : meta.path}`;
    const rawImage = meta.image ?? SITE.image;
    const imageUrl = rawImage.startsWith('http') ? rawImage : `${SITE.url}${rawImage}`;

    document.title = meta.title;
    setMeta('meta[name="description"]', 'name', 'description', meta.description);
    setCanonical(url);
    setMeta('meta[property="og:title"]', 'property', 'og:title', meta.title);
    setMeta('meta[property="og:description"]', 'property', 'og:description', meta.description);
    setMeta('meta[property="og:url"]', 'property', 'og:url', url);
    setMeta('meta[property="og:type"]', 'property', 'og:type', meta.type);
    setMeta('meta[property="og:image"]', 'property', 'og:image', imageUrl);
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', meta.title);
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', meta.description);
    setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', imageUrl);
  }, [path, title, description, type, image]);
}
