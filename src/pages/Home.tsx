import { useRef, useCallback, useMemo, useState, useEffect, useLayoutEffect, startTransition } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTerrainAnimation } from '@/components/Dashboard/useTerrainAnimation';
import { PROJECTS } from '@/lib/projects';
import { getProject } from '@/lib/projects';
import { ART_PIECES, getArtPiece } from '@/lib/art';
import { useFetch } from '@/hooks/useAnalytics';
import { useMusicPlayer } from '@/hooks/useMusicPlayer';
import { api } from '@/lib/api';
import { filterTracks, formatDuration } from '@/lib/music';
import { prepareWithSegments, layoutWithLines, measureLineStats } from '@chenglou/pretext';
import { ExternalLink } from 'lucide-react';
import type { SpotifyNowPlaying } from '@/types/analytics';
import type { MusicChromeState } from '@/components/Dashboard/musicView';
import { CONTACT_MESSAGE_MAX, isContactFormValid, type ContactField, type ContactStatus, type ContactUIState } from '@/components/Dashboard/contactView';
import type { MenuEntryKey } from '@/components/Dashboard/useTerrainAnimation';
import SeoContent from '@/components/SeoContent';
import { useSeo } from '@/hooks/useSeo';
import { ArtMedia } from '@/components/LiveStream/ArtMedia';
import { KoiFishGallery, KoiInstall } from '@/components/KoiExtras';
import { LivestreamArticle } from '@/components/Art/LivestreamArticle';
import { LivestreamArtHero, LivestreamArtScrollRegion } from '@/components/LiveStream/LivestreamArtHero';
import { AiArchitectureArticle, AiArchitectureHero } from '@/components/Art/AiArchitectureArticle';
import { AboutArticle } from '@/components/About/AboutArticle';
import { AboutName } from '@/components/About/AboutName';
import { StreamCloutArticle, StreamCloutHero } from '@/components/Code/StreamCloutArticle';
import { AboutPortrait } from '@/components/About/AboutPortrait';
import { markLoaded } from '@/lib/fadeIn';

// 'feed' is the code list at /code and 'work-detail' a project under it; the
// internal names predate the rename. Old /feed and /work/* links redirect
// (see App.tsx and backend/main.py).
// Art pieces shown full screen under the header, with their write-up below.
const FULL_BLEED_ART = new Set(['livestream-art', 'koi-pond']);

type Page = 'home' | 'feed' | 'art' | 'music' | 'about' | 'work-detail' | 'art-detail';

function parseRoute(path: string): { page: Page; slug?: string } {
  if (path === '/code') return { page: 'feed' };
  if (path === '/art') return { page: 'art' };
  if (path === '/music') return { page: 'music' };
  if (path === '/about') return { page: 'about' };
  if (path.startsWith('/code/')) return { page: 'work-detail', slug: decodeURIComponent(path.slice('/code/'.length)) };
  if (path.startsWith('/art/')) return { page: 'art-detail', slug: decodeURIComponent(path.slice('/art/'.length)) };
  return { page: 'home' };
}

const monoFont = "'JetBrains Mono', 'Courier New', monospace";
const EXIT_FADE_MS = 450;

/** Pages drawn in the DOM over a melted-away canvas, rather than on the canvas. */
function isDetailPage(page: Page): boolean {
  return page === 'work-detail' || page === 'art-detail' || page === 'about';
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const coverCanvasRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  // Full-screen "+" menu overlay. React state drives the button's toggle and
  // the Esc handler; menuOpenRef mirrors it for the canvas draw loop (rAF
  // reads .current every frame — a plain boolean ref sync in render is fine
  // here, unlike the getter-refs elsewhere that guard against stale closures
  // over objects replaced wholesale outside React's render cycle).
  const [menuOpen, setMenuOpen] = useState(false);
  const menuOpenRef = useRef(false);
  menuOpenRef.current = menuOpen;
  // Set right before closing the menu: true for W/+ (animated close-to-landing
  // crossfade), false for Esc (instant restore, unchanged). Read once by the
  // canvas draw loop on the open->closed edge.
  const menuCloseToHomeRef = useRef(false);
  // Set right before a menu entry navigates to a content page (portfolio /
  // music): the draw loop dissolves the menu words over the incoming page
  // instead of dropping them instantly. Consumed (reset) by the draw loop.
  const menuCloseToContentRef = useRef(false);
  // Keeps the canvas above a detail page for the length of the menu's close
  // crossfade (900ms in useTerrainAnimation), so the words and terrain veil
  // back off the page instead of dropping behind it in one frame.
  const [menuVeil, setMenuVeil] = useState(false);
  // Set when a menu entry opens About from a non-detail page: the menu stays
  // up, untouched, while the black veil comes down over it, then closes
  // instantly behind the veil as the route lands (the entry-fade timer).
  const menuCloseBehindVeilRef = useRef(false);
  // + on a detail page fades the page to black first, the way W does, and
  // only then opens the menu over it. The page stays faded while the menu
  // is up and comes back as the menu closes.
  const [menuPageFade, setMenuPageFade] = useState(false);
  const menuFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelMenuFade = useCallback(() => {
    if (menuFadeTimerRef.current) clearTimeout(menuFadeTimerRef.current);
    menuFadeTimerRef.current = null;
  }, []);
  useEffect(() => {
    if (!menuOpen) setMenuPageFade(false);
  }, [menuOpen]);
  useEffect(() => {
    if (!menuVeil) return;
    const id = setTimeout(() => setMenuVeil(false), 1000);
    return () => clearTimeout(id);
  }, [menuVeil]);
  // Set when a menu entry navigates: the menu's terrain already covers the
  // page being left, so a detail page drops at once instead of reverse-melting.
  const menuNavRef = useRef(false);

  // Canvas-native contact mode — built into the terrain like the "+" menu
  // above (contactOpenRef mirrors contactOpen the same way menuOpenRef
  // mirrors menuOpen; contactCloseToHomeRef mirrors menuCloseToHomeRef).
  const [contactOpen, setContactOpen] = useState(false);
  const contactOpenRef = useRef(false);
  contactOpenRef.current = contactOpen;
  const contactCloseToHomeRef = useRef(false);

  const route = parseRoute(location.pathname);
  // A route change (back button, W) drops a menu-open fade still pending.
  useEffect(() => {
    cancelMenuFade();
    if (!menuOpenRef.current) setMenuPageFade(false);
  }, [location.pathname, cancelMenuFade]);

  // Leaving a detail page (W, back) for anywhere but the work list: hold the
  // detail page for EXIT_FADE_MS while its media fades to black, then let
  // the route through, so the background comes in from black instead of the
  // videos snapping away. The work list keeps its own melt; the menu and
  // contact screens already cover the page they leave.
  const [lastPath, setLastPath] = useState(location.pathname);
  const [exitingFrom, setExitingFrom] = useState<{ page: Page; slug?: string } | null>(null);
  // Set as the hold ends: the page left is already black, so the next page
  // change must not melt it back in (the layout effect below consumes it).
  const exitFadedRef = useRef(false);
  // Opening an item from the code or art list runs the same fade the other
  // way: a black veil dims the list out while the route is held, then lifts
  // off the detail page. The canvas skips its melt (instantDetailRef).
  const [enteringFrom, setEnteringFrom] = useState<{ page: Page; slug?: string } | null>(null);
  const [veilDown, setVeilDown] = useState(false);
  const instantDetailRef = useRef(false);
  // Set with instantDetailRef: the page opening behind the veil is music, so
  // the canvas may take the instant open once the music tiles are up. Leaving
  // music the tiles are the old page and must not take it.
  const instantToMusicRef = useRef(false);
  // This render must already use the held page: the state set below only
  // lands on the re-render, and this pass still writes refs the canvas reads
  // (contentOpenRef, scrollTargetRef). Coming from the landing, a pass that
  // saw the new route would open the content and start the melt above the
  // veil.
  let exitingNow = exitingFrom;
  let enteringNow = enteringFrom;
  if (location.pathname !== lastPath) {
    const prev = parseRoute(lastPath);
    setLastPath(location.pathname);
    const leavingDetail = isDetailPage(prev.page) && !isDetailPage(route.page) && route.page !== 'feed';
    // W closes an open menu or contact screen in the same commit as the
    // navigation; the close-to-home refs say one was covering the page.
    const covered = menuNavRef.current || menuOpen || contactOpen ||
      menuCloseToHomeRef.current || contactCloseToHomeRef.current;
    // Music is drawn on the canvas, but leaves for the landing the same way:
    // held under a black veil (below) until it is dark.
    const leavingMusic = prev.page === 'music' && route.page === 'home';
    exitingNow = (leavingDetail || leavingMusic) && !covered ? prev : null;
    setExitingFrom(exitingNow);
    // About gets the same fade from anywhere that isn't another detail page,
    // and About and music get it from the menu over any page: the menu stays
    // up under the veil and closes once the screen is black (see
    // handleMenuSelect).
    const enteringDetail = ((prev.page === 'feed' || prev.page === 'art') &&
      (route.page === 'work-detail' || route.page === 'art-detail') && !covered) ||
      (route.page === 'about' && !isDetailPage(prev.page)) ||
      ((route.page === 'about' || route.page === 'music') && menuCloseBehindVeilRef.current);
    enteringNow = enteringDetail ? prev : null;
    setEnteringFrom(enteringNow);
    setVeilDown(enteringDetail);
  }
  useEffect(() => {
    if (!exitingFrom) return;
    const timer = setTimeout(() => {
      exitFadedRef.current = true;
      setExitingFrom(null);
    }, EXIT_FADE_MS);
    return () => clearTimeout(timer);
  }, [exitingFrom]);
  const routePage = route.page;
  useEffect(() => {
    if (!enteringFrom) return;
    const toMusic = routePage === 'music';
    const timer = setTimeout(() => {
      instantDetailRef.current = true;
      instantToMusicRef.current = toMusic;
      // Open the content now rather than at the commit: from the landing the
      // draw loop would otherwise see a closed page for a frame and drop
      // instantDetailRef before the route lands.
      contentOpenRef.current = true;
      // The page left kept its own header position under the veil; jump to
      // the incoming page's now, while the screen is black.
      scrollProgressRef.current = 1;
      scrollTargetRef.current = 1;
      if (menuCloseBehindVeilRef.current) {
        menuCloseBehindVeilRef.current = false;
        menuCloseToContentRef.current = false;
        setMenuOpen(false);
        setContactOpen(false);
      }
      setEnteringFrom(null);
      setVeilDown(false);
    }, EXIT_FADE_MS);
    return () => clearTimeout(timer);
  }, [enteringFrom, routePage]);
  const { page, slug } = exitingNow ?? enteringNow ?? route;

  // Canvas draws everything a human sees; this keeps the document head in sync
  // for anything that reads the page instead of looking at it.
  useSeo({ path: location.pathname });

  const isContent = page !== 'home';
  const liveArtRef = useRef(false);
  // A page with a full-screen hero under the header (Livestream Art,
  // StreamClout): the header canvas stays drawn over it so W and + show.
  liveArtRef.current = (page === 'art-detail' && FULL_BLEED_ART.has(slug ?? ''))
    || (page === 'work-detail' && slug === 'streamclout');
  const domPageRef = useRef(false);
  domPageRef.current = isDetailPage(page);
  // Music is drawn on the canvas, so once its + fade has gone black under
  // the veil it is hidden there as well: the menu then comes in over black
  // rather than over the tiles.
  const pageHiddenRef = useRef(false);
  pageHiddenRef.current = menuPageFade && menuOpen && page === 'music';
  const musicFade = page === 'music' && (exitingFrom?.page === 'music' || menuPageFade);

  // Delay contentOpen going false until feed content has faded out
  const contentOpenRef = useRef(isContent);
  if (isContent) contentOpenRef.current = true;

  const activeLabelRef = useRef<string | null>(isContent ? 'feed' : null);
  activeLabelRef.current = isContent ? 'feed' : null;

  const scrollTargetRef = useRef(page === 'home' ? 0 : 1);
  scrollTargetRef.current = page === 'home' ? 0 : 1;

  const scrollProgressRef = useRef(page === 'home' ? 0 : 1);
  const meltCompleteRef = useRef(page !== 'home');
  const meltProgressRef = useRef(page !== 'home' ? 1 : 0);
  const detailToFeedRef = useRef(false);

  // Track feed closing animation
  // While a card page (feed/music) closes back to home, remember WHICH page
  // is closing so its items keep rendering through the fade — falling back to
  // the feed's items mid-close flashed a portfolio list when leaving /music.
  const [feedClosing, setFeedClosing] = useState<null | 'feed' | 'art' | 'music'>(null);


  // Form fields + UI state. Plain useState is the source of truth (so the
  // hidden <input>/<textarea> below stay normal controlled elements); each
  // field also gets a ref kept in sync every render, and contactUIRef wraps
  // those refs in getters (same "stale-snapshot rule" as nowPlayingRef
  // above) so the rAF canvas draw loop always reads the live values rather
  // than a value captured whenever contactUIRef itself was last created.
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactActiveField, setContactActiveField] = useState<ContactField | null>(null);
  const [contactStatus, setContactStatus] = useState<ContactStatus>('idle');

  const contactNameRef = useRef(contactName); contactNameRef.current = contactName;
  const contactEmailRef = useRef(contactEmail); contactEmailRef.current = contactEmail;
  const contactMessageRef = useRef(contactMessage); contactMessageRef.current = contactMessage;
  const contactActiveFieldRef = useRef(contactActiveField); contactActiveFieldRef.current = contactActiveField;
  const contactStatusRef = useRef(contactStatus); contactStatusRef.current = contactStatus;

  const contactUIRef = useMemo(() => ({
    get current(): ContactUIState {
      return {
        name: contactNameRef.current,
        email: contactEmailRef.current,
        message: contactMessageRef.current,
        activeField: contactActiveFieldRef.current,
        status: contactStatusRef.current,
      };
    },
  }), []) as React.RefObject<ContactUIState | null>;

  const contactNameInputRef = useRef<HTMLInputElement>(null);
  const contactEmailInputRef = useRef<HTMLInputElement>(null);
  const contactMessageInputRef = useRef<HTMLTextAreaElement>(null);

  const focusContactField = useCallback((field: ContactField) => {
    setContactActiveField(field);
    const el = field === 'name' ? contactNameInputRef.current : field === 'email' ? contactEmailInputRef.current : contactMessageInputRef.current;
    el?.focus();
  }, []);

  // No auto-focus on open: the caret only appears once a field is actually
  // selected (click/tap or Tab). Reset the selection each time the form
  // opens so a previous session's active field doesn't blink on arrival.
  useEffect(() => {
    if (contactOpen) setContactActiveField(null);
  }, [contactOpen]);

  const handleSendContact = useCallback(async () => {
    if (contactStatusRef.current === 'sending') return;
    const snapshot = { name: contactNameRef.current, email: contactEmailRef.current, message: contactMessageRef.current };
    if (!isContactFormValid(snapshot)) return;
    setContactStatus('sending');
    try {
      const body = new FormData();
      body.append('name', snapshot.name);
      body.append('email', snapshot.email);
      body.append('message', snapshot.message);
      // Same Formspree endpoint/method/headers ContactForm.tsx used.
      const response = await fetch('https://formspree.io/f/xdkyngrb', {
        method: 'POST',
        body,
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to send message');
      setContactName('');
      setContactEmail('');
      setContactMessage('');
      setContactStatus('sent');
    } catch {
      setContactStatus('error');
    }
  }, []);

  const handleContactControl = useCallback((action: string) => {
    if (action === 'send') { handleSendContact(); return; }
    if (action.startsWith('field:')) {
      focusContactField(action.slice('field:'.length) as ContactField);
    }
  }, [handleSendContact, focusContactField]);

  // Track detail→feed fade-out: keep old detail overlay mounted during transition
  const prevPageRef = useRef(page);
  const prevSlugRef = useRef(slug);
  const [fadingDetail, setFadingDetail] = useState<{ page: 'work-detail' | 'art-detail' | 'about'; slug: string } | null>(null);

  // Detect page transitions in useLayoutEffect (not during render) to avoid
  // StrictMode double-render discarding the setState-during-render call.
  // useLayoutEffect fires synchronously after commit, before paint.
  useLayoutEffect(() => {
    const prev = prevPageRef.current;
    const prevSlug = prevSlugRef.current;
    prevPageRef.current = page;
    prevSlugRef.current = slug;

    if (prev === page) return;
    if (exitFadedRef.current) {
      exitFadedRef.current = false;
      menuNavRef.current = false;
      return;
    }
    const viaMenu = menuNavRef.current;
    menuNavRef.current = false;

    if ((prev === 'feed' || prev === 'art' || prev === 'music') && page === 'home') {
      setFeedClosing(prev);
    }
    if ((prev === 'feed' || prev === 'art' || prev === 'music') && isDetailPage(page)) {
      meltCompleteRef.current = false;
    }
    if ((prev === 'work-detail' || prev === 'art-detail' || prev === 'about') && (page === 'feed' || page === 'art' || page === 'music') && !viaMenu) {
      detailToFeedRef.current = true;
      meltProgressRef.current = 0;
      setFadingDetail({ page: prev, slug: prevSlug ?? '' });
    }
  }, [page, slug]);

  useEffect(() => {
    if (feedClosing) {
      // Set immediately — no delay needed since FeedOverlay HTML is gone
      contentOpenRef.current = false;
      const unmountTimer = setTimeout(() => setFeedClosing(null), 800);
      return () => { clearTimeout(unmountTimer); };
    }
    if (!isContent) {
      contentOpenRef.current = false;
    }
  }, [feedClosing, isContent]);

  const isCardPage = page === 'feed' || page === 'art' || page === 'music';
  const showFeed = isCardPage || feedClosing !== null;
  // The card page whose items should render right now: the live page, or the
  // one animating closed. Drives both the items memo and music-mode gating.
  const cardPage = isCardPage ? page : feedClosing;
  activeLabelRef.current = cardPage === 'art' ? 'art' : isContent ? 'feed' : null;

  // Now-playing: fetch Spotify state and expose via ref for terrain canvas.
  // Local playback (below) owns the landing-style box on /music instead.
  const spotifyNPRef = useRef<{ track: string; artist: string; isPlaying: boolean; playedAt?: string } | null>(null);
  useEffect(() => {
    const fetchNP = () => {
      if (document.visibilityState === 'hidden') return;
      api.getSpotifyNowPlaying().then((d: SpotifyNowPlaying) => {
        spotifyNPRef.current = d.track ? { track: d.track, artist: d.artist, isPlaying: d.is_playing, playedAt: d.played_at } : null;
      }).catch(() => {});
    };
    fetchNP();
    const id = setInterval(fetchNP, 30_000);
    const onVisible = () => { if (document.visibilityState === 'visible') fetchNP(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  const { data: blogData } = useFetch(() => api.getBlogPosts());

  const [musicQuery, setMusicQuery] = useState('');
  const { data: musicCatalog, error: musicError } = useFetch(() => api.getMusicCatalog());
  const musicTracks = useMemo(
    () => filterTracks(musicCatalog?.tracks ?? [], musicQuery),
    [musicCatalog, musicQuery],
  );
  // Library play tracking: every track start records a play server-side; the
  // 30-day total renders as a stat in the /music intro panel. Ref-backed (not
  // state) because only the rAF canvas draw reads it.
  const plays30dRef = useRef<number | null>(null);
  useEffect(() => {
    api.getMusicPlayStats()
      .then((s) => { plays30dRef.current = s.plays_30d; })
      .catch(() => {});
  }, []);
  const handleTrackPlay = useCallback((trackId: string) => {
    api.recordMusicPlay(trackId)
      .then((s) => { plays30dRef.current = s.plays_30d; })
      .catch(() => {});
  }, []);
  const player = useMusicPlayer(musicCatalog?.tracks ?? [], handleTrackPlay);

  // Local playback owns the landing-style now-playing box on /music; Spotify
  // owns it elsewhere. This is a getter-style ref (not a snapshot object) so
  // the rAF draw loop always reads whichever source is live at access time —
  // a plain object captured at render time would go stale the moment
  // startCurrent() replaces player.uiRef.current wholesale without triggering
  // a React re-render.
  const localPlayerRef = player.uiRef;
  // One global now-playing source, page-independent (the canvas decides where
  // the box shows). Priority: whichever source is actively playing (library
  // wins a tie — it's this site's own player), else whichever played more
  // recently, so a library track outranks stale Spotify history as the
  // "last listened to" entry.
  const nowPlayingRef = useMemo(() => ({
    get current() {
      const local = localPlayerRef.current;
      const spot = spotifyNPRef.current;
      const localEntry = local
        ? {
            track: local.title,
            artist: local.artist,
            isPlaying: local.isPlaying,
            playedAt: new Date(local.startedAt).toISOString(),
          }
        : null;
      if (localEntry?.isPlaying) return localEntry;
      if (spot?.isPlaying) return spot;
      if (localEntry && spot) {
        const localTime = Date.parse(localEntry.playedAt);
        const spotTime = spot.playedAt ? Date.parse(spot.playedAt) : 0;
        return localTime >= spotTime ? localEntry : spot;
      }
      return localEntry ?? spot;
    },
  }), [localPlayerRef]) as React.RefObject<{ track: string; artist: string; isPlaying: boolean; playedAt?: string } | null>;

  const searchInputRef = useRef<HTMLInputElement>(null);
  const musicUIRef = useRef<MusicChromeState | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);

  // Keep the ref in sync every render (player UI flows through by reference so
  // canvas sees live progress). playingTrackId/playingIsPlaying are getters
  // (not snapshotted values) so the rAF draw loop always reads whichever
  // track is live at access time — player.uiRef.current is replaced wholesale
  // by startCurrent() without triggering a React re-render, so a plain field
  // captured here would go stale immediately (same reasoning as localPlayerRef above).
  musicUIRef.current = cardPage === 'music'
    ? {
        query: musicQuery,
        focused: searchFocused,
        caretOn: true,
        get playingTrackId() { return player.uiRef.current?.trackId ?? null; },
        get playingIsPlaying() { return player.uiRef.current?.isPlaying ?? false; },
        get plays30d() { return plays30dRef.current; },
      }
    : null;

  const contentSubItemsRef = useRef<{ text: string; url: string; description?: string; mau?: string; category?: string; icon?: string; artist?: string; hasArt?: boolean }[]>([]);

  const feedSubItems = useMemo(() => {
    if (!showFeed) return [];

    if (cardPage === 'music') {
      if (musicError && !musicCatalog) {
        return [{
          text: 'CATALOG UNAVAILABLE',
          url: 'music:none',
          description: 'COULD NOT LOAD MUSIC LIBRARY',
          icon: '!!!',
        }];
      }
      const tracks = musicTracks;
      const radioCard = {
        text: '> RADIO',
        url: 'music:radio',
        description: `SHUFFLE ALL ${musicCatalog?.tracks.length ?? 0} TRACKS`,
        icon: '((o',
      };
      const trackItems = tracks.map((t) => ({
        text: t.title,
        url: `music:${t.id}`,
        description: formatDuration(t.duration_s),
        icon: '.))',
        // Catalog fields may be missing until the M1 refresh op has run against
        // the live library — treat undefined as "no artist" / "no art" rather
        // than crashing or showing "undefined".
        artist: t.artist ?? '',
        hasArt: t.has_art ?? false,
      }));
      return [radioCard, ...trackItems];
    }

    const projectIcons: Record<string, string> = {
      coderview: '[#]',
      streamclout: '[~]',
    };
    const projectDescs: Record<string, string> = {
      streamclout: '40T+ SPOTIFY STREAMS',
    };
    const workItems = PROJECTS.map((p) => ({
      text: p.name, url: `/code/${p.slug}`,
      description: projectDescs[p.slug] ?? p.description,
      icon: projectIcons[p.slug] ?? '</>',
    }));

    const artIcons: Record<string, string> = {
      'ai-architecture': '{*}',
      'livestream-art': '[o]',
      'koi-pond': '><>',
    };
    const artDescs: Record<string, string> = {
      'ai-architecture': 'GENERATIVE AI VIDEOS',
      'livestream-art': 'COMPUTER VISION VIDEOS',
      'koi-pond': 'LIVE PIXEL ART',
    };
    const artItems = ART_PIECES.map((a) => ({
      text: a.name, url: `/art/${a.slug}`,
      description: artDescs[a.slug] ?? a.description,
      icon: artIcons[a.slug] ?? '(~)',
    }));

    if (cardPage === 'art') return artItems;

    const blogItems = (blogData?.posts ?? []).map((b) => ({
      text: b.title.toUpperCase(), url: `/blog/${b.slug}`,
      description: b.description.toUpperCase(),
      icon: '>>>',
    }));

    // MUSIC and art cards stay off the work feed — the full-screen "+" menu
    // covers navigation to /music and /art (see MENU_ENTRIES in
    // useTerrainAnimation.ts).
    return [workItems[1], workItems[0], ...blogItems].filter(Boolean);
  }, [showFeed, cardPage, blogData, musicCatalog, musicError, musicTracks]);

  contentSubItemsRef.current = feedSubItems;

  // React Router commits navigations inside startTransition. Overlay state
  // that changes together with a navigation goes in a transition too, so
  // both land in the same commit — otherwise the menu closes a frame early
  // and the page being left flashes under it.
  const handleLogoClick = useCallback(() => {
    cancelMenuFade();
    startTransition(() => {
      if (menuOpen) {
        menuCloseToHomeRef.current = true;
        setMenuOpen(false);
      }
      // W always goes home, animated — closes contact mode the same way it
      // closes the menu, regardless of whether the menu was open over it.
      if (contactOpen) {
        contactCloseToHomeRef.current = true;
        setContactOpen(false);
      }
    });
    navigate('/');
  }, [navigate, menuOpen, contactOpen, cancelMenuFade]);
  const handleNameClick = useCallback(() => navigate('/about'), [navigate]);
  const handleMenuClick = useCallback(() => {
    if (menuOpen) {
      if (page === 'home') {
        menuCloseToHomeRef.current = true;
        startTransition(() => setMenuOpen(false));
        navigate('/');
      } else {
        // Close back to the page the menu was opened over (portfolio/music/
        // detail): stay on the route and dissolve the menu words over the
        // live content instead of navigating to the landing.
        menuCloseToContentRef.current = true;
        setMenuOpen(false);
        if (isDetailPage(page)) setMenuVeil(true);
      }
    } else if ((isDetailPage(page) || page === 'music') && !contactOpen) {
      // A detail page (or music) fades to black first, like leaving it with
      // W, then the menu comes in over the black.
      if (menuFadeTimerRef.current) return;
      setMenuPageFade(true);
      menuFadeTimerRef.current = setTimeout(() => {
        menuFadeTimerRef.current = null;
        setMenuOpen(true);
      }, EXIT_FADE_MS);
    } else {
      // Opens over contact mode without closing it — contact stays open
      // underneath until Esc or W (handleLogoClick above) closes it.
      setMenuOpen(true);
    }
  }, [menuOpen, navigate, page, contactOpen]);
  const handleMenuSelect = useCallback((entry: MenuEntryKey) => {
    menuCloseToHomeRef.current = false;
    contactCloseToHomeRef.current = false;
    // Snap the name-dissolve scroll to its end state so the WORTHY RAE
    // name never flashes between the menu words and the page content —
    // the route's scroll target is 1 anyway; only the slow lerp from 0
    // made the name reappear mid-transition. menuCloseToContentRef makes
    // the menu words scatter-dissolve over the incoming page instead of
    // vanishing instantly (consumed by the draw loop's close edge).
    const target: Page = entry === 'code' ? 'feed' : entry;
    // About and music fade in through the black veil like an item opened
    // from a list: leave the menu exactly as it is and let the veil darken it; it
    // closes behind the veil when the route lands. Already on About there
    // is no route change, so hold the page under the veil directly.
    if (target === 'about' || target === 'music') {
      menuNavRef.current = page !== target;
      menuCloseBehindVeilRef.current = true;
      if (page === target) {
        setEnteringFrom({ page: target });
        setVeilDown(true);
      } else {
        navigate(`/${entry}`);
      }
      return;
    }
    menuCloseToContentRef.current = true;
    // Only consumed by the layout effect when the page actually changes.
    menuNavRef.current = target !== page;
    // The target too: until React commits the route, the draw loop would
    // otherwise keep easing the scroll back toward the landing's 0 and
    // let the name re-form under the closing menu.
    scrollProgressRef.current = 1;
    scrollTargetRef.current = 1;
    startTransition(() => {
      setMenuOpen(false);
      setContactOpen(false);
      // About is a DOM page: keep the canvas above it while the menu
      // words dissolve off it, as when closing the menu over a detail page.
      if (isDetailPage(target)) setMenuVeil(true);
    });
    navigate(`/${entry}`);
  }, [navigate, page]);
  const handleItemClick = useCallback(
    (url: string) => {
      if (url === 'music:radio') { player.playShuffled(); return; }
      if (url.startsWith('music:')) {
        const id = url.slice('music:'.length);
        const catalogIdx = (musicCatalog?.tracks ?? []).findIndex((t) => t.id === id);
        if (catalogIdx >= 0) player.playAt(catalogIdx);
        return;
      }
      navigate(url);
    },
    [navigate, player, musicCatalog],
  );

  const handleMusicControl = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);

  const config = useMemo(
    () => ({
      liveArtRef,
      onLogoClick: handleLogoClick,
      onNameClick: handleNameClick,
      onMenuClick: handleMenuClick,
      onSubItemClick: handleItemClick,
      menuOpenRef,
      menuCloseToHomeRef,
      menuCloseToContentRef,
      onMenuSelect: handleMenuSelect,
      contentOpenRef,
      activeLabelRef,
      scrollTargetRef,
      contentSubItemsRef,
      meltCompleteRef,
      meltProgressRef,
      detailToFeedRef,
      instantDetailRef,
      instantToMusicRef,
      domPageRef,
      pageHiddenRef,
      nowPlayingRef,
      coverCanvasRef,
      musicUIRef,
      onMusicControl: handleMusicControl,
      contactOpenRef,
      contactCloseToHomeRef,
      contactUIRef,
      onContactControl: handleContactControl,
    }),
    [handleLogoClick, handleNameClick, handleMenuClick, handleMenuSelect, handleItemClick, handleMusicControl, nowPlayingRef, contactUIRef, handleContactControl],
  );

  useTerrainAnimation(canvasRef, scrollProgressRef, config);

  // Clear the query when leaving /music. No desktop auto-focus of the hidden
  // input — typing reaches search via the global keydown handler below; the
  // hidden input stays mounted purely to summon the mobile keyboard when the
  // search row is tapped.
  useEffect(() => {
    if (page !== 'music') setMusicQuery('');
  }, [page]);

  // Global keyboard transport + typing fallback: any canvas click blurs the
  // hidden search input, after which typing would otherwise go nowhere.
  // While on /music, space/arrow keys drive playback and printable
  // keys / Backspace / Escape route into the query, whenever the hidden
  // input isn't the focused element.
  useEffect(() => {
    if (page !== 'music') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (menuOpen) return; // menu-close Esc (below) wins while the menu is open
      if (contactOpen) return; // contact mode takes priority; no music transport while typing
      if (document.activeElement === searchInputRef.current) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === ' ' && player.uiRef.current !== null) {
        player.toggle();
        e.preventDefault();
        return;
      }
      if (e.key === 'ArrowLeft') {
        player.prev();
        e.preventDefault();
        return;
      }
      if (e.key === 'ArrowRight') {
        player.next();
        e.preventDefault();
        return;
      }
      if (e.key.length === 1) {
        setMusicQuery((q) => q + e.key);
        e.preventDefault();
      } else if (e.key === 'Backspace') {
        setMusicQuery((q) => q.slice(0, -1));
        e.preventDefault();
      } else if (e.key === 'Escape') {
        setMusicQuery('');
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [page, player, menuOpen, contactOpen]);

  // Esc closes the full-screen menu. Capture phase + stopPropagation so it
  // wins over the /music search Esc handler above (both listen on window;
  // capture fires first and stops the bubble-phase listener from also running).
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        menuCloseToHomeRef.current = false;
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [menuOpen]);

  // Esc closes contact mode instantly (no crossfade — matches menu-Esc's
  // instant restore). Yields to the menu's own Esc handler above when both
  // are open (menu takes priority, same as the render/hitTest priority in
  // useTerrainAnimation.ts).
  useEffect(() => {
    if (!contactOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (menuOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        contactCloseToHomeRef.current = false;
        setContactOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [contactOpen, menuOpen]);

  // Tab / Shift-Tab cycles the active contact field while contact mode is open.
  useEffect(() => {
    if (!contactOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (menuOpen) return;
      if (e.key !== 'Tab') return;
      e.preventDefault();
      const order: ContactField[] = ['name', 'email', 'message'];
      const cur = contactActiveFieldRef.current;
      // Nothing selected yet: Tab enters the form at the first field,
      // Shift-Tab at the last.
      if (cur === null) { focusContactField(e.shiftKey ? 'message' : 'name'); return; }
      const idx = order.indexOf(cur);
      const next = e.shiftKey ? (idx - 1 + order.length) % order.length : (idx + 1) % order.length;
      focusContactField(order[next]);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [contactOpen, menuOpen, focusContactField]);

  // Detail page data (active or fading-out)
  const project = page === 'work-detail' && slug ? getProject(slug) : null;
  const artPiece = page === 'art-detail' && slug ? getArtPiece(slug) : null;
  const fadingProject = fadingDetail?.page === 'work-detail' ? getProject(fadingDetail.slug) : null;
  const fadingArtPiece = fadingDetail?.page === 'art-detail' ? getArtPiece(fadingDetail.slug) : null;

  const showWork = page === 'work-detail' || fadingDetail?.page === 'work-detail';
  const showArt = page === 'art-detail' || fadingDetail?.page === 'art-detail';
  const displayProject = project || fadingProject;
  const displayArtPiece = artPiece || fadingArtPiece;
  const isFadingOut = !!fadingDetail && page !== fadingDetail.page;
  const showAbout = page === 'about' || fadingDetail?.page === 'about';
  const handleFadeComplete = useCallback(() => setFadingDetail(null), []);
  // The entry veil sits above the canvas, so a menu still open over the page
  // being left darkens with it and keeps covering that page until it is black.
  const canvasOverPage = menuOpen || contactOpen || menuVeil;

  return (
    <div>
      <SeoContent page={page} />

      {/* z-25 while the menu or contact mode is open (and through the menu's
          close back onto a detail page): both draw on this canvas and must
          sit above DetailOverlay (z-10) and the melt cover canvas (z-20) so
          they're visible over detail pages too. */}
      <canvas ref={canvasRef} className="fixed inset-0 w-full h-full" style={{ zIndex: canvasOverPage ? 25 : liveArtRef.current ? 15 : 0, clipPath: liveArtRef.current && !canvasOverPage ? 'inset(0 0 calc(100% - 100px) 0)' : undefined }} />

      {page === 'music' && (
        <input
          ref={searchInputRef}
          value={musicQuery}
          onChange={(e) => setMusicQuery(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          onKeyDown={(e) => { if (e.key === 'Escape') { setMusicQuery(''); e.currentTarget.blur(); } }}
          aria-label="Search tracks"
          autoCapitalize="off"
          autoCorrect="off"
          style={{ position: 'fixed', top: 0, left: 0, width: 1, height: 1, opacity: 0, border: 'none', padding: 0, zIndex: 5, fontSize: 16 }}
        />
      )}

      {/* Hidden inputs backing the canvas-native contact fields (same
          "invisible input summons the OS keyboard" technique as the /music
          search input above). Controlled by React state; the canvas reads
          the live values via contactUIRef and draws them as legible opaque
          strips over the terrain — see contactView.ts / useTerrainAnimation.ts. */}
      {contactOpen && (
        <>
          <input
            ref={contactNameInputRef}
            value={contactName}
            onChange={(e) => { setContactName(e.target.value); if (contactStatus !== 'idle') setContactStatus('idle'); }}
            onFocus={() => setContactActiveField('name')}
            onBlur={() => setContactActiveField(null)}
            aria-label="Your name"
            autoCapitalize="off"
            autoCorrect="off"
            style={{ position: 'fixed', top: 0, left: 0, width: 1, height: 1, opacity: 0, border: 'none', padding: 0, zIndex: 5, fontSize: 16 }}
          />
          <input
            ref={contactEmailInputRef}
            type="email"
            value={contactEmail}
            onChange={(e) => { setContactEmail(e.target.value); if (contactStatus !== 'idle') setContactStatus('idle'); }}
            onFocus={() => setContactActiveField('email')}
            onBlur={() => setContactActiveField(null)}
            aria-label="Your email"
            autoCapitalize="off"
            autoCorrect="off"
            style={{ position: 'fixed', top: 0, left: 0, width: 1, height: 1, opacity: 0, border: 'none', padding: 0, zIndex: 5, fontSize: 16 }}
          />
          <textarea
            ref={contactMessageInputRef}
            value={contactMessage}
            onChange={(e) => { setContactMessage(e.target.value); if (contactStatus !== 'idle') setContactStatus('idle'); }}
            onFocus={() => setContactActiveField('message')}
            onBlur={() => setContactActiveField(null)}
            aria-label="Your message"
            maxLength={CONTACT_MESSAGE_MAX}
            style={{ position: 'fixed', top: 0, left: 0, width: 1, height: 1, opacity: 0, border: 'none', padding: 0, zIndex: 5, fontSize: 16 }}
          />
        </>
      )}

      {showWork && displayProject && (
        <DetailOverlay fullBleed={displayProject.slug === 'streamclout'} meltProgressRef={meltProgressRef} fadeOut={isFadingOut} exitFade={!!exitingFrom || menuPageFade} onFadeComplete={handleFadeComplete}>
          {displayProject.slug === 'streamclout' && <StreamCloutHero />}
          <div className={`flex items-start justify-between gap-4 ${displayProject.slug === 'streamclout' ? 'mt-16' : ''}`}>
            <div className="text-left">
              <h1
                className="text-2xl md:text-3xl uppercase tracking-wider text-white font-normal"
                style={{ fontFamily: monoFont }}
              >
                {displayProject.name}
              </h1>
              <div
                className="text-xs md:text-sm uppercase tracking-wider mt-1 text-white/30"
                style={{ fontFamily: monoFont }}
              >
                {displayProject.description}
              </div>
            </div>
            <a
              href={displayProject.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 shrink-0 mt-1 px-3 py-1.5 text-xs uppercase tracking-wider text-white/50 hover:text-white/90 border border-white/20 hover:border-white/50 transition-colors"
              style={{ fontFamily: monoFont }}
            >
              <ExternalLink size={12} />
              View
            </a>
          </div>
          {displayProject.slug === 'streamclout' ? (
            <StreamCloutArticle summary={displayProject.summary} tech={displayProject.tech} />
          ) : (
            <>
              <div className="mt-8">
                <MediaBlock videoUrl={displayProject.videoUrl} posterUrl={displayProject.posterUrl} imageUrl={displayProject.imageUrl} />
              </div>
              <div
                className="text-xs tracking-[0.3em] uppercase mt-10 mb-3 opacity-40 text-left"
                style={{ fontFamily: monoFont }}
              >
                SUMMARY
              </div>
              <PretextSummary text={displayProject.summary} />
              <div
                className="text-xs tracking-[0.3em] uppercase mt-10 mb-3 opacity-40 text-left"
                style={{ fontFamily: monoFont }}
              >
                TOOLS
              </div>
              <TechTags tags={displayProject.tech} />
            </>
          )}
          <ProjectAnalyticsSection slug={displayProject.slug} />
        </DetailOverlay>
      )}

      {showAbout && (
        <DetailOverlay meltProgressRef={meltProgressRef} fadeOut={isFadingOut} exitFade={!!exitingFrom || menuPageFade} onFadeComplete={handleFadeComplete}>
          <AboutPortrait />
          <AboutName fontFamily={monoFont} />
          <AboutArticle />
        </DetailOverlay>
      )}

      {showArt && displayArtPiece && (
        <DetailOverlay fullBleed={FULL_BLEED_ART.has(displayArtPiece.slug)} meltProgressRef={meltProgressRef} fadeOut={isFadingOut} exitFade={!!exitingFrom || menuPageFade} onFadeComplete={handleFadeComplete}>
          {FULL_BLEED_ART.has(displayArtPiece.slug) && (
            <LivestreamArtHero piece={displayArtPiece} />
          )}
          <LivestreamArtScrollRegion active={FULL_BLEED_ART.has(displayArtPiece.slug)}>
            {displayArtPiece.slug === 'ai-architecture' && <AiArchitectureHero />}
            <div className={`flex items-start justify-between gap-4 ${
              FULL_BLEED_ART.has(displayArtPiece.slug) ? 'mt-16' : ''
            }`}>
              <div className="text-left">
                <h1
                  className="text-2xl md:text-3xl uppercase tracking-wider text-white font-normal"
                  style={{ fontFamily: monoFont }}
                >
                  {displayArtPiece.name}
                </h1>
                <div
                  className="text-xs md:text-sm uppercase tracking-wider mt-1 text-white/30"
                  style={{ fontFamily: monoFont }}
                >
                  {displayArtPiece.description}
                </div>
              </div>
              {displayArtPiece.githubUrl && (
                <a
                  href={displayArtPiece.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 shrink-0 mt-1 px-3 py-1.5 text-xs uppercase tracking-wider text-white/50 hover:text-white/90 border border-white/20 hover:border-white/50 transition-colors"
                  style={{ fontFamily: monoFont }}
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" /></svg>
                  View
                </a>
              )}
            </div>
            {!FULL_BLEED_ART.has(displayArtPiece.slug) && displayArtPiece.slug !== 'ai-architecture' && (
              <div className="mt-8">
                <ArtMedia piece={displayArtPiece} />
              </div>
            )}
            {displayArtPiece.slug === 'ai-architecture' ? (
              <AiArchitectureArticle tech={displayArtPiece.tech} />
            ) : displayArtPiece.slug === 'livestream-art' ? (
              <LivestreamArticle summary={displayArtPiece.summary} tech={displayArtPiece.tech} />
            ) : (
              <>
                <div className="text-xs tracking-[0.3em] uppercase mt-10 mb-3 opacity-40 text-left" style={{ fontFamily: monoFont }}>SUMMARY</div>
                <PretextSummary text={displayArtPiece.summary} />
                {displayArtPiece.slug === 'koi-pond' && (
                  <>
                    <KoiInstall />
                    <KoiFishGallery />
                  </>
                )}
                <div className="text-xs tracking-[0.3em] uppercase mt-10 mb-3 opacity-40 text-left" style={{ fontFamily: monoFont }}>TOOLS</div>
                <TechTags tags={displayArtPiece.tech} />
              </>
            )}
          </LivestreamArtScrollRegion>
        </DetailOverlay>
      )}

      <canvas ref={coverCanvasRef} className="fixed inset-0 w-full h-full" style={{ zIndex: 20, pointerEvents: 'none' }} />

      {/* Music fading out (W or +): below the header band, like a detail
          page's own fade, and gone at once when the canvas takes over. */}
      <div
        aria-hidden
        className="fixed left-0 right-0 bottom-0"
        style={{ top: 100, zIndex: 12, background: '#000', pointerEvents: 'none', opacity: musicFade ? 1 : 0, transition: `opacity ${musicFade ? EXIT_FADE_MS : 120}ms linear` }}
      />

      {/* Veil for opening a detail page from a list or About from the menu:
          above the page and every canvas, the menu's included. */}
      <div
        aria-hidden
        className="fixed inset-0"
        style={{ zIndex: 30, background: '#000', pointerEvents: 'none', opacity: veilDown ? 1 : 0, transition: `opacity ${EXIT_FADE_MS}ms linear` }}
      />
    </div>
  );
}

function TechTags({ tags }: { tags: string[] }) {
  return (
    <div className="flex flex-wrap justify-start gap-2">
      {tags.map((tag) => (
        <span
          key={tag}
          className="text-[10px] tracking-[0.2em] uppercase text-white/40 border border-white/10 rounded-full px-3 py-1"
          style={{ fontFamily: monoFont }}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

function DetailOverlay({ children, meltProgressRef, fadeOut = false, exitFade = false, onFadeComplete, fullBleed = false }: {
  fullBleed?: boolean;
  /** Fade the page (and its videos) to black before the route lets go of it. */
  exitFade?: boolean;
  children: React.ReactNode;
  meltProgressRef: React.MutableRefObject<number>;
  fadeOut?: boolean;
  onFadeComplete?: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const onFadeCompleteRef = useRef(onFadeComplete);
  onFadeCompleteRef.current = onFadeComplete;

  // For fadeOut (reverse melt): content stays at full opacity while cover canvas
  // accumulates terrain on top. Once fully covered (~75%), unmount.
  useEffect(() => {
    if (!fadeOut) return;
    let cancelled = false;
    let fired = false;
    const check = () => {
      if (cancelled) return;
      if (!fired && meltProgressRef.current >= 0.75) {
        fired = true;
        onFadeCompleteRef.current?.();
        return;
      }
      requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
    return () => { cancelled = true; };
  }, [fadeOut, meltProgressRef]);

  return (
    <div
      ref={overlayRef}
      className="fixed left-0 right-0 bottom-0 z-10 overflow-y-auto"
      style={{
        // Stays below the header band while fading out too: the reverse melt
        // reforms the header on the main canvas in step with the cover canvas,
        // so covering it only made W/+ flicker through the cover's scatter.
        top: fullBleed ? '0px' : '100px',
        paddingTop: fullBleed ? '0px' : '20px',
        paddingBottom: '120px',
        pointerEvents: fadeOut || exitFade ? 'none' : 'auto',
        backgroundColor: '#000',
      }}
    >
      <div
        className="max-w-2xl mx-auto px-6 text-center"
        style={{ opacity: exitFade ? 0 : 1, transition: exitFade ? `opacity ${EXIT_FADE_MS}ms linear` : undefined }}
      >
        {children}
      </div>
    </div>
  );
}

function MediaBlock({ videoUrl, posterUrl, imageUrl }: { videoUrl?: string; posterUrl?: string; imageUrl?: string }) {
  if (videoUrl) {
    return videoUrl.includes('youtube.com') ? (
      <iframe
        className="w-full rounded-lg shadow-lg shadow-black/30"
        style={{ aspectRatio: '16/9', border: 'none' }}
        src={videoUrl}
        allow="autoplay; encrypted-media"
        allowFullScreen
      />
    ) : (
      <video
        className="w-full rounded-lg shadow-lg shadow-black/30 media-fade"
        onLoadedData={markLoaded}
        src={videoUrl}
        poster={posterUrl}
        autoPlay
        muted
        loop
        playsInline
      />
    );
  }
  if (imageUrl) {
    return (
      <img
        className="w-full rounded-lg shadow-lg shadow-black/30 media-fade"
        onLoad={markLoaded}
        src={imageUrl}
        alt=""
      />
    );
  }
  return null;
}

function PretextSummary({ text }: { text: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<{ text: string; width: number }[]>([]);
  const [balancedWidth, setBalancedWidth] = useState(0);
  const fontSize = 14;
  const lineHeight = 22;
  const font = `${fontSize}px JetBrains Mono, Courier New, monospace`;

  useEffect(() => {
    const prepared = prepareWithSegments(text, font);

    const computeLines = () => {
      const maxWidth = containerRef.current?.clientWidth ?? 600;
      const { lineCount } = measureLineStats(prepared, maxWidth);

      // Binary search for the narrowest width that keeps the same line count
      let lo = 100;
      let hi = maxWidth;
      while (hi - lo > 1) {
        const mid = Math.floor((lo + hi) / 2);
        if (measureLineStats(prepared, mid).lineCount <= lineCount) {
          hi = mid;
        } else {
          lo = mid;
        }
      }

      const result = layoutWithLines(prepared, hi, lineHeight);
      setLines(result.lines.map((l) => ({ text: l.text, width: l.width })));
      setBalancedWidth(hi);
    };

    computeLines();
    window.addEventListener('resize', computeLines);
    return () => window.removeEventListener('resize', computeLines);
  }, [text, font]);

  return (
    <div ref={containerRef} className="text-left">
      <div style={{ maxWidth: balancedWidth || undefined }}>
        {lines.map((line, i) => (
          <div
            key={i}
            className="text-white/50"
            style={{
              fontFamily: monoFont,
              fontSize,
              lineHeight: `${lineHeight}px`,
              whiteSpace: 'pre',
            }}
          >
            {line.text || '\u00A0'}
          </div>
        ))}
      </div>
    </div>
  );
}

const monoFontFamily = "'JetBrains Mono', 'Courier New', monospace";

function ProjectAnalyticsSection({ slug }: { slug: string }) {
  const { data } = useFetch(() => api.getProjectDetail(slug));
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (!data || data.daily_views.length === 0) return null;

  const days = data.daily_views;
  const views = days.map((d) => d.views);
  const mid = Math.floor(views.length / 2);
  const prevHalf = views.slice(0, mid).reduce((a, b) => a + b, 0);
  const currHalf = views.slice(mid).reduce((a, b) => a + b, 0);
  const pctChange = prevHalf > 0 ? ((currHalf - prevHalf) / prevHalf) * 100 : 0;
  const pctSign = pctChange >= 0 ? '+' : '';

  const max = Math.max(...views, 1);
  const w = 600;
  const h = 120;
  const pad = 2;
  const padX = 6;

  const coords = views.map((v, i) => ({
    x: padX + (i / (views.length - 1)) * (w - padX * 2),
    y: h - pad - ((v / max) * (h - pad * 2)),
  }));
  const points = coords.map((c) => `${c.x},${c.y}`).join(' ');

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const idx = Math.round(relX * (views.length - 1));
    setHoverIndex(Math.max(0, Math.min(views.length - 1, idx)));
  };

  const hovered = hoverIndex !== null ? { ...coords[hoverIndex], date: days[hoverIndex].date, views: views[hoverIndex] } : null;

  return (
    <div className="mt-10 text-left">
      <div
        className="text-xs tracking-[0.3em] uppercase mb-1 opacity-40"
        style={{ fontFamily: monoFontFamily }}
      >
        ANALYTICS
      </div>
      <div
        className="text-xs text-white/20 mb-3 flex justify-between"
        style={{ fontFamily: monoFontFamily }}
      >
        <span>
          {views.reduce((a, b) => a + b, 0).toLocaleString()} views
          <span className={pctChange >= 0 ? 'text-green-500/60' : 'text-red-500/60'}>
            {' '}{pctSign}{pctChange.toFixed(1)}%
          </span>
        </span>
        <span className="opacity-60">Last 30 days</span>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${w} ${h}`}
        className="w-full"
        preserveAspectRatio="none"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIndex(null)}
        style={{ cursor: 'crosshair' }}
      >
        <polyline
          points={points}
          fill="none"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {hovered && (
          <>
            <line
              x1={hovered.x} y1={0} x2={hovered.x} y2={h}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="1"
            />
            <circle
              cx={hovered.x} cy={hovered.y} r="4"
              fill="white" fillOpacity="0.6"
            />
          </>
        )}
      </svg>
      <div
        className={`text-xs text-white/40 mt-1 flex justify-between ${hovered ? 'visible' : 'invisible'}`}
        style={{ fontFamily: monoFontFamily }}
      >
        <span>{hovered ? new Date(`${hovered.date.slice(0, 4)}-${hovered.date.slice(4, 6)}-${hovered.date.slice(6, 8)}`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '\u00A0'}</span>
        <span>{hovered ? `${hovered.views.toLocaleString()} views` : '\u00A0'}</span>
      </div>
    </div>
  );
}
