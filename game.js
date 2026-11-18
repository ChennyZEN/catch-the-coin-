/*
  Catch the Coin by ChennyZEN
  Grafica: Kenney.nl (CC0) - pacchetto Platformer Art Pixel
  Musica menu: "Crystal Cave (song18)" - The Cynic Project / pixelsphere.org (CC0)
  Musica di gioco: "Enchanted Tiki 86" - cynicmusic.com (CC0)
*/

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false; // pixel art nitida

// ?debug mostra le hitbox, ?test accorcia gli stage e rende comuni i power-up
const DEBUG = location.search.includes("debug");
const TEST = location.search.includes("test"); // [v1.3.0]

// ---- ELEMENTI HTML (menu, pausa, game over) ----
const el = {
  menu:       document.getElementById("screen-menu"),
  pause:      document.getElementById("screen-pause"),
  gameover:   document.getElementById("screen-gameover"),
  pauseBtn:   document.getElementById("btn-pause"),
  soundBtn:   document.getElementById("btn-sound"),
  menuRecord: document.getElementById("menu-record"),
  finalScore: document.getElementById("final-score"),
  finalRecord:document.getElementById("final-record"),
  newRecord:  document.getElementById("new-record")
};
const volMusic = document.querySelectorAll(".vol-music");
const volSfx   = document.querySelectorAll(".vol-sfx");

// ---- CONFIGURAZIONE ----
const CONFIG = {
  playerSpeed: 500,      // velocità iniziale del player (pixel/secondo)
  playerSpeedGain: 8,    // quanta velocità in più per ogni moneta raccolta
  playerSpeedMax: 1000,  // limite massimo (alzalo o abbassalo a piacere)
  spawnInterval: 0.8,    // secondi tra un oggetto e l'altro
  itemSpeed: 300,        // velocità iniziale di caduta
  itemSpeedGain: 3,      // aumento della caduta per ogni moneta raccolta
  lives: 1,              // modalità hardcore: una sola vita
  badChance: 0.50,       // probabilità che compaia un pipistrello
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

  // ---- [v1.3.0] novità ----
  stageSize: 25,         // ogni quante monete cambia stage (sfondo + ondata)
  comboStep: 5,          // monete di fila per salire di moltiplicatore
  comboMax: 5,           // moltiplicatore massimo
  goldChance: 0.08,      // probabilità che una moneta sia d'oro
  goldValue: 5,
  goldSize: 40,
  powerupChance: 0.06,   // probabilità che nasca un power-up (uno alla volta)
  powerupFrom: 5,        // dalla quale moneta raccolta compaiono
  magnetTime: 6,
  magnetRadius: 170,
  magnetPull: 380,
  slowTime: 5,
  slowFactor: 0.55,      // velocità di caduta durante lo slow-mo
  zigFrom: 1,            // dallo stage 1 (2º) compaiono i pipistrelli a zig-zag
  zigChance: 0.25,
  zigAmp: 55,
  fastFrom: 2,           // dallo stage 2 (3º) compaiono i pipistrelli veloci
  fastChance: 0.2,
  fastMul: 1.6,
  fastWarning: 0.6,      // secondi di avviso prima che un pipistrello veloce entri
  waveWarning: 1.6,      // secondi di avviso prima di un'ondata
  waveColumns: 6,
  musicRateMax: 1.25     // velocità massima della musica di gioco
};
if (TEST) {
  Object.assign(CONFIG, { stageSize: 3, powerupFrom: 0, powerupChance: 0.5, goldChance: 0.4, zigFrom: 0, fastFrom: 0 });
}

// ---- STATO ----
let state = "menu"; // "menu" | "countdown" | "playing" | "paused" | "dying" | "gameover"
let score, lives, player, items, spawnTimer;
let targetX = null; // destinazione del player con mouse/touch
let newRecord = false;
let highScore = 0;
try { highScore = Number(localStorage.getItem("highScore")) || 0; } catch (e) {}
const keys = {};
let soundOn = true;

// v1.2.0
let particles = [];
let popups = [];
let shake = 0, flash = 0, streak = 0;
let countdown = 0, lastCount = 0, goFlash = 0, dyingTimer = 0;
let gameTime = 0;

// [v1.3.0]
let coinsCaught = 0, stage = 0;
let shield = false, magnetTimer = 0, slowTimer = 0;
let wavePending = false, waveTimer = 0, waveGap = 0;
let bannerText = "", bannerTimer = 0;
let theme = 0, prevTheme = 0, themeFade = 1;

// impostazioni audio salvate nel browser
const settings = { music: CONFIG.musicVolume, sfx: 1, sound: true };
try {
  const saved = JSON.parse(localStorage.getItem("ctcSettings"));
  if (saved) {
    if (typeof saved.music === "number") settings.music = Math.min(1, Math.max(0, saved.music));
    if (typeof saved.sfx === "number")   settings.sfx   = Math.min(1, Math.max(0, saved.sfx));
    if (typeof saved.sound === "boolean") settings.sound = saved.sound;
  }
} catch (e) {}
soundOn = settings.sound;
function saveSettings() {
  try { localStorage.setItem("ctcSettings", JSON.stringify(settings)); } catch (e) {}
}

// ---- SPRITE (cartella Assets/) ----
function loadImage(src) {
  const img = new Image();
  img.loaded = false;
  img.onload = () => { img.loaded = true; };
  img.src = src;
  return img;
}
const IMG = {
  player: loadImage("Assets/player.png"),
  coin:   loadImage("Assets/coin.png"),
  bat:    loadImage("Assets/bat.png")
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
  click:    () => beep(520, 0.06),
  collect:  (pitch = 1) => beep(880 * pitch, 0.1),
  hit:      () => beep(140, 0.3, "sawtooth", 0.12),
  gameover: () => {
    beep(300, 0.2, "triangle");
    setTimeout(() => beep(150, 0.5, "triangle"), 200);
  },
  tick:     () => beep(440, 0.08),
  go:       () => beep(880, 0.25, "square", 0.1),
  record:   () => {
    beep(660, 0.12);
    setTimeout(() => beep(880, 0.12), 120);
    setTimeout(() => beep(1320, 0.3), 240);
  },
  // [v1.3.0]
  gold:        () => { beep(1175, 0.08); setTimeout(() => beep(1568, 0.14), 70); },
  power:       () => { beep(660, 0.1, "triangle"); setTimeout(() => beep(990, 0.16, "triangle"), 90); },
  shieldBreak: () => beep(240, 0.2, "triangle", 0.12),
  warning:     () => { beep(600, 0.15, "sawtooth", 0.06); setTimeout(() => beep(800, 0.15, "sawtooth", 0.06), 180); }
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
    if (state === "menu") wanted = MUSIC.menu;
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
  volMusic.forEach(s => { s.value = Math.round(settings.music * 100); });
  volSfx.forEach(s => { s.value = Math.round(settings.sfx * 100); });
}
volMusic.forEach(s => {
  s.addEventListener("input", () => { settings.music = s.value / 100; applyVolumes(); saveSettings(); });
  s.addEventListener("change", () => s.blur());
});
volSfx.forEach(s => {
  s.addEventListener("input", () => { settings.sfx = s.value / 100; applyVolumes(); saveSettings(); });
  s.addEventListener("change", () => { unlockAudio(); SFX.click(); s.blur(); });
});
applyVolumes();

// ---- [v1.3.0] SFONDI A TEMA ----
const STALACTITES = Array.from({ length: 9 }, (_, i) => ({
  x: i * 56 + Math.random() * 20, w: 24 + Math.random() * 22, h: 30 + Math.random() * 60
}));
const STARS = Array.from({ length: 40 }, () => ({
  x: Math.random() * 480, y: Math.random() * 640, r: 1 + Math.random() * 1.5, p: Math.random() * 6.28
}));
const RAIN = Array.from({ length: 45 }, () => ({
  x: Math.random() * 480, y: Math.random() * 640, s: 500 + Math.random() * 300, l: 10 + Math.random() * 12
}));

function drawTheme(idx, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  if (idx === 0) {            // grotta
    g.addColorStop(0, "#10002b"); g.addColorStop(0.55, "#240046"); g.addColorStop(1, "#3c096c");
  } else if (idx === 1) {     // notte
    g.addColorStop(0, "#03045e"); g.addColorStop(0.6, "#10002b"); g.addColorStop(1, "#240046");
  } else {                    // tempesta
    g.addColorStop(0, "#1b1b2f"); g.addColorStop(0.6, "#2d2a4a"); g.addColorStop(1, "#3a3358");
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
    ctx.beginPath(); ctx.arc(400, 90, 28, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#03045e";
    ctx.beginPath(); ctx.arc(412, 82, 26, 0, Math.PI * 2); ctx.fill();
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

// ---- AZIONI ----
function currentPlayerSpeed() {
  return Math.min(CONFIG.playerSpeed + coinsCaught * CONFIG.playerSpeedGain, CONFIG.playerSpeedMax);
}
function currentFall() {
  return CONFIG.itemSpeed + coinsCaught * CONFIG.itemSpeedGain;
}
function comboMultiplier() { // [v1.3.0]
  return Math.min(CONFIG.comboMax, 1 + Math.floor(streak / CONFIG.comboStep));
}
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
  shake = 0;
  flash = 0;
  streak = 0;
  goFlash = 0;
  // [v1.3.0]
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
}
function startGame() {
  resetGame();
  MUSIC.game.currentTime = 0;
  MUSIC.game.playbackRate = 1;
  countdown = CONFIG.countdown;
  lastCount = 0;
  state = "countdown";
}
function finishGame() {
  state = "gameover";
  newRecord = score > highScore;
  highScore = Math.max(highScore, score);
  try { localStorage.setItem("highScore", highScore); } catch (e) {}
  if (newRecord) SFX.record(); else SFX.gameover();
}
function goToMenu() { state = "menu"; }
function refreshSoundButton() {
  el.soundBtn.textContent = "SOUND: " + (soundOn ? "ON" : "OFF");
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
refreshSoundButton();

// [v1.3.0] power-up e stage
function activatePowerup(kind) {
  if (kind === "shield") shield = true;
  if (kind === "magnet") magnetTimer = CONFIG.magnetTime;
  if (kind === "slow") slowTimer = CONFIG.slowTime;
  SFX.power();
}
function startStage() {
  prevTheme = theme;
  theme = stage % 3;
  themeFade = 0;
  waveGap = Math.floor(Math.random() * CONFIG.waveColumns);
  waveTimer = CONFIG.waveWarning;
  wavePending = true;
  bannerText = "STAGE " + (stage + 1);
  bannerTimer = CONFIG.waveWarning + 0.4;
  SFX.warning();
  MUSIC.game.playbackRate = Math.min(CONFIG.musicRateMax, 1 + stage * 0.04);
}

// ---- EFFETTI VISIVI ----
function burst(x, y, color, n, power = 160) {
  for (let i = 0; i < n && particles.length < CONFIG.maxParticles; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = power * (0.3 + Math.random() * 0.7);
    const life = 0.4 + Math.random() * 0.4;
    particles.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 40,
      life, max: life,
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
  particles = particles.filter(p => p.life > 0);
  for (const t of popups) {
    t.y -= 50 * dt;
    t.life -= dt;
  }
  popups = popups.filter(t => t.life > 0);
  shake = Math.max(0, shake - 25 * dt);
  flash = Math.max(0, flash - 2.5 * dt);
  goFlash = Math.max(0, goFlash - dt);
  bannerTimer = Math.max(0, bannerTimer - dt);       // [v1.3.0]
  themeFade = Math.min(1, themeFade + dt / 1.5);     // [v1.3.0]
}

// ---- COLLISIONI CON HITBOX RIDOTTE ----
function box(x, y, w, h, scale) {
  const dx = w * (1 - scale) / 2;
  const dy = h * (1 - scale) / 2;
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
    const x = Math.random() * (canvas.width - size);
    if (items.every(o => o.y > CONFIG.itemSize * 1.5 || Math.abs(o.x - x) > CONFIG.itemSize * 1.3)) return x;
  }
  return Math.random() * (canvas.width - size);
}

// [v1.3.0] crea un oggetto di qualsiasi tipo
function makeItem(x, kind) {
  const bad = kind === "bat" || kind === "zig" || kind === "fast";
  const size = kind === "gold" ? CONFIG.goldSize : CONFIG.itemSize;
  const it = {
    kind, bad,
    power: kind === "shield" || kind === "magnet" || kind === "slow",
    size, x, y: -size,
    phase: Math.random() * Math.PI * 2,
    age: 0, delay: 0, baseX: x, amp: 0, speedMul: 1
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
  if (stage >= CONFIG.fastFrom && Math.random() < CONFIG.fastChance) return "fast";
  if (stage >= CONFIG.zigFrom && Math.random() < CONFIG.zigChance) return "zig";
  return "bat";
}
function spawnItem() {
  // power-up: raro, uno alla volta
  if (coinsCaught >= CONFIG.powerupFrom &&
      !items.some(o => o.power) &&
      Math.random() < CONFIG.powerupChance) {
    const kinds = ["shield", "magnet", "slow"];
    items.push(makeItem(freeX(CONFIG.itemSize), kinds[Math.floor(Math.random() * kinds.length)]));
    return;
  }
  // pipistrello, solo se lascia una corsia libera
  if (Math.random() < CONFIG.badChance) {
    for (let i = 0; i < 12; i++) {
      const cand = makeItem(freeX(CONFIG.itemSize), pickBatKind());
      if (hasSafeLane(cand)) { items.push(cand); return; }
    }
    // nessuna posizione equa: diventa una moneta
  }
  const kind = Math.random() < CONFIG.goldChance ? "gold" : "coin";
  items.push(makeItem(freeX(kind === "gold" ? CONFIG.goldSize : CONFIG.itemSize), kind));
}
// [v1.3.0] ondata: una riga di pipistrelli con una colonna libera (con una moneta dentro)
function spawnWave() {
  const cols = CONFIG.waveColumns;
  const colW = canvas.width / cols;
  for (let c = 0; c < cols; c++) {
    const cx = c * colW + colW / 2 - CONFIG.itemSize / 2;
    if (c === waveGap) items.push(makeItem(cx, "coin"));
    else if (Math.random() < 0.85) items.push(makeItem(cx, "bat"));
  }
}

// ---- PULSANTI HTML ----
function onClick(id, action) {
  const b = document.getElementById(id);
  b.addEventListener("click", () => {
    unlockAudio();
    SFX.click();
    action();
    b.blur();
  });
}
onClick("btn-start", startGame);
onClick("btn-sound", toggleSound);
onClick("btn-resume", togglePause);
onClick("btn-pause-menu", goToMenu);
onClick("btn-retry", startGame);
onClick("btn-over-menu", goToMenu);
onClick("btn-pause", togglePause);

let shownState = null;
function syncScreens() {
  if (shownState === state) return;
  shownState = state;
  el.menu.classList.toggle("hidden", state !== "menu");
  el.pause.classList.toggle("hidden", state !== "paused");
  el.gameover.classList.toggle("hidden", state !== "gameover");
  el.pauseBtn.classList.toggle("hidden", state !== "playing");
  if (state === "menu") el.menuRecord.textContent = highScore;
  if (state === "gameover") {
    el.finalScore.textContent = score;
    el.finalRecord.textContent = highScore;
    el.newRecord.classList.toggle("hidden", !newRecord);
  }
}

// ---- INPUT ----
function setTargetFromPointer(e) {
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) * (canvas.width / r.width);
  targetX = x - player.w / 2;
}

window.addEventListener("keydown", e => {
  if ([" ", "ArrowLeft", "ArrowRight"].includes(e.key)) e.preventDefault();
  unlockAudio();
  keys[e.key] = true;
  if (e.repeat) return;
  if ((e.key === " " || e.key === "Enter") && (state === "menu" || state === "gameover")) {
    SFX.click();
    startGame();
  }
  if ((e.key === "p" || e.key === "P" || e.key === "Escape") &&
      (state === "playing" || state === "paused")) {
    togglePause();
  }
  if (e.key === "m" || e.key === "M") toggleSound();
  if (e.key === "f" || e.key === "F") toggleFullscreen();
});
window.addEventListener("keyup", e => { keys[e.key] = false; });

canvas.addEventListener("pointermove", e => {
  if (state === "playing" || state === "countdown") setTargetFromPointer(e);
});
canvas.addEventListener("pointerdown", e => {
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
  if (keys["ArrowLeft"] || keys["a"] || keys["A"])  dir -= 1;
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

  const ratio = (speed * dt) > 0 ? Math.max(-1, Math.min(1, moved / (speed * dt))) : 0;
  player.lean += (ratio * 0.2 - player.lean) * Math.min(1, dt * 12);
}

function update(dt) {
  if (state === "countdown") {
    movePlayer(dt);
    countdown -= dt;
    const n = Math.ceil(countdown);
    if (n > 0 && n !== lastCount) { lastCount = n; SFX.tick(); }
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

  // [v1.3.0] timer dei power-up e ondata in arrivo
  magnetTimer = Math.max(0, magnetTimer - dt);
  slowTimer = Math.max(0, slowTimer - dt);
  if (wavePending) {
    waveTimer -= dt;
    if (waveTimer <= 0) {
      wavePending = false;
      spawnWave();
    }
  }

  // Nuovi oggetti
  spawnTimer += dt;
  if (spawnTimer >= CONFIG.spawnInterval) {
    spawnTimer = 0;
    const count = Math.random() < CONFIG.burstChance ? 2 + Math.floor(Math.random() * 2) : 1;
    for (let i = 0; i < count; i++) spawnItem();
  }

  // Caduta e movimento
  const fall = currentFall() * (slowTimer > 0 ? CONFIG.slowFactor : 1);
  const pcx = player.x + player.w / 2;
  const pcy = player.y + player.h / 2;
  for (const it of items) {
    if (it.delay > 0) { it.delay -= dt; continue; }
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

  // Collisioni
  const pBox = box(player.x, player.y, player.w, player.h, CONFIG.playerHitbox);
  items = items.filter(it => {
    if (it.delay > 0) return true;
    const iBox = box(it.x, it.y, it.size, it.size, it.bad ? CONFIG.batHitbox : CONFIG.coinHitbox);
    if (overlaps(pBox, iBox)) {
      const cx = it.x + it.size / 2;
      const cy = it.y + it.size / 2;
      if (it.bad) {
        if (shield) {                       // lo scudo assorbe il colpo
          shield = false;
          SFX.shieldBreak();
          burst(cx, cy, "#4cc9f0", 20);
          popup(cx, cy, "SHIELD!", "#4cc9f0");
          shake = 6;
        } else {
          lives--;
          SFX.hit();
          burst(cx, cy, "#f72585", 18);
          shake = 10;
          flash = 0.8;
          streak = 0;
        }
      } else if (it.power) {
        activatePowerup(it.kind);
        burst(cx, cy, "#ffffff", 14);
        popup(cx, cy, it.kind === "slow" ? "SLOW-MO" : it.kind.toUpperCase(), "#ffffff");
      } else {
        coinsCaught++;
        streak++;
        const value = (it.kind === "gold" ? CONFIG.goldValue : 1) * comboMultiplier();
        score += value;
        if (it.kind === "gold") {
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
      }
      return false;
    }
    if (it.y > canvas.height) {
      if (it.kind === "coin" || it.kind === "gold") streak = 0;
      return false;
    }
    return true;
  });

  if (lives <= 0) {
    state = "dying";
    dyingTimer = CONFIG.dyingTime;
    shake = 14;
    flash = 1;
    burst(player.x + player.w / 2, player.y + player.h / 2, "#4cc9f0", 30, 220);
  }
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
  if (it.delay > 0) { drawWarningMark(it.x + it.size / 2); return; }
  if (it.power) { drawPowerup(it); return; }
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
  // pipistrelli
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

  // corsia libera durante l'avviso dell'ondata
  if (wavePending) {
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

  if (state !== "dying") {
    drawSpriteFx(IMG.player, player.x, player.y, player.w, player.h, "#4cc9f0", 1, 1, player.lean);
    if (shield) {
      ctx.strokeStyle = "rgba(76, 201, 240, " + (0.6 + 0.4 * Math.sin(gameTime * 6)) + ")";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(player.x + player.w / 2, player.y + player.h / 2, player.w * 0.75, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;

  ctx.font = "bold 18px sans-serif";
  ctx.textAlign = "center";
  for (const t of popups) {
    ctx.globalAlpha = Math.max(0, t.life / t.max);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
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
  ctx.fillText("Points: " + score, 10, 25);
  ctx.textAlign = "right";
  ctx.fillStyle = "#4cc9f0";
  ctx.fillText("Speed: x" + (currentPlayerSpeed() / CONFIG.playerSpeed).toFixed(1), canvas.width - 10, 25);

  ctx.font = "bold 14px sans-serif";
  ctx.textAlign = "left";
  let ly = 46;
  const line = (text, color) => { ctx.fillStyle = color; ctx.fillText(text, 10, ly); ly += 18; };
  const mult = comboMultiplier();
  if (mult > 1) line("COMBO x" + mult + "  (" + streak + ")", "#ffd60a");
  if (shield) line("SHIELD", "#4cc9f0");
  if (magnetTimer > 0) line("MAGNET " + magnetTimer.toFixed(1) + "s", "#f72585");
  if (slowTimer > 0) line("SLOW-MO " + slowTimer.toFixed(1) + "s", "#9d4edd");
  if (!soundOn) line("MUTED (M)", "rgba(255, 255, 255, 0.7)");
  if (DEBUG) {
    ctx.font = "12px monospace";
    line("stage " + (stage + 1) + "  coins " + coinsCaught + "  items " + items.length, "#fff");
  }

  // lieve tinta azzurra durante lo slow-mo
  if (slowTimer > 0) {
    ctx.fillStyle = "rgba(157, 78, 221, 0.10)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // lampo rosa alla morte
  if (flash > 0) {
    ctx.fillStyle = "rgba(247, 37, 133, " + (flash * 0.45) + ")";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // striscione dello stage / avviso ondata
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
      ctx.font = "bold 22px sans-serif";
      ctx.strokeText("WARNING: WAVE INCOMING", canvas.width / 2, 205);
      ctx.fillStyle = "#ff4d6d";
      ctx.fillText("WARNING: WAVE INCOMING", canvas.width / 2, 205);
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
    ctx.strokeText("GO!", canvas.width / 2, canvas.height / 2);
    ctx.fillStyle = "#ffd60a";
    ctx.fillText("GO!", canvas.width / 2, canvas.height / 2);
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
function loop(t) {
  const dt = Math.min((t - last) / 1000, 0.05);
  last = t;
  gameTime += dt;
  update(dt);
  syncMusic();
  syncScreens();
  draw();
  requestAnimationFrame(loop);
}

resetGame();
requestAnimationFrame(loop);