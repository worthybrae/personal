import { useMemo, useState } from 'react';
import { FISH_GROUPS, fishNote, fishSvg } from '@/lib/koi/catalog';

const monoFont = "'JetBrains Mono', 'Courier New', monospace";
const heading = 'text-xs tracking-[0.3em] uppercase mt-10 mb-3 opacity-40 text-left';

const asImage = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/** One fish on its own patch of water: still until pointed at or tapped, then swimming in place. */
function FishCard({ name }: { name: string }) {
  const [moving, setMoving] = useState(false);
  const still = useMemo(() => asImage(fishSvg(name, false)), [name]);
  const [swimming, setSwimming] = useState<string>();
  const start = () => {
    if (swimming === undefined) setSwimming(asImage(fishSvg(name, true)));
    setMoving(true);
  };
  return (
    <button
      type="button"
      onMouseEnter={start}
      onMouseLeave={() => setMoving(false)}
      onFocus={start}
      onBlur={() => setMoving(false)}
      onClick={() => (moving ? setMoving(false) : start())}
      className="group flex flex-col text-left rounded-md border border-white/10 hover:border-white/30 bg-[#16211d] overflow-hidden transition-colors"
    >
      <div className="aspect-[5/2] w-full flex items-center justify-center px-2">
        <img src={moving && swimming ? swimming : still} alt="" className="max-h-full max-w-full" />
      </div>
      <div className="px-3 pb-3 pt-1">
        <div className="text-[11px] tracking-[0.2em] uppercase text-white/80" style={{ fontFamily: monoFont }}>
          {name}
        </div>
        <div className="mt-1 text-[11px] leading-snug text-white/40" style={{ fontFamily: monoFont }}>
          {fishNote(name)}
        </div>
      </div>
    </button>
  );
}

function Command({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <div className="flex items-center gap-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">
      <code className="flex-1 overflow-x-auto whitespace-nowrap text-left text-[12px] text-white/80" style={{ fontFamily: monoFont }}>
        {text}
      </code>
      <button
        type="button"
        onClick={copy}
        className="shrink-0 text-[10px] tracking-[0.2em] uppercase text-white/40 hover:text-white/90"
        style={{ fontFamily: monoFont }}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

/** How to get the pond behind your own Claude Code chats. */
export function KoiInstall() {
  const text = 'text-[13px] leading-relaxed text-white/60 text-left';
  return (
    <section aria-labelledby="koi-install">
      <div id="koi-install" className={heading} style={{ fontFamily: monoFont }}>
        INSTALL
      </div>
      <div className="space-y-3" style={{ fontFamily: monoFont }}>
        <p className={text}>In a terminal session of Claude Code, run this and answer y to add the marketplace:</p>
        <Command text="/plugin install koi --marketplace worthybrae/koi-pond" />
        <p className={text}>Or from a shell:</p>
        <Command text="claude plugin install koi --marketplace worthybrae/koi-pond" />
        <p className={text}>
          In the Claude desktop app, click + next to the prompt box, then Plugins, then Add marketplace with{' '}
          <span className="text-white/80">worthybrae/koi-pond</span>, then Add plugin.
        </p>
        <p className={text}>
          The pond shows behind the chat in the desktop app, in sessions you start after installing. Type /koi off to turn it
          off and /koi to bring it back.
        </p>
      </div>
    </section>
  );
}

/** Every kind of fish the pond can hold, from the everyday koi to the legendary ones. */
export function KoiFishGallery() {
  return (
    <section aria-labelledby="koi-fish">
      <div id="koi-fish" className={heading} style={{ fontFamily: monoFont }}>
        THE FISH
      </div>
      <p className="text-[13px] leading-relaxed text-white/60 text-left" style={{ fontFamily: monoFont }}>
        A new lineup swims the pond each day, the same for everyone. Point at a fish to see it swim.
      </p>
      {FISH_GROUPS.map((group) => (
        <div key={group.title} className="mt-8">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-3 text-left">
            <h3 className="text-[11px] tracking-[0.25em] uppercase text-white/80" style={{ fontFamily: monoFont }}>
              {group.title}
            </h3>
            <span className="text-[11px] text-white/35" style={{ fontFamily: monoFont }}>
              {group.blurb}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {group.names.map((name) => (
              <FishCard key={name} name={name} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
