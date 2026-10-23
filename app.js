/* Interview Prep Tracks
   Progress lives in progress.json on the repo's "data" branch, so saving a mark
   never rebuilds the website. Marks are saved in this browser first, then
   pushed to GitHub when a token is set. */
(function () {
"use strict";

const OWNER = "Feirzen", REPO = "interview-prep", BRANCH = "data", FILE = "progress.json";
const API = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE}`;
const RAW = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${FILE}`;
const EVENTS = [["Emory", Date.parse("2026-10-23T15:45:00Z")], ["UNM", Date.parse("2026-10-28T14:30:00Z")], ["Savannah", Date.parse("2026-11-06T13:00:00Z")]];

const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const ls = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} },
};
const b64enc = s => btoa(unescape(encodeURIComponent(s)));
const b64dec = s => decodeURIComponent(escape(atob(s.replace(/\n/g, ""))));

let settings = ls.get("ipt-settings", { theme: "midnight" });
let TRACKS = [];
let STATE = ls.get("ipt-state", { progress: {}, mocks: [] });
let PENDING = ls.get("ipt-pending", { progress: {}, mocks: [] });
let TODAY_ID = null;

/* ---------------- themes (same set as Study Decks) ---------------- */
const THEMES = {
  midnight: { label: "Midnight", swatch: "#0f181c" },
  paper: { label: "Paper", swatch: "#eef2f3" },
  sepia: { label: "Sepia", swatch: "#2a211a" },
  chameleon: { label: "Chameleon", swatch: "conic-gradient(#f87171,#fbbf24,#34d399,#38bdf8,#a78bfa,#f87171)" },
};
const CHAM_VARS = ["bg", "surface", "ink", "muted", "line", "accent", "accent-ink", "accent-soft", "shaky", "okay", "solid", "onlight", "shaky-soft", "okay-soft", "solid-soft"];
let currentCham = null;
function makeChameleon() {
  if (settings.theme === "chameleon" && settings.chamLock && settings.chamLock.v) return settings.chamLock;
  const tone = settings.tone || "any";
  const h = Math.floor(Math.random() * 360), acc = (h + 120 + Math.floor(Math.random() * 110)) % 360;
  const H = (x, s, l, a) => `hsl(${x} ${s}% ${l}%${a ? " / " + a + "%" : ""})`;
  const light = tone === "light" ? true : tone === "dark" ? false : Math.random() < 0.28;
  if (light) return { scheme: "light", v: {
    bg: H(h, 32, 95), surface: H(h, 42, 99), ink: H(h, 38, 11), muted: H(h, 14, 42), line: H(h, 22, 83),
    accent: H(acc, 66, 37), "accent-ink": "#fff", "accent-soft": H(acc, 66, 45, 13),
    shaky: "hsl(8 72% 44%)", okay: "hsl(38 80% 36%)", solid: "hsl(150 55% 30%)", onlight: "#fff",
    "shaky-soft": "hsl(8 72% 50% / 13%)", "okay-soft": "hsl(38 80% 45% / 15%)", "solid-soft": "hsl(150 55% 40% / 14%)" } };
  return { scheme: "dark", v: {
    bg: H(h, 26, 7), surface: H(h, 22, 12), ink: H(h, 26, 95), muted: H(h, 14, 66), line: H(h, 18, 21),
    accent: H(acc, 74, 63), "accent-ink": H(h, 30, 8), "accent-soft": H(acc, 74, 63, 16),
    shaky: "hsl(4 82% 70%)", okay: "hsl(42 90% 62%)", solid: "hsl(150 60% 62%)", onlight: H(h, 30, 8),
    "shaky-soft": "hsl(4 82% 70% / 15%)", "okay-soft": "hsl(42 90% 62% / 15%)", "solid-soft": "hsl(150 60% 62% / 15%)" } };
}
function applyTheme(reroll) {
  const t = THEMES[settings.theme] ? settings.theme : "midnight";
  const root = document.documentElement;
  root.setAttribute("data-theme", t === "chameleon" ? "midnight" : t);
  if (t === "chameleon") {
    const p = currentCham = makeChameleon();
    CHAM_VARS.forEach(k => root.style.setProperty("--" + k, p.v[k]));
    root.style.colorScheme = p.scheme;
  } else if (!reroll) {
    CHAM_VARS.forEach(k => root.style.removeProperty("--" + k));
    root.style.colorScheme = "";
  }
  const m = $("#themeColorMeta");
  if (m) m.setAttribute("content", getComputedStyle(document.body).backgroundColor);
}
function bumpChameleon() { if (settings.theme === "chameleon" && !settings.chamLock) applyTheme(true); }

/* ---------------- shared settings gear (Feirzen/flag-hub kit) ----------------
   The gear rolls out the kit tray: Look (Paper / Midnight / Sepia / Chameleon) and Flag.
   The app still paints its own looks; the kit is just the controls. */
const KIT_TO_APP = { light: "paper", dark: "midnight", sepia: "sepia", chameleon: "chameleon" };
const APP_TO_KIT = { paper: "light", midnight: "dark", sepia: "sepia", chameleon: "chameleon" };
function saveSettings() { ls.set("ipt-settings", settings); }
window.KitConfig = {
  gear: "#gearBtn",
  look: {
    labels: { light: "Paper", dark: "Midnight" },
    get: () => ({ theme: APP_TO_KIT[settings.theme] || "dark", tone: settings.tone || "any", locked: !!settings.chamLock }),
    set: t => { settings.theme = KIT_TO_APP[t] || "midnight"; settings.chamLock = null; saveSettings(); applyTheme(); },
    tone: t => { settings.tone = t; settings.chamLock = null; saveSettings(); applyTheme(true); },
    lock: on => { settings.chamLock = on ? currentCham : null; saveSettings(); },
    reroll: () => { if (!settings.chamLock) { settings.chamLock = null; applyTheme(true); } },
  },
};

/* ---------------- helpers ---------------- */
function localISO(d = new Date()) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function fmtDate(iso) { const d = new Date(iso + "T12:00:00"); return [d.toLocaleDateString("en-US", { weekday: "short" }), d.toLocaleDateString("en-US", { month: "short", day: "numeric" })]; }
function mins(s) { return s ? Math.round(s / 60) + " min" : ""; }
function clock(s) { s = Math.max(0, Math.floor(s || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }
function st(id) { return STATE.progress[id] || {}; }
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2200); }
function pickToday() {
  const hash = decodeURIComponent(location.hash.replace(/^#/, ""));
  if (hash.startsWith("play-")) { const t = TRACKS.find(x => x.id === hash.slice(5)); if (t) return t; }
  const d = localISO();
  return TRACKS.find(x => x.date === d) || (d < TRACKS[0].date ? TRACKS[0] : TRACKS.find(x => !st(x.id).listened) || TRACKS[TRACKS.length - 1]);
}

/* ---------------- rendering ---------------- */
function drawCountdowns() {
  const now = Date.now();
  $("#countdowns").innerHTML = EVENTS.map(([n, t]) => {
    const d = Math.ceil((t - now) / 864e5);
    const txt = d > 1 ? `${d} days` : d === 1 ? "tomorrow" : (t - now > -6 * 36e5 ? "today" : "done");
    return `<div class="cd"><b>${esc(txt)}</b><span>to ${n}</span></div>`;
  }).join("");
}
function controlsHTML(tr) {
  const b = (k, label, val, cls = "") => `<button type="button" class="${cls}" data-id="${tr.id}" data-k="${k}" data-v="${val}">${label}</button>`;
  return `<div class="controls"><span class="lbl">Done:</span>${b("listened", "Listened", true)}${b("practiced", "Answered out loud", true)}</div>
  <div class="controls"><span class="lbl">Feel:</span>${b("confidence", "Shaky", "shaky", "c-shaky")}${b("confidence", "Okay", "okay", "c-okay")}${b("confidence", "Solid", "solid", "c-solid")}</div>`;
}
const ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z"/></svg>';
const ICON_PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>';
// Saves the mp3 to the device (Files app on iPhone/iPad) for offline listening
const dlHTML = tr => `<a class="link" href="${esc(tr.url)}" download="${esc(tr.id)}.mp3">Download for offline</a>`;
function renderToday() {
  const tr = pickToday(); TODAY_ID = tr.id;
  const [wd, md] = fmtDate(tr.date);
  const isToday = tr.date === localISO();
  $("#today").innerHTML = `<div class="eyebrow">${isToday ? "Today's track" : "Up next"} · ${wd} ${md}</div>
   <h2>${esc(tr.title)}</h2>
   <div class="meta"><span class="chip">${esc(tr.type)}</span><span class="mono">${mins(tr.dur)}</span></div>
   <div class="player">
     <button type="button" class="bigplay" id="bigplay" aria-label="Play">${ICON_PLAY}</button>
     <div class="ptrack">
       <input type="range" class="scrub" id="scrub" min="0" max="${tr.dur || 600}" value="0" step="1" aria-label="Seek">
       <div class="ptime"><span id="tcur">0:00</span><span id="tdur">${clock(tr.dur)}</span></div>
       <div class="skips"><button type="button" id="back15">−15s</button><button type="button" id="fwd15">+15s</button><button type="button" id="rate">1×</button></div>
     </div>
   </div>
   <audio id="todayAudio" preload="metadata" src="${esc(tr.url)}"></audio>
   ${controlsHTML(tr)}
   <textarea data-id="${tr.id}" placeholder="Notes for your check-in (what felt weak, what to redo)"></textarea>
   <div class="links">${dlHTML(tr)}</div>`;
  wirePlayer(tr);
}
function wirePlayer(tr) {
  const a = $("#todayAudio"), btn = $("#bigplay"), scrub = $("#scrub");
  const setIcon = () => { btn.innerHTML = a.paused ? ICON_PLAY : ICON_PAUSE; btn.setAttribute("aria-label", a.paused ? "Play" : "Pause"); };
  btn.onclick = () => { a.paused ? a.play().catch(() => toast("Couldn't start audio. Tap play again.")) : a.pause(); };
  a.addEventListener("play", setIcon); a.addEventListener("pause", setIcon);
  a.addEventListener("loadedmetadata", () => { scrub.max = Math.floor(a.duration); $("#tdur").textContent = clock(a.duration); });
  a.addEventListener("timeupdate", () => { if (!scrub.matches(":active")) scrub.value = Math.floor(a.currentTime); $("#tcur").textContent = clock(a.currentTime); });
  scrub.addEventListener("input", () => { a.currentTime = +scrub.value; });
  $("#back15").onclick = () => a.currentTime = Math.max(0, a.currentTime - 15);
  $("#fwd15").onclick = () => a.currentTime = Math.min(a.duration || 1e9, a.currentTime + 15);
  const rates = [1, 1.15, 1.3]; let ri = 0;
  $("#rate").onclick = e => { ri = (ri + 1) % rates.length; a.playbackRate = rates[ri]; e.target.textContent = rates[ri] + "×"; };
  a.addEventListener("ended", () => { if (!st(tr.id).listened) { save(tr.id, { listened: true }); toast("Marked as listened"); } });
  if ("mediaSession" in navigator) {
    a.addEventListener("play", () => {
      navigator.mediaSession.metadata = new MediaMetadata({ title: tr.title, artist: "Interview Prep Tracks", artwork: [{ src: "icons/icon-512.png", sizes: "512x512", type: "image/png" }] });
      navigator.mediaSession.setActionHandler("seekbackward", () => a.currentTime = Math.max(0, a.currentTime - 15));
      navigator.mediaSession.setActionHandler("seekforward", () => a.currentTime += 15);
    });
  }
  if (location.hash.startsWith("#play-") || location.hash === "#today") {
    $("#today").scrollIntoView({ block: "start" });
    a.play().catch(() => toast("Tap the play button to start"));
  }
}
function stateHTML(id) {
  const s = st(id);
  return (s.confidence ? `<span class="conf ${s.confidence}">${s.confidence}</span>` : "") +
    `<span class="dot ${s.listened ? "on" : ""}" title="Listened"></span><span class="dot ${s.practiced ? "on" : ""}" title="Answered out loud"></span>`;
}
function renderList() {
  $("#list").innerHTML = TRACKS.map(tr => {
    const [wd, md] = fmtDate(tr.date);
    return `<details class="row${tr.id === TODAY_ID ? " is-today" : ""}" id="row-${tr.id}">
      <summary><div class="date">${wd}<b>${md}</b></div>
      <div class="rt"><h3>${esc(tr.title.replace(/^Day \d+ · /, ""))}</h3><div>${esc(tr.type)} · ${mins(tr.dur)}</div></div>
      <div class="state" data-state="${tr.id}"></div></summary>
      <div class="body"><audio controls preload="none" src="${esc(tr.url)}"></audio>${controlsHTML(tr)}
      <textarea data-id="${tr.id}" placeholder="Notes for your check-in"></textarea>
      <div class="links"><button type="button" class="link" data-script="${tr.id}">Show script</button>${dlHTML(tr)}</div><div id="sc-${tr.id}" hidden></div></div></details>`;
  }).join("");
}
function scriptHTML(tr) {
  return `<div class="script">${tr.lines.map(([w, t]) => w === "PAUSE"
    ? `<p class="pause">· · · your turn, ${t} seconds · · ·</p>`
    : `<p class="${w.toLowerCase()}"><span class="who">${w === "COACH" ? "Coach" : "Proctor"}</span>${esc(t)}</p>`).join("")}</div>`;
}
function renderState() {
  document.querySelectorAll("button[data-k]").forEach(b => { let v = b.dataset.v; if (v === "true") v = true; b.setAttribute("aria-pressed", String(st(b.dataset.id)[b.dataset.k] === v)); });
  document.querySelectorAll("textarea[data-id]").forEach(t => { if (document.activeElement !== t) t.value = st(t.dataset.id).note || ""; });
  document.querySelectorAll("[data-state]").forEach(el => el.innerHTML = stateHTML(el.dataset.state));
  const n = TRACKS.length; let L = 0;
  $("#lights").innerHTML = TRACKS.map(t => { const s = st(t.id); if (s.listened) L++;
    return `<i class="${s.confidence || ""}${s.listened ? " listened" : ""}${t.id === TODAY_ID ? " now" : ""}" title="${esc(t.title)}"></i>`; }).join("");
  $("#sumtext").textContent = `${L} of ${n} listened`;
  const mocks = STATE.mocks || [];
  $("#mocks").innerHTML = mocks.length ? mocks.slice().sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")).map(m =>
    `<div class="mock"><span class="mono">${esc(m.date)}</span> · <b>${esc(m.who || "Mock")}</b> <span class="conf ${esc(m.feel)}">${esc(m.feel)}</span><div>${esc(m.note)}</div></div>`).join("")
    : `<div class="note">No mocks logged yet. Log each practice interview here so we can see what's improving.</div>`;
}

/* ---------------- saving + GitHub sync ---------------- */
function token() { return ls.get("ipt-token", ""); }
function setSyncDot(cls, msg) { $("#syncDot").className = "syncdot " + (cls || ""); if (msg !== undefined) $("#syncStatus").textContent = msg; }
function persist() { ls.set("ipt-state", STATE); ls.set("ipt-pending", PENDING); }
function applyPending(base) {
  const out = { progress: Object.assign({}, base.progress || {}), mocks: (base.mocks || []).slice() };
  for (const [id, patch] of Object.entries(PENDING.progress)) out.progress[id] = Object.assign({}, out.progress[id], patch);
  const have = new Set(out.mocks.map(m => m.id));
  PENDING.mocks.forEach(m => { if (!have.has(m.id)) out.mocks.push(m); });
  return out;
}
function save(id, patch) {
  patch.updatedAt = new Date().toISOString();
  PENDING.progress[id] = Object.assign({}, PENDING.progress[id], patch);
  STATE = applyPending(STATE);
  persist(); renderState(); bumpChameleon(); schedulePush();
}
let pushTimer = null, pushing = false;
function schedulePush() { clearTimeout(pushTimer); pushTimer = setTimeout(push, 800); }
async function ghGet() {
  const r = await fetch(`${API}?ref=${BRANCH}&t=${Date.now()}`, { headers: { Authorization: `Bearer ${token()}`, Accept: "application/vnd.github+json" }, cache: "no-store" });
  if (r.status === 404) return { sha: null, data: { progress: {}, mocks: [] } };
  if (!r.ok) throw new Error(r.status === 401 ? "Token rejected. Make a new one and paste it again." : r.status === 403 ? "Token can't write here. Check it has Contents: Read and write on interview-prep." : "GitHub error " + r.status);
  const j = await r.json();
  return { sha: j.sha, data: JSON.parse(b64dec(j.content)) };
}
async function push(attempt = 0) {
  if (!token()) { setSyncDot("", "Saved on this device only. Add a token to sync."); return; }
  if (pushing) { schedulePush(); return; }
  const hasPending = Object.keys(PENDING.progress).length || PENDING.mocks.length;
  if (!hasPending) return;
  pushing = true;
  try {
    const { sha, data } = await ghGet();
    const merged = applyPending(data);
    merged.updatedAt = new Date().toISOString();
    const body = { message: "Update interview prep progress", content: b64enc(JSON.stringify(merged, null, 2)), branch: BRANCH };
    if (sha) body.sha = sha;
    const r = await fetch(API, { method: "PUT", headers: { Authorization: `Bearer ${token()}`, Accept: "application/vnd.github+json" }, body: JSON.stringify(body) });
    if ((r.status === 409 || r.status === 422) && attempt < 2) { pushing = false; return push(attempt + 1); }
    if (!r.ok) throw new Error("GitHub error " + r.status);
    PENDING = { progress: {}, mocks: [] }; STATE = merged; persist();
    setSyncDot("on", "Synced " + new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
  } catch (e) {
    setSyncDot("err", e.message || "Couldn't reach GitHub. Your marks are saved here and will sync later.");
  } finally { pushing = false; }
}
async function pull() {
  try {
    let data;
    if (token()) data = (await ghGet()).data;
    else { const r = await fetch(`${RAW}?t=${Date.now()}`, { cache: "no-store" }); if (!r.ok) return; data = await r.json(); }
    STATE = applyPending(data); persist(); renderState();
    if (token()) { setSyncDot("on", "Synced"); push(); }
  } catch (e) { if (token()) setSyncDot("err", e.message || "Couldn't reach GitHub."); }
}

/* ---------------- events ---------------- */
document.addEventListener("click", e => {
  const b = e.target.closest("button[data-k]");
  if (b) { const id = b.dataset.id, k = b.dataset.k; let v = b.dataset.v; if (v === "true") v = true;
    save(id, { [k]: st(id)[k] === v ? (k === "confidence" ? null : false) : v }); return; }
  const s = e.target.closest("button[data-script]");
  if (s) { const id = s.dataset.script, box = document.getElementById("sc-" + id), tr = TRACKS.find(t => t.id === id);
    if (box.hidden) { box.innerHTML = scriptHTML(tr); box.hidden = false; s.textContent = "Hide script"; } else { box.hidden = true; s.textContent = "Show script"; } return; }
  if (e.target.closest("#syncBtn")) { $("#syncPanel").hidden = !$("#syncPanel").hidden; return; }
});
document.addEventListener("change", e => { const t = e.target; if (t.matches("textarea[data-id]")) save(t.dataset.id, { note: t.value }); });
document.addEventListener("play", e => { document.querySelectorAll("audio").forEach(a => { if (a !== e.target) a.pause(); }); }, true);
$("#tokenSave").onclick = () => {
  const v = $("#tokenInput").value.trim();
  if (!v) { setSyncDot("", "Paste a token first."); return; }
  ls.set("ipt-token", v); $("#tokenInput").value = ""; setSyncDot("", "Checking token…"); pull().then(() => toast("Token saved"));
};
$("#tokenClear").onclick = () => { ls.del("ipt-token"); setSyncDot("", "Token removed. Marks save on this device only."); };
$("#m-date").value = localISO();
$("#mockform").addEventListener("submit", e => {
  e.preventDefault();
  const m = { id: "m" + Date.now(), date: $("#m-date").value, who: $("#m-who").value.trim(), feel: $("#m-feel").value, note: $("#m-note").value.trim(), createdAt: new Date().toISOString() };
  PENDING.mocks.push(m); STATE = applyPending(STATE); persist(); renderState(); schedulePush();
  $("#m-who").value = ""; $("#m-note").value = ""; toast("Mock logged");
});
window.addEventListener("hashchange", () => { if (TRACKS.length) { renderToday(); renderState(); } });
document.addEventListener("visibilitychange", () => { if (!document.hidden) { drawCountdowns(); pull(); } });

const STORIES = [
  ["1 · No-show phone call", "Empathy, listening, motivating someone", "Bridge: the pre-op interview is a short talk with a scared person. Read what they're not saying."],
  ["2 · Baptism disagreement", "Conflict, cross-cultural, feedback", "Add: safety issues get raised on the spot; style issues wait for private."],
  ["3 · Software crisis", "Adaptability, initiative, leading without a title", "Bridge: equipment fails mid-case. Patient first, then fix the system."],
  ["4 · Avoided patient", "Integrity, escalation", "Keep it short. Your judgment, not the doctor's failure. Concerns go up the chain."],
  ["5 · Five-day housing scramble", "Teamwork, pressure, decisions with incomplete info", "Line: act on what's certain instead of freezing over what isn't."],
  ["6 · The $200 deficit", "Failure, accountability, weakness", "Bridge: med errors and counts. Report the minute you know. Leave out the tithing piece."],
];
$("#stories").innerHTML = STORIES.map(s => `<div class="story"><b>${esc(s[0])}</b><div>${esc(s[1])}</div><div>${esc(s[2])}</div></div>`).join("");

/* ---------------- boot ---------------- */
applyTheme(); drawCountdowns(); setInterval(drawCountdowns, 6e4);
setSyncDot(token() ? "" : "", token() ? "Connecting…" : "Saved on this device only. Add a token to sync.");
fetch("tracks.json").then(r => r.json()).then(t => {
  TRACKS = t; renderToday(); renderList(); renderState(); pull();
}).catch(() => { $("#today").innerHTML = '<div class="note">Couldn\'t load the track list. Reload the page.</div>'; });
})();
