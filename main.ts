// The World Today — Sunday 22 November 2026.
// One image that sums up the world's news of 22 November 2026: fifty sourced
// stories, a dotted world map with twenty pins, and a UTC timeline of the day
// as it was reported. Drawn by this program alone — Node 22, standard library
// only, no network. Writes entry.png into $MAKEFUN_OUTPUT_DIR (or /output).
// Deterministic: two runs produce byte-identical files.
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { join } from "node:path";

const W = 1024;
const H = 1024;

// ---- palette: a broadsheet front page ----
const PAPER = [247, 243, 233];
const INK = [22, 22, 22];
const RED = [166, 24, 32];
const SLATE = [64, 78, 92];
const FAINT = [120, 112, 96];
const GOLD = [176, 132, 40];

// ---- framebuffer ----
const fb = new Uint8Array(W * H * 3);
for (let i = 0; i < W * H; i++) {
  fb[i * 3] = PAPER[0];
  fb[i * 3 + 1] = PAPER[1];
  fb[i * 3 + 2] = PAPER[2];
}
function px(x, y, c) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const o = (y * W + x) * 3;
  fb[o] = c[0];
  fb[o + 1] = c[1];
  fb[o + 2] = c[2];
}
function rect(x, y, w, h, c) {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) px(i, j, c);
}
function hline(x, y, w, c) {
  for (let i = x; i < x + w; i++) px(i, y, c);
}
function vline(x, y, h, c) {
  for (let j = y; j < y + h; j++) px(x, j, c);
}
function frame(x, y, w, h, c) {
  hline(x, y, w, c);
  hline(x, y + h - 1, w, c);
  vline(x, y, h, c);
  vline(x + w - 1, y, h, c);
}
function disc(cx, cy, r, c) {
  for (let j = cy - r; j <= cy + r; j++) {
    for (let i = cx - r; i <= cx + r; i++) {
      const dx = i - cx, dy = j - cy;
      if (dx * dx + dy * dy <= r * r) px(i, j, c);
    }
  }
}
function ring(cx, cy, r, c) {
  for (let a = 0; a < 360; a += 4) {
    const t = (a * Math.PI) / 180;
    px(Math.round(cx + r * Math.cos(t)), Math.round(cy + r * Math.sin(t)), c);
  }
}

// ---- PNG encoder (RGB, filter 0, zlib level 9) ----
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}
function encodePng() {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    raw.set(fb.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---- 5x7 bitmap font, drawn by hand: capitals, digits, punctuation ----
const FONT = {
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
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  '"': ["01010", "01010", "00000", "00000", "00000", "00000", "00000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  "$": ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  "*": ["00000", "10101", "01110", "11111", "01110", "10101", "00000"],
};
function textWidth(s, scale) {
  return s.length * 6 * scale - scale;
}
function drawText(x, y, s, scale, c) {
  let cx = x;
  for (const ch of s) {
    const g = FONT[ch] || FONT["?"];
    for (let r = 0; r < 7; r++) {
      for (let col = 0; col < 5; col++) {
        if (g[r][col] === "1") rect(cx + col * scale, y + r * scale, scale, scale, c);
      }
    }
    cx += 6 * scale;
  }
  return cx;
}
function drawTextCentered(x, y, w, s, scale, c) {
  drawText(x + Math.floor((w - textWidth(s, scale)) / 2), y, s, scale, c);
}
// Wrap on word boundaries to at most maxChars per line.
function wrapText(s, maxChars) {
  const words = s.split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? cur + " " + w : w;
    if (next.length <= maxChars) {
      cur = next;
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ---- dotted world map: 88 x 31 hand-plotted land grid ----
const MAP = [
  "...........................####.........................................................",
  "...######...#########.....######.......................###############################..",
  "..#######################..#####..........###...#######################################.",
  "...######.################..###..........#####.########################################.",
  ".........#################.............##.############################################..",
  ".........################..............##############..##############################...",
  "..........###############...............#############.###############################...",
  "..........###############...............############...######################.###.......",
  "...........##############...............##############.#####################..##........",
  "............############.................##...###..######.#####.#########.#.............",
  "............#####........................######################..######.................",
  ".............#####.......................#####################...#######................",
  "................####.....................################.###.....######................",
  ".................####.....................#############...##......#####.................",
  "..................#########...............############.............######...............",
  ".....................#######..............############............#########.............",
  ".....................########..............###########.............##########.######....",
  ".....................########..............##########.................#######..######...",
  "......................#######...............#########...........................#####...",
  "......................#######...............########..##................................",
  "......................######.................######...##................................",
  "......................######.................######...#.................................",
  ".......................####...................####........................#########.....",
  ".......................####..............................................###########....",
  ".......................####..............................................###########....",
  "........................##................................................#########..##.",
  "........................#..................................................######....##.",
  "........................#............................................................#..",
  "........................................................................................",
  "........................................................................................",
  "........................................................................................",
];
for (const row of MAP) if (row.length !== 88) throw new Error("MAP row is not 88 wide: " + row.length);
if (MAP.length !== 31) throw new Error("MAP is not 31 rows");

// Twenty places in today's news: [grid col, grid row] on the map above.
const PINS = [
  [54, 12], // Manama, Bahrain — Guards claim strikes on US bases
  [52, 11], // Kuwait City — Ali Al Salem air base
  [56, 12], // Khasab, Oman — tanker hit off the coast
  [49, 8], // Antalya, Turkey — COP31
  [49, 6], // Kyiv, Ukraine — houses burn in Podilskyi
  [50, 8], // Kerch / Crimea — bridge strikes
  [46, 4], // Gulf of Finland — drones hit Russian ship
  [45, 5], // Copenhagen, Denmark — assassination plot
  [48, 4], // Tallinn, Estonia — border to shut
  [47, 6], // Warsaw, Poland — missiles called provocation
  [42, 6], // London — Zelensky meets UK minister
  [23, 9], // Washington — FBI hack probe, Iran debate
  [69, 13], // Shenzhen, China — Trump, Xi, Putin meet
  [60, 12], // Patna, India — Nitish Setu opens
  [85, 27], // Wellington, NZ — Pant century, India 629-6
  [16, 12], // Sinaloa, Mexico — cartel lord arrested
  [50, 11], // Gaza City — ceasefire breached
  [53, 12], // Riyadh, Saudi Arabia — Houthi missiles downed
  [52, 15], // Taiz, Yemen — third month of siege
  [43, 17], // Lagos, Nigeria — boat capsizes, 24 dead
];

// ---- the lead story, told bigger ----
const LEAD = "IRAN CLAIMS STRIKES ON TWO U.S. BASES IN BAHRAIN";
const LEAD_SUB =
  "IRAN'S GUARDS SAY SHEIKH ISA AND THE FIFTH FLEET HQ IN JUFFAIR WERE HIT ON SATURDAY NIGHT; WASHINGTON HAS NOT CONFIRMED IT. (FARS)";

// ---- forty-nine more stories: headline + source in brackets ----
const STORIES = [
  "DRONES HIT RUSSIAN SHIP IN FINLAND GULF (TOI)",
  "ZELENSKY: BRIDGE STRIKES A FAIR RESPONSE (BBC)",
  "COP31 DEADLOCK OVER FOSSIL FUELS (BBC)",
  "TRUMP: IRAN DEAL COULD LAST 20 YEARS (FOX)",
  "TRUMP, XI AND PUTIN MEET IN SHENZHEN (REUTERS)",
  "ESTONIA TO SHUT ROAD BORDER WITH RUSSIA (AJ)",
  "POLAND: RUSSIAN MISSILES A PROVOCATION (TOI)",
  "DENMARK: RUSSIA PLOTTED TO KILL RAPPER (BBC)",
  "VON DER LEYEN CONDEMNS DENMARK PLOT (EU)",
  "SWEDEN SUMMONS RUSSIAN AMBASSADOR (AFP)",
  "FBI PROBES HACK OF ITS CRIMINAL DATABASE (BBC)",
  "U.S. AIRLINES WARNED OF AL-QAEDA THREAT (TOI)",
  "TANKER HIT OFF OMAN AS HORMUZ BURNS (UKMTO)",
  "IRGC SAYS IT DOWNED TWO U.S. DRONES (AL JAZEERA)",
  "IRAN: QESHM BLASTS WERE U.S. DISPOSAL (TOI)",
  "BAHRAIN PROBES PATRIOT MISSILE CRASH (TOI)",
  "SAUDIS DOWN THREE HOUTHI MISSILES (AFP)",
  "FOUR KILLED IN GAZA AS TRUCE IS BREACHED (AFP)",
  "MACKLEMORE GIVES GAZA SINGLE AWAY (BBC)",
  "FRANCE SEEKS U.N. ACTION OVER MYANMAR (AFP)",
  "ZELENSKY: NATO IS BEST UKRAINE GUARANTEE (BBC)",
  "ZELENSKY FLOATS NEW TALKS AT THE G-20 (BBC)",
  "MELANIA TRUMP PUSHES MORE CEASEFIRES (TOI)",
  "HEGSETH LIMITS U.S.-CANADA TIES (BBC)",
  "U.S. OPEN TO LATIN U.N. CHIEF (WALTZ)",
  "JEFFRIES VOWS EARLY PUSH TO END IRAN WAR (BBC)",
  "TECH SELL-OFF: ANTHROPIC SLIDES (BBC)",
  "INDIA 629-6 AS PANT HITS CENTURY (REUTERS)",
  "NEWCASTLE 2-2 ARSENAL, MADRID 2-1 (SCOREZAAP)",
  "ZVEREV BEATS MEDVEDEV IN ATP SEMI (SCOREZAAP)",
  "CUMMINS KEEPS AUSTRALIA TEST CAPTAINCY (CA)",
  "BOLSONARO IN INTENSIVE CARE IN BRAZIL (TOI)",
  "MEXICO ARRESTS 'EL CHAPO ISIDRO' (TOI)",
  "SINALOA VIOLENCE KILLS 11 AFTER ARREST (TOI)",
  "NIGERIA BOAT SINKS; AT LEAST 24 DEAD (AFP)",
  "ANC FIGHTS TO HOLD SOUTH AFRICAN CITIES (BBC)",
  "SUDAN ARMY RESTORES BLUE NILE SECURITY (BBC)",
  "TAIZ FACES THIRD MONTH OF HOUTHI SIEGE (BBC)",
  "MODI OPENS NITISH SETU BRIDGE IN BIHAR (JAGRAN)",
  "CYCLONE AKVAN HALTS 14 FLIGHTS (JAGRAN)",
  "JAPAN TO TRAIN LIVE-FIRE IN INDIA (JAGRAN)",
  "U.S. DECLASSIFIES MORE UFO FOOTAGE (BBC)",
  "JAPAN TOBACCO FACES $8.9BN RUSSIA LOSS (BBC)",
  "VOYAGER 1 FIRST OBJECT A LIGHT-DAY AWAY (NASA)",
  "GERMANS PROTEST SCHOOL, ARMY-SERVICE PLANS (BBC)",
  "HOUSES BURN IN KYIV'S PODILSKYI DISTRICT (BBC)",
  "TRUMP: CHINA NUCLEAR BUILD-UP ALARMING (BBC)",
  "JUDGE CLEARS $7.25BN ROUNDUP SETTLEMENT (BBC)",
  "MAN CONVICTED OVER PALISADES FIRE (BBC)",
];

// ---- the day as it was reported, UTC ----
const TIMELINE = [
  ["00:14", "KYIV: HOUSES BURN IN PODILSKYI (BBC)"],
  ["00:35", "ZELENSKY: BRIDGE STRIKES FAIR (BBC)"],
  ["00:41", "PANT CENTURY: INDIA 629-6 (REUTERS)"],
  ["01:10", "HEGSETH LIMITS U.S.-CANADA TIES (BBC)"],
  ["01:13", "NIGERIA BOAT TOLL: AT LEAST 24 (AFP)"],
  ["01:23", "FRANCE SEEKS U.N. ACTION (AFP)"],
];

// ---- layout ----
function drawMasthead() {
  drawText(20, 12, "THE WORLD TODAY", 5, INK);
  drawText(734, 16, "50 STORIES - 20 PLACES - AS REPORTED TODAY", 1, FAINT);
  drawText(20, 56, "SUNDAY, 22 NOVEMBER 2026", 3, RED);
  drawText(560, 60, "ONE DAY. THE WHOLE WORLD. EVERY STORY SOURCED.", 1, SLATE);
  rect(20, 86, 984, 3, RED);
  hline(20, 92, 984, FAINT);
}
function drawLead() {
  const lines = wrapText(LEAD, 27);
  if (lines.length > 2) throw new Error("lead wraps to " + lines.length + " lines");
  let y = 100;
  for (const ln of lines) {
    drawTextCentered(20, y, 984, ln, 3, INK);
    y += 26;
  }
  drawTextCentered(20, 154, 984, LEAD_SUB, 1, SLATE);
}
function drawMapAndTimeline() {
  drawText(20, 174, "WHERE TODAY HAPPENED", 2, INK);
  drawText(330, 178, "RED DOTS: 20 PLACES IN TODAY'S NEWS", 1, RED);
  const MAP_X = 20, MAP_Y = 196, CW = 7, CH = 4.4;
  for (let r = 0; r < MAP.length; r++) {
    for (let c = 0; c < 88; c++) {
      if (MAP[r][c] === "#") rect(MAP_X + c * CW + 2, Math.round(MAP_Y + r * CH) + 1, 3, 3, SLATE);
    }
  }
  for (const [c, r] of PINS) {
    const x = MAP_X + c * CW + 3;
    const y = Math.round(MAP_Y + r * CH) + 2;
    disc(x, y, 5, PAPER);
    disc(x, y, 4, RED);
  }
  vline(652, 174, 156, FAINT);
  drawText(664, 174, "THE DAY AS REPORTED - UTC", 2, INK);
  let y = 198;
  for (const [t, s] of TIMELINE) {
    drawText(664, y, t, 2, RED);
    drawText(664 + 66, y + 4, s, 1, INK);
    y += 22;
  }
}
function drawStories() {
  rect(20, 336, 984, 2, RED);
  const cols = [20, 352, 684];
  const perCol = 17;
  for (let i = 0; i < STORIES.length; i++) {
    const col = Math.floor(i / perCol);
    const row = i % perCol;
    const x = cols[col];
    const y = 344 + row * 39;
    const n = String(i + 2);
    drawText(x, y, n + ".", 2, RED);
    const lines = wrapText(STORIES[i], 24);
    if (lines.length > 2) throw new Error("story " + n + " wraps to " + lines.length + " lines: " + STORIES[i]);
    drawText(x + 36, y, lines[0], 2, INK);
    if (lines[1]) drawText(x + 36, y + 17, lines[1], 2, INK);
  }
}
function drawFooter() {
  drawTextCentered(
    20, 1012, 984,
    "DRAWN BY MAIN.TS - NODE 22, NO NETWORK - EVERY STORY SOURCED - MAKE.FUN NEWS-IMAGE-20261122",
    1, FAINT,
  );
}
function main() {
  drawMasthead();
  drawLead();
  drawMapAndTimeline();
  drawStories();
  drawFooter();
  const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "entry.png"), encodePng());
}
main();
