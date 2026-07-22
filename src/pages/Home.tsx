import { useRef, useCallback, useMemo, useState, useEffect, useLayoutEffect } from 'react';
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
import { isContactFormValid, type ContactField, type ContactStatus, type ContactUIState } from '@/components/Dashboard/contactView';
import type { MenuEntryKey } from '@/components/Dashboard/useTerrainAnimation';

type Page = 'home' | 'feed' | 'music' | 'work-detail' | 'art-detail';

function parseRoute(path: string): { page: Page; slug?: string } {
  if (path === '/feed') return { page: 'feed' };
  if (path === '/music') return { page: 'music' };
  if (path.startsWith('/work/')) return { page: 'work-detail', slug: decodeURIComponent(path.slice('/work/'.length)) };
  if (path.startsWith('/art/')) return { page: 'art-detail', slug: decodeURIComponent(path.slice('/art/'.length)) };
  return { page: 'home' };
}

const monoFont = "'JetBrains Mono', 'Courier New', monospace";

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const coverCanvasRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { page, slug } = parseRoute(location.pathname);

  const isContent = page !== 'home';

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
  const [feedClosing, setFeedClosing] = useState(false);

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

  // Canvas-native contact mode — built into the terrain like the "+" menu
  // above (contactOpenRef mirrors contactOpen the same way menuOpenRef
  // mirrors menuOpen; contactCloseToHomeRef mirrors menuCloseToHomeRef).
  const [contactOpen, setContactOpen] = useState(false);
  const contactOpenRef = useRef(false);
  contactOpenRef.current = contactOpen;
  const contactCloseToHomeRef = useRef(false);

  // Form fields + UI state. Plain useState is the source of truth (so the
  // hidden <input>/<textarea> below stay normal controlled elements); each
  // field also gets a ref kept in sync every render, and contactUIRef wraps
  // those refs in getters (same "stale-snapshot rule" as nowPlayingRef
  // above) so the rAF canvas draw loop always reads the live values rather
  // than a value captured whenever contactUIRef itself was last created.
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactActiveField, setContactActiveField] = useState<ContactField>('name');
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

  // Auto-focus the first field the moment contact mode opens, so typing
  // works immediately without requiring a click first (desktop keyboard).
  useEffect(() => {
    if (contactOpen) focusContactField('name');
  }, [contactOpen, focusContactField]);

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
  const [fadingDetail, setFadingDetail] = useState<{ page: 'work-detail' | 'art-detail'; slug: string } | null>(null);

  // Detect page transitions in useLayoutEffect (not during render) to avoid
  // StrictMode double-render discarding the setState-during-render call.
  // useLayoutEffect fires synchronously after commit, before paint.
  useLayoutEffect(() => {
    const prev = prevPageRef.current;
    const prevSlug = prevSlugRef.current;
    prevPageRef.current = page;
    prevSlugRef.current = slug;

    if (prev === page) return;

    if ((prev === 'feed' || prev === 'music') && page === 'home') {
      setFeedClosing(true);
    }
    if ((prev === 'feed' || prev === 'music') && (page === 'work-detail' || page === 'art-detail')) {
      meltCompleteRef.current = false;
    }
    if ((prev === 'work-detail' || prev === 'art-detail') && (page === 'feed' || page === 'music')) {
      detailToFeedRef.current = true;
      meltProgressRef.current = 0;
      setFadingDetail({ page: prev, slug: prevSlug ?? '' });
    }
  }, [page, slug]);

  useEffect(() => {
    if (feedClosing) {
      // Set immediately — no delay needed since FeedOverlay HTML is gone
      contentOpenRef.current = false;
      const unmountTimer = setTimeout(() => setFeedClosing(false), 800);
      return () => { clearTimeout(unmountTimer); };
    }
    if (!isContent) {
      contentOpenRef.current = false;
    }
  }, [feedClosing, isContent]);

  const isCardPage = page === 'feed' || page === 'music';
  const showFeed = isCardPage || feedClosing;

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
  const player = useMusicPlayer(musicCatalog?.tracks ?? []);

  // Local playback owns the landing-style now-playing box on /music; Spotify
  // owns it elsewhere. This is a getter-style ref (not a snapshot object) so
  // the rAF draw loop always reads whichever source is live at access time —
  // a plain object captured at render time would go stale the moment
  // startCurrent() replaces player.uiRef.current wholesale without triggering
  // a React re-render.
  const localPlayerRef = player.uiRef;
  const pageRef = useRef(page);
  pageRef.current = page;
  const nowPlayingRef = useMemo(() => ({
    get current() {
      if (pageRef.current === 'music') {
        const ui = localPlayerRef.current;
        return ui ? { track: ui.title, artist: '', isPlaying: ui.isPlaying } : null;
      }
      return spotifyNPRef.current;
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
  musicUIRef.current = page === 'music'
    ? {
        query: musicQuery,
        focused: searchFocused,
        caretOn: true,
        get playingTrackId() { return player.uiRef.current?.trackId ?? null; },
        get playingIsPlaying() { return player.uiRef.current?.isPlaying ?? false; },
      }
    : null;

  const contentSubItemsRef = useRef<{ text: string; url: string; description?: string; mau?: string; category?: string; icon?: string; artist?: string; hasArt?: boolean }[]>([]);

  const feedSubItems = useMemo(() => {
    if (!showFeed) return [];

    if (page === 'music') {
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
      text: p.name, url: `/work/${p.slug}`,
      description: projectDescs[p.slug] ?? p.description,
      icon: projectIcons[p.slug] ?? '</>',
    }));

    const artIcons: Record<string, string> = {
      'ai-architecture': '{*}',
      'livestream-art': '[o]',
    };
    const artDescs: Record<string, string> = {
      'ai-architecture': 'GENERATIVE AI VIDEOS',
      'livestream-art': 'COMPUTER VISION VIDEOS',
    };
    const artItems = ART_PIECES.map((a) => ({
      text: a.name, url: `/art/${a.slug}`,
      description: artDescs[a.slug] ?? a.description,
      icon: artIcons[a.slug] ?? '(~)',
    }));

    const blogItems = (blogData?.posts ?? []).map((b) => ({
      text: b.title.toUpperCase(), url: `/blog/${b.slug}`,
      description: b.description.toUpperCase(),
      icon: '>>>',
    }));

    // MUSIC card removed from the feed — the full-screen "+" menu covers
    // navigation to /music now (see MENU_ENTRIES in useTerrainAnimation.ts).
    return [artItems[0], workItems[1], artItems[1], workItems[0], ...blogItems].filter(Boolean);
  }, [showFeed, page, blogData, musicCatalog, musicError, musicTracks]);

  contentSubItemsRef.current = feedSubItems;

  const handleLogoClick = useCallback(() => {
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
    navigate('/');
  }, [navigate, menuOpen, contactOpen]);
  const handleMenuClick = useCallback(() => {
    if (menuOpen) {
      menuCloseToHomeRef.current = true;
      setMenuOpen(false);
      navigate('/');
    } else {
      // Opens over contact mode without closing it — contact stays open
      // underneath until Esc or W (handleLogoClick above) closes it.
      setMenuOpen(true);
    }
  }, [menuOpen, navigate]);
  const handleMenuSelect = useCallback((entry: MenuEntryKey) => {
    menuCloseToHomeRef.current = false;
    contactCloseToHomeRef.current = false;
    setMenuOpen(false);
    if (entry === 'portfolio') { setContactOpen(false); navigate('/feed'); }
    else if (entry === 'music') { setContactOpen(false); navigate('/music'); }
    else if (entry === 'resume') window.open('/resume.pdf', '_blank');
    else if (entry === 'contact') setContactOpen(true);
  }, [navigate]);
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
      onLogoClick: handleLogoClick,
      onMenuClick: handleMenuClick,
      onSubItemClick: handleItemClick,
      menuOpenRef,
      menuCloseToHomeRef,
      onMenuSelect: handleMenuSelect,
      contentOpenRef,
      activeLabelRef,
      scrollTargetRef,
      contentSubItemsRef,
      meltCompleteRef,
      meltProgressRef,
      detailToFeedRef,
      nowPlayingRef,
      coverCanvasRef,
      musicUIRef,
      onMusicControl: handleMusicControl,
      contactOpenRef,
      contactCloseToHomeRef,
      contactUIRef,
      onContactControl: handleContactControl,
    }),
    [handleLogoClick, handleMenuClick, handleMenuSelect, handleItemClick, handleMusicControl, nowPlayingRef, contactUIRef, handleContactControl],
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
      const idx = order.indexOf(contactActiveFieldRef.current);
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
  const handleFadeComplete = useCallback(() => setFadingDetail(null), []);

  return (
    <div>
      {/* z-25 while the menu or contact mode is open: both draw on this
          canvas and must sit above DetailOverlay (z-10) and the melt cover
          canvas (z-20) so they're visible over detail pages too. */}
      <canvas ref={canvasRef} className="fixed inset-0 w-full h-full" style={{ zIndex: (menuOpen || contactOpen) ? 25 : 0 }} />

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
          style={{ position: 'fixed', top: 0, left: 0, width: 1, height: 1, opacity: 0, border: 'none', padding: 0, zIndex: 5 }}
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
            aria-label="Your name"
            autoCapitalize="off"
            autoCorrect="off"
            style={{ position: 'fixed', top: 0, left: 0, width: 1, height: 1, opacity: 0, border: 'none', padding: 0, zIndex: 5 }}
          />
          <input
            ref={contactEmailInputRef}
            type="email"
            value={contactEmail}
            onChange={(e) => { setContactEmail(e.target.value); if (contactStatus !== 'idle') setContactStatus('idle'); }}
            onFocus={() => setContactActiveField('email')}
            aria-label="Your email"
            autoCapitalize="off"
            autoCorrect="off"
            style={{ position: 'fixed', top: 0, left: 0, width: 1, height: 1, opacity: 0, border: 'none', padding: 0, zIndex: 5 }}
          />
          <textarea
            ref={contactMessageInputRef}
            value={contactMessage}
            onChange={(e) => { setContactMessage(e.target.value); if (contactStatus !== 'idle') setContactStatus('idle'); }}
            onFocus={() => setContactActiveField('message')}
            aria-label="Your message"
            style={{ position: 'fixed', top: 0, left: 0, width: 1, height: 1, opacity: 0, border: 'none', padding: 0, zIndex: 5 }}
          />
        </>
      )}

      {showWork && displayProject && (
        <DetailOverlay meltProgressRef={meltProgressRef} fadeOut={isFadingOut} onFadeComplete={handleFadeComplete}>
          <div className="flex items-start justify-between gap-4">
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
          <div className="mt-8">
            <MediaBlock videoUrl={displayProject.videoUrl} imageUrl={displayProject.imageUrl} />
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
          <ProjectAnalyticsSection slug={displayProject.slug} />
        </DetailOverlay>
      )}

      {showArt && displayArtPiece && (
        <DetailOverlay meltProgressRef={meltProgressRef} fadeOut={isFadingOut} onFadeComplete={handleFadeComplete}>
          <div className="flex items-start justify-between gap-4">
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
          <div className="mt-8">
            <MediaBlock videoUrl={displayArtPiece.videoUrl} imageUrl={displayArtPiece.imageUrl} />
          </div>
          <div
            className="text-xs tracking-[0.3em] uppercase mt-10 mb-3 opacity-40 text-left"
            style={{ fontFamily: monoFont }}
          >
            SUMMARY
          </div>
          <PretextSummary text={displayArtPiece.summary} />
          <div
            className="text-xs tracking-[0.3em] uppercase mt-10 mb-3 opacity-40 text-left"
            style={{ fontFamily: monoFont }}
          >
            TOOLS
          </div>
          <TechTags tags={displayArtPiece.tech} />
        </DetailOverlay>
      )}

      <canvas ref={coverCanvasRef} className="fixed inset-0 w-full h-full" style={{ zIndex: 20, pointerEvents: 'none' }} />
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

function DetailOverlay({ children, meltProgressRef, fadeOut = false, onFadeComplete }: {
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
        top: fadeOut ? '0px' : '100px',
        paddingTop: fadeOut ? '120px' : '20px',
        paddingBottom: '120px',
        pointerEvents: fadeOut ? 'none' : 'auto',
        backgroundColor: '#000',
      }}
    >
      <div className="max-w-2xl mx-auto px-6 text-center">
        {children}
      </div>
    </div>
  );
}

function MediaBlock({ videoUrl, imageUrl }: { videoUrl?: string; imageUrl?: string }) {
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
        className="w-full rounded-lg shadow-lg shadow-black/30"
        src={videoUrl}
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
        className="w-full rounded-lg shadow-lg shadow-black/30"
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
