// src/components/Dashboard/ascii-art.ts

const WORTHY_ART = `
██╗    ██╗ ██████╗ ██████╗ ████████╗██╗  ██╗██╗   ██╗
██║    ██║██╔═══██╗██╔══██╗╚══██╔══╝██║  ██║╚██╗ ██╔╝
██║ █╗ ██║██║   ██║██████╔╝   ██║   ███████║ ╚████╔╝
██║███╗██║██║   ██║██╔══██╗   ██║   ██╔══██║  ╚██╔╝
╚███╔███╔╝╚██████╔╝██║  ██║   ██║   ██║  ██║   ██║
 ╚══╝╚══╝  ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝   ╚═╝   `;

const RAE_ART = `
██████╗  █████╗ ███████╗
██╔══██╗██╔══██╗██╔════╝
██████╔╝███████║█████╗
██╔══██╗██╔══██║██╔══╝
██║  ██║██║  ██║███████╗
╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝`;

export interface AsciiChar {
  char: string;
  col: number;
  row: number;
}

/**
 * Parse an ASCII art string into positioned characters.
 * Skips spaces — only non-space characters become particles.
 */
function parseArt(art: string, colOffset: number, rowOffset: number): AsciiChar[] {
  const chars: AsciiChar[] = [];
  const lines = art.split('\n').filter((l) => l.length > 0);
  for (let row = 0; row < lines.length; row++) {
    for (let col = 0; col < lines[row].length; col++) {
      const char = lines[row][col];
      if (char !== ' ') {
        chars.push({ char, col: col + colOffset, row: row + rowOffset });
      }
    }
  }
  return chars;
}

export function getAsciiChars(): { chars: AsciiChar[]; totalCols: number; totalRows: number } {
  const worthyLines = WORTHY_ART.split('\n').filter((l) => l.length > 0);
  const raeLines = RAE_ART.split('\n').filter((l) => l.length > 0);

  const worthyCols = Math.max(...worthyLines.map((l) => l.length));
  const raeCols = Math.max(...raeLines.map((l) => l.length));
  const totalCols = Math.max(worthyCols, raeCols);

  // Center RAE horizontally under WORTHY
  const raeColOffset = Math.floor((worthyCols - raeCols) / 2);

  const worthyChars = parseArt(WORTHY_ART, 0, 0);
  const raeChars = parseArt(RAE_ART, raeColOffset, worthyLines.length + 1);

  const totalRows = worthyLines.length + 1 + raeLines.length;

  return {
    chars: [...worthyChars, ...raeChars],
    totalCols,
    totalRows,
  };
}

/** Characters used for background floating particles */
export const BACKGROUND_CHARS = ['█', '╗', '║', '╔', '╚', '═', '╝', '╬', '░', '▒'];
