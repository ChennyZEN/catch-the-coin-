/*
  Catch the Coin by ChennyZEN
  Grafica: Kenney.nl (CC0) - pacchetto Platformer Art Pixel
  Musica menu: "Crystal Cave (song18)" - The Cynic Project / pixelsphere.org (CC0)
  Musica di gioco: "Enchanted Tiki 86" - cynicmusic.com (CC0)
*/

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false; // pixel art nitida

// [v1.2.0] aggiungi ?debug all'indirizzo per vedere le hitbox
const DEBUG = location.search.includes("debug");

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
// [v1.2.0] cursori del volume (ce ne sono due set: menu e pausa)
const volMusic = document.querySelectorAll(".vol-music");
const volSfx   = document.querySelectorAll(".vol-sfx");

// ---- CONFIGURAZIONE ----
const CONFIG = {
  playerSpeed: 500,      // velocità iniziale del player (pixel/secondo)
  playerSpeedGain: 8,    // quanta velocità in più per ogni punto
  playerSpeedMax: 1000,  // limite massimo (alzalo o abbassalo a piacere)
  spawnInterval: 0.8,    // secondi tra un oggetto e l'altro
  itemSpeed: 300,        // velocità iniziale di caduta
  itemSpeedGain: 3,      // aumento della caduta per ogni punto
  lives: 1,              // modalità hardcore: una sola vita
  badChance: 0.50,       // probabilità che compaia un pipistrello
  playerW: 50,
  playerH: 40,
  itemSize: 30,
  musicVolume: 0.5,

  // ---- [v1.2.0] novità ----
  playerHitbox: 0.8,     // quanta parte dello sprite del player "conta" nelle collisioni
  batHitbox: 0.7,        // idem per i pipistrelli (più basso = più clemente)
  coinHitbox: 1.0,       // le monete restano generose
  laneWindow: 1.2,       // secondi: pipistrelli vicini nel tempo vengono considerati insieme
  safeLaneWidth: 60,     // larghezza minima della corsia libera (pixel)
  laneMargin: 10,        // margine di sicurezza attorno a ogni pipistrello
  burstChance: 0,        // 0 = un oggetto alla volta; es. 0.2 = 20% di ondate da 2-3 oggetti
  countdown: 3,          // secondi del conto alla rovescia
  dyingTime: 0.7,        // durata della "morte" prima di Game Over
  maxParticles: 200
};

// ---- STATO ----
let state = "menu"; // "menu" | "countdown" | "playing" | "paused" | "dying" | "gameover"
let score, lives, player, items, spawnTimer;
let targetX = null; // destinazione del player con mouse/touch
let newRecord = false;
let highScore = 0;
try { highScore = Number(localStorage.getItem("highScore")) || 0; } catch (e) {}
const keys = {};
let soundOn = true;

// [v1.2.0] nuove variabili
let particles = [];
let popups = [];
let shake = 0, flash = 0, streak = 0;
let countdown = 0, lastCount = 0, goFlash = 0, dyingTimer = 0;
let gameTime = 0;

// [v1.2.0] impostazioni audio salvate nel browser
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
// [v1.2.0] sprite con scala e rotazione attorno al centro (per le animazioni)
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
  gain.gain.setValueAtTime(volume * settings.sfx, audioCtx.currentTime); // [v1.2.0] volume effetti
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}
const SFX = {
  click:    () => beep(520, 0.06),
  collect:  (pitch = 1) => beep(880 * pitch, 0.1),   // [v1.2.0] tono crescente con la serie
  hit:      () => beep(140, 0.3, "sawtooth", 0.12),
  gameover: () => {
    beep(300, 0.2, "triangle");
    setTimeout(() => beep(150, 0.5, "triangle"), 200);
  },
  tick:     () => beep(440, 0.08),                    // [v1.2.0] conto alla rovescia
  go:       () => beep(880, 0.25, "square", 0.1),
  record:   () => {                                    // [v1.2.0] jingle nuovo record
    beep(660, 0.12);
    setTimeout(() => beep(880, 0.12), 120);
    setTimeout(() => beep(1320, 0.3), 240);
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
    if (state === "menu") wanted = MUSIC.menu;
    else if (state === "countdown" || state === "playing") wanted = MUSIC.game; // [v1.2.0]
  }
  for (const m of [MUSIC.menu, MUSIC.game]) {
    if (m === wanted) {
      if (m.paused && !m.failed) m.play().catch(() => {});
    } else if (!m.paused) {
      m.pause();
    }
  }
}

// [v1.2.0] volumi: applica le impostazioni a musica e cursori
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

// ---- AZIONI ----
function currentPlayerSpeed() {
  return Math.min(CONFIG.playerSpeed + score * CONFIG.playerSpeedGain, CONFIG.playerSpeedMax);
}
function currentFall() { // [v1.2.0]
  return CONFIG.itemSpeed + score * CONFIG.itemSpeedGain;
}
function resetGame() {
  score = 0;
  lives = CONFIG.lives;
  player = {
    x: canvas.width / 2 - CONFIG.playerW / 2,
    y: canvas.height - CONFIG.playerH - 10,
    w: CONFIG.playerW,
    h: CONFIG.playerH,
    lean: 0 // [v1.2.0] inclinazione quando si muove
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
}
function startGame() {
  resetGame();
  MUSIC.game.currentTime = 0;
  countdown = CONFIG.countdown; // [v1.2.0] parte il conto alla rovescia
  lastCount = 0;
  state = "countdown";
}
function finishGame() { // [v1.2.0] chiamata al termine dell'animazione di morte
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
function toggleFullscreen() { // [v1.2.0]
  const root = document.documentElement;
  if (!document.fullscreenElement) {
    if (root.requestFullscreen) root.requestFullscreen().catch(() => {});
  } else if (document.exitFullscreen) {
    document.exitFullscreen();
  }
}
refreshSoundButton();

// ---- [v1.2.0] EFFETTI VISIVI ----
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
}

// ---- [v1.2.0] COLLISIONI CON HITBOX RIDOTTE ----
function box(x, y, w, h, scale) {
  const dx = w * (1 - scale) / 2;
  const dy = h * (1 - scale) / 2;
  return { x: x + dx, y: y + dy, w: w * scale, h: h * scale };
}
function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// ---- [v1.2.0] SPAWN EQUO E "CORSIA SICURA" ----
// Intervallo di posizioni del player (coordinata x) che verrebbero colpite da un pipistrello in x
function batBlock(x) {
  return [x - CONFIG.playerW - CONFIG.laneMargin, x + CONFIG.itemSize + CONFIG.laneMargin];
}
// Con un nuovo pipistrello in newX, esiste ancora una corsia libera abbastanza larga?
function hasSafeLane(newX) {
  const maxX = canvas.width - CONFIG.playerW;
  const range = currentFall() * CONFIG.laneWindow;
  const blocked = [batBlock(newX)];
  for (const it of items) {
    // pipistrelli vicini nel tempo al nuovo (spawn a y = -itemSize)
    if (it.bad && Math.abs(it.y + CONFIG.itemSize) <= range) blocked.push(batBlock(it.x));
  }
  blocked.sort((a, b) => a[0] - b[0]);
  let cursor = 0;
  for (const [start, end] of blocked) {
    if (start - cursor >= CONFIG.safeLaneWidth) return true;
    cursor = Math.max(cursor, end);
  }
  return maxX - cursor >= CONFIG.safeLaneWidth;
}
// Posizione casuale che non si sovrappone agli oggetti appena nati
function freeX() {
  for (let i = 0; i < 12; i++) {
    const x = Math.random() * (canvas.width - CONFIG.itemSize);
    if (items.every(o => o.y > CONFIG.itemSize * 1.5 || Math.abs(o.x - x) > CONFIG.itemSize * 1.3)) return x;
  }
  return Math.random() * (canvas.width - CONFIG.itemSize);
}
function spawnItem() {
  let bad = Math.random() < CONFIG.badChance;
  let x = freeX();
  if (bad) {
    let tries = 0;
    while (!hasSafeLane(x) && tries < 12) { x = freeX(); tries++; }
    if (!hasSafeLane(x)) bad = false; // nessuna posizione equa: diventa una moneta
  }
  items.push({
    x,
    y: -CONFIG.itemSize,
    size: CONFIG.itemSize,
    bad,
    phase: Math.random() * Math.PI * 2 // [v1.2.0] per sfasare le animazioni
  });
}

// ---- PULSANTI HTML ----
function onClick(id, action) {
  const b = document.getElementById(id);
  b.addEventListener("click", () => {
    unlockAudio();
    SFX.click();
    action();
    b.blur(); // evita che Spazio/Invio riattivino il pulsante
  });
}
onClick("btn-start", startGame);
onClick("btn-sound", toggleSound);
onClick("btn-resume", togglePause);
onClick("btn-pause-menu", goToMenu);
onClick("btn-retry", startGame);
onClick("btn-over-menu", goToMenu);
onClick("btn-pause", togglePause);

// Mostra la schermata giusta ogni volta che cambia lo stato
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
  if (e.key === "m" || e.key === "M") toggleSound();      // [v1.2.0]
  if (e.key === "f" || e.key === "F") toggleFullscreen(); // [v1.2.0]
});
window.addEventListener("keyup", e => { keys[e.key] = false; });

canvas.addEventListener("pointermove", e => {
  if (state === "playing" || state === "countdown") setTargetFromPointer(e);
});
canvas.addEventListener("pointerdown", e => {
  unlockAudio();
  if (state === "playing" || state === "countdown") setTargetFromPointer(e);
});

// Pausa automatica se cambi scheda
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

  // [v1.2.0] inclinazione morbida nella direzione del movimento
  const ratio = (speed * dt) > 0 ? Math.max(-1, Math.min(1, moved / (speed * dt))) : 0;
  player.lean += (ratio * 0.2 - player.lean) * Math.min(1, dt * 12);
}

function update(dt) {
  // [v1.2.0] conto alla rovescia 3-2-1
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
  // [v1.2.0] breve animazione di morte prima del Game Over
  if (state === "dying") {
    dyingTimer -= dt;
    updateEffects(dt);
    if (dyingTimer <= 0) finishGame();
    return;
  }
  if (state !== "playing") return;

  updateEffects(dt);

  // Movimento del player: la velocità cresce con il punteggio
  movePlayer(dt);

  // Nuovi oggetti
  spawnTimer += dt;
  if (spawnTimer >= CONFIG.spawnInterval) {
    spawnTimer = 0;
    const count = Math.random() < CONFIG.burstChance ? 2 + Math.floor(Math.random() * 2) : 1;
    for (let i = 0; i < count; i++) spawnItem();
  }

  // Caduta e collisioni
  const fall = currentFall();
  for (const it of items) it.y += fall * dt;

  const pBox = box(player.x, player.y, player.w, player.h, CONFIG.playerHitbox);
  items = items.filter(it => {
    const iBox = box(it.x, it.y, it.size, it.size, it.bad ? CONFIG.batHitbox : CONFIG.coinHitbox);
    if (overlaps(pBox, iBox)) {
      const cx = it.x + it.size / 2;
      const cy = it.y + it.size / 2;
      if (it.bad) {
        lives--;
        SFX.hit();
        burst(cx, cy, "#f72585", 18);
        shake = 10;
        flash = 0.8;
        streak = 0;
      } else {
        score++;
        streak++;
        SFX.collect(Math.pow(2, Math.min(streak, 12) / 12));
        burst(cx, cy, "#ffd60a", 10);
        popup(cx, cy, "+1", "#ffd60a");
      }
      return false;
    }
    if (it.y > canvas.height) {
      if (!it.bad) streak = 0; // moneta persa: la serie si interrompe
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

// ---- DISEGNO (solo la scena di gioco: il resto è HTML/CSS) ----
function drawScene() {
  ctx.save();
  if (shake > 0) {
    ctx.translate((Math.random() - 0.5) * shake * 2, (Math.random() - 0.5) * shake * 2);
  }

  for (const it of items) {
    if (it.bad) {
      const flap = 1 + 0.15 * Math.sin(gameTime * 16 + it.phase);          // [v1.2.0] battito d'ali
      drawSpriteFx(IMG.bat, it.x, it.y, it.size, it.size, "#f72585", 1, flap);
    } else {
      const spin = 0.35 + 0.65 * Math.abs(Math.cos(gameTime * 6 + it.phase)); // [v1.2.0] moneta che gira
      drawSpriteFx(IMG.coin, it.x, it.y, it.size, it.size, "#ffd60a", spin, 1);
    }
  }
  if (state !== "dying") {
    drawSpriteFx(IMG.player, player.x, player.y, player.w, player.h, "#4cc9f0", 1, 1, player.lean);
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
  if (!soundOn) {
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.fillText("MUTED (M)", 10, 46);
  }
  if (DEBUG) {
    ctx.font = "12px monospace";
    ctx.textAlign = "left";
    ctx.fillStyle = "#fff";
    ctx.fillText("items: " + items.length, 10, 64);
  }

  // Lampo rosa alla morte
  if (flash > 0) {
    ctx.fillStyle = "rgba(247, 37, 133, " + (flash * 0.45) + ")";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Conto alla rovescia e "GO!"
  ctx.textAlign = "center";
  ctx.lineJoin = "round";
  if (state === "countdown") {
    const n = Math.ceil(countdown);
    const frac = countdown - (n - 1); // da 1 a 0 dentro ogni secondo
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