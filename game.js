/*
  Catch the Coin by ChennyZEN
  Grafica: Kenney.nl (CC0) - pacchetto Platformer Art Pixel
  Musica menu: "Crystal Cave (song18)" - The Cynic Project / pixelsphere.org (CC0)
  Musica di gioco: "Enchanted Tiki 86" - cynicmusic.com (CC0)
*/

const canvas = document.getElementById("game"); 
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false; // pixel art nitida

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

// ---- CONFIGURAZIONE ----
const CONFIG = {
  playerSpeed: 500,      // velocità iniziale del player (pixel/secondo)
  playerSpeedGain: 8,    // quanta velocità in più per ogni punto
  playerSpeedMax: 1000,   // limite massimo (alzalo o abbassalo a piacere)
  spawnInterval: 0.8,    // secondi tra un oggetto e l'altro
  itemSpeed: 300,        // velocità iniziale di caduta
  itemSpeedGain: 3,      // aumento della caduta per ogni punto
  lives: 1,              // modalità hardcore: una sola vita
  badChance: 0.50,       // probabilità che compaia un pipistrello
  playerW: 50,
  playerH: 40,
  itemSize: 30,
  musicVolume: 0.5
};

// ---- STATO ----
let state = "menu"; // "menu" | "playing" | "paused" | "gameover"
let score, lives, player, items, spawnTimer;
let targetX = null; // destinazione del player con mouse/touch
let newRecord = false;
let highScore = 0;
try { highScore = Number(localStorage.getItem("highScore")) || 0; } catch (e) {}
const keys = {};
let soundOn = true;

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
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}
const SFX = {
  click:    () => beep(520, 0.06),
  collect:  () => beep(880, 0.1),
  hit:      () => beep(140, 0.3, "sawtooth", 0.12),
  gameover: () => {
    beep(300, 0.2, "triangle");
    setTimeout(() => beep(150, 0.5, "triangle"), 200);
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
    else if (state === "playing") wanted = MUSIC.game;
  }
  for (const m of [MUSIC.menu, MUSIC.game]) {
    if (m === wanted) {
      if (m.paused && !m.failed) m.play().catch(() => {});
    } else if (!m.paused) {
      m.pause();
    }
  }
}

// ---- AZIONI ----
function currentPlayerSpeed() {
  return Math.min(CONFIG.playerSpeed + score * CONFIG.playerSpeedGain, CONFIG.playerSpeedMax);
}
function resetGame() {
  score = 0;
  lives = CONFIG.lives;
  player = {
    x: canvas.width / 2 - CONFIG.playerW / 2,
    y: canvas.height - CONFIG.playerH - 10,
    w: CONFIG.playerW,
    h: CONFIG.playerH
  };
  items = [];
  spawnTimer = 0;
  targetX = null;
  newRecord = false;
}
function startGame() {
  resetGame();
  MUSIC.game.currentTime = 0;
  state = "playing";
}
function goToMenu() { state = "menu"; }
function toggleSound() {
  soundOn = !soundOn;
  el.soundBtn.textContent = "SOUND: " + (soundOn ? "ON" : "OFF");
}
function togglePause() {
  if (state === "playing") state = "paused";
  else if (state === "paused") state = "playing";
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
});
window.addEventListener("keyup", e => { keys[e.key] = false; });

canvas.addEventListener("pointermove", e => {
  if (state === "playing") setTargetFromPointer(e);
});
canvas.addEventListener("pointerdown", e => {
  unlockAudio();
  if (state === "playing") setTargetFromPointer(e);
});

// Pausa automatica se cambi scheda
document.addEventListener("visibilitychange", () => {
  if (document.hidden && state === "playing") state = "paused";
});

// ---- LOGICA ----
function update(dt) {
  if (state !== "playing") return;

  // Movimento del player: la velocità cresce con il punteggio
  const speed = currentPlayerSpeed();
  let dir = 0;
  if (keys["ArrowLeft"] || keys["a"] || keys["A"])  dir -= 1;
  if (keys["ArrowRight"] || keys["d"] || keys["D"]) dir += 1;

  if (dir !== 0) {
    player.x += dir * speed * dt;
    targetX = null;
  } else if (targetX !== null) {
    const diff = targetX - player.x;
    const step = speed * dt;
    player.x += Math.abs(diff) <= step ? diff : Math.sign(diff) * step;
  }
  player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));

  // Nuovi oggetti
  spawnTimer += dt;
  if (spawnTimer >= CONFIG.spawnInterval) {
    spawnTimer = 0;
    items.push({
      x: Math.random() * (canvas.width - CONFIG.itemSize),
      y: -CONFIG.itemSize,
      size: CONFIG.itemSize,
      bad: Math.random() < CONFIG.badChance
    });
  }

  // Caduta e collisioni
  const fall = CONFIG.itemSpeed + score * CONFIG.itemSpeedGain;
  for (const it of items) it.y += fall * dt;

  items = items.filter(it => {
    const hit =
      it.x < player.x + player.w && it.x + it.size > player.x &&
      it.y + it.size > player.y && it.y < player.y + player.h;
    if (hit) {
      if (it.bad) { lives--; SFX.hit(); }
      else { score++; SFX.collect(); }
      return false;
    }
    return it.y <= canvas.height;
  });

  if (lives <= 0) {
    state = "gameover";
    SFX.gameover();
    newRecord = score > highScore;
    highScore = Math.max(highScore, score);
    try { localStorage.setItem("highScore", highScore); } catch (e) {}
  }
}

// ---- DISEGNO (solo la scena di gioco: il resto è HTML/CSS) ----
function drawScene() {
  drawSprite(IMG.player, player.x, player.y, player.w, player.h, "#4cc9f0");
  for (const it of items) {
    if (it.bad) drawSprite(IMG.bat,  it.x, it.y, it.size, it.size, "#f72585");
    else        drawSprite(IMG.coin, it.x, it.y, it.size, it.size, "#ffd60a");
  }
  ctx.font = "bold 20px sans-serif";
  ctx.textAlign = "left";
  ctx.fillStyle = "#ffd60a";
  ctx.fillText("Points: " + score, 10, 25);
  ctx.textAlign = "right";
  ctx.fillStyle = "#4cc9f0";
  ctx.fillText("Speed: x" + (currentPlayerSpeed() / CONFIG.playerSpeed).toFixed(1), canvas.width - 10, 25);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (state === "playing" || state === "paused") drawScene();
}

// ---- GAME LOOP ----
let last = 0;
function loop(t) {
  const dt = Math.min((t - last) / 1000, 0.05);
  last = t;
  update(dt);
  syncMusic();
  syncScreens();
  draw();
  requestAnimationFrame(loop);
}

resetGame();
requestAnimationFrame(loop);