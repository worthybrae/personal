// src/components/Dashboard/contactView.ts
// Canvas-native contact form chrome: each field is an opaque "legibility
// strip" (same technique as the /music search row — see musicView.ts)
// holding the typed value in bright white chars — no separate field labels;
// the in-strip placeholders (YOUR NAME / YOU@EXAMPLE.COM / ...) identify the
// fields — plus a SEND action row. Pure layout + draw are exported for
// tests; drawing writes directly to the terrain canvas so typed text stays
// legible over the animated terrain beneath it regardless of scatter/reveal
// state.

export type ContactField = 'name' | 'email' | 'message';
export const CONTACT_FIELD_ORDER: readonly ContactField[] = ['name', 'email', 'message'];

export type ContactStatus = 'idle' | 'sending' | 'sent' | 'error';

export interface ContactUIState {
  name: string;
  email: string;
  message: string;
  activeField: ContactField;
  status: ContactStatus;
}

export interface ContactGeom {
  cols: number;
  rows: number;
  charW: number;
  charH: number;
  fontSize: number;
  // First grid row available below the "CONTACT" heading cutout (rendered by
  // the caller as a terrain mask, same technique as the menu-word cutouts).
  headingBottomRow: number;
}

const MONO = "'JetBrains Mono','Courier New',monospace";
// Field/strip text renders at 2x the terrain glyph size, matching the
// /music search row's legibility convention.
const SCALE = 2;
const ROW_GAP = 3;
// Inner padding of each legibility strip, in 1x grid cells: text is inset
// PAD_X cols from the strip's left/right edges and PAD_Y rows from top/bottom.
const PAD_X = 2;
const PAD_Y = 1;
// Enforced by maxLength on the hidden textarea backing the canvas field
// (Home.tsx); drawn here as the n/max counter in the strip's bottom padding.
// The message strip is sized to hold this many chars fully wrapped, so the
// draw path's keep-last-lines fallback never has to scroll.
export const CONTACT_MESSAGE_MAX = 200;

const FIELD_PLACEHOLDER: Record<ContactField, string> = {
  name: 'YOUR NAME',
  email: 'YOU@EXAMPLE.COM',
  message: 'TYPE YOUR MESSAGE...',
};

export interface ContactRowGeom {
  field: ContactField;
  stripRow: number;      // grid row the strip's first text line starts at (opaque rect starts PAD_Y rows above)
  lines: number;         // text lines the strip holds (1 for name/email; enough for a full max-length message)
  left: number;          // grid col the strip begins at
  width: number;         // strip width in grid cols
  charsPerLine: number;  // visible chars per line at SCALE
}

export interface ContactLayout {
  rows: ContactRowGeom[];
  sendRow: number;    // grid row the SEND label text is drawn on (box starts PAD_Y rows above)
  sendHeight: number; // send box height in 1x grid rows, padding included
}

export function contactLayout(geom: ContactGeom): ContactLayout {
  const stripWidth = Math.max(24, Math.min(56, geom.cols - 10));
  const left = Math.max(0, Math.floor((geom.cols - stripWidth) / 2));
  const charsPerLine = Math.max(4, Math.floor((stripWidth - PAD_X * 2) / SCALE));

  let row = geom.headingBottomRow;
  const rows: ContactRowGeom[] = [];
  for (const field of CONTACT_FIELD_ORDER) {
    // Message strip fits an entire max-length message wrapped (+1 spare line
    // for wrap slack), so typing never scrolls earlier lines out of view.
    const lines = field === 'message' ? Math.ceil(CONTACT_MESSAGE_MAX / charsPerLine) + 1 : 1;
    const stripRow = row + PAD_Y;
    rows.push({ field, stripRow, lines, left, width: stripWidth, charsPerLine });
    row = stripRow + lines * SCALE + PAD_Y + ROW_GAP;
  }

  return { rows, sendRow: row + PAD_Y, sendHeight: SCALE + PAD_Y * 2 };
}

export type ContactZoneAction = `field:${ContactField}` | 'send';
export interface ContactZone {
  action: ContactZoneAction;
  x: number; y: number; w: number; h: number; // canvas pixels
}

/** Pure geometry (no ctx) — used both for hit-testing/hover and to avoid
 * recomputing pixel bounds inside the draw pass. */
export function computeContactZones(layout: ContactLayout, charW: number, charH: number): ContactZone[] {
  const zones: ContactZone[] = [];
  for (const rg of layout.rows) {
    const h = (rg.lines * SCALE + PAD_Y * 2) * charH;
    zones.push({ action: `field:${rg.field}`, x: rg.left * charW, y: (rg.stripRow - PAD_Y) * charH, w: rg.width * charW, h });
  }
  if (layout.rows.length > 0) {
    const first = layout.rows[0];
    zones.push({
      action: 'send',
      x: first.left * charW,
      y: (layout.sendRow - PAD_Y) * charH,
      w: first.width * charW,
      h: layout.sendHeight * charH,
    });
  }
  return zones;
}

function fieldValue(state: Pick<ContactUIState, 'name' | 'email' | 'message'>, field: ContactField): string {
  if (field === 'name') return state.name;
  if (field === 'email') return state.email;
  return state.message;
}

/** Light validity check — email just needs to contain '@'. */
export function isContactFormValid(state: Pick<ContactUIState, 'name' | 'email' | 'message'>): boolean {
  return state.name.trim().length > 0 && state.email.includes('@') && state.message.trim().length > 0;
}

/** Manual word-wrap at `charsPerLine` chars, hard-breaking any single word
 * that's longer than a whole line. */
export function wrapContactMessage(text: string, charsPerLine: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const word of words) {
    let w = word;
    // Hard-break words longer than a full line before considering wrapping.
    while (w.length > charsPerLine) {
      const cand = cur ? cur + ' ' + w.slice(0, charsPerLine - cur.length - 1) : w.slice(0, charsPerLine);
      if (cur && cand.length <= charsPerLine) {
        lines.push(cand);
        w = w.slice(charsPerLine - cur.length - 1);
      } else {
        lines.push(w.slice(0, charsPerLine));
        w = w.slice(charsPerLine);
      }
      cur = '';
    }
    const cand = cur ? cur + ' ' + w : w;
    if (cand.length > charsPerLine && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = cand;
    }
  }
  if (cur || lines.length === 0) lines.push(cur);
  return lines;
}

export function sendLabel(status: ContactStatus): string {
  if (status === 'sending') return 'SENDING…';
  if (status === 'sent') return 'MESSAGE SENT — THANKS';
  if (status === 'error') return 'FAILED — TRY AGAIN';
  return 'SEND MESSAGE';
}

/** Draws the opaque legibility strips, typed text + caret, message counter,
 * and the SEND row. Zones (for hit-testing) come from computeContactZones,
 * not this function — this is drawing only. */
export function drawContactChrome(
  ctx: CanvasRenderingContext2D,
  geom: ContactGeom,
  layout: ContactLayout,
  state: ContactUIState,
  caretOn: boolean,
  bgFill: string,
  hoveredAction: ContactZoneAction | null,
): void {
  const { charW, charH, fontSize } = geom;
  ctx.textBaseline = 'top';

  for (const rg of layout.rows) {
    const isActive = state.activeField === rg.field;
    const value = fieldValue(state, rg.field);

    // --- Opaque legibility strip (text inset PAD_X cols / PAD_Y rows) ---
    const stripPxH = (rg.lines * SCALE + PAD_Y * 2) * charH;
    ctx.fillStyle = bgFill;
    ctx.fillRect(rg.left * charW, (rg.stripRow - PAD_Y) * charH, rg.width * charW, stripPxH);

    // Character counter tucked into the strip's bottom padding, right-aligned.
    if (rg.field === 'message') {
      ctx.font = `${fontSize}px ${MONO}`;
      const counter = `${Math.min(value.length, CONTACT_MESSAGE_MAX)}/${CONTACT_MESSAGE_MAX}`;
      ctx.fillStyle = value.length >= CONTACT_MESSAGE_MAX ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.45)';
      const counterLeft = rg.left + rg.width - PAD_X - counter.length;
      for (let i = 0; i < counter.length; i++) {
        ctx.fillText(counter[i], (counterLeft + i) * charW, (rg.stripRow + rg.lines * SCALE) * charH);
      }
    }

    // --- Typed text / placeholder / caret ---
    ctx.font = `${fontSize * SCALE}px ${MONO}`;
    const caretStr = isActive && caretOn ? '_' : '';

    if (rg.field === 'message') {
      if (value.length === 0 && !isActive) {
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        const ph = FIELD_PLACEHOLDER.message.slice(0, rg.charsPerLine);
        for (let i = 0; i < ph.length; i++) {
          ctx.fillText(ph[i], (rg.left + PAD_X + i * SCALE) * charW, rg.stripRow * charH);
        }
      } else {
        // Preserve the user's actual typed case (unlike the decorative dim
        // terrain labels elsewhere) — this is a real message body.
        const wrapped = value.length > 0 ? wrapContactMessage(value, rg.charsPerLine) : [''];
        const visible = wrapped.slice(-rg.lines);
        while (visible.length < rg.lines) visible.unshift('');
        for (let li = 0; li < visible.length; li++) {
          const isLastLine = li === visible.length - 1;
          const lineStr = visible[li] + (isLastLine ? caretStr : '');
          ctx.fillStyle = 'rgba(255,255,255,0.95)';
          for (let i = 0; i < lineStr.length; i++) {
            ctx.fillText(lineStr[i], (rg.left + PAD_X + i * SCALE) * charW, (rg.stripRow + li * SCALE) * charH);
          }
        }
      }
    } else {
      if (value.length === 0 && !isActive) {
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        const ph = FIELD_PLACEHOLDER[rg.field].slice(0, rg.charsPerLine);
        for (let i = 0; i < ph.length; i++) {
          ctx.fillText(ph[i], (rg.left + PAD_X + i * SCALE) * charW, rg.stripRow * charH);
        }
      } else {
        const display = value.length > rg.charsPerLine ? value.slice(value.length - rg.charsPerLine) : value;
        const shown = display + caretStr;
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        for (let i = 0; i < shown.length; i++) {
          ctx.fillText(shown[i], (rg.left + PAD_X + i * SCALE) * charW, rg.stripRow * charH);
        }
      }
    }
  }

  // --- SEND row ---
  if (layout.rows.length === 0) return;
  const valid = isContactFormValid(state);
  const disabled = !valid && state.status === 'idle';
  const label = sendLabel(state.status);
  const first = layout.rows[0];
  // Hover lights the button up white even while the form is still invalid —
  // the click itself stays a no-op until isContactFormValid passes (Home.tsx).
  const hovered = hoveredAction === 'send' && state.status !== 'sending';

  ctx.font = `${fontSize * SCALE}px ${MONO}`;
  const textCols = label.length * SCALE;
  const textLeft = first.left + Math.max(0, Math.floor((first.width - textCols) / 2));

  // Always-visible button box: a border rect with an opaque interior so the
  // SEND action reads as a button over the terrain, not loose dim text.
  // (Border is two fillRects — outer border-color, inset interior — rather
  // than strokeRect, to keep the ctx surface area minimal for tests.)
  const boxX = first.left * charW;
  const boxY = (layout.sendRow - PAD_Y) * charH;
  const boxW = first.width * charW;
  const boxH = layout.sendHeight * charH;
  const border = Math.max(1, Math.floor(charH / 6));
  ctx.fillStyle = hovered ? '#fff' : disabled ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.85)';
  ctx.fillRect(boxX, boxY, boxW, boxH);
  ctx.fillStyle = hovered ? '#fff' : bgFill;
  ctx.fillRect(boxX + border, boxY + border, boxW - border * 2, boxH - border * 2);

  ctx.fillStyle = hovered ? '#000' : disabled ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.9)';
  for (let i = 0; i < label.length; i++) {
    ctx.fillText(label[i], (textLeft + i * SCALE) * charW, layout.sendRow * charH);
  }
}
