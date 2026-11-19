/*
  Catch the Coin by ChennyZEN
  Grafica: Kenney.nl (CC0) - pacchetto Platformer Art Pixel
  Musica menu: "Crystal Cave (song18)" - The Cynic Project / pixelsphere.org (CC0)
  Musica di gioco: "Enchanted Tiki 86" - cynicmusic.com (CC0)
*/

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false; // pixel art nitida

// ?debug mostra le hitbox, ?test accorcia stage e timer e rende comuni i power-up
const DEBUG = location.search.includes("debug");
const TEST = location.search.includes("test");

const $ = (id) => document.getElementById(id);

// ---- ELEMENTI HTML ----
const el = {
  menu: $("screen-menu"),
  howto: $("screen-howto"),
  stats: $("screen-stats"),
  settings: $("screen-settings"),
  pause: $("screen-pause"),
  gameover: $("screen-gameover"),
  pauseBtn: $("btn-pause"),
  soundBtn: $("btn-sound"),
  resetBtn: $("btn-reset"),
  menuRecord: $("menu-record"),
  modeDesc: $("mode-desc"),
  finalScore: $("final-score"),
  finalRecord: $("final-record"),
  newRecord: $("new-record"),
  overMode: $("over-mode"),
  overAch: $("over-ach"),
  statsList: $("stats-list")
};
const modeBtns = document.querySelectorAll(".mode-btn");
const langBtns = document.querySelectorAll(".lang-btn");
const volMusic = document.querySelectorAll(".vol-music");
const volSfx = document.querySelectorAll(".vol-sfx");

const MODES = ["classic", "daily", "time", "zen"];

// ---- CONFIGURAZIONE ----
const CONFIG = {
  playerSpeed: 500, // velocità iniziale del player (pixel/secondo)
  playerSpeedGain: 8, // quanta velocità in più per ogni moneta raccolta
  playerSpeedMax: 1000, // limite massimo (alzalo o abbassalo a piacere)
  spawnInterval: 0.8, // secondi tra un oggetto e l'altro
  itemSpeed: 300, // velocità iniziale di caduta
  itemSpeedGain: 3, // aumento della caduta per ogni moneta raccolta
  lives: 1, // Classic e Daily: una sola vita
  badChance: 0.5, // probabilità che compaia un pipistrello
  playerW: 50,
  playerH: 40,
  itemSize: 30,
  musicVolume: 0.5,

  // ---- v1.2.0 ----
  playerHitbox: 0.8,
  batHitbox: 0.7,
  coinHitbox: 1.0,
  laneWindow: 1.2,
  safeLaneWidth: 60,
  laneMargin: 10,
  burstChance: 0,
  countdown: 3,
  dyingTime: 0.7,
  maxParticles: 200,

  // ---- v1.3.0 ----
  stageSize: 25,
  comboStep: 5,
  comboMax: 5,
  goldChance: 0.08,
  goldValue: 5,
  goldSize: 40,
  powerupChance: 0.06,
  powerupFrom: 5,
  magnetTime: 6,
  magnetRadius: 170,
  magnetPull: 380,
  slowTime: 5,
  slowFactor: 0.55,
  zigFrom: 1,
  zigChance: 0.25,
  zigAmp: 55,
  fastFrom: 2,
  fastChance: 0.2,
  fastMul: 1.6,
  fastWarning: 0.6,
  waveWarning: 1.6,
  waveColumns: 6,
  musicRateMax: 1.25,

  // ---- [v1.4.0] novità ----
  timeAttackTime: 60, // secondi in Time Attack
  timePenalty: 5, // secondi persi per ogni pipistrello in Time Attack
  invulnTime: 1, // secondi di invulnerabilità dopo un colpo in Time Attack
  zenTime: 90, // secondi in Zen
  zenGoldChance: 0.15, // monete d'oro più frequenti in Zen
  zenRamp: 0.5 // in Zen la difficoltà cresce più lentamente
};
if (TEST) {
  Object.assign(CONFIG, {
    stageSize: 3,
    powerupFrom: 0,
    powerupChance: 0.5,
    goldChance: 0.4,
    zigFrom: 0,
    fastFrom: 0,
    timeAttackTime: 20,
    zenTime: 20
  });
}

// ---- TESTI (EN / IT) ----
const I18N = {
  en: {
    start: "START",
    how_to: "HOW TO PLAY",
    stats: "STATS",
    settings: "SETTINGS",
    back: "BACK",
    record: "Record",
    score: "Score",
    points: "Points",
    speed: "Speed",
    pause: "PAUSE",
    resume: "RESUME",
    menu: "MENU",
    restart: "RESTART",
    gameover: "Game over",
    new_record: "New Record!",
    hint1: "Arrows / A-D or mouse / touch to move",
    hint2: "P pause · M mute · F fullscreen · 1-4 mode",
    music: "Music",
    sfx: "SFX",
    sound_on: "SOUND: ON",
    sound_off: "SOUND: OFF",
    language: "Language",
    reset: "RESET DATA",
    reset_confirm: "CLICK AGAIN TO CONFIRM",
    mode_classic: "Classic",
    mode_daily: "Daily",
    mode_time: "Time Attack",
    mode_zen: "Zen",
    desc_classic: "One life. Everything gets faster.",
    desc_daily: "The same run for everyone, every day.",
    desc_time: "60 seconds. Every bat costs 5 seconds.",
    desc_zen: "90 relaxed seconds. No bats, just coins.",
    stage: "STAGE",
    warning_wave: "WARNING: WAVE INCOMING",
    coin_shower: "COIN SHOWER!",
    times_up: "TIME'S UP!",
    go: "GO!",
    muted: "MUTED (M)",
    combo: "COMBO",
    shield: "SHIELD",
    magnet: "MAGNET",
    slow: "SLOW-MO",
    time: "TIME",
    ach_unlocked: "Achievement unlocked",
    htp_move: "Move: arrows / A-D, or mouse / touch.",
    htp_coin: "Coin: +1 point (times your combo).",
    htp_gold: "Golden coin: +5 points.",
    htp_bat: "Bats end the run. Zig-zag bats weave; fast bats show a red warning mark.",
    htp_shield: "Shield: absorbs one bat.",
    htp_magnet: "Magnet: pulls coins toward you.",
    htp_slow: "Slow-mo: slows falling objects.",
    htp_combo: "Combo: x2 at 5 coins in a row, up to x5 at 20.",
    htp_stage: "Every 25 coins: a new stage and a warning wave. Follow the glowing safe lane.",
    htp_modes: "Daily: same sequence for everyone. Time Attack: bats cost 5 seconds. Zen: no bats.",
    st_games: "Games played",
    st_time: "Time played",
    st_coins: "Coins caught",
    st_gold: "Golden coins",
    st_powerups: "Power-ups",
    st_combo: "Best combo streak",
    st_stage: "Best stage",
    st_best_classic: "Best Classic",
    st_best_daily: "Daily best (today)",
    st_best_time: "Best Time Attack",
    st_best_zen: "Best Zen",
    st_ach: "Achievements",
    ach_first_coin: "First coin",
    achd_first_coin: "Catch your first coin.",
    ach_coins_100: "Collector",
    achd_coins_100: "Catch 100 coins in total.",
    ach_coins_500: "Treasure hunter",
    achd_coins_500: "Catch 500 coins in total.",
    ach_combo_10: "Combo starter",
    achd_combo_10: "Reach a streak of 10 coins.",
    ach_combo_20: "Max combo",
    achd_combo_20: "Reach the x5 combo (20 in a row).",
    ach_gold_3: "Gold rush",
    achd_gold_3: "Catch 3 golden coins in one run.",
    ach_stage_3: "Deep dive",
    achd_stage_3: "Reach stage 3.",
    ach_shield_save: "Close call",
    achd_shield_save: "Block a bat with a shield.",
    ach_daily_done: "Daily player",
    achd_daily_done: "Finish a Daily run.",
    ach_time_40: "Speed runner",
    achd_time_40: "Score 40 points in Time Attack."
  },
  it: {
    start: "INIZIA",
    how_to: "COME SI GIOCA",
    stats: "STATISTICHE",
    settings: "IMPOSTAZIONI",
    back: "INDIETRO",
    record: "Record",
    score: "Punteggio",
    points: "Punti",
    speed: "Velocità",
    pause: "PAUSA",
    resume: "RIPRENDI",
    menu: "MENU",
    restart: "RIGIOCA",
    gameover: "Game over",
    new_record: "Nuovo record!",
    hint1: "Frecce / A-D o mouse / touch per muoverti",
    hint2: "P pausa · M muto · F schermo intero · 1-4 modalità",
    music: "Musica",
    sfx: "Effetti",
    sound_on: "SUONO: ON",
    sound_off: "SUONO: OFF",
    language: "Lingua",
    reset: "AZZERA DATI",
    reset_confirm: "CLICCA ANCORA PER CONFERMARE",
    mode_classic: "Classico",
    mode_daily: "Giornaliera",
    mode_time: "Time Attack",
    mode_zen: "Zen",
    desc_classic: "Una sola vita. Tutto accelera.",
    desc_daily: "La stessa partita per tutti, ogni giorno.",
    desc_time: "60 secondi. Ogni pipistrello costa 5 secondi.",
    desc_zen: "90 secondi rilassati. Niente pipistrelli, solo monete.",
    stage: "STAGE",
    warning_wave: "ATTENZIONE: ONDATA IN ARRIVO",
    coin_shower: "PIOGGIA DI MONETE!",
    times_up: "TEMPO SCADUTO!",
    go: "VIA!",
    muted: "MUTO (M)",
    combo: "COMBO",
    shield: "SCUDO",
    magnet: "MAGNETE",
    slow: "SLOW-MO",
    time: "TEMPO",
    ach_unlocked: "Obiettivo sbloccato",
    htp_move: "Movimento: frecce / A-D, oppure mouse / touch.",
    htp_coin: "Moneta: +1 punto (per il tuo combo).",
    htp_gold: "Moneta d'oro: +5 punti.",
    htp_bat:
      "I pipistrelli chiudono la partita. Quelli a zig-zag ondeggiano; quelli veloci mostrano un segnale rosso.",
    htp_shield: "Scudo: assorbe un pipistrello.",
    htp_magnet: "Magnete: attira le monete verso di te.",
    htp_slow: "Slow-mo: rallenta gli oggetti che cadono.",
    htp_combo: "Combo: x2 a 5 monete di fila, fino a x5 a 20.",
    htp_stage: "Ogni 25 monete: nuovo stage e ondata di avviso. Segui la corsia sicura luminosa.",
    htp_modes:
      "Giornaliera: stessa sequenza per tutti. Time Attack: i pipistrelli costano 5 secondi. Zen: niente pipistrelli.",
    st_games: "Partite giocate",
    st_time: "Tempo di gioco",
    st_coins: "Monete raccolte",
    st_gold: "Monete d'oro",
    st_powerups: "Power-up",
    st_combo: "Miglior serie combo",
    st_stage: "Miglior stage",
    st_best_classic: "Record Classico",
    st_best_daily: "Record Giornaliera (oggi)",
    st_best_time: "Record Time Attack",
    st_best_zen: "Record Zen",
    st_ach: "Obiettivi",
    ach_first_coin: "Prima moneta",
    achd_first_coin: "Raccogli la tua prima moneta.",
    ach_coins_100: "Collezionista",
    achd_coins_100: "Raccogli 100 monete in totale.",
    ach_coins_500: "Cacciatore di tesori",
    achd_coins_500: "Raccogli 500 monete in totale.",
    ach_combo_10: "Inizio combo",
    achd_combo_10: "Raggiungi una serie di 10 monete.",
    ach_combo_20: "Combo massimo",
    achd_combo_20: "Raggiungi il combo x5 (20 di fila).",
    ach_gold_3: "Corsa all'oro",
    achd_gold_3: "Raccogli 3 monete d'oro in una partita.",
    ach_stage_3: "Immersione",
    achd_stage_3: "Raggiungi lo stage 3.",
    ach_shield_save: "Per un soffio",
    achd_shield_save: "Blocca un pipistrello con lo scudo.",
    ach_daily_done: "Giocatore del giorno",
    achd_daily_done: "Finisci una partita Giornaliera.",
    ach_time_40: "Velocista",
    achd_time_40: "Fai 40 punti in Time Attack."
  }
};

// ---- STATO ----
let state = "menu"; // menu | howto | stats | settings | countdown | playing | paused | dying | gameover
let mode = "classic"; // modalità della partita in corso
let selectedMode = "classic"; // modalità scelta nel menu
let score, lives, player, items, spawnTimer;
let targetX = null;
let newRecord = false;
const keys = {};
let soundOn = true;

let particles = [];
let popups = [];
let shake = 0,
  flash = 0,
  streak = 0;
let countdown = 0,
  lastCount = 0,
  goFlash = 0,
  dyingTimer = 0;
let gameTime = 0;

let coinsCaught = 0,
  stage = 0;
let shield = false,
  magnetTimer = 0,
  slowTimer = 0;
let wavePending = false,
  waveTimer = 0,
  waveGap = 0;
let bannerText = "",
  bannerTimer = 0;
let theme = 0,
  prevTheme = 0,
  themeFade = 1;

// [v1.4.0]
let timeLeft = 0,
  invuln = 0,
  runTime = 0,
  spawnIndex = 0,
  playerHidden = false;
let run = { coins: 0, gold: 0, powerups: 0, shieldSaves: 0, ended: false };
let runUnlocked = [];
let toasts = [];
let dailyKey = "",
  dailySeed = 0;
let rnd = Math.random;

// ---- IMPOSTAZIONI E STATISTICHE (salvate nel browser) ----
function detectLang() {
  return String(navigator.language || "en")
    .toLowerCase()
    .startsWith("it")
    ? "it"
    : "en";
}
const settings = {
  music: CONFIG.musicVolume,
  sfx: 1,
  sound: true,
  mode: "classic",
  lang: detectLang()
};
try {
  const saved = JSON.parse(localStorage.getItem("ctcSettings"));
  if (saved) {
    if (typeof saved.music === "number") settings.music = Math.min(1, Math.max(0, saved.music));
    if (typeof saved.sfx === "number") settings.sfx = Math.min(1, Math.max(0, saved.sfx));
    if (typeof saved.sound === "boolean") settings.sound = saved.sound;
    if (MODES.includes(saved.mode)) settings.mode = saved.mode;
    if (saved.lang === "en" || saved.lang === "it") settings.lang = saved.lang;
  }
} catch (e) {}
soundOn = settings.sound;
selectedMode = settings.mode;
mode = selectedMode;
let lang = settings.lang;
function saveSettings() {
  try {
    localStorage.setItem("ctcSettings", JSON.stringify(settings));
  } catch (e) {}
}
function t(key) {
  return (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
}

function defaultStats() {
  return {
    games: 0,
    playTime: 0,
    coins: 0,
    gold: 0,
    powerups: 0,
    bestStreak: 0,
    bestStage: 0,
    best: { classic: 0, time: 0, zen: 0 },
    daily: {},
    ach: {}
  };
}
let stats = defaultStats();
try {
  const s = JSON.parse(localStorage.getItem("ctcStats"));
  if (s) {
    stats = Object.assign(defaultStats(), s);
    stats.best = Object.assign({ classic: 0, time: 0, zen: 0 }, s.best);
    stats.daily = s.daily || {};
    stats.ach = s.ach || {};
  }
  // recupera il record Classic delle versioni precedenti
  stats.best.classic = Math.max(stats.best.classic, Number(localStorage.getItem("highScore")) || 0);
} catch (e) {}
function saveStats() {
  const days = Object.keys(stats.daily).sort();
  while (days.length > 60) delete stats.daily[days.shift()];
  try {
    localStorage.setItem("ctcStats", JSON.stringify(stats));
    localStorage.setItem("highScore", stats.best.classic); // compatibilità con le versioni precedenti
  } catch (e) {}
}
window.addEventListener("pagehide", saveStats);

function todayKey() {
  const d = new Date();
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}
function bestFor(m) {
  return m === "daily" ? stats.daily[todayKey()] || 0 : stats.best[m] || 0;
}

// ---- NUMERI CASUALI RIPRODUCIBILI (per la sfida giornaliera) ----
function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
// Ogni "evento" (nascita di un oggetto, ondata...) ha il suo generatore: in Daily è lo stesso per tutti
function useRng(salt) {
  rnd =
    mode === "daily"
      ? mulberry32((dailySeed ^ Math.imul(salt + 1, 2654435761)) >>> 0)
      : Math.random;
}

// ---- SPRITE (cartella Assets/) ----
function loadImage(src) {
  const img = new Image();
  img.loaded = false;
  img.onload = () => {
    img.loaded = true;
  };
  img.src = src;
  return img;
}
const IMG = {
  player: loadImage("Assets/player.png"),
  coin: loadImage("Assets/coin.png"),
  bat: loadImage("Assets/bat.png")
};
function drawSprite(img, x, y, w, h, fallbackColor) {
  if (img.loaded) {
    ctx.drawImage(img, x, y, w, h);
  } else {
    ctx.fillStyle = fallbackColor;
    ctx.fillRect(x, y, w, h);
  }
}
function drawSpriteFx(img, x, y, w, h, fallbackColor, sx = 1, sy = 1, rot = 0) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(rot);
  ctx.scale(sx, sy);
  drawSprite(img, -w / 2, -h / 2, w, h, fallbackColor);
  ctx.restore();
}

// ---- EFFETTI SONORI (generati dal codice) ----
let audioCtx = null;
let audioUnlocked = false;
function unlockAudio() {
  audioUnlocked = true;
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audioCtx = new AC();
  }
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
}
function beep(freq, duration, type = "square", volume = 0.08) {
  if (!soundOn || !audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume * settings.sfx, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}
const SFX = {
  click: () => beep(520, 0.06),
  collect: (pitch = 1) => beep(880 * pitch, 0.1),
  hit: () => beep(140, 0.3, "sawtooth", 0.12),
  gameover: () => {
    beep(300, 0.2, "triangle");
    setTimeout(() => beep(150, 0.5, "triangle"), 200);
  },
  tick: () => beep(440, 0.08),
  go: () => beep(880, 0.25, "square", 0.1),
  record: () => {
    beep(660, 0.12);
    setTimeout(() => beep(880, 0.12), 120);
    setTimeout(() => beep(1320, 0.3), 240);
  },
  gold: () => {
    beep(1175, 0.08);
    setTimeout(() => beep(1568, 0.14), 70);
  },
  power: () => {
    beep(660, 0.1, "triangle");
    setTimeout(() => beep(990, 0.16, "triangle"), 90);
  },
  shieldBreak: () => beep(240, 0.2, "triangle", 0.12),
  warning: () => {
    beep(600, 0.15, "sawtooth", 0.06);
    setTimeout(() => beep(800, 0.15, "sawtooth", 0.06), 180);
  }
};

// ---- MUSICA DI SOTTOFONDO (file in Assets/) ----
function makeMusic(src) {
  const a = new Audio(src);
  a.loop = true;
  a.volume = CONFIG.musicVolume;
  a.failed = false;
  a.addEventListener("error", () => {
    a.failed = true;
    console.warn("Musica non caricata: " + src);
  });
  return a;
}
const MUSIC = {
  menu: makeMusic("Assets/music_menu.mp3"),
  game: makeMusic("Assets/music_game.mp3")
};
function syncMusic() {
  let wanted = null;
  if (soundOn && audioUnlocked) {
    if (state === "menu" || state === "howto" || state === "stats" || state === "settings")
      wanted = MUSIC.menu;
    else if (state === "countdown" || state === "playing") wanted = MUSIC.game;
  }
  for (const m of [MUSIC.menu, MUSIC.game]) {
    if (m === wanted) {
      if (m.paused && !m.failed) m.play().catch(() => {});
    } else if (!m.paused) {
      m.pause();
    }
  }
}
function applyVolumes() {
  MUSIC.menu.volume = settings.music;
  MUSIC.game.volume = settings.music;
  volMusic.forEach((s) => {
    s.value = Math.round(settings.music * 100);
  });
  volSfx.forEach((s) => {
    s.value = Math.round(settings.sfx * 100);
  });
}
volMusic.forEach((s) => {
  s.addEventListener("input", () => {
    settings.music = s.value / 100;
    applyVolumes();
    saveSettings();
  });
  s.addEventListener("change", () => s.blur());
});
volSfx.forEach((s) => {
  s.addEventListener("input", () => {
    settings.sfx = s.value / 100;
    applyVolumes();
    saveSettings();
  });
  s.addEventListener("change", () => {
    unlockAudio();
    SFX.click();
    s.blur();
  });
});
applyVolumes();

// ---- SFONDI A TEMA ----
const STALACTITES = Array.from({ length: 9 }, (_, i) => ({
  x: i * 56 + Math.random() * 20,
  w: 24 + Math.random() * 22,
  h: 30 + Math.random() * 60
}));
const STARS = Array.from({ length: 40 }, () => ({
  x: Math.random() * 480,
  y: Math.random() * 640,
  r: 1 + Math.random() * 1.5,
  p: Math.random() * 6.28
}));
const RAIN = Array.from({ length: 45 }, () => ({
  x: Math.random() * 480,
  y: Math.random() * 640,
  s: 500 + Math.random() * 300,
  l: 10 + Math.random() * 12
}));

function drawTheme(idx, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  if (idx === 0) {
    // grotta
    g.addColorStop(0, "#10002b");
    g.addColorStop(0.55, "#240046");
    g.addColorStop(1, "#3c096c");
  } else if (idx === 1) {
    // notte
    g.addColorStop(0, "#03045e");
    g.addColorStop(0.6, "#10002b");
    g.addColorStop(1, "#240046");
  } else {
    // tempesta
    g.addColorStop(0, "#1b1b2f");
    g.addColorStop(0.6, "#2d2a4a");
    g.addColorStop(1, "#3a3358");
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (idx === 0) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
    for (const s of STALACTITES) {
      ctx.beginPath();
      ctx.moveTo(s.x, 0);
      ctx.lineTo(s.x + s.w, 0);
      ctx.lineTo(s.x + s.w / 2, s.h);
      ctx.closePath();
      ctx.fill();
    }
  } else if (idx === 1) {
    ctx.fillStyle = "#fff";
    for (const s of STARS) {
      ctx.globalAlpha = alpha * (0.4 + 0.6 * Math.abs(Math.sin(gameTime * 1.5 + s.p)));
      ctx.fillRect(s.x, s.y, s.r, s.r);
    }
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#f1e9c6";
    ctx.beginPath();
    ctx.arc(400, 90, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#03045e";
    ctx.beginPath();
    ctx.arc(412, 82, 26, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = "rgba(180, 200, 255, 0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const r of RAIN) {
      const y = (r.y + gameTime * r.s) % (canvas.height + 20);
      ctx.moveTo(r.x, y);
      ctx.lineTo(r.x - 3, y + r.l);
    }
    ctx.stroke();
    if (Math.sin(gameTime * 0.9) * Math.sin(gameTime * 2.3) > 0.93) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }
  ctx.restore();
}
function drawBackground() {
  if (themeFade < 1) drawTheme(prevTheme, 1);
  drawTheme(theme, themeFade);
}

// ---- DIFFICOLTÀ E PARAMETRI PER MODALITÀ ----
function progress() {
  // [v1.4.0] in Zen la difficoltà sale più piano
  return coinsCaught * (mode === "zen" ? CONFIG.zenRamp : 1);
}
function currentPlayerSpeed() {
  return Math.min(CONFIG.playerSpeed + progress() * CONFIG.playerSpeedGain, CONFIG.playerSpeedMax);
}
function currentFall() {
  return CONFIG.itemSpeed + progress() * CONFIG.itemSpeedGain;
}
function effBadChance() {
  return mode === "zen" ? 0 : CONFIG.badChance;
}
function effGoldChance() {
  return mode === "zen" ? CONFIG.zenGoldChance : CONFIG.goldChance;
}
function comboMultiplier() {
  return Math.min(CONFIG.comboMax, 1 + Math.floor(streak / CONFIG.comboStep));
}

// ---- AZIONI ----
function resetGame() {
  score = 0;
  lives = CONFIG.lives;
  player = {
    x: canvas.width / 2 - CONFIG.playerW / 2,
    y: canvas.height - CONFIG.playerH - 10,
    w: CONFIG.playerW,
    h: CONFIG.playerH,
    lean: 0
  };
  items = [];
  spawnTimer = 0;
  targetX = null;
  newRecord = false;
  particles = [];
  popups = [];
  toasts = [];
  shake = 0;
  flash = 0;
  streak = 0;
  goFlash = 0;
  coinsCaught = 0;
  stage = 0;
  shield = false;
  magnetTimer = 0;
  slowTimer = 0;
  wavePending = false;
  waveTimer = 0;
  bannerTimer = 0;
  theme = 0;
  prevTheme = 0;
  themeFade = 1;
  // [v1.4.0]
  timeLeft = mode === "time" ? CONFIG.timeAttackTime : mode === "zen" ? CONFIG.zenTime : 0;
  invuln = 0;
  runTime = 0;
  spawnIndex = 0;
  playerHidden = false;
  run = { coins: 0, gold: 0, powerups: 0, shieldSaves: 0, ended: false };
  runUnlocked = [];
}
function startGame() {
  mode = selectedMode;
  dailyKey = todayKey();
  dailySeed = hashString("ctc-" + dailyKey);
  resetGame();
  MUSIC.game.currentTime = 0;
  MUSIC.game.playbackRate = 1;
  countdown = CONFIG.countdown;
  lastCount = 0;
  state = "countdown";
}
// [v1.4.0] fine partita: per pipistrello (morte) o per tempo scaduto
function endRun(reason) {
  state = "dying";
  if (reason === "time") {
    dyingTimer = 0.9;
    playerHidden = false;
    wavePending = false;
    bannerText = t("times_up");
    bannerTimer = 1.1;
    SFX.warning();
  } else {
    dyingTimer = CONFIG.dyingTime;
    playerHidden = true;
    shake = 14;
    flash = 1;
    burst(player.x + player.w / 2, player.y + player.h / 2, "#4cc9f0", 30, 220);
  }
}
function finishGame() {
  state = "gameover";
  run.ended = true;
  stats.games++;
  stats.playTime += runTime;
  stats.bestStage = Math.max(stats.bestStage, stage + 1);
  const prev = mode === "daily" ? stats.daily[dailyKey] || 0 : stats.best[mode] || 0;
  newRecord = score > prev;
  if (newRecord) {
    if (mode === "daily") stats.daily[dailyKey] = score;
    else stats.best[mode] = score;
  }
  checkAch();
  saveStats();
  if (newRecord) SFX.record();
  else SFX.gameover();
}
function goTo(s) {
  state = s;
}
function goToMenu() {
  state = "menu";
}
function refreshSoundButton() {
  el.soundBtn.textContent = t(soundOn ? "sound_on" : "sound_off");
}
function toggleSound() {
  soundOn = !soundOn;
  settings.sound = soundOn;
  saveSettings();
  refreshSoundButton();
}
function togglePause() {
  if (state === "playing") state = "paused";
  else if (state === "paused") state = "playing";
}
function toggleFullscreen() {
  const root = document.documentElement;
  if (!document.fullscreenElement) {
    if (root.requestFullscreen) root.requestFullscreen().catch(() => {});
  } else if (document.exitFullscreen) {
    document.exitFullscreen();
  }
}
function activatePowerup(kind) {
  if (kind === "shield") shield = true;
  if (kind === "magnet") magnetTimer = CONFIG.magnetTime;
  if (kind === "slow") slowTimer = CONFIG.slowTime;
  SFX.power();
}
function startStage() {
  useRng(100000 + stage);
  prevTheme = theme;
  theme = stage % 3;
  themeFade = 0;
  waveGap = Math.floor(rnd() * CONFIG.waveColumns);
  waveTimer = CONFIG.waveWarning;
  wavePending = true;
  bannerText = t("stage") + " " + (stage + 1);
  bannerTimer = CONFIG.waveWarning + 0.4;
  SFX.warning();
  MUSIC.game.playbackRate = Math.min(CONFIG.musicRateMax, 1 + stage * 0.04);
}

// ---- LINGUA E MENU ----
function refreshModeUI() {
  modeBtns.forEach((b) => b.classList.toggle("selected", b.dataset.mode === selectedMode));
  let d = t("desc_" + selectedMode);
  if (selectedMode === "daily") d += " (" + todayKey() + ")";
  el.modeDesc.textContent = d;
  el.menuRecord.textContent = bestFor(selectedMode);
}
function selectMode(m) {
  if (!MODES.includes(m)) return;
  selectedMode = m;
  settings.mode = m;
  saveSettings();
  refreshModeUI();
}
function applyLang() {
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach((n) => {
    n.textContent = t(n.dataset.i18n);
  });
  langBtns.forEach((b) => b.classList.toggle("selected", b.dataset.lang === lang));
  refreshSoundButton();
  refreshModeUI();
  if (state === "stats") renderStats();
}
function setLang(l) {
  lang = l;
  settings.lang = l;
  saveSettings();
  applyLang();
}

// ---- STATISTICHE E OBIETTIVI ----
const ACH = [
  { id: "first_coin", test: () => stats.coins >= 1 },
  { id: "coins_100", test: () => stats.coins >= 100 },
  { id: "coins_500", test: () => stats.coins >= 500 },
  { id: "combo_10", test: () => stats.bestStreak >= 10 },
  { id: "combo_20", test: () => stats.bestStreak >= 20 },
  { id: "gold_3", test: () => run.gold >= 3 },
  { id: "stage_3", test: () => mode !== "zen" && stage >= 2 },
  { id: "shield_save", test: () => run.shieldSaves >= 1 },
  { id: "daily_done", test: () => run.ended && mode === "daily" },
  { id: "time_40", test: () => run.ended && mode === "time" && score >= 40 }
];
function unlock(id) {
  if (stats.ach[id]) return;
  stats.ach[id] = true;
  runUnlocked.push(id);
  toasts.push({ text: t("ach_unlocked") + ": " + t("ach_" + id), life: 3.2 });
  SFX.power();
  saveStats();
}
function checkAch() {
  for (const a of ACH) {
    if (!stats.ach[a.id] && a.test()) unlock(a.id);
  }
}
function fmtTime(sec) {
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h ? h + "h " + m + "m" : m + "m " + (sec % 60) + "s";
}
function addRow(box, label, value, cls) {
  const r = document.createElement("div");
  r.className = "row" + (cls ? " " + cls : "");
  const a = document.createElement("span");
  a.textContent = label;
  r.appendChild(a);
  if (value !== undefined) {
    const b = document.createElement("strong");
    b.textContent = value;
    r.appendChild(b);
  }
  box.appendChild(r);
}
function renderStats() {
  const box = el.statsList;
  box.textContent = "";
  addRow(box, t("st_games"), stats.games);
  addRow(box, t("st_time"), fmtTime(stats.playTime));
  addRow(box, t("st_coins"), stats.coins);
  addRow(box, t("st_gold"), stats.gold);
  addRow(box, t("st_powerups"), stats.powerups);
  addRow(box, t("st_combo"), stats.bestStreak);
  addRow(box, t("st_stage"), stats.bestStage);
  addRow(box, t("st_best_classic"), stats.best.classic);
  addRow(box, t("st_best_daily"), stats.daily[todayKey()] || 0);
  addRow(box, t("st_best_time"), stats.best.time);
  addRow(box, t("st_best_zen"), stats.best.zen);
  const done = ACH.filter((a) => stats.ach[a.id]).length;
  addRow(box, t("st_ach") + " " + done + "/" + ACH.length, undefined, "section");
  for (const a of ACH) {
    const got = !!stats.ach[a.id];
    addRow(
      box,
      (got ? "✓ " : "· ") + t("ach_" + a.id) + " - " + t("achd_" + a.id),
      undefined,
      got ? "" : "locked"
    );
  }
}
function fillGameOver() {
  el.overMode.textContent = t("mode_" + mode) + (mode === "daily" ? " · " + dailyKey : "");
  el.finalScore.textContent = score;
  el.finalRecord.textContent =
    mode === "daily" ? stats.daily[dailyKey] || 0 : stats.best[mode] || 0;
  el.newRecord.classList.toggle("hidden", !newRecord);
  if (runUnlocked.length) {
    el.overAch.textContent =
      t("ach_unlocked") + ": " + runUnlocked.map((id) => t("ach_" + id)).join(", ");
    el.overAch.classList.remove("hidden");
  } else {
    el.overAch.classList.add("hidden");
  }
}
let resetArmed = false;
let resetTimer = null;
function disarmReset() {
  resetArmed = false;
  clearTimeout(resetTimer);
  el.resetBtn.textContent = t("reset");
}
function resetData() {
  stats = defaultStats();
  try {
    localStorage.removeItem("highScore");
  } catch (e) {}
  saveStats();
  refreshModeUI();
}

// ---- EFFETTI VISIVI ----
function burst(x, y, color, n, power = 160) {
  for (let i = 0; i < n && particles.length < CONFIG.maxParticles; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = power * (0.3 + Math.random() * 0.7);
    const life = 0.4 + Math.random() * 0.4;
    particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 40,
      life,
      max: life,
      size: 2 + Math.random() * 3,
      color
    });
  }
}
function popup(x, y, text, color) {
  popups.push({ x, y, text, color, life: 0.7, max: 0.7 });
}
function updateEffects(dt) {
  for (const p of particles) {
    p.vy += 500 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
  }
  particles = particles.filter((p) => p.life > 0);
  for (const tx of popups) {
    tx.y -= 50 * dt;
    tx.life -= dt;
  }
  popups = popups.filter((tx) => tx.life > 0);
  for (const ts of toasts) ts.life -= dt;
  toasts = toasts.filter((ts) => ts.life > 0);
  shake = Math.max(0, shake - 25 * dt);
  flash = Math.max(0, flash - 2.5 * dt);
  goFlash = Math.max(0, goFlash - dt);
  bannerTimer = Math.max(0, bannerTimer - dt);
  themeFade = Math.min(1, themeFade + dt / 1.5);
}

// ---- COLLISIONI CON HITBOX RIDOTTE ----
function box(x, y, w, h, scale) {
  const dx = (w * (1 - scale)) / 2;
  const dy = (h * (1 - scale)) / 2;
  return { x: x + dx, y: y + dy, w: w * scale, h: h * scale };
}
function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// ---- SPAWN EQUO E "CORSIA SICURA" ----
function batBlock(it) {
  const pad = CONFIG.laneMargin + it.amp;
  return [it.baseX - CONFIG.playerW - pad, it.baseX + it.size + pad];
}
function hasSafeLane(cand) {
  const maxX = canvas.width - CONFIG.playerW;
  const range = currentFall() * CONFIG.laneWindow;
  const blocked = [batBlock(cand)];
  for (const it of items) {
    if (it.bad && Math.abs(it.y + CONFIG.itemSize) <= range) blocked.push(batBlock(it));
  }
  blocked.sort((a, b) => a[0] - b[0]);
  let cursor = 0;
  for (const [start, end] of blocked) {
    if (start - cursor >= CONFIG.safeLaneWidth) return true;
    cursor = Math.max(cursor, end);
  }
  return maxX - cursor >= CONFIG.safeLaneWidth;
}
function freeX(size = CONFIG.itemSize) {
  for (let i = 0; i < 12; i++) {
    const x = rnd() * (canvas.width - size);
    if (
      items.every((o) => o.y > CONFIG.itemSize * 1.5 || Math.abs(o.x - x) > CONFIG.itemSize * 1.3)
    )
      return x;
  }
  return rnd() * (canvas.width - size);
}
function makeItem(x, kind) {
  const bad = kind === "bat" || kind === "zig" || kind === "fast";
  const size = kind === "gold" ? CONFIG.goldSize : CONFIG.itemSize;
  const it = {
    kind,
    bad,
    power: kind === "shield" || kind === "magnet" || kind === "slow",
    size,
    x,
    y: -size,
    phase: rnd() * Math.PI * 2,
    age: 0,
    delay: 0,
    baseX: x,
    amp: 0,
    speedMul: 1
  };
  if (kind === "zig") {
    it.amp = CONFIG.zigAmp;
    it.baseX = Math.min(canvas.width - size - it.amp, Math.max(it.amp, x));
    it.x = it.baseX;
  }
  if (kind === "fast") {
    it.speedMul = CONFIG.fastMul;
    it.delay = CONFIG.fastWarning;
  }
  return it;
}
function pickBatKind() {
  if (stage >= CONFIG.fastFrom && rnd() < CONFIG.fastChance) return "fast";
  if (stage >= CONFIG.zigFrom && rnd() < CONFIG.zigChance) return "zig";
  return "bat";
}
function spawnItem() {
  useRng(spawnIndex++);
  // tiri fissi in anticipo: in Daily ogni nascita ha le stesse decisioni per tutti
  const rPower = rnd(),
    rBad = rnd(),
    rGold = rnd(),
    rKind = rnd();

  if (
    coinsCaught >= CONFIG.powerupFrom &&
    !items.some((o) => o.power) &&
    rPower < CONFIG.powerupChance
  ) {
    const kinds = mode === "zen" ? ["magnet", "slow"] : ["shield", "magnet", "slow"];
    items.push(makeItem(freeX(CONFIG.itemSize), kinds[Math.floor(rKind * kinds.length)]));
    return;
  }
  if (rBad < effBadChance()) {
    for (let i = 0; i < 12; i++) {
      const cand = makeItem(freeX(CONFIG.itemSize), pickBatKind());
      if (hasSafeLane(cand)) {
        items.push(cand);
        return;
      }
    }
    // nessuna posizione equa: diventa una moneta
  }
  const kind = rGold < effGoldChance() ? "gold" : "coin";
  items.push(makeItem(freeX(kind === "gold" ? CONFIG.goldSize : CONFIG.itemSize), kind));
}
function spawnWave() {
  useRng(200000 + stage);
  const cols = CONFIG.waveColumns;
  const colW = canvas.width / cols;
  for (let c = 0; c < cols; c++) {
    const x = c * colW + colW / 2 - CONFIG.itemSize / 2;
    if (mode === "zen")
      items.push(makeItem(x, rnd() < 0.15 ? "gold" : "coin")); // pioggia di monete
    else if (c === waveGap) items.push(makeItem(x, "coin"));
    else if (rnd() < 0.85) items.push(makeItem(x, "bat"));
  }
}

// ---- PULSANTI HTML ----
function onClick(id, action) {
  const b = $(id);
  b.addEventListener("click", () => {
    unlockAudio();
    SFX.click();
    action();
    b.blur();
  });
}
onClick("btn-start", startGame);
onClick("btn-howto", () => goTo("howto"));
onClick("btn-stats", () => goTo("stats"));
onClick("btn-settings", () => goTo("settings"));
onClick("btn-howto-back", goToMenu);
onClick("btn-stats-back", goToMenu);
onClick("btn-settings-back", goToMenu);
onClick("btn-sound", toggleSound);
onClick("btn-resume", togglePause);
onClick("btn-pause-menu", goToMenu);
onClick("btn-retry", startGame);
onClick("btn-over-menu", goToMenu);
onClick("btn-pause", togglePause);

modeBtns.forEach((b) =>
  b.addEventListener("click", () => {
    unlockAudio();
    SFX.click();
    selectMode(b.dataset.mode);
    b.blur();
  })
);
langBtns.forEach((b) =>
  b.addEventListener("click", () => {
    unlockAudio();
    SFX.click();
    setLang(b.dataset.lang);
    b.blur();
  })
);
el.resetBtn.addEventListener("click", () => {
  unlockAudio();
  SFX.click();
  if (!resetArmed) {
    resetArmed = true;
    el.resetBtn.textContent = t("reset_confirm");
    resetTimer = setTimeout(disarmReset, 3000);
  } else {
    disarmReset();
    resetData();
  }
  el.resetBtn.blur();
});

// Mostra la schermata giusta ogni volta che cambia lo stato
let shownState = null;
function syncScreens() {
  if (shownState === state) return;
  shownState = state;
  const map = {
    menu: el.menu,
    howto: el.howto,
    stats: el.stats,
    settings: el.settings,
    paused: el.pause,
    gameover: el.gameover
  };
  for (const key in map) map[key].classList.toggle("hidden", state !== key);
  el.pauseBtn.classList.toggle("hidden", state !== "playing");
  if (state === "menu") refreshModeUI();
  if (state === "stats") renderStats();
  if (state === "gameover") fillGameOver();
  if (state !== "settings") disarmReset();
}

// ---- INPUT ----
function setTargetFromPointer(e) {
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) * (canvas.width / r.width);
  targetX = x - player.w / 2;
}

window.addEventListener("keydown", (e) => {
  if ([" ", "ArrowLeft", "ArrowRight"].includes(e.key)) e.preventDefault();
  unlockAudio();
  keys[e.key] = true;
  if (e.repeat) return;
  if ((e.key === " " || e.key === "Enter") && (state === "menu" || state === "gameover")) {
    SFX.click();
    startGame();
  }
  if (
    (e.key === "p" || e.key === "P" || e.key === "Escape") &&
    (state === "playing" || state === "paused")
  ) {
    togglePause();
  }
  if (e.key === "Escape" && (state === "howto" || state === "stats" || state === "settings"))
    goToMenu();
  if (state === "menu" && e.key >= "1" && e.key <= "4") selectMode(MODES[Number(e.key) - 1]);
  if (e.key === "m" || e.key === "M") toggleSound();
  if (e.key === "f" || e.key === "F") toggleFullscreen();
});
window.addEventListener("keyup", (e) => {
  keys[e.key] = false;
});

canvas.addEventListener("pointermove", (e) => {
  if (state === "playing" || state === "countdown") setTargetFromPointer(e);
});
canvas.addEventListener("pointerdown", (e) => {
  unlockAudio();
  if (state === "playing" || state === "countdown") setTargetFromPointer(e);
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && state === "playing") state = "paused";
});

// ---- LOGICA ----
function movePlayer(dt) {
  const speed = currentPlayerSpeed();
  let dir = 0;
  if (keys["ArrowLeft"] || keys["a"] || keys["A"]) dir -= 1;
  if (keys["ArrowRight"] || keys["d"] || keys["D"]) dir += 1;

  let moved = 0;
  if (dir !== 0) {
    moved = dir * speed * dt;
    targetX = null;
  } else if (targetX !== null) {
    const diff = targetX - player.x;
    const step = speed * dt;
    moved = Math.abs(diff) <= step ? diff : Math.sign(diff) * step;
  }
  player.x += moved;
  player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));

  const ratio = speed * dt > 0 ? Math.max(-1, Math.min(1, moved / (speed * dt))) : 0;
  player.lean += (ratio * 0.2 - player.lean) * Math.min(1, dt * 12);
}

function update(dt) {
  if (state === "countdown") {
    movePlayer(dt);
    countdown -= dt;
    const n = Math.ceil(countdown);
    if (n > 0 && n !== lastCount) {
      lastCount = n;
      SFX.tick();
    }
    if (countdown <= 0) {
      state = "playing";
      goFlash = 0.6;
      SFX.go();
    }
    updateEffects(dt);
    return;
  }
  if (state === "dying") {
    dyingTimer -= dt;
    updateEffects(dt);
    if (dyingTimer <= 0) finishGame();
    return;
  }
  if (state !== "playing") return;

  updateEffects(dt);
  movePlayer(dt);
  runTime += dt;
  invuln = Math.max(0, invuln - dt);
  magnetTimer = Math.max(0, magnetTimer - dt);
  slowTimer = Math.max(0, slowTimer - dt);

  // [v1.4.0] timer di Time Attack e Zen
  if (mode === "time" || mode === "zen") {
    timeLeft -= dt;
    if (timeLeft <= 0) {
      timeLeft = 0;
      endRun("time");
      return;
    }
  }

  // ondata in arrivo
  if (wavePending) {
    waveTimer -= dt;
    if (waveTimer <= 0) {
      wavePending = false;
      spawnWave();
    }
  }

  // nuovi oggetti
  spawnTimer += dt;
  if (spawnTimer >= CONFIG.spawnInterval) {
    spawnTimer = 0;
    const count = Math.random() < CONFIG.burstChance ? 2 + Math.floor(Math.random() * 2) : 1;
    for (let i = 0; i < count; i++) spawnItem();
  }

  // caduta e movimento
  const fall = currentFall() * (slowTimer > 0 ? CONFIG.slowFactor : 1);
  const pcx = player.x + player.w / 2;
  const pcy = player.y + player.h / 2;
  for (const it of items) {
    if (it.delay > 0) {
      it.delay -= dt;
      continue;
    }
    it.age += dt;
    it.y += fall * it.speedMul * dt;
    if (it.kind === "zig") it.x = it.baseX + Math.sin(it.age * 3.2 + it.phase) * it.amp;
    if (magnetTimer > 0 && (it.kind === "coin" || it.kind === "gold")) {
      const dx = pcx - (it.x + it.size / 2);
      const dy = pcy - (it.y + it.size / 2);
      const dist = Math.hypot(dx, dy);
      if (dist < CONFIG.magnetRadius && dist > 1) {
        it.x += (dx / dist) * CONFIG.magnetPull * dt;
        it.y += (dy / dist) * CONFIG.magnetPull * dt;
      }
    }
  }

  // collisioni
  let dead = false;
  const pBox = box(player.x, player.y, player.w, player.h, CONFIG.playerHitbox);
  items = items.filter((it) => {
    if (it.delay > 0) return true;
    const iBox = box(it.x, it.y, it.size, it.size, it.bad ? CONFIG.batHitbox : CONFIG.coinHitbox);
    if (overlaps(pBox, iBox)) {
      const cx = it.x + it.size / 2;
      const cy = it.y + it.size / 2;
      if (it.bad) {
        if (shield) {
          // lo scudo assorbe il colpo
          shield = false;
          run.shieldSaves++;
          SFX.shieldBreak();
          burst(cx, cy, "#4cc9f0", 20);
          popup(cx, cy, t("shield") + "!", "#4cc9f0");
          shake = 6;
          checkAch();
        } else if (invuln > 0) {
          return true; // invulnerabilità: il pipistrello passa
        } else if (mode === "time") {
          // Time Attack: perdi secondi
          timeLeft = Math.max(0, timeLeft - CONFIG.timePenalty);
          invuln = CONFIG.invulnTime;
          SFX.hit();
          burst(cx, cy, "#f72585", 18);
          popup(pcx, player.y, "-" + CONFIG.timePenalty + "s", "#ff4d6d");
          shake = 8;
          flash = 0.5;
          streak = 0;
        } else {
          // Classic e Daily: fine partita
          lives--;
          SFX.hit();
          burst(cx, cy, "#f72585", 18);
          shake = 10;
          flash = 0.8;
          streak = 0;
          if (lives <= 0) dead = true;
        }
      } else if (it.power) {
        activatePowerup(it.kind);
        stats.powerups++;
        run.powerups++;
        burst(cx, cy, "#ffffff", 14);
        popup(cx, cy, t(it.kind), "#ffffff");
      } else {
        coinsCaught++;
        streak++;
        stats.coins++;
        run.coins++;
        stats.bestStreak = Math.max(stats.bestStreak, streak);
        const value = (it.kind === "gold" ? CONFIG.goldValue : 1) * comboMultiplier();
        score += value;
        if (it.kind === "gold") {
          stats.gold++;
          run.gold++;
          SFX.gold();
          burst(cx, cy, "#fff6a8", 18);
          popup(cx, cy, "+" + value, "#fff6a8");
        } else {
          SFX.collect(Math.pow(2, Math.min(streak, 12) / 12));
          burst(cx, cy, "#ffd60a", 10);
          popup(cx, cy, "+" + value, "#ffd60a");
        }
        if (Math.floor(coinsCaught / CONFIG.stageSize) > stage) {
          stage = Math.floor(coinsCaught / CONFIG.stageSize);
          startStage();
        }
        checkAch();
      }
      return false;
    }
    if (it.y > canvas.height) {
      if (it.kind === "coin" || it.kind === "gold") streak = 0;
      return false;
    }
    return true;
  });

  if (dead) endRun("bat");
}

// ---- DISEGNO ----
function drawWarningMark(cx) {
  if (Math.sin(gameTime * 20) < 0) return;
  ctx.save();
  ctx.fillStyle = "#ff1744";
  ctx.beginPath();
  ctx.moveTo(cx, 6);
  ctx.lineTo(cx + 14, 32);
  ctx.lineTo(cx - 14, 32);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 18px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("!", cx, 29);
  ctx.restore();
}

function drawPowerup(it) {
  const cx = it.x + it.size / 2;
  const cy = it.y + it.size / 2;
  const r = it.size / 2;
  const color = it.kind === "shield" ? "#4cc9f0" : it.kind === "magnet" ? "#f72585" : "#9d4edd";
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 12 + 6 * Math.sin(gameTime * 6 + it.phase);
  ctx.fillStyle = "rgba(16, 0, 43, 0.85)";
  ctx.beginPath();
  ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#fff";
  ctx.fillStyle = color;
  if (it.kind === "shield") {
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 0.55);
    ctx.lineTo(cx + r * 0.5, cy - r * 0.3);
    ctx.lineTo(cx + r * 0.5, cy + r * 0.05);
    ctx.quadraticCurveTo(cx + r * 0.45, cy + r * 0.5, cx, cy + r * 0.65);
    ctx.quadraticCurveTo(cx - r * 0.45, cy + r * 0.5, cx - r * 0.5, cy + r * 0.05);
    ctx.lineTo(cx - r * 0.5, cy - r * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (it.kind === "magnet") {
    ctx.lineWidth = 4;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.05, r * 0.42, Math.PI, 0);
    ctx.lineTo(cx + r * 0.42, cy + r * 0.5);
    ctx.moveTo(cx - r * 0.42, cy - r * 0.05);
    ctx.lineTo(cx - r * 0.42, cy + r * 0.5);
    ctx.stroke();
    ctx.strokeStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.42, cy + r * 0.3);
    ctx.lineTo(cx - r * 0.42, cy + r * 0.5);
    ctx.moveTo(cx + r * 0.42, cy + r * 0.3);
    ctx.lineTo(cx + r * 0.42, cy + r * 0.5);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, cy - r * 0.38);
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + r * 0.28, cy + r * 0.12);
    ctx.stroke();
  }
  ctx.restore();
}

function drawItem(it) {
  if (it.delay > 0) {
    drawWarningMark(it.x + it.size / 2);
    return;
  }
  if (it.power) {
    drawPowerup(it);
    return;
  }
  if (it.kind === "gold") {
    ctx.save();
    ctx.shadowColor = "#ffd60a";
    ctx.shadowBlur = 12 + 6 * Math.sin(gameTime * 6 + it.phase);
    const spin = 0.4 + 0.6 * Math.abs(Math.cos(gameTime * 4 + it.phase));
    drawSpriteFx(IMG.coin, it.x, it.y, it.size, it.size, "#ffd60a", spin, 1);
    ctx.restore();
    return;
  }
  if (it.kind === "coin") {
    const spin = 0.35 + 0.65 * Math.abs(Math.cos(gameTime * 6 + it.phase));
    drawSpriteFx(IMG.coin, it.x, it.y, it.size, it.size, "#ffd60a", spin, 1);
    return;
  }
  const flap = 1 + 0.15 * Math.sin(gameTime * (it.kind === "fast" ? 24 : 16) + it.phase);
  ctx.save();
  if (it.kind === "zig") {
    ctx.shadowColor = "#9bf000";
    ctx.shadowBlur = 10;
  }
  if (it.kind === "fast") {
    ctx.shadowColor = "#ff1744";
    ctx.shadowBlur = 12;
    ctx.strokeStyle = "rgba(255, 23, 68, 0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(it.x + 8, it.y - 18);
    ctx.lineTo(it.x + 8, it.y - 4);
    ctx.moveTo(it.x + it.size - 8, it.y - 18);
    ctx.lineTo(it.x + it.size - 8, it.y - 4);
    ctx.stroke();
  }
  drawSpriteFx(IMG.bat, it.x, it.y, it.size, it.size, "#f72585", 1, flap);
  ctx.restore();
}

function drawScene() {
  drawBackground();

  ctx.save();
  if (shake > 0) {
    ctx.translate((Math.random() - 0.5) * shake * 2, (Math.random() - 0.5) * shake * 2);
  }

  // corsia libera durante l'avviso dell'ondata (non in Zen)
  if (wavePending && mode !== "zen") {
    const colW = canvas.width / CONFIG.waveColumns;
    const cx = waveGap * colW + colW / 2;
    const bob = Math.sin(gameTime * 10) * 4;
    ctx.fillStyle = "rgba(76, 201, 240, 0.12)";
    ctx.fillRect(waveGap * colW, 0, colW, canvas.height);
    ctx.fillStyle = "rgba(76, 201, 240, 0.85)";
    ctx.beginPath();
    ctx.moveTo(cx - 14, 60 + bob);
    ctx.lineTo(cx + 14, 60 + bob);
    ctx.lineTo(cx, 84 + bob);
    ctx.closePath();
    ctx.fill();
  }

  for (const it of items) drawItem(it);

  const flicker = invuln > 0 && Math.sin(gameTime * 40) < 0;
  if (!playerHidden && !flicker) {
    drawSpriteFx(IMG.player, player.x, player.y, player.w, player.h, "#4cc9f0", 1, 1, player.lean);
  }
  if (!playerHidden && shield) {
    ctx.strokeStyle = "rgba(76, 201, 240, " + (0.6 + 0.4 * Math.sin(gameTime * 6)) + ")";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(player.x + player.w / 2, player.y + player.h / 2, player.w * 0.75, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;

  ctx.font = "bold 18px sans-serif";
  ctx.textAlign = "center";
  for (const tx of popups) {
    ctx.globalAlpha = Math.max(0, tx.life / tx.max);
    ctx.fillStyle = tx.color;
    ctx.fillText(tx.text, tx.x, tx.y);
  }
  ctx.globalAlpha = 1;

  if (DEBUG) {
    ctx.lineWidth = 1;
    const pb = box(player.x, player.y, player.w, player.h, CONFIG.playerHitbox);
    ctx.strokeStyle = "#00ff88";
    ctx.strokeRect(pb.x, pb.y, pb.w, pb.h);
    for (const it of items) {
      const b = box(it.x, it.y, it.size, it.size, it.bad ? CONFIG.batHitbox : CONFIG.coinHitbox);
      ctx.strokeStyle = it.bad ? "#ff0044" : "#00ffff";
      ctx.strokeRect(b.x, b.y, b.w, b.h);
    }
  }
  ctx.restore();

  // HUD (non trema)
  ctx.font = "bold 20px sans-serif";
  ctx.textAlign = "left";
  ctx.fillStyle = "#ffd60a";
  ctx.fillText(t("points") + ": " + score, 10, 25);
  ctx.textAlign = "right";
  ctx.fillStyle = "#4cc9f0";
  ctx.fillText(
    t("speed") + ": x" + (currentPlayerSpeed() / CONFIG.playerSpeed).toFixed(1),
    canvas.width - 10,
    25
  );

  if (mode === "time" || mode === "zen") {
    const sec = Math.ceil(timeLeft);
    const urgent = mode === "time" && sec <= 10 && Math.sin(gameTime * 10) > 0;
    ctx.textAlign = "center";
    ctx.font = "bold 22px sans-serif";
    ctx.fillStyle = urgent ? "#ff4d6d" : "#ffffff";
    ctx.fillText(
      t("time") + " " + Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0"),
      canvas.width / 2,
      25
    );
  }

  ctx.font = "bold 14px sans-serif";
  ctx.textAlign = "left";
  let ly = 46;
  const line = (text, color) => {
    ctx.fillStyle = color;
    ctx.fillText(text, 10, ly);
    ly += 18;
  };
  const mult = comboMultiplier();
  if (mult > 1) line(t("combo") + " x" + mult + "  (" + streak + ")", "#ffd60a");
  if (shield) line(t("shield"), "#4cc9f0");
  if (magnetTimer > 0) line(t("magnet") + " " + magnetTimer.toFixed(1) + "s", "#f72585");
  if (slowTimer > 0) line(t("slow") + " " + slowTimer.toFixed(1) + "s", "#9d4edd");
  if (!soundOn) line(t("muted"), "rgba(255, 255, 255, 0.7)");
  if (DEBUG) {
    ctx.font = "12px monospace";
    line(
      "mode " +
        mode +
        "  stage " +
        (stage + 1) +
        "  coins " +
        coinsCaught +
        "  items " +
        items.length,
      "#fff"
    );
  }

  // avviso obiettivi sbloccati
  ctx.textAlign = "center";
  ctx.lineJoin = "round";
  ctx.font = "bold 15px sans-serif";
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#10002b";
  toasts.slice(0, 2).forEach((ts, i) => {
    const y = 62 + i * 22;
    ctx.globalAlpha = Math.min(1, ts.life);
    ctx.strokeText(ts.text, canvas.width / 2, y);
    ctx.fillStyle = "#ffd60a";
    ctx.fillText(ts.text, canvas.width / 2, y);
  });
  ctx.globalAlpha = 1;

  // tinta durante lo slow-mo
  if (slowTimer > 0) {
    ctx.fillStyle = "rgba(157, 78, 221, 0.10)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // lampo rosa
  if (flash > 0) {
    ctx.fillStyle = "rgba(247, 37, 133, " + flash * 0.45 + ")";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // striscione dello stage, avviso ondata o tempo scaduto
  if (bannerTimer > 0) {
    ctx.textAlign = "center";
    ctx.lineJoin = "round";
    ctx.font = "bold 40px sans-serif";
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#10002b";
    ctx.strokeText(bannerText, canvas.width / 2, 170);
    ctx.fillStyle = "#ffd60a";
    ctx.fillText(bannerText, canvas.width / 2, 170);
    if (wavePending && Math.sin(gameTime * 14) > 0) {
      const zen = mode === "zen";
      const msg = zen ? t("coin_shower") : t("warning_wave");
      ctx.font = "bold 22px sans-serif";
      ctx.strokeText(msg, canvas.width / 2, 205);
      ctx.fillStyle = zen ? "#ffd60a" : "#ff4d6d";
      ctx.fillText(msg, canvas.width / 2, 205);
    }
  }

  // conto alla rovescia e "GO!"
  ctx.textAlign = "center";
  ctx.lineJoin = "round";
  if (state === "countdown") {
    const n = Math.ceil(countdown);
    const frac = countdown - (n - 1);
    ctx.font = "bold " + Math.round(80 + 40 * frac) + "px sans-serif";
    ctx.lineWidth = 8;
    ctx.strokeStyle = "#10002b";
    ctx.strokeText(n, canvas.width / 2, canvas.height / 2);
    ctx.fillStyle = "#fff";
    ctx.fillText(n, canvas.width / 2, canvas.height / 2);
  } else if (goFlash > 0) {
    ctx.globalAlpha = Math.min(1, goFlash / 0.3);
    ctx.font = "bold 90px sans-serif";
    ctx.lineWidth = 8;
    ctx.strokeStyle = "#10002b";
    ctx.strokeText(t("go"), canvas.width / 2, canvas.height / 2);
    ctx.fillStyle = "#ffd60a";
    ctx.fillText(t("go"), canvas.width / 2, canvas.height / 2);
    ctx.globalAlpha = 1;
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (state === "countdown" || state === "playing" || state === "paused" || state === "dying") {
    drawScene();
  }
}

// ---- GAME LOOP ----
let last = 0;
function loop(tm) {
  const dt = Math.min((tm - last) / 1000, 0.05);
  last = tm;
  gameTime += dt;
  update(dt);
  syncMusic();
  syncScreens();
  draw();
  requestAnimationFrame(loop);
}

// ---- AVVIO ----
resetGame();
applyLang();
requestAnimationFrame(loop);
