// THE SUNDAY GLOBE — 22 November 2026.
// One image summing up the world's news of Sunday 22 November 2026.
// Draws the whole broadsheet with a hand-built 5x7 bitmap font and a
// hand-rolled PNG writer (zlib from the Node standard library only).
// No network, no clock, no randomness: two runs write identical bytes.
import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";

const W = 1024;
const H = 1024;

// ---- palette ----
const PAPER = [250, 246, 236];
const INK = [22, 24, 30];
const NAVY = [20, 33, 61];
const NAVY2 = [28, 46, 84];
const RED = [178, 34, 34];
const GOLD = [176, 141, 26];
const TEAL = [27, 127, 122];
const GREY = [110, 110, 104];
const LIGHT = [232, 226, 212];
const RULE = [200, 192, 172];
const PURPLE = [108, 74, 176];
const ORANGE = [211, 84, 0];
const MAPDOT = [96, 118, 148];

// ---- 5x7 bitmap font: each glyph is 7 rows of 5 bits ----
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
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["01110", "10000", "11110", "10001", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00010", "00100", "00000", "00100"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "$": ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  "•": ["00000", "00000", "01100", "01100", "01100", "00000", "00000"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  '"': ["01010", "01010", "00000", "00000", "00000", "00000", "00000"],
  _: ["00000", "00000", "00000", "00000", "00000", "00000", "11111"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
};

function textWidth(s: string, scale: number): number {
  return s.length * 6 * scale - scale;
}

function wrapText(s: string, maxChars: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (cur === "") {
      cur = w;
    } else if (cur.length + 1 + w.length <= maxChars) {
      cur += " " + w;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}

// ---- canvas ----
class Canvas {
  buf: Buffer;
  constructor() {
    this.buf = Buffer.alloc(W * H * 3);
    for (let i = 0; i < W * H; i++) {
      this.buf[i * 3] = PAPER[0];
      this.buf[i * 3 + 1] = PAPER[1];
      this.buf[i * 3 + 2] = PAPER[2];
    }
  }
  px(x: number, y: number, c: number[]): void {
    if (x < 0 || x >= W || y < 0 || y >= H) return;
    const o = (y * W + x) * 3;
    this.buf[o] = c[0];
    this.buf[o + 1] = c[1];
    this.buf[o + 2] = c[2];
  }
  rect(x: number, y: number, w: number, h: number, c: number[]): void {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) this.px(xx, yy, c);
    }
  }
  hline(x: number, y: number, w: number, c: number[]): void {
    for (let xx = x; xx < x + w; xx++) this.px(xx, y, c);
  }
  vline(x: number, y: number, h: number, c: number[]): void {
    for (let yy = y; yy < y + h; yy++) this.px(x, yy, c);
  }
  disc(cx: number, cy: number, r: number, c: number[]): void {
    for (let yy = cy - r; yy <= cy + r; yy++) {
      for (let xx = cx - r; xx <= cx + r; xx++) {
        if ((xx - cx) * (xx - cx) + (yy - cy) * (yy - cy) <= r * r) {
          this.px(xx, yy, c);
        }
      }
    }
  }
  ring(cx: number, cy: number, r: number, c: number[]): void {
    for (let a = 0; a < 360; a += 4) {
      const rad = (a * Math.PI) / 180;
      this.px(Math.round(cx + r * Math.cos(rad)), Math.round(cy + r * Math.sin(rad)), c);
    }
  }
  text(x: number, y: number, s: string, scale: number, c: number[]): void {
    let cx = x;
    for (const ch of s.toUpperCase()) {
      const g = FONT[ch] || FONT[" "];
      for (let r = 0; r < 7; r++) {
        for (let col = 0; col < 5; col++) {
          if (g[r][col] === "1") {
            this.rect(cx + col * scale, y + r * scale, scale, scale, c);
          }
        }
      }
      cx += 6 * scale;
    }
  }
  textCenter(cx: number, y: number, s: string, scale: number, c: number[]): void {
    this.text(cx - Math.floor(textWidth(s, scale) / 2), y, s, scale, c);
  }
}

// ---- PNG writer (CRC32 + zlib from stdlib) ----
const CRC_TABLE: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t.push(c >>> 0);
  }
  return t;
})();

function crc32(b: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8);
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

function toPng(cv: Canvas): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    cv.buf.copy(raw, y * (1 + W * 3) + 1, y * W * 3, (y + 1) * W * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = zlib.deflateSync(raw, { level: 9 });
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---- the day's news: 52 stories, all reported 21-22 November 2026 ----
interface Story {
  tag: string;
  head: string;
}

const LEAD: Story = {
  tag: "CLIMATE SUMMIT - ANTALYA",
  head: "COP31 COLLAPSES",
};
const LEAD_SUMMARY: string[] = [
  "Two weeks of talks end with no deal. The EU refuses a final text with no mention of fossil fuels, and delegates leave Antalya with nothing agreed.",
];
const LEAD_SOURCE = "BBC - REUTERS - AFP - 22 NOV 2026";

const TOP4: Story[] = [
  { tag: "GULF", head: "IRAN HITS US BASES IN BAHRAIN" },
  { tag: "AMERICAS", head: "'EL CHAPO ISIDRO' SEIZED IN SINALOA" },
  { tag: "UKRAINE", head: "MISSILE KILLS BOY, 7, IN KRYVYI RIH" },
  { tag: "MARKETS", head: "STOCKS SLIDE INTO CORRECTION" },
];
const TOP4_SUB: string[] = [
  "IRGC claims two Patriot radars struck; Bahrain says a factory was hit and two people hurt.",
  "Mexican special forces capture cartel boss Fausto Isidro Meza Flores; 11 dead in the raid.",
  "Russian strike on Zelenskyy's hometown kills a child and a woman, wounds 60.",
  "S&P 500 falls 3.7% and Nasdaq 5.3% as the AI sell-off spreads to Japan and Korea.",
];

const GRID: Story[] = [
  { tag: "GULF", head: "THREE TANKERS HIT NEAR STRAIT OF HORMUZ" },
  { tag: "GULF", head: "CENTCOM DENIES IRAN'S F-16 DAMAGE CLAIM" },
  { tag: "GULF", head: "IRAN SAYS 20TH US DRONE DOWNED SINCE FEBRUARY" },
  { tag: "GULF", head: "HOUTHIS FIRE THREE MISSILES AT RIYADH" },
  { tag: "WORLD", head: "ICJ: MYANMAR COMMITTED ROHINGYA GENOCIDE" },
  { tag: "TRADE", head: "EU-INDONESIA SIGN LANDMARK TRADE DEAL" },
  { tag: "ASIA", head: "CIKANDE FACTORY FIRE: 3 DEAD, 36 MISSING" },
  { tag: "GULF", head: "HARTHA POWER FIRE KILLS 4, HURTS 35 IN BASRA" },
  { tag: "ASIA", head: "TOXIC ALCOHOL KILLS 11 IN MANIPUR" },
  { tag: "AFRICA", head: "BOAT CAPSIZE KILLS 24 MOURNERS IN NIGERIA" },
  { tag: "AMERICAS", head: "PERU QUAKE 6.7: 1 DEAD, 853 DISPLACED" },
  { tag: "EUROPE", head: "DENMARK EXPELS RUSSIAN DEFENCE ATTACHE" },
  { tag: "UKRAINE", head: "DRONE COLLAPSES KYIV FLAT; 14 MISSING" },
  { tag: "UKRAINE", head: "RUSSIAN SHIP SPARTA II ABLAZE IN BALTIC" },
  { tag: "EUROPE", head: "FINLAND PROBES RUSSIAN HELICOPTER INCURSION" },
  { tag: "UKRAINE", head: "CRIMEAN BRIDGE DAMAGED IN STRIKES" },
  { tag: "WORLD", head: "UN EXTENDS KILLER-ROBOT TALKS TO 2028" },
  { tag: "ASIA", head: "SEOUL MINISTER QUITS OVER AI EXAM SCANDAL" },
  { tag: "WORLD", head: "TRUMP, XI, PUTIN MEET IN SHENZHEN" },
  { tag: "USA", head: "FBI DATABASE BREACH CONFIRMED BY TRUMP" },
  { tag: "TECH", head: "AMAZON NEARS $7.5B DECART AI DEAL" },
  { tag: "TECH", head: "IBM UNVEILS 520-QUBIT NIGHTHAWK R3" },
  { tag: "TECH", head: "GTA 6 SCORES $3.79B RECORD LAUNCH" },
  { tag: "SPORT", head: "LEEDS THRASH CHELSEA 4-1 AT THE BRIDGE" },
  { tag: "SPORT", head: "ARSENAL HELD 2-2 BY NEWCASTLE" },
  { tag: "SPORT", head: "MAN CITY HELD 1-1 BY FULHAM" },
  { tag: "SPORT", head: "SPURS BEAT IPSWICH 2-0" },
  { tag: "SPORT", head: "BOURNEMOUTH 2-0 FOREST, INTO TOP FOUR" },
  { tag: "SPORT", head: "COVENTRY 3-2 PALACE; FRANK LOSES DEBUT" },
  { tag: "SPORT", head: "FERRARI FURY AT HAMILTON-LECLERC CLASH" },
  { tag: "SPORT", head: "POCHETTINO FACES LIVERPOOL IN FIRST GAME" },
  { tag: "SPORT", head: "PAREDES COLLAPSES ON LIVE TV" },
  { tag: "WORLD", head: "PAOLO BULGARI DIES AT 89" },
  { tag: "USA", head: "FLORIDA RIVER BREAKS 73-YEAR RECORD" },
  { tag: "EUROPE", head: "CROATIA RALLY OVER PATIENT DEATH" },
  { tag: "AMERICAS", head: "GUATEMALA ARRESTS WANTED MEXICAN" },
  { tag: "AMERICAS", head: "HAITI BLAST KILLS SALVADORAN SOLDIER" },
  { tag: "GULF", head: "THREE KILLED IN GAZA DRONE STRIKE" },
  { tag: "GULF", head: "WEST BANK ARSON CONDEMNED" },
  { tag: "GULF", head: "UNIFIL HANDS POSTS TO LEBANESE ARMY" },
  { tag: "GULF", head: "HAMAS CALLS TUNNEL OP CEASEFIRE BREACH" },
  { tag: "EUROPE", head: "TURKISH POLICE RAID SOZCU TV" },
  { tag: "USA", head: "FBI ARRESTS MAN OVER $26,000 IS TRANSFERS" },
  { tag: "EUROPE", head: "EU BUDGET PLAN: 1.78TN EURO FOR 2028-34" },
  { tag: "WORLD", head: "CHINA RENEWS UN BID TO BLACKLIST BLA" },
  { tag: "ASIA", head: "PAKISTAN KILLS 15 MILITANTS IN MASTUNG" },
  { tag: "USA", head: "TRUMP WANTS 'PERMANENT' IRAN DEAL" },
];

// ---- the day in UTC: six moments, times as published ----
const TIMELINE: { t: string; s: string }[] = [
  { t: "02:54", s: "BAHRAIN: IRANIAN STRIKE HITS INDUSTRIAL SITE; FIRE REPORTED" },
  { t: "03:22", s: "IRAN LAUNCHES TWO WAVES OF ATTACKS ON US BASES IN BAHRAIN" },
  { t: "06:21", s: "ARSENAL GO SIX CLEAR AFTER 2-2 DRAW AT NEWCASTLE" },
  { t: "08:01", s: "LEEDS STUN CHELSEA 4-1; FULL PREMIER LEAGUE ROUND-UP" },
  { t: "10:32", s: "REUTERS: BAHRAIN SAYS TWO INJURED; AIR DEFENCES INTERCEPT" },
  { t: "13:21", s: "INDONESIA: SEVEN BODY BAGS FROM CIKANDE FACTORY FIRE" },
];

// ---- pins: place, latitude, longitude, region colour ----
const PINS: { name: string; lat: number; lon: number; c: number[] }[] = [
  { name: "ANTALYA", lat: 36.9, lon: 30.7, c: GOLD },
  { name: "MANAMA", lat: 26.2, lon: 50.6, c: RED },
  { name: "HORMUZ", lat: 26.5, lon: 56.3, c: RED },
  { name: "RIYADH", lat: 24.7, lon: 46.7, c: RED },
  { name: "HODEIDAH", lat: 14.8, lon: 42.9, c: RED },
  { name: "SINALOA", lat: 25.6, lon: -108.5, c: PURPLE },
  { name: "KRYVYI RIH", lat: 47.9, lon: 33.4, c: GOLD },
  { name: "KYIV", lat: 50.5, lon: 30.5, c: GOLD },
  { name: "GULF OF FINLAND", lat: 59.9, lon: 25.0, c: GOLD },
  { name: "COPENHAGEN", lat: 55.7, lon: 12.6, c: GOLD },
  { name: "HELSINKI", lat: 60.2, lon: 25.0, c: GOLD },
  { name: "CIKANDE", lat: -6.2, lon: 106.2, c: TEAL },
  { name: "BASRA", lat: 30.5, lon: 47.8, c: RED },
  { name: "MANIPUR", lat: 24.8, lon: 93.9, c: TEAL },
  { name: "BAYELSA", lat: 4.8, lon: 6.3, c: ORANGE },
  { name: "JUNIN", lat: -11.2, lon: -75.9, c: PURPLE },
  { name: "SEOUL", lat: 37.6, lon: 127.0, c: TEAL },
  { name: "SHENZHEN", lat: 22.5, lon: 114.1, c: TEAL },
  { name: "GAZA", lat: 31.5, lon: 34.5, c: RED },
  { name: "WEST BANK", lat: 31.9, lon: 35.2, c: RED },
  { name: "BEIRUT", lat: 33.9, lon: 35.5, c: RED },
  { name: "ISTANBUL", lat: 41.0, lon: 29.0, c: GOLD },
  { name: "LONDON", lat: 51.5, lon: -0.1, c: GOLD },
  { name: "COCOA, FLORIDA", lat: 28.4, lon: -80.7, c: PURPLE },
];

// ---- stylised world map: land as rectangles on a 60 x 24 grid ----
const LAND: [number, number, number, number][] = [
  [2, 2, 6, 3], // Alaska
  [6, 2, 16, 4], // Canada
  [16, 1, 19, 3], // Greenland
  [7, 5, 15, 7], // USA
  [8, 8, 13, 10], // Mexico and Central America
  [13, 10, 18, 12], // South America north
  [14, 13, 18, 15], // South America middle
  [15, 16, 17, 18], // South America south
  [28, 4, 29, 4], // Britain
  [30, 2, 32, 4], // Scandinavia
  [28, 5, 33, 6], // Europe
  [28, 8, 35, 9], // North Africa
  [28, 10, 34, 12], // Africa middle
  [30, 13, 33, 15], // Southern Africa
  [35, 14, 35, 15], // Madagascar
  [34, 7, 38, 8], // Middle East
  [33, 1, 55, 3], // Russia
  [36, 4, 45, 5], // Central Asia
  [40, 8, 42, 10], // India
  [44, 8, 47, 11], // South-East Asia
  [44, 5, 50, 7], // China
  [52, 5, 53, 6], // Japan
  [45, 11, 50, 12], // Indonesia
  [48, 16, 54, 18], // Australia
  [55, 18, 56, 19], // New Zealand
];

const TAG_COLOR: Record<string, number[]> = {
  GULF: RED,
  UKRAINE: GOLD,
  WORLD: NAVY2,
  TRADE: TEAL,
  ASIA: TEAL,
  AFRICA: ORANGE,
  AMERICAS: PURPLE,
  EUROPE: GOLD,
  USA: PURPLE,
  TECH: NAVY2,
  SPORT: TEAL,
  MARKETS: RED,
  CLIMATE: RED,
};

// ---- layout ----
function drawMasthead(cv: Canvas): void {
  cv.rect(0, 0, W, 88, NAVY);
  cv.textCenter(512, 12, "THE SUNDAY GLOBE", 6, PAPER);
  cv.textCenter(512, 62, "SUNDAY, 22 NOVEMBER 2026", 2, GOLD);
  cv.hline(0, 88, W, GOLD);
  cv.hline(0, 91, W, GOLD);
}

function drawLead(cv: Canvas): void {
  cv.rect(16, 96, 992, 126, [255, 252, 244]);
  cv.rect(16, 96, 992, 3, RED);
  cv.rect(16, 219, 992, 3, NAVY);
  cv.text(28, 106, LEAD.tag, 2, RED);
  cv.text(28, 124, LEAD.head, 5, INK);
  const lines = wrapText(LEAD_SUMMARY.join(" "), 80);
  let y = 166;
  for (const ln of lines) {
    cv.text(28, y, ln, 2, INK);
    y += 15;
  }
  cv.text(28, 204, LEAD_SOURCE, 1, GREY);
  cv.textCenter(512, 204, "LEAD STORY", 1, GREY);
}

function drawTop4(cv: Canvas): void {
  const xs = [16, 268, 520, 772];
  for (let i = 0; i < 4; i++) {
    const x = xs[i];
    cv.rect(x, 230, 236, 114, [255, 252, 244]);
    cv.rect(x, 230, 236, 3, TAG_COLOR[TOP4[i].tag]);
    cv.text(x + 10, 240, TOP4[i].tag, 1, TAG_COLOR[TOP4[i].tag]);
    const hl = wrapText(TOP4[i].head, 19);
    let y = 254;
    for (const ln of hl.slice(0, 2)) {
      cv.text(x + 10, y, ln, 2, INK);
      y += 15;
    }
    const sub = wrapText(TOP4_SUB[i], 38);
    let sy = 290;
    for (const ln of sub.slice(0, 3)) {
      cv.text(x + 10, sy, ln, 1, INK);
      sy += 9;
    }
  }
}

function drawGrid(cv: Canvas): void {
  cv.text(16, 352, "THE WORLD IN BRIEF - 47 MORE STORIES", 2, NAVY);
  cv.text(1008 - textWidth("52 STORIES IN ALL", 1), 356, "52 STORIES IN ALL", 1, GREY);
  cv.hline(16, 374, 992, RULE);
  const xs = [16, 348, 680];
  for (let i = 0; i < GRID.length; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = xs[col];
    const y = 384 + row * 22;
    const s = GRID[i];
    const color = TAG_COLOR[s.tag] || INK;
    const firstMax = 54 - s.tag.length - 3;
    const parts = wrapText(s.head, firstMax);
    cv.text(x, y, s.tag, 1, color);
    const tagW = textWidth(s.tag + " - ", 1);
    cv.text(x + tagW, y, parts[0], 1, INK);
    if (parts.length > 1) {
      const rest = wrapText(parts.slice(1).join(" "), 54);
      cv.text(x, y + 9, rest[0], 1, INK);
    }
  }
}

function drawMap(cv: Canvas): void {
  cv.text(16, 748, "WHERE IT HAPPENED - 24 PLACES", 2, NAVY);
  cv.hline(16, 768, 992, RULE);
  const mx = 16;
  const my = 776;
  const mw = 544;
  const mh = 96;
  const cw = mw / 60;
  const ch = mh / 24;
  for (let gy = 0; gy < 24; gy++) {
    for (let gx = 0; gx < 60; gx++) {
      let land = false;
      for (const r of LAND) {
        if (gx >= r[0] && gx <= r[2] && gy >= r[1] && gy <= r[3]) {
          land = true;
          break;
        }
      }
      if (land) {
        const px = Math.round(mx + gx * cw + cw / 2);
        const py = Math.round(my + gy * ch + ch / 2);
        cv.rect(px - 1, py - 1, 3, 3, MAPDOT);
      }
    }
  }
  for (const p of PINS) {
    const px = Math.round(mx + ((p.lon + 180) / 360) * mw);
    const py = Math.round(my + ((90 - p.lat) / 180) * mh);
    cv.disc(px, py, 5, PAPER);
    cv.disc(px, py, 4, p.c);
    cv.ring(px, py, 5, INK);
  }
  // legend: two columns of twelve
  for (let i = 0; i < PINS.length; i++) {
    const col = i < 12 ? 0 : 1;
    const row = i % 12;
    const lx = 584 + col * 216;
    const ly = 776 + row * 8;
    const p = PINS[i];
    cv.rect(lx, ly, 6, 6, p.c);
    cv.text(lx + 10, ly, String(i + 1) + ". " + p.name, 1, INK);
  }
}

function drawTimeline(cv: Canvas): void {
  cv.text(16, 890, "THE DAY IN UTC", 2, NAVY);
  cv.hline(16, 910, 992, RULE);
  const xs = [16, 348, 680];
  for (let i = 0; i < TIMELINE.length; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = xs[col];
    const y = 920 + row * 26;
    cv.text(x, y, TIMELINE[i].t, 2, RED);
    const lines = wrapText(TIMELINE[i].s, 42);
    let ly = y + 1;
    for (const ln of lines.slice(0, 2)) {
      cv.text(x + 68, ly, ln, 1, INK);
      ly += 9;
    }
  }
}

function drawFooter(cv: Canvas): void {
  cv.hline(16, 978, 992, GOLD);
  cv.textCenter(
    512,
    986,
    "SOURCES: BBC - REUTERS - AFP - AP - AL JAZEERA - XINHUA - CENTCOM - EU - UN",
    1,
    GREY,
  );
  cv.textCenter(
    512,
    1000,
    "52 STORIES - 24 PLACES - SUNDAY 22 NOVEMBER 2026 - THE SUNDAY GLOBE",
    1,
    GREY,
  );
}

function main(): void {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
  fs.mkdirSync(outDir, { recursive: true });
  const cv = new Canvas();
  drawMasthead(cv);
  drawLead(cv);
  drawTop4(cv);
  drawGrid(cv);
  drawMap(cv);
  drawTimeline(cv);
  drawFooter(cv);
  // thin navy frame
  cv.rect(0, 0, W, 3, NAVY);
  cv.rect(0, H - 3, W, 3, NAVY);
  cv.rect(0, 0, 3, H, NAVY);
  cv.rect(W - 3, 0, 3, H, NAVY);
  const png = toPng(cv);
  fs.writeFileSync(path.join(outDir, "entry.png"), png);
}

main();
