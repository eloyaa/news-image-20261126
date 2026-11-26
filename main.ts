// Solmar-free daily news poster: "26 November 2026 in one image".
// Draws the poster with code (shapes + a 5x7 bitmap font) and encodes a
// 1024x1024 PNG with Node's standard library only. No network, no clock,
// no randomness: the same input always produces the same bytes.
// Run:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { deflateSync } from "node:zlib";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------- font --
// 5x7 bitmap font. Each glyph is 7 rows; each row is a 5-bit number,
// most-significant bit on the left. Only the characters the poster uses
// are defined; the renderer upper-cases everything first.
const FONT: Record<string, number[]> = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x15, 0x0a],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  "0": [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  "1": [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  "2": [0x0e, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1f],
  "3": [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  "4": [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  "5": [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  "6": [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  "7": [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  "8": [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  "9": [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  " ": [0, 0, 0, 0, 0, 0, 0],
  ".": [0, 0, 0, 0, 0, 0x0c, 0x0c],
  ",": [0, 0, 0, 0, 0x0c, 0x04, 0x08],
  ":": [0, 0x0c, 0x0c, 0, 0x0c, 0x0c, 0],
  ";": [0, 0x0c, 0x0c, 0, 0x0c, 0x04, 0x08],
  "-": [0, 0, 0, 0x0e, 0, 0, 0],
  "'": [0x04, 0x04, 0x08, 0, 0, 0, 0],
  '"': [0x0a, 0x0a, 0, 0, 0, 0, 0],
  "(": [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ")": [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  "/": [0x01, 0x02, 0x02, 0x04, 0x08, 0x08, 0x10],
  "&": [0x0c, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0d],
  "%": [0x19, 0x1a, 0x02, 0x04, 0x08, 0x0b, 0x13],
  "+": [0, 0x04, 0x04, 0x1f, 0x04, 0x04, 0],
  "=": [0, 0, 0x1f, 0, 0x1f, 0, 0],
  "?": [0x0e, 0x11, 0x01, 0x06, 0x04, 0, 0x04],
  "!": [0x04, 0x04, 0x04, 0x04, 0x04, 0, 0x04],
  $: [0x04, 0x0f, 0x14, 0x0e, 0x05, 0x1e, 0x04],
  "·": [0, 0, 0x0c, 0x0c, 0, 0, 0],
  "×": [0, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0],
  ">": [0x08, 0x04, 0x02, 0x01, 0x02, 0x04, 0x08],
  "<": [0x02, 0x04, 0x08, 0x10, 0x08, 0x04, 0x02],
  "—": [0, 0, 0, 0x1f, 0, 0, 0],
};

// ------------------------------------------------------------ PNG encode --
const CRC_TABLE: number[] = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table.push(c >>> 0);
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}

// Encode an RGB buffer (W*H*3 bytes) as a PNG. Color type 2, 8-bit, no
// interlace. Deterministic: fixed zlib level, fixed chunking.
function encodePNG(rgb: Buffer): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    rgb.copy(raw, y * (1 + W * 3) + 1, y * W * 3, (y + 1) * W * 3);
  }
  const compressed = deflateSync(raw, { level: 9 });

  const parts: Buffer[] = [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])];
  parts.push(chunk("IHDR", ihdr));
  for (let off = 0; off < compressed.length; off += 65536) {
    parts.push(chunk("IDAT", compressed.subarray(off, off + 65536)));
  }
  parts.push(chunk("IEND", Buffer.alloc(0)));
  return Buffer.concat(parts);
}

// ------------------------------------------------------------- canvas ----
type RGB = [number, number, number];

const INK: RGB = [0x1a, 0x1a, 0x1a];
const GREY: RGB = [0x5a, 0x55, 0x4a];
const PAPER: RGB = [0xf6, 0xf1, 0xe4];
const CARD: RGB = [0xff, 0xff, 0xff];
const CARD_LINE: RGB = [0xd8, 0xd2, 0xc4];
const NAVY: RGB = [0x12, 0x23, 0x3d];
const RED: RGB = [0xc0, 0x39, 0x2b];
const WHITE: RGB = [0xff, 0xff, 0xff];

const px = Buffer.alloc(W * H * 3);

function setPixel(x: number, y: number, c: RGB): void {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0];
  px[i + 1] = c[1];
  px[i + 2] = c[2];
}

function fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) setPixel(xx, yy, c);
  }
}

function fillCircle(cx: number, cy: number, r: number, c: RGB): void {
  for (let yy = cy - r; yy <= cy + r; yy++) {
    for (let xx = cx - r; xx <= cx + r; xx++) {
      const dx = xx - cx;
      const dy = yy - cy;
      if (dx * dx + dy * dy <= r * r) setPixel(xx, yy, c);
    }
  }
}

function ring(cx: number, cy: number, r: number, thick: number, c: RGB): void {
  for (let yy = cy - r - thick; yy <= cy + r + thick; yy++) {
    for (let xx = cx - r - thick; xx <= cx + r + thick; xx++) {
      const d = Math.sqrt((xx - cx) * (xx - cx) + (yy - cy) * (yy - cy));
      if (d >= r - thick / 2 && d <= r + thick / 2) setPixel(xx, yy, c);
    }
  }
}

// One glyph, scaled. A character is 5*s wide plus 1*s of spacing.
function drawChar(ch: string, x: number, y: number, s: number, c: RGB): void {
  const glyph = FONT[ch] ?? FONT["?"];
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 5; col++) {
      if ((glyph[row] >> (4 - col)) & 1) {
        fillRect(x + col * s, y + row * s, s, s, c);
      }
    }
  }
}

function textWidth(text: string, s: number): number {
  return text.length * 6 * s - s;
}

function drawText(text: string, x: number, y: number, s: number, c: RGB): void {
  const upper = text.toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    drawChar(upper[i], x + i * 6 * s, y, s, c);
  }
}

function drawTextCentered(text: string, cx: number, y: number, s: number, c: RGB): void {
  drawText(text, cx - Math.floor(textWidth(text, s) / 2), y, s, c);
}

// Greedy word wrap: returns lines that fit maxW pixels at scale s.
function wrapText(text: string, maxW: number, s: number): string[] {
  const words = text.toUpperCase().split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line === "" ? word : line + " " + word;
    if (textWidth(test, s) <= maxW || line === "") {
      line = test;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line !== "") lines.push(line);
  return lines;
}

// -------------------------------------------------------------- icons ----
// Small white pictograms drawn inside a coloured circle. Each draws within
// a 52x52 box centred at (cx, cy); keep them simple geometric marks.
function iconMissile(cx: number, cy: number): void {
  // Rocket body + nose + flame, pointing up-right.
  fillRect(cx - 4, cy - 14, 8, 22, WHITE);
  fillRect(cx - 9, cy - 2, 5, 12, WHITE);
  fillRect(cx + 4, cy - 2, 5, 12, WHITE);
  for (let i = 0; i < 10; i++) {
    fillRect(cx - 4 + i, cy - 24 + i, 9 - i, 1, WHITE);
  }
  fillRect(cx - 2, cy + 8, 4, 8, WHITE);
}

function iconChart(cx: number, cy: number): void {
  fillRect(cx - 16, cy + 2, 8, 14, WHITE);
  fillRect(cx - 4, cy - 6, 8, 22, WHITE);
  fillRect(cx + 8, cy - 14, 8, 30, WHITE);
}

function iconBurst(cx: number, cy: number): void {
  // Explosion star: 8 spikes from the centre.
  for (let a = 0; a < 8; a++) {
    const ang = (a * Math.PI) / 4;
    for (let r = 0; r < 18; r++) {
      const x = Math.round(cx + Math.cos(ang) * r);
      const y = Math.round(cy + Math.sin(ang) * r);
      fillRect(x - 1, y - 1, 3, 3, WHITE);
    }
  }
  fillCircle(cx, cy, 6, WHITE);
}

function iconDrop(cx: number, cy: number): void {
  fillCircle(cx, cy + 4, 11, WHITE);
  for (let i = 0; i < 12; i++) {
    fillRect(cx - 11 + i, cy - 14 + i, 23 - 2 * i, 1, WHITE);
  }
}

function iconCross(cx: number, cy: number): void {
  fillRect(cx - 4, cy - 16, 8, 32, WHITE);
  fillRect(cx - 16, cy - 4, 32, 8, WHITE);
}

function iconNote(cx: number, cy: number): void {
  fillCircle(cx - 6, cy + 10, 7, WHITE);
  fillRect(cx + 1, cy - 16, 3, 26, WHITE);
  fillRect(cx + 1, cy - 16, 12, 3, WHITE);
  fillRect(cx + 10, cy - 13, 3, 8, WHITE);
}

// ------------------------------------------------------------- stories ---
// Thursday 26 November 2026, from the Reuters World News Summary of that
// day (Kim item first reported by KCNA on Thursday 26 Nov). Headlines are
// kept short so they wrap to two lines at scale 3 inside a 440px card.
interface Story {
  tag: string;
  color: RGB;
  icon: (cx: number, cy: number) => void;
  headline: string;
  sub: string;
}

const STORIES: Story[] = [
  {
    tag: "NORTH KOREA",
    color: [0xb3, 0x26, 0x1e],
    icon: iconMissile,
    headline: "KIM ORDERS WIDER TACTICAL NUCLEAR DEPLOYMENT",
    sub: "KCNA: ARSENAL TO SPREAD ACROSS DOMAINS; STATUS 'INVIOLABLE'.",
  },
  {
    tag: "TRADE",
    color: [0x1d, 0x4e, 0xd8],
    icon: iconChart,
    headline: "US PROPOSES NEW TARIFFS ON 14 PARTNERS",
    sub: "CHINA HIT HARDEST; BRAZIL AIRCRAFT +10%. S&P FUTURES -2.1%.",
  },
  {
    tag: "UKRAINE WAR",
    color: [0xb4, 0x53, 0x09],
    icon: iconBurst,
    headline: "UKRAINE HITS RUSSIAN AIR BASE; KYIV STRUCK",
    sub: "5 PLANES DAMAGED AT SAVASLEYKA; MISSILES HIT KYIV MALL.",
  },
  {
    tag: "ENERGY",
    color: [0x16, 0x65, 0x34],
    icon: iconDrop,
    headline: "HOUTHIS CLAIM SAUDI REFINERY ATTACK",
    sub: "RAS TANURA AND RIYADH TARGETED; BRENT CRUDE TOPS $94.",
  },
  {
    tag: "CONGO",
    color: [0x0f, 0x76, 0x6e],
    icon: iconCross,
    headline: "UN EVACUATES EBOLA WORKERS FROM FIGHTING",
    sub: "10 HEALTH WORKERS AIRLIFTED FROM ITURI HOSPITAL, DRC.",
  },
  {
    tag: "MUSIC",
    color: [0x7c, 0x3a, 0xed],
    icon: iconNote,
    headline: "DURAN DURAN GUITARIST ANDY TAYLOR DIES AT 65",
    sub: "CO-WROTE 'RIO' AND 'HUNGRY LIKE THE WOLF'; DIED OF CANCER.",
  },
];

// ------------------------------------------------------------- layout ----
function drawCard(x: number, y: number, story: Story): void {
  const w = 476;
  const h = 248;
  // Card body + border + accent bar.
  fillRect(x, y, w, h, CARD);
  fillRect(x, y, w, 1, CARD_LINE);
  fillRect(x, y + h - 1, w, 1, CARD_LINE);
  fillRect(x, y, 1, h, CARD_LINE);
  fillRect(x + w - 1, y, 1, h, CARD_LINE);
  fillRect(x, y, w, 8, story.color);

  // Tag, top-left; icon disc, top-right. The text block is centred
  // vertically in the card so short and long headlines fill it alike.
  const headLines = wrapText(story.headline, 440, 3).slice(0, 3);
  const subLines = wrapText(story.sub, 440, 2).slice(0, 3);
  const contentH = 14 + 16 + headLines.length * 30 + 14 + subLines.length * 18;
  const startY = y + 8 + Math.max(16, Math.floor((h - 8 - contentH) / 2));
  drawText(story.tag, x + 18, startY, 2, story.color);
  fillCircle(x + w - 44, startY + 18, 26, story.color);
  story.icon(x + w - 44, startY + 18);

  // Headline (scale 3, up to 3 lines) and sub (scale 2, up to 3 lines).
  let hy = startY + 38;
  for (const line of headLines) {
    drawText(line, x + 18, hy, 3, INK);
    hy += 30;
  }
  let sy = hy + 14;
  for (const line of subLines) {
    drawText(line, x + 18, sy, 2, GREY);
    sy += 18;
  }

  // Thin rule + small squares near the card bottom.
  fillRect(x + 18, y + h - 26, w - 36, 1, CARD_LINE);
  fillRect(x + 18, y + h - 20, 8, 8, story.color);
  fillRect(x + 32, y + h - 20, 8, 8, story.color);
  fillRect(x + 46, y + h - 20, 8, 8, story.color);
}

function drawPoster(): void {
  fillRect(0, 0, W, H, PAPER);

  // Masthead.
  fillRect(0, 0, W, 148, NAVY);
  // Globe mark, top-left: ring + equator + meridian.
  ring(72, 74, 34, 4, WHITE);
  fillRect(40, 72, 64, 3, WHITE);
  fillRect(70, 42, 3, 64, WHITE);
  drawText("THURSDAY", 132, 30, 2, WHITE);
  drawText("26 NOVEMBER 2026", 132, 56, 5, WHITE);
  drawText("WORLD NEWS IN ONE IMAGE", 132, 108, 2, WHITE);
  // Red divider under the masthead.
  fillRect(0, 148, W, 8, RED);

  // Six cards: 2 columns x 3 rows.
  const xs = [24, 524];
  const ys = [172, 436, 700];
  for (let i = 0; i < 6; i++) {
    drawCard(xs[i % 2], ys[Math.floor(i / 2)], STORIES[i]);
  }

  // Footer: sources.
  drawTextCentered(
    "SOURCES: REUTERS WORLD NEWS SUMMARY, 26 NOVEMBER 2026 - KCNA",
    512,
    972,
    2,
    GREY,
  );
}

// --------------------------------------------------------------- main ----
function main(): void {
  drawPoster();
  const png = encodePNG(px);
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "entry.png");
  writeFileSync(outPath, png);

  // Verify what we wrote: PNG signature, IHDR size 1024x1024, size cap.
  const back = readFileSync(outPath);
  if (back.length > 1048576) {
    throw new Error(`entry.png is ${back.length} bytes, over the 1 MiB cap`);
  }
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < 8; i++) {
    if (back[i] !== sig[i]) throw new Error("entry.png has a bad PNG signature");
  }
  const w = back.readUInt32BE(16);
  const h = back.readUInt32BE(20);
  if (w !== 1024 || h !== 1024) {
    throw new Error(`IHDR is ${w}x${h}, expected 1024x1024`);
  }
  console.log(`wrote ${outPath}: ${back.length} bytes, IHDR ${w}x${h}`);
}

main();
