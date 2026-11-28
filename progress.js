/*
  Catch the Coin - [v1.7.1] "Il tuo progresso"
  Livello e XP, 3 missioni giornaliere con serie, storico delle ultime 20 partite,
  10 nuovi obiettivi. Si carica DOPO game.js e usa le sue variabili globali
  (stats, run, mode, score, stage, runTime, dailyKey, newRecord, ACH, I18N, t, addRow...).
  game.js lo chiama solo tramite progressHook(): se questo file mancasse, il gioco
  funzionerebbe come la v1.7.0.
*/

// ---- CONFIGURAZIONE DEL PROGRESSO (valori decisi dall'utente) ----
const PROGRESS_CONFIG = {
  maxLevel: 50,
  levelBase: 50, // XP per passare dal livello 1 al 2
  levelStep: 25, // XP in più per ogni livello successivo
  xpCoin: 1, // ogni moneta raccolta
  xpGoldBonus: 2, // in aggiunta, per ogni moneta d'oro
  xpStage: 5, // ogni stage superato (non in Zen)
  grazesPerXp: 2, // 1 XP ogni 2 sfiori
  zenMult: 0.5, // in Zen monete e oro valgono metà
  missionXp: { easy: 30, medium: 50, hard: 80 },
  historySize: 20
};

// Parametro di prova: ?day=2026-12-01 simula un altro giorno (solo per le missioni)
const PROGRESS_DAY = (location.search.match(/[?&]day=(\d{4}-\d{2}-\d{2})/) || [])[1];

// ---- MISSIONI GIORNALIERE ----
// scope "day": si somma tra le partite del giorno; "run": conta la singola partita (il valore migliore)
const MISSIONS = {
  easy: [
    { id: "coins_day", n: 50, scope: "day", get: () => run.coins },
    { id: "games_day", n: 3, scope: "day", get: () => 1 },
    { id: "power_day", n: 2, scope: "day", get: () => run.powerups },
    { id: "graze_day", n: 5, scope: "day", get: () => run.grazes }
  ],
  medium: [
    { id: "stage_run", n: 3, scope: "run", get: () => (mode === "zen" ? 0 : stage + 1) },
    { id: "combo_run", n: 15, scope: "run", get: () => run.bestStreak || 0 },
    { id: "gold_run", n: 3, scope: "run", get: () => run.gold },
    { id: "fever_day", n: 2, scope: "day", get: () => run.fevers },
    { id: "daily_day", n: 1, scope: "day", get: () => (mode === "daily" ? 1 : 0) }
  ],
  hard: [
    { id: "coins_day", n: 150, scope: "day", get: () => run.coins },
    { id: "stage_run", n: 5, scope: "run", get: () => (mode === "zen" ? 0 : stage + 1) },
    { id: "time_run", n: 40, scope: "run", get: () => (mode === "time" ? score : 0) },
    { id: "graze_run", n: 10, scope: "run", get: () => run.grazes },
    { id: "zen_run", n: 60, scope: "run", get: () => (mode === "zen" ? run.coins : 0) }
  ]
};
const TIERS = ["easy", "medium", "hard"];

function missionDef(m) {
  const list = MISSIONS[m.tier] || [];
  return list.find((d) => d.id === m.id && d.n === m.n) || null;
}
function progressDay() {
  return PROGRESS_DAY || (typeof todayKey === "function" ? todayKey() : "");
}
function dayBefore(day) {
  const p = day.split("-").map(Number);
  const d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
// Le 3 missioni del giorno: stesse per tutti, generatore proprio (non tocca la Daily)
function buildMissions(day) {
  const r = mulberry32(hashString("ctc-missions-" + day));
  return {
    day,
    list: TIERS.map((tier) => {
      const pool = MISSIONS[tier];
      const d = pool[Math.floor(r() * pool.length)];
      return { tier, id: d.id, n: d.n, p: 0, done: false };
    })
  };
}
function currentMissions(day) {
  const m = stats.missions;
  const ok =
    m &&
    m.day === day &&
    Array.isArray(m.list) &&
    m.list.length === 3 &&
    m.list.every((x) => x && missionDef(x));
  if (!ok) stats.missions = buildMissions(day);
  return stats.missions;
}
// serie valida se l'ultimo giorno completo è oggi o ieri
function liveStreak(day) {
  const last = stats.missionLastDay;
  return last === day || last === dayBefore(day) ? stats.missionStreak || 0 : 0;
}
function missionText(m) {
  return t("mis_" + m.id).replace("{n}", m.n);
}

// ---- LIVELLO ----
function levelNeed(level) {
  return PROGRESS_CONFIG.levelBase + PROGRESS_CONFIG.levelStep * (level - 1);
}
function levelInfo(xp) {
  let level = 1,
    rest = Math.max(0, Math.floor(xp || 0));
  while (level < PROGRESS_CONFIG.maxLevel && rest >= levelNeed(level)) {
    rest -= levelNeed(level);
    level++;
  }
  const max = level >= PROGRESS_CONFIG.maxLevel;
  return { level, into: max ? 0 : rest, need: max ? 0 : levelNeed(level), max };
}
function progressLevel() {
  return levelInfo(stats.xp).level;
}
function runXp() {
  const c = PROGRESS_CONFIG;
  let base = run.coins * c.xpCoin + run.gold * c.xpGoldBonus;
  if (mode === "zen") base *= c.zenMult;
  const stages = mode === "zen" ? 0 : stage * c.xpStage;
  return Math.floor(base + stages + Math.floor(run.grazes / c.grazesPerXp));
}

// ---- FINE PARTITA ----
let lastProgress = null;
function progressFinish() {
  const day = PROGRESS_DAY || dailyKey || progressDay();
  const before = levelInfo(stats.xp).level;
  let xp = runXp();

  // missioni
  const ms = currentMissions(day);
  const completed = [];
  for (const m of ms.list) {
    if (m.done) continue;
    const d = missionDef(m);
    const v = Math.max(0, Number(d.get()) || 0);
    m.p = d.scope === "day" ? m.p + v : Math.max(m.p, v);
    if (m.p >= m.n) {
      m.p = m.n;
      m.done = true;
      completed.push(m);
      xp += PROGRESS_CONFIG.missionXp[m.tier] || 0;
      stats.missionsDone = (stats.missionsDone || 0) + 1;
    }
  }
  let allDone = false;
  if (completed.length && ms.list.every((m) => m.done)) {
    allDone = true;
    stats.missionStreak =
      stats.missionLastDay === dayBefore(day) ? (stats.missionStreak || 0) + 1 : 1;
    stats.missionLastDay = day;
    stats.bestMissionStreak = Math.max(stats.bestMissionStreak || 0, stats.missionStreak);
  }

  stats.xp = Math.floor((stats.xp || 0) + xp);
  const after = levelInfo(stats.xp).level;

  // storico (la partita più recente in cima)
  const h = {
    t: Date.now(),
    m: mode,
    s: score,
    c: run.coins,
    g: run.gold,
    st: stage + 1,
    sec: Math.round(runTime),
    gr: run.grazes,
    f: run.fevers,
    cb: run.bestStreak || 0,
    xp,
    r: newRecord ? 1 : 0
  };
  if (mode === "daily") h.d = dailyKey;
  if (!Array.isArray(stats.history)) stats.history = [];
  stats.history.unshift(h);
  stats.history.length = Math.min(stats.history.length, PROGRESS_CONFIG.historySize);

  lastProgress = { xp, before, after, completed, allDone };
  return { levelUp: after > before };
}
function progressGameOverLines(lines) {
  const p = lastProgress;
  if (!p) return;
  lines.unshift("+" + p.xp + " XP");
  if (p.after > p.before) lines.push(t("level_up").replace("{n}", p.after));
  if (p.completed.length)
    lines.push(t("mission_done") + ": " + p.completed.map(missionText).join(", "));
  if (p.allDone) lines.push(t("missions_all_done").replace("{n}", stats.missionStreak));
}

// ---- MENU: livello e barra XP ----
function progressMenu() {
  const lv = $("menu-level"),
    fill = $("menu-xp-fill");
  if (!lv || !fill) return;
  const info = levelInfo(stats.xp);
  lv.textContent = t("lv") + " " + info.level;
  fill.style.width = (info.max ? 100 : Math.floor((info.into / info.need) * 100)) + "%";
}

// ---- SCHERMATA PROGRESSI ----
function fmtDate(ts) {
  const d = new Date(ts);
  const two = (n) => String(n).padStart(2, "0");
  return (
    two(d.getDate()) +
    "/" +
    two(d.getMonth() + 1) +
    " " +
    two(d.getHours()) +
    ":" +
    two(d.getMinutes())
  );
}
function progressRender() {
  const box = $("progress-list");
  if (!box) return;
  box.textContent = "";
  const day = progressDay();

  // livello
  const info = levelInfo(stats.xp);
  addRow(
    box,
    t("level") + " " + info.level,
    info.max ? t("max_level") : info.into + " / " + info.need + " XP"
  );
  const bar = document.createElement("div");
  bar.className = "xp-bar xp-bar-big";
  const fill = document.createElement("span");
  fill.style.width = (info.max ? 100 : Math.floor((info.into / info.need) * 100)) + "%";
  bar.appendChild(fill);
  box.appendChild(bar);
  addRow(box, t("total_xp"), stats.xp);

  // missioni del giorno
  const ms = currentMissions(day);
  addRow(box, t("missions") + " · " + day, undefined, "section");
  for (const m of ms.list) {
    addRow(
      box,
      (m.done ? "✓ " : "· ") + t("tier_" + m.tier) + ": " + missionText(m),
      m.done ? "+" + PROGRESS_CONFIG.missionXp[m.tier] + " XP" : m.p + " / " + m.n,
      m.done ? "" : "locked"
    );
  }
  addRow(
    box,
    t("streak"),
    t("days").replace("{n}", liveStreak(day)) +
      " (" +
      t("best") +
      " " +
      (stats.bestMissionStreak || 0) +
      ")"
  );

  // storico
  const hist = Array.isArray(stats.history) ? stats.history : [];
  addRow(
    box,
    t("history") + " (" + hist.length + "/" + PROGRESS_CONFIG.historySize + ")",
    undefined,
    "section"
  );
  if (!hist.length) addRow(box, t("history_empty"), undefined, "locked");
  for (const g of hist) {
    addRow(
      box,
      (g.r ? "★ " : "") +
        fmtDate(g.t) +
        " · " +
        t("mode_" + g.m) +
        (g.m === "zen" ? "" : " · " + t("stage_short") + " " + g.st) +
        " · " +
        fmtTime(g.sec || 0),
      g.s + " " + t("pts")
    );
  }
  if (hist.length) {
    const avgS = Math.round(hist.reduce((a, g) => a + (g.s || 0), 0) / hist.length);
    const avgT = hist.reduce((a, g) => a + (g.sec || 0), 0) / hist.length;
    addRow(box, t("average"), avgS + " " + t("pts") + " · " + fmtTime(avgT));
  }
  hideCopyBox();
}

// ---- COPIA DATI ----
function historyText() {
  const head = [
    "date",
    "mode",
    "daily",
    "score",
    "coins",
    "gold",
    "stage",
    "seconds",
    "near_misses",
    "fevers",
    "best_combo",
    "xp",
    "record"
  ];
  const rows = (stats.history || []).map((g) =>
    [
      new Date(g.t).toISOString(),
      g.m,
      g.d || "",
      g.s,
      g.c,
      g.g,
      g.st,
      g.sec,
      g.gr,
      g.f,
      g.cb,
      g.xp,
      g.r ? "yes" : "no"
    ].join("\t")
  );
  const info = levelInfo(stats.xp);
  return (
    "Catch the Coin " +
    ((document.querySelector(".version") || {}).textContent || "") +
    " - level " +
    info.level +
    ", " +
    stats.xp +
    " XP\n" +
    [head.join("\t")].concat(rows).join("\n")
  );
}
function hideCopyBox() {
  const area = $("copy-area"),
    msg = $("copy-msg");
  if (area) area.classList.add("hidden");
  if (msg) msg.textContent = "";
}
// Se il browser blocca gli appunti (per esempio nell'iframe di Itch.io) mostra il testo selezionato
function showCopyBox(text) {
  const area = $("copy-area"),
    msg = $("copy-msg");
  area.value = text;
  area.classList.remove("hidden");
  area.focus();
  area.select();
  msg.textContent = t("copy_manual");
}
function copyHistory() {
  const text = historyText();
  const msg = $("copy-msg");
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(
      () => {
        hideCopyBox();
        msg.textContent = t("copied");
      },
      () => showCopyBox(text)
    );
  } else showCopyBox(text);
}

// ---- 10 NUOVI OBIETTIVI (da 15 a 25) ----
ACH.push(
  { id: "level_5", test: () => progressLevel() >= 5 },
  { id: "level_10", test: () => progressLevel() >= 10 },
  { id: "level_25", test: () => progressLevel() >= 25 },
  { id: "mission_1", test: () => (stats.missionsDone || 0) >= 1 },
  { id: "mission_day", test: () => (stats.bestMissionStreak || 0) >= 1 },
  { id: "streak_3", test: () => (stats.bestMissionStreak || 0) >= 3 },
  { id: "streak_7", test: () => (stats.bestMissionStreak || 0) >= 7 },
  { id: "games_50", test: () => stats.games >= 50 },
  { id: "stage_6", test: () => mode !== "zen" && stage >= 5 },
  { id: "hour_1", test: () => stats.playTime >= 3600 }
);

// ---- TESTI EN / IT ----
Object.assign(I18N.en, {
  progress: "PROGRESS",
  lv: "Lv",
  level: "Level",
  max_level: "MAX",
  total_xp: "Total XP",
  level_up: "Level {n}!",
  missions: "Daily missions",
  mission_done: "Mission complete",
  missions_all_done: "All missions done! Streak: {n}",
  tier_easy: "Easy",
  tier_medium: "Medium",
  tier_hard: "Hard",
  streak: "Mission streak",
  days: "{n} days",
  best: "best",
  history: "Last games",
  history_empty: "No games yet.",
  stage_short: "stage",
  pts: "pts",
  average: "Average",
  copy: "COPY DATA",
  copied: "Copied to clipboard.",
  copy_manual: "Press Ctrl+C to copy.",
  mis_coins_day: "Collect {n} coins today",
  mis_games_day: "Play {n} games today",
  mis_power_day: "Grab {n} power-ups today",
  mis_graze_day: "Get {n} near-misses today",
  mis_stage_run: "Reach stage {n} in one run (not Zen)",
  mis_combo_run: "Reach a {n} combo in one run",
  mis_gold_run: "Catch {n} golden coins in one run",
  mis_fever_day: "Trigger Fever {n} times today",
  mis_daily_day: "Finish a Daily run",
  mis_time_run: "Score {n} in Time Attack",
  mis_graze_run: "Get {n} near-misses in one run",
  mis_zen_run: "Collect {n} coins in one Zen run",
  ach_level_5: "Growing up",
  achd_level_5: "Reach level 5.",
  ach_level_10: "Veteran",
  achd_level_10: "Reach level 10.",
  ach_level_25: "Legend",
  achd_level_25: "Reach level 25.",
  ach_mission_1: "First task",
  achd_mission_1: "Complete a daily mission.",
  ach_mission_day: "Full day",
  achd_mission_day: "Complete all 3 missions of a day.",
  ach_streak_3: "Steady",
  achd_streak_3: "Reach a 3-day mission streak.",
  ach_streak_7: "Perfect week",
  achd_streak_7: "Reach a 7-day mission streak.",
  ach_games_50: "Regular",
  achd_games_50: "Play 50 games.",
  ach_stage_6: "The abyss",
  achd_stage_6: "Reach stage 6 in one run (not Zen).",
  ach_hour_1: "Coin hour",
  achd_hour_1: "Play for 1 hour in total."
});
Object.assign(I18N.it, {
  progress: "PROGRESSI",
  lv: "Liv",
  level: "Livello",
  max_level: "MAX",
  total_xp: "XP totali",
  level_up: "Livello {n}!",
  missions: "Missioni del giorno",
  mission_done: "Missione completata",
  missions_all_done: "Tutte le missioni fatte! Serie: {n}",
  tier_easy: "Facile",
  tier_medium: "Media",
  tier_hard: "Difficile",
  streak: "Serie di missioni",
  days: "{n} giorni",
  best: "migliore",
  history: "Ultime partite",
  history_empty: "Nessuna partita ancora.",
  stage_short: "stage",
  pts: "pt",
  average: "Media",
  copy: "COPIA DATI",
  copied: "Copiato negli appunti.",
  copy_manual: "Premi Ctrl+C per copiare.",
  mis_coins_day: "Raccogli {n} monete oggi",
  mis_games_day: "Gioca {n} partite oggi",
  mis_power_day: "Prendi {n} power-up oggi",
  mis_graze_day: "Fai {n} sfiori oggi",
  mis_stage_run: "Arriva allo stage {n} in una partita (non Zen)",
  mis_combo_run: "Fai una combo di {n} in una partita",
  mis_gold_run: "Prendi {n} monete d'oro in una partita",
  mis_fever_day: "Attiva la Frenesia {n} volte oggi",
  mis_daily_day: "Finisci una Giornaliera",
  mis_time_run: "Fai {n} punti in Time Attack",
  mis_graze_run: "Fai {n} sfiori in una partita",
  mis_zen_run: "Raccogli {n} monete in una partita Zen",
  ach_level_5: "In crescita",
  achd_level_5: "Raggiungi il livello 5.",
  ach_level_10: "Veterano",
  achd_level_10: "Raggiungi il livello 10.",
  ach_level_25: "Leggenda",
  achd_level_25: "Raggiungi il livello 25.",
  ach_mission_1: "Primo incarico",
  achd_mission_1: "Completa una missione giornaliera.",
  ach_mission_day: "Giornata piena",
  achd_mission_day: "Completa le 3 missioni di un giorno.",
  ach_streak_3: "Costante",
  achd_streak_3: "Raggiungi una serie di 3 giorni.",
  ach_streak_7: "Settimana perfetta",
  achd_streak_7: "Raggiungi una serie di 7 giorni.",
  ach_games_50: "Habitué",
  achd_games_50: "Gioca 50 partite.",
  ach_stage_6: "L'abisso",
  achd_stage_6: "Arriva allo stage 6 in una partita (non Zen).",
  ach_hour_1: "Un'ora di monete",
  achd_hour_1: "Gioca 1 ora in totale."
});

// ---- COLLEGAMENTO CON game.js ----
window.CTC_PROGRESS = {
  finish: progressFinish,
  gameOverLines: progressGameOverLines,
  menu: progressMenu,
  render: progressRender
};
onClick("btn-copy", copyHistory);
applyLang(); // ritraduce i pulsanti nuovi e aggiorna il livello nel menu
