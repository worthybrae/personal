import { useEffect, useState } from 'react';
import { pondSvg } from '@/lib/koi/pond';
import { fallbackWeather, nextSky } from '@/lib/koi/sky';
import { VEIL } from '@/lib/koi/surface';
import { parseWeather, WEATHER_URL } from '@/lib/koi/weather';
import type { Sky } from '@/lib/koi/types';
import { markLoaded } from '@/lib/fadeIn';

/** The pond's first day: the fish grow a little from here, as they do in the plugin. */
const BORN = Date.UTC(2026, 10, 14);
/** How often the pond rereads New York's weather and redraws: the weather service updates every quarter hour. */
const EVERY = 15 * 60 * 1000;

/** The koi pond from the Claude Code backdrop plugin, drawn live: New York's weather and sun times, fish on the clock.
 *  The scene is shown as an image so its own styles stay inside it and never touch the page's. */
export function KoiPond({ fill = false }: { fill?: boolean }): JSX.Element {
  const [src, setSrc] = useState<string>();

  useEffect(() => {
    let sky: Sky | null = null;
    let url: string | undefined;
    let stopped = false;

    const draw = (reading = fallbackWeather(Date.now())) => {
      const now = Date.now();
      const next = nextSky(sky, reading, now, BORN);
      if (next === sky && url !== undefined) return;
      sky = next;
      // The veil darkens the middle for the chat in Claude; there is no chat here.
      const svg = pondSvg(sky, now).replace(VEIL, '');
      const old = url;
      url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
      setSrc(url);
      if (old !== undefined) setTimeout(() => URL.revokeObjectURL(old), 2000);
    };

    const read = async () => {
      try {
        const res = await fetch(WEATHER_URL);
        const reading = parseWeather(await res.text(), Date.now());
        if (!stopped) draw(reading ?? sky?.weather ?? undefined);
      } catch {
        if (!stopped) draw(sky?.weather ?? undefined);
      }
    };

    draw();
    void read();
    const timer = setInterval(read, EVERY);
    return () => {
      stopped = true;
      clearInterval(timer);
      if (url !== undefined) URL.revokeObjectURL(url);
    };
  }, []);

  return (
    <div className={`relative overflow-hidden bg-[#0b1714] ${fill ? 'h-full w-full' : 'w-full rounded-lg shadow-lg shadow-black/30 aspect-[16/10]'}`}>
      {src && (
        <img
          className="absolute inset-0 h-full w-full object-cover media-fade"
          src={src}
          onLoad={markLoaded}
          alt="Koi swimming slow loops in a dark green pond under drifting lily pads"
        />
      )}
    </div>
  );
}
