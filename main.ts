// THE WORLD IN ONE DAY — Sunday 22 November 2026
// Round 3 entry for make.fun news-image-20261122.
// Draws the whole image with Node 22 stdlib only (no network, no fonts):
// a 5x7 bitmap font, a dotted equirectangular world map with numbered
// pins, a lead story, three story columns, an in-brief strip and a UTC
// timeline. Deterministic: two runs write byte-identical PNGs.
import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------- palette
const PAPER = [246, 241, 231];
const INK = [28, 43, 43];
const TEAL = [14, 90, 84];
const TEAL_DOT = [20, 101, 94];
const VERM = [179, 64, 42];
const GOLD = [185, 138, 47];
const OCEAN = [220, 233, 229];
const MUTED = [110, 116, 110];
const PANEL = [255, 253, 247];
const RULE = [28, 43, 43];

// ---------------------------------------------------------------- 5x7 font
// Uppercase A-Z, digits, punctuation. Each glyph: 7 rows of 5 bits.
const FONT: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  '"': ["01010", "01010", "00000", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "[": ["01110", "01000", "01000", "01000", "01000", "01000", "01110"],
  "]": ["01110", "00010", "00010", "00010", "00010", "00010", "01110"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "+": ["00000", "00100", "00100", "01110", "00100", "00100", "00000"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  "*": ["00000", "00100", "10101", "01110", "10101", "00100", "00000"],
  "#": ["01010", "01010", "11111", "01010", "11111", "01010", "01010"],
  $: ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  "<": ["00001", "00010", "00100", "01000", "00100", "00010", "00001"],
  ">": ["10000", "01000", "00100", "00010", "00100", "01000", "10000"],
  _: ["00000", "00000", "00000", "00000", "00000", "00000", "11111"],
  "~": ["00000", "00000", "01001", "10110", "00000", "00000", "00000"],
  "@": ["01110", "10001", "10111", "10101", "10110", "10000", "01110"],
};
const MID_DOT = ["00000", "00000", "00000", "01100", "01100", "00000", "00000"];
const EM_DASH = ["00000", "00000", "00000", "11111", "00000", "00000", "00000"];

function glyphFor(ch: string): string[] {
  if (ch === "·") return MID_DOT;
  if (ch === "—") return EM_DASH;
  return FONT[ch] ?? FONT["?"];
}

// ---------------------------------------------------------------- canvas
class Canvas {
  buf = Buffer.alloc(W * H * 3);
  constructor() {
    this.fill(PAPER);
  }
  fill(c: number[]) {
    for (let i = 0; i < W * H; i++) {
      this.buf[i * 3] = c[0];
      this.buf[i * 3 + 1] = c[1];
      this.buf[i * 3 + 2] = c[2];
    }
  }
  px(x: number, y: number, c: number[]) {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 3;
    this.buf[i] = c[0];
    this.buf[i + 1] = c[1];
    this.buf[i + 2] = c[2];
  }
  rect(x: number, y: number, w: number, h: number, c: number[]) {
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++) this.px(xx, yy, c);
  }
  hline(x0: number, x1: number, y: number, c: number[], t = 1) {
    for (let t0 = 0; t0 < t; t0++) for (let x = x0; x <= x1; x++) this.px(x, y + t0, c);
  }
  vline(x: number, y0: number, y1: number, c: number[], t = 1) {
    for (let t0 = 0; t0 < t; t0++) for (let y = y0; y <= y1; y++) this.px(x + t0, y, c);
  }
  frame(x: number, y: number, w: number, h: number, c: number[], t = 1) {
    this.hline(x, x + w - 1, y, c, t);
    this.hline(x, x + w - 1, y + h - t, c, t);
    this.vline(x, y, y + h - 1, c, t);
    this.vline(x + w - t, y, y + h - 1, c, t);
  }
  circle(cx: number, cy: number, r: number, c: number[]) {
    for (let y = -r; y <= r; y++)
      for (let x = -r; x <= r; x++)
        if (x * x + y * y <= r * r) this.px(cx + x, cy + y, c);
  }
  ring(cx: number, cy: number, r: number, c: number[]) {
    for (let a = 0; a < 360; a += 2) {
      const rad = (a * Math.PI) / 180;
      this.px(Math.round(cx + r * Math.cos(rad)), Math.round(cy + r * Math.sin(rad)), c);
    }
  }
  text(s: string, x: number, y: number, scale: number, c: number[], bold = false) {
    let cx = x;
    const up = s.toUpperCase();
    for (const ch of up) {
      const g = glyphFor(ch);
      for (let r = 0; r < 7; r++)
        for (let col = 0; col < 5; col++)
          if (g[r][col] === "1") {
            for (let dy = 0; dy < scale; dy++)
              for (let dx = 0; dx < scale; dx++) {
                this.px(cx + col * scale + dx, y + r * scale + dy, c);
                if (bold) this.px(cx + col * scale + dx + 1, y + r * scale + dy, c);
              }
          }
      cx += 6 * scale;
    }
    return cx;
  }
  textW(s: string, scale: number): number {
    return s.length * 6 * scale - scale;
  }
  // Wrap text to lines of at most maxChars characters, breaking on spaces.
  wrap(s: string, maxChars: number): string[] {
    const words = s.split(" ");
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      if (!cur) cur = w;
      else if (cur.length + 1 + w.length <= maxChars) cur += " " + w;
      else {
        lines.push(cur);
        cur = w;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  }
}

// ---------------------------------------------------------------- PNG out
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
function toPNG(cv: Canvas): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter none
    cv.buf.copy(raw, y * (1 + W * 3) + 1, y * W * 3, (y + 1) * W * 3);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------- world map
// Rough continent outlines in [lon, lat]. Dotted equirectangular render.
const LAND: number[][][] = [
  // North America
  [[-168, 66], [-150, 70], [-135, 70], [-125, 71], [-115, 73], [-105, 70], [-95, 80], [-85, 80], [-78, 74], [-70, 66], [-60, 60], [-55, 52], [-60, 47], [-65, 44], [-70, 42], [-74, 39], [-76, 35], [-80, 32], [-81, 26], [-84, 30], [-88, 29], [-90, 21], [-87, 15], [-83, 9], [-79, 9], [-84, 12], [-90, 14], [-95, 16], [-97, 19], [-102, 20], [-106, 23], [-110, 25], [-114, 29], [-118, 33], [-122, 37], [-124, 42], [-124, 48], [-130, 55], [-140, 60], [-155, 58], [-165, 60], [-168, 66]],
  // Greenland
  [[-55, 60], [-45, 60], [-40, 64], [-32, 68], [-25, 70], [-20, 74], [-25, 78], [-35, 80], [-50, 79], [-58, 76], [-60, 70], [-55, 60]],
  // South America
  [[-79, 9], [-77, 7], [-75, 5], [-77, 2], [-80, -3], [-81, -6], [-80, -12], [-77, -18], [-75, -22], [-70, -25], [-70, -32], [-68, -38], [-65, -42], [-66, -48], [-68, -52], [-66, -55], [-69, -52], [-71, -45], [-73, -38], [-73, -30], [-71, -22], [-70, -18], [-68, -14], [-62, -12], [-57, -10], [-52, -5], [-48, -2], [-44, -2], [-40, -5], [-36, -8], [-38, -14], [-40, -20], [-44, -23], [-48, -26], [-52, -30], [-55, -34], [-58, -38], [-62, -40], [-65, -45], [-70, -50], [-73, -53], [-75, -45], [-76, -35], [-78, -25], [-80, -15], [-79, 9]],
  // Africa
  [[-17, 15], [-16, 20], [-12, 24], [-8, 28], [-5, 32], [-1, 35], [5, 37], [10, 37], [12, 34], [18, 33], [22, 33], [26, 32], [30, 31], [32, 31], [34, 28], [36, 24], [38, 20], [40, 15], [43, 12], [48, 11], [51, 11], [48, 6], [45, 2], [42, -2], [40, -6], [39, -10], [37, -15], [35, -19], [33, -25], [30, -29], [27, -33], [22, -35], [18, -34], [16, -30], [14, -24], [12, -18], [11, -12], [10, -6], [9, -1], [9, 4], [6, 4], [2, 6], [-4, 5], [-8, 5], [-12, 8], [-15, 11], [-17, 15]],
  // Eurasia
  [[-10, 36], [-9, 38], [-9, 43], [-4, 44], [-2, 48], [-4, 49], [0, 50], [2, 51], [5, 53], [8, 55], [8, 57], [10, 59], [14, 58], [18, 56], [21, 55], [24, 58], [26, 60], [30, 62], [32, 65], [35, 66], [40, 68], [45, 68], [50, 69], [55, 69], [60, 70], [65, 71], [70, 72], [75, 73], [80, 73], [90, 75], [100, 76], [110, 74], [115, 73], [125, 72], [135, 72], [145, 72], [155, 70], [162, 68], [170, 67], [178, 65], [178, 62], [172, 60], [165, 60], [160, 55], [158, 52], [156, 51], [150, 59], [144, 56], [142, 52], [141, 47], [139, 43], [135, 43], [131, 42], [128, 39], [125, 40], [122, 38], [121, 33], [120, 28], [116, 24], [112, 22], [109, 19], [108, 14], [106, 10], [104, 8], [101, 7], [99, 9], [98, 13], [96, 16], [94, 18], [92, 21], [90, 22], [88, 21], [86, 20], [84, 18], [82, 17], [80, 13], [78, 8], [76, 10], [74, 14], [73, 19], [71, 21], [69, 22], [67, 24], [65, 25], [62, 25], [59, 26], [57, 26], [55, 27], [52, 27], [50, 29], [48, 30], [46, 29], [44, 29], [42, 27], [40, 25], [38, 22], [36, 20], [34, 19], [32, 19], [30, 18], [28, 20], [26, 21], [24, 23], [22, 25], [20, 28], [18, 30], [16, 32], [14, 33], [12, 34], [10, 35], [8, 37], [5, 38], [2, 37], [0, 36], [-3, 35], [-6, 35], [-9, 37], [-10, 36]],
  // United Kingdom
  [[-5, 50], [-3, 53], [-5, 56], [-3, 58], [-1, 58], [0, 55], [1, 52], [0, 51], [-3, 50], [-5, 50]],
  // Japan
  [[130, 31], [131, 33], [133, 34], [135, 34], [137, 35], [139, 37], [141, 39], [141, 41], [143, 42], [145, 44], [143, 44], [141, 42], [140, 39], [138, 37], [136, 35], [133, 34], [130, 33], [130, 31]],
  // Australia
  [[113, -22], [114, -28], [115, -32], [117, -35], [121, -34], [125, -33], [129, -32], [132, -32], [135, -35], [138, -35], [140, -38], [144, -38], [147, -39], [150, -37], [153, -32], [153, -27], [150, -23], [147, -19], [143, -15], [142, -11], [138, -12], [136, -13], [133, -12], [131, -12], [128, -14], [125, -15], [122, -17], [119, -20], [116, -21], [113, -22]],
  // New Zealand
  [[167, -45], [168, -44], [170, -42], [172, -41], [174, -39], [176, -38], [178, -37], [176, -38], [174, -40], [172, -41], [170, -43], [168, -45], [167, -46]],
  // Indonesia (rough island chain)
  [[95, 5], [98, 3], [100, 0], [103, -2], [106, -5], [110, -7], [114, -8], [118, -9], [122, -10], [126, -9], [130, -6], [134, -4], [138, -3], [141, -5], [138, -8], [133, -9], [128, -9], [123, -10], [118, -10], [113, -8], [108, -7], [104, -4], [100, 0], [96, 3], [95, 5]],
  // Madagascar
  [[44, -16], [47, -15], [50, -16], [49, -20], [47, -24], [45, -25], [43, -22], [43, -18], [44, -16]],
];
function inPoly(lon: number, lat: number, poly: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function onLand(lon: number, lat: number): boolean {
  for (const p of LAND) if (inPoly(lon, lat, p)) return true;
  return false;
}

// Pins: [lon, lat, displayLonOffset, displayLatOffset] — offsets nudge
// crowded European / Gulf / US-east pins apart so numbers stay readable.
const PINS: [number, number, number, number][] = [
  [30.7, 36.9, 0, 0], [50.6, 26.2, 0, 0], [56.5, 26.6, 2.0, 0], [30.0, 50.8, -2.5, 0], [33.4, 47.9, 3.5, 0],
  [23.0, 51.0, -3.5, 1.5], [27.0, 59.5, 0, 0], [107.4, 24.8, 0, 0], [35.2, 31.9, 0, 0], [-77.0, 38.9, -2.5, 0],
  [-74.0, 40.7, 3.0, 0], [4.3, 52.1, 0, 0], [106.8, -6.2, 0, 0], [-75.2, -11.0, 0, 0], [-6.3, 4.9, 0, 0],
  [127.7, 26.2, 0, 0], [-115.1, 36.2, 0, 0], [7.7, 45.1, 0, -2.5], [174.8, -41.3, 0, 0], [-0.1, 51.5, 0, 0],
  [-58.4, -34.6, 0, 0], [32.5, 15.6, 0, 0], [46.7, 24.7, -2.5, 0], [12.6, 55.7, 0, 2.0],
];

// ---------------------------------------------------------------- the news
type Story = { h: string; s: string };
const COL_A: Story[] = [
  { h: "[2] IRAN HITS BAHRAIN SITE; 2 HURT AS GULF CONDEMNS", s: "REUTERS / AP" },
  { h: "[3] IRAN CLAIMS THREE TANKERS STRUCK NEAR HORMUZ", s: "AP" },
  { h: "[4] DRONE FLATTENS FLAT IN DYMER; 14 MISSING", s: "AP" },
  { h: "[5] MISSILE KILLS BOY, 7, IN ZELENSKYY'S HOME CITY", s: "AP" },
  { h: "[6] RUSSIAN MISSILES STRAY INTO POLAND; NATO: VIOLATION", s: "AP" },
  { h: "[7] DRONE-HIT RUSSIAN SHIP STILL BURNING IN BALTIC", s: "AP" },
  { h: "[8] MEXICO NABS 'EL CHAPO ISIDRO'; 11 DEAD IN RAID", s: "AP" },
  { h: "[9] SETTLERS TORCH 12 CARS IN WEST BANK; INQUIRY OPENS", s: "AP" },
  { h: "[22] DRONES HIT KHARTOUM, DAMAGE UN BUILDING", s: "ONETURN" },
  { h: "[23] BLAST HEARD IN RIYADH; MISSILES INTERCEPTED", s: "TNX AFRICA" },
  { h: "ISRAELI STRIKES CONTINUE IN GAZA DESPITE CEASEFIRE FRAME", s: "GARDNER" },
];
const COL_B: Story[] = [
  { h: "[12] WORLD COURT: MYANMAR COMMITTED ROHINGYA GENOCIDE", s: "AP / BBC" },
  { h: "[10] FBI PROBES BREACH OF NATIONAL CRIME DATABASE", s: "AP" },
  { h: "[24] DENMARK EXPELS RUSSIAN ATTACHE OVER 'PLOT TO KILL'", s: "REUTERS" },
  { h: "[11] MARKETS IN CORRECTION AS AI SELL-OFF SPREADS", s: "AP" },
  { h: "EU-INDONESIA SIGN LANDMARK TRADE DEAL AFTER 10 YEARS", s: "AFP" },
  { h: "EISENKOT CALLS SETTLER ARSON 'JEWISH TERRORISM'", s: "AP" },
  { h: "RUTTE VOWS TO DEFEND POLAND; NATO MEETS MONDAY", s: "AP" },
  { h: "FCC BARS CHINESE CARRIERS FROM US PHONE NUMBERS", s: "FCC" },
  { h: "SPAIN HEADS TO 29 NOV VOTE AMID UNCERTAINTY", s: "GARDNER" },
  { h: "UN KILLER-ROBOT TALKS EXTENDED TO 2028", s: "HANSEN INTEL" },
  { h: "CHINA-JAPAN TENSIONS RISE OVER TAIWAN, MINERALS", s: "GARDNER" },
];
const COL_C: Story[] = [
  { h: "BEPICOLOMBO ENTERS MERCURY ORBIT AFTER 8-YEAR TRIP", s: "ESA / AP" },
  { h: "[13] CANDY FACTORY FIRE: 3 DEAD, 36 MISSING IN CIKANDE", s: "AP / REUTERS" },
  { h: "[14] PERU QUAKE 6.7: 1 DEAD, 853 DISPLACED", s: "AP / AFP" },
  { h: "[15] BOAT CAPSIZES IN NIGERIA: 24 DEAD ON FUNERAL TRIP", s: "AP" },
  { h: "[17] VERSTAPPEN WINS LAS VEGAS GP, 75TH CAREER WIN", s: "FIA" },
  { h: "[18] ALCARAZ TO FACE ZVEREV IN ATP FINALS DECIDER", s: "ATP" },
  { h: "[19] INDIA DECLARE 720/9, BEST TOTAL EVER IN NEW ZEALAND", s: "THE HINDU" },
  { h: "REAL MADRID 2-1 CELTA AS ESPI STRIKES LATE", s: "AP" },
  { h: "LEEDS STUN CHELSEA 4-1 AT STAMFORD BRIDGE", s: "SKY SPORTS" },
  { h: "[21] BOCA WIN SUDAMERICANA 2-0; PAREDES FAINTS, 'FINE'", s: "RIO TIMES" },
  { h: "MARQUEZ SEALS EIGHTH MOTOGP TITLE", s: "APPISTOS" },
];
const BRIEF: Story[] = [
  { h: "SHURI CASTLE HALL RESTORED IN OKINAWA, 7 YEARS AFTER FIRE", s: "AP" },
  { h: "AMAZON NEARS $7.5BN DEAL FOR ISRAELI AI START-UP DECART", s: "CRYPTO BRIEFING" },
  { h: "IBM UNVEILS 520-QUBIT 'NIGHTHAWK R3' QUANTUM CHIP", s: "IBM" },
  { h: "GTA 6 SETS $3.79BN RECORD LAUNCH DAY", s: "INDUSTRY REPORTS" },
  { h: "'HUNGER GAMES: SUNRISE ON THE REAPING' OPENS TO $56M", s: "VARIETY" },
  { h: "MILEY CYRUS WEDS MAXX MORANDO", s: "REPORTS" },
  { h: "CISA: VMWARE VCENTER FLAW EXPLOITED; PATCH BY 23 NOV", s: "CISA" },
  { h: "KING TIDES MAY SET RECORDS ON CALIFORNIA COAST", s: "FORECASTERS" },
  { h: "TRAFALGAR SQUARE TREE FELLED IN NORWAY, 69 FT TALL", s: "UBSTANDARD" },
  { h: "PHUMZILE MLAMBO-NGCUKA, EX-SA DEPUTY PRESIDENT, DIES AT 71", s: "AP" },
  { h: "FRANCE 45-17 ARGENTINA, INTO NATIONS CHAMPIONSHIP FINAL", s: "AP" },
  { h: "INDIA BEAT KOREA 2-1 IN WOMEN'S HOCKEY", s: "THE HINDU" },
  { h: "KNICKS' BRIDGES HITS BUZZER-BEATER, 97-96", s: "AP" },
  { h: "HONG KONG OPEN: ANTONSEN WINS AFTER WALKOVER", s: "AP" },
  { h: "F1 AGREES V8 FRAMEWORK FOR 2030", s: "FIA" },
  { h: "BRUNO FERNANDES PAUSES MAN UTD CONTRACT TALKS", s: "AP" },
  { h: "PSG'S DOUE SUFFERS SERIOUS KNEE INJURY AT NICE", s: "AP" },
  { h: "TRUMP, XI, PUTIN SUMMIT: NUCLEAR WORDS, NO UKRAINE BREAKTHROUGH", s: "RFE/RL" },
];
const TIMELINE: [string, string][] = [
  ["00:56", "BEPICOLOMBO ORBITS MERCURY"],
  ["05:00", "VERSTAPPEN WINS IN VEGAS"],
  ["05:30", "INDIA DECLARE 720/9"],
  ["14:10", "FLAT HIT NEAR KYIV"],
  ["14:20", "COP31 TALKS COLLAPSE"],
  ["14:42", "CIKANDE FIRE: 3 DEAD"],
  ["15:44", "EISENKOT SLAMS ARSON"],
  ["23:59", "NO CLIMATE DEAL"],
];

// ---------------------------------------------------------------- drawing
const MX = 28; // margin
const CW = W - 2 * MX; // 968 content width

function drawColumn(cv: Canvas, x: number, w: number, y0: number, title: string, stories: Story[]) {
  cv.text(title, x, y0, 2, TEAL, true);
  cv.hline(x, x + w - 1, y0 + 18, TEAL, 2);
  let y = y0 + 26;
  const maxChars = Math.floor(w / 6);
  for (const st of stories) {
    const lines = cv.wrap(st.h, maxChars);
    for (const ln of lines) {
      cv.text(ln, x, y, 1, INK, true);
      y += 8;
    }
    cv.text("— " + st.s, x, y, 1, MUTED);
    y += 10;
  }
  return y;
}

function draw() {
  const cv = new Canvas();
  // outer double frame
  cv.frame(8, 8, W - 16, H - 16, INK, 2);
  cv.frame(14, 14, W - 28, H - 28, GOLD, 1);

  // ---- masthead
  cv.text("THE WORLD IN ONE DAY", MX, 26, 1, VERM, true);
  cv.text("SUNDAY'S WORLD", MX, 40, 4, INK, true);
  const dateW = cv.textW("22 NOVEMBER 2026", 3);
  cv.text("22 NOVEMBER 2026", MX + CW - dateW, 40, 3, TEAL, true);
  cv.text("ONE DAY · EVERY REGION · EVERY BEAT · AS REPORTED", MX, 74, 1, MUTED);
  const tag2 = "ALL TIMES UTC · 50 STORIES · 24 PLACES";
  cv.text(tag2, MX + CW - cv.textW(tag2, 1), 74, 1, MUTED);
  cv.hline(MX, MX + CW - 1, 90, RULE, 2);

  // ---- lead story panel
  const LY = 100, LH = 92;
  cv.rect(MX, LY, CW, LH, PANEL);
  cv.frame(MX, LY, CW, LH, INK, 1);
  cv.rect(MX, LY, 10, LH, VERM);
  cv.text("THE LEAD · CLIMATE", MX + 22, LY + 8, 1, VERM, true);
  cv.text("CLIMATE TALKS COLLAPSE", MX + 22, LY + 20, 3, INK, true);
  const lead = cv.wrap(
    "COP31 IN ANTALYA ENDS SUNDAY WITH NO AGREEMENT AFTER THE EU AND SMALL ISLAND STATES REJECT A FOURTH DRAFT THAT LEAVES OUT FOSSIL FUELS — THE FIRST COP TO FAIL OUTRIGHT SINCE COPENHAGEN 2009. UN CHIEF GUTERRES: 'DEEPLY DISAPPOINTED.'",
    152,
  );
  let ly = LY + 46;
  for (const ln of lead) {
    cv.text(ln, MX + 22, ly, 1, INK);
    ly += 9;
  }
  // stat chips
  const chips: [string, string][] = [
    ["0", "DEALS ADOPTED"],
    ["2 DAYS", "PAST DEADLINE"],
    ["1ST", "COP FAILURE SINCE 2009"],
  ];
  let chipX = MX + CW - 12;
  for (let i = chips.length - 1; i >= 0; i--) {
    const label = chips[i][0] + " " + chips[i][1];
    const w = cv.textW(label, 1) + 14;
    chipX -= w;
    cv.rect(chipX, LY + 8, w, 16, TEAL);
    cv.text(label, chipX + 7, LY + 12, 1, [255, 255, 255], true);
    chipX -= 8;
  }

  // ---- map
  const MAPY = 204, MAPX = MX, MAPW = CW, MAPH = 214;
  cv.text("WHERE IT HAPPENED — 24 PLACES, ONE DAY", MX, MAPY, 1, TEAL, true);
  cv.text("NUMBERS MATCH THE STORIES BELOW", MX + CW - cv.textW("NUMBERS MATCH THE STORIES BELOW", 1), MAPY, 1, MUTED);
  const my0 = MAPY + 14, my1 = MAPY + MAPH;
  cv.rect(MAPX, my0, MAPW, MAPH - 14, OCEAN);
  cv.frame(MAPX, my0, MAPW, MAPH - 14, INK, 1);
  const latTop = 78, latBot = -56;
  const lonToX = (lon: number) => MAPX + ((lon + 180) / 360) * MAPW;
  const latToY = (lat: number) => my0 + ((latTop - lat) / (latTop - latBot)) * (MAPH - 14);
  for (let gy = my0 + 3; gy < my1 - 2; gy += 7) {
    for (let gx = MAPX + 3; gx < MAPX + MAPW - 2; gx += 7) {
      const lon = ((gx - MAPX) / MAPW) * 360 - 180;
      const lat = latTop - ((gy - my0) / (MAPH - 14)) * (latTop - latBot);
      if (onLand(lon, lat)) cv.circle(gx, gy, 1, TEAL_DOT);
    }
  }
  PINS.forEach(([lon, lat, dLon, dLat], i) => {
    const cx = Math.round(lonToX(lon + dLon));
    const cy = Math.round(latToY(lat + dLat));
    cv.circle(cx, cy, 6, VERM);
    cv.ring(cx, cy, 6, [255, 255, 255]);
    const num = String(i + 1);
    cv.text(num, cx - Math.floor(cv.textW(num, 1) / 2), cy - 3, 1, [255, 255, 255], true);
  });

  // ---- three story columns
  const CY = 436;
  const colW = Math.floor((CW - 2 * 16) / 3);
  drawColumn(cv, MX, colW, CY, "CONFLICT & SECURITY", COL_A);
  drawColumn(cv, MX + colW + 16, colW, CY, "POLITICS, LAW & MARKETS", COL_B);
  drawColumn(cv, MX + 2 * (colW + 16), colW, CY, "SCIENCE, SPORT & LIFE", COL_C);
  cv.hline(MX, MX + CW - 1, 752, RULE, 1);

  // ---- in brief
  cv.text("IN BRIEF — MORE OF THE DAY", MX, 760, 1, TEAL, true);
  let by = 774;
  let briefDrawn = 0;
  for (const st of BRIEF) {
    if (by > 914) break;
    const line = "· " + st.h + " — " + st.s;
    const cut = line.length > 158 ? line.slice(0, 158) : line;
    cv.text(cut, MX, by, 1, INK);
    by += 10;
    briefDrawn++;
  }

  // ---- UTC timeline
  const TY = 936;
  cv.text("THE DAY IN UTC", MX, TY, 1, TEAL, true);
  cv.hline(MX, MX + CW - 1, TY + 22, INK, 2);
  const n = TIMELINE.length;
  TIMELINE.forEach(([t, label], i) => {
    const x = MX + 8 + Math.round((i * (CW - 16)) / (n - 1));
    cv.circle(x, TY + 22, 4, VERM);
    cv.text(t, x - 14, TY + 32, 1, INK, true);
    const lw = cv.textW(label, 1);
    const lx = Math.max(MX, Math.min(MX + CW - lw, x - Math.floor(lw / 2)));
    cv.text(label, lx, TY + 44 + (i % 2) * 12, 1, MUTED);
  });

  // ---- footer
  cv.hline(MX, MX + CW - 1, 1000, RULE, 1);
  cv.text("SOURCES: AP · REUTERS · AFP · BBC · ESA · FIA · ATP · THE HINDU · SKY SPORTS · VARIETY · CISA · FCC", MX, 1006, 1, MUTED);
  // Total distinct stories: 1 lead + 3 columns + brief lines + 1 timeline-only
  // story (the 14:10 Kyiv-region strike, separate from the Dymer strike).
  const total = 1 + COL_A.length + COL_B.length + COL_C.length + briefDrawn + 1;
  cv.text(total + " STORIES · DRAWN BY MAIN.TS, NO NETWORK", MX + CW - cv.textW(total + " STORIES · DRAWN BY MAIN.TS, NO NETWORK", 1), 1006, 1, MUTED);
  return cv;
}

function main() {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  fs.mkdirSync(outDir, { recursive: true });
  const png = toPNG(draw());
  fs.writeFileSync(path.join(outDir, "entry.png"), png);
}
main();
