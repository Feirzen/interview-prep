// Interview Prep Tracks widget for Scriptable (iOS)
// Name this script exactly: Interview Prep
// Medium size works best. Tap the play area to open today's track.
// Tap Heard / Aloud / Shaky / Okay / Solid to save a mark to GitHub.

const OWNER = "Feirzen";
const REPO = "interview-prep";
const SITE = "https://feirzen.github.io/interview-prep/";
const SCRIPT_NAME = "Interview Prep";
const KEY = "interview-prep-token";
const EVENTS = [
  { name: "Emory", at: new Date("2026-10-23T15:45:00Z") },
  { name: "UNM", at: new Date("2026-10-28T14:30:00Z") },
  { name: "Savannah", at: new Date("2026-11-06T13:00:00Z") },
];
const API = `https://api.github.com/repos/${OWNER}/${REPO}/contents/progress.json`;
const RAW = `https://raw.githubusercontent.com/${OWNER}/${REPO}/data/progress.json`;

const C = {
  bg: Color.dynamic(new Color("#eef2f3"), new Color("#0f181c")),
  card: Color.dynamic(new Color("#ffffff"), new Color("#16232a")),
  ink: Color.dynamic(new Color("#15232a"), new Color("#e3ecef")),
  muted: Color.dynamic(new Color("#5b6d75"), new Color("#93a6ae")),
  line: Color.dynamic(new Color("#d5dee1"), new Color("#26363e")),
  accent: Color.dynamic(new Color("#1f6f8b"), new Color("#5bb3d0")),
  shaky: new Color("#e5534b"),
  okay: new Color("#e8b130"),
  solid: new Color("#3fb27f"),
};

// ---------- helpers ----------
const fm = FileManager.local();
const cacheFile = fm.joinPath(fm.documentsDirectory(), "interview-prep-tracks.json");
function iso(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function token() { return Keychain.contains(KEY) ? Keychain.get(KEY) : ""; }

async function loadTracks() {
  try {
    const r = new Request(SITE + "tracks.json?t=" + Date.now());
    const t = await r.loadJSON();
    const slim = t.map(x => ({ id: x.id, date: x.date, title: x.title, type: x.type, dur: x.dur }));
    fm.writeString(cacheFile, JSON.stringify(slim));
    return slim;
  } catch (e) {
    if (fm.fileExists(cacheFile)) return JSON.parse(fm.readString(cacheFile));
    throw e;
  }
}
async function ghGet() {
  const r = new Request(`${API}?ref=data&t=${Date.now()}`);
  r.headers = { Authorization: `Bearer ${token()}`, Accept: "application/vnd.github+json" };
  const j = await r.loadJSON();
  if (r.response.statusCode === 404) return { sha: null, data: { progress: {}, mocks: [] } };
  if (r.response.statusCode >= 300) throw new Error("GitHub said " + r.response.statusCode);
  return { sha: j.sha, data: JSON.parse(Data.fromBase64String(j.content.replace(/\n/g, "")).toRawString()) };
}
async function loadProgress() {
  try {
    if (token()) return (await ghGet()).data;
    const r = new Request(RAW + "?t=" + Date.now());
    return await r.loadJSON();
  } catch (e) { return { progress: {}, mocks: [] }; }
}
async function mark(id, k, v) {
  if (!token()) throw new Error("No token yet. Run the script once in Scriptable to add it.");
  for (let attempt = 0; attempt < 3; attempt++) {
    const { sha, data } = await ghGet();
    data.progress = data.progress || {};
    const cur = data.progress[id] || {};
    let val = v === "true" ? true : v;
    if (cur[k] === val) val = k === "confidence" ? null : false; // tap again to undo
    data.progress[id] = Object.assign({}, cur, { [k]: val, updatedAt: new Date().toISOString() });
    data.updatedAt = new Date().toISOString();
    const body = { message: "Update interview prep progress (widget)", content: Data.fromString(JSON.stringify(data, null, 2)).toBase64String(), branch: "data" };
    if (sha) body.sha = sha;
    const r = new Request(API);
    r.method = "PUT";
    r.headers = { Authorization: `Bearer ${token()}`, Accept: "application/vnd.github+json" };
    r.body = JSON.stringify(body);
    await r.loadJSON();
    const code = r.response.statusCode;
    if (code === 200 || code === 201) return val;
    if (code !== 409 && code !== 422) throw new Error("GitHub said " + code);
  }
  throw new Error("Couldn't save after 3 tries");
}
function pickToday(tracks, prog) {
  const d = iso();
  return tracks.find(t => t.date === d) || (d < tracks[0].date ? tracks[0] : tracks.find(t => !(prog[t.id] || {}).listened) || tracks[tracks.length - 1]);
}
function countdown() {
  const now = Date.now();
  const ev = EVENTS.find(e => e.at.getTime() - now > -6 * 3600e3) || EVENTS[EVENTS.length - 1];
  const d = Math.ceil((ev.at.getTime() - now) / 864e5);
  return { name: ev.name, text: d > 1 ? `${d} days` : d === 1 ? "1 day" : "Today" };
}
function barImage(tracks, prog, todayId, width) {
  const n = tracks.length, gap = 4, h = 10;
  const ctx = new DrawContext();
  ctx.size = new Size(width, h + 4);
  ctx.opaque = false;
  ctx.respectScreenScale = true;
  const w = (width - gap * (n - 1)) / n;
  tracks.forEach((t, i) => {
    const p = prog[t.id] || {};
    let col = new Color("#8a9aa1", 0.35);
    if (p.listened) col = new Color("#8a9aa1", 0.9);
    if (p.confidence === "shaky") col = C.shaky;
    if (p.confidence === "okay") col = C.okay;
    if (p.confidence === "solid") col = C.solid;
    const x = i * (w + gap);
    if (t.id === todayId) {
      ctx.setFillColor(new Color("#5bb3d0"));
      const ring = new Path(); ring.addRoundedRect(new Rect(x - 1.5, 0, w + 3, h + 4), 4, 4); ctx.addPath(ring); ctx.fillPath();
    }
    ctx.setFillColor(col);
    const p2 = new Path(); p2.addRoundedRect(new Rect(x, 2, w, h), 3, 3); ctx.addPath(p2); ctx.fillPath();
  });
  return ctx.getImage();
}
function runURL(params) {
  const q = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
  return `scriptable:///run/${encodeURIComponent(SCRIPT_NAME)}?${q}`;
}
function pill(stack, label, on, color, url) {
  const s = stack.addStack();
  s.url = url;
  s.setPadding(5, 8, 5, 8);
  s.cornerRadius = 10;
  s.backgroundColor = on ? color : C.card;
  s.borderColor = on ? color : C.line;
  s.borderWidth = 1;
  const t = s.addText(label);
  t.font = Font.semiboldSystemFont(11);
  t.textColor = on ? new Color("#0c1a20") : C.ink;
  t.lineLimit = 1;
  t.minimumScaleFactor = 0.7;
}

// ---------- widget ----------
async function buildWidget() {
  const tracks = await loadTracks();
  const data = await loadProgress();
  const prog = data.progress || {};
  const tr = pickToday(tracks, prog);
  const p = prog[tr.id] || {};
  const cd = countdown();
  const fam = config.widgetFamily || "medium";
  const w = new ListWidget();
  w.backgroundColor = C.bg;
  w.setPadding(12, 14, 12, 14);
  w.url = `${SITE}#play-${tr.id}`;

  // top row: date + title, days on the right
  const top = w.addStack();
  top.centerAlignContent();
  const titleCol = top.addStack();
  titleCol.layoutVertically();
  const dateTxt = titleCol.addText(new Date(tr.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }).toUpperCase());
  dateTxt.font = Font.mediumMonospacedSystemFont(9);
  dateTxt.textColor = C.muted;
  const title = titleCol.addText(tr.title.replace(/^Day \d+ · /, ""));
  title.font = Font.boldSystemFont(fam === "small" ? 12 : 13);
  title.textColor = C.ink;
  title.lineLimit = fam === "small" ? 2 : 1;
  top.addSpacer();
  const daysCol = top.addStack();
  daysCol.layoutVertically();
  const days = daysCol.addText(cd.text);
  days.font = Font.boldMonospacedSystemFont(fam === "small" ? 12 : 14);
  days.textColor = C.accent;
  days.rightAlignText();
  if (fam !== "small") {
    const to = daysCol.addText("to " + cd.name);
    to.font = Font.systemFont(9);
    to.textColor = C.muted;
    to.rightAlignText();
  }

  w.addSpacer(6);
  const barW = fam === "small" ? 130 : fam === "large" ? 300 : 300;
  w.addImage(barImage(tracks, prog, tr.id, barW)).imageSize = new Size(barW, 14);

  w.addSpacer(fam === "small" ? 6 : 8);

  // main: play
  const main = w.addStack();
  main.centerAlignContent();
  main.url = `${SITE}#play-${tr.id}`;
  const play = main.addImage(SFSymbol.named("play.circle.fill").image);
  play.tintColor = C.accent;
  play.imageSize = new Size(fam === "small" ? 34 : 42, fam === "small" ? 34 : 42);
  main.addSpacer(10);
  const mc = main.addStack();
  mc.layoutVertically();
  const pl = mc.addText(p.listened ? "Play again" : "Play today's track");
  pl.font = Font.boldSystemFont(fam === "small" ? 12 : 15);
  pl.textColor = C.ink;
  const sub = mc.addText(`${Math.round(tr.dur / 60)} min · ${tr.type}`);
  sub.font = Font.systemFont(10);
  sub.textColor = C.muted;
  sub.lineLimit = 1;
  main.addSpacer();

  if (fam !== "small") {
    w.addSpacer();
    const row = w.addStack();
    row.centerAlignContent();
    const m = (k, v) => runURL({ action: "mark", id: tr.id, k, v });
    pill(row, "Heard", !!p.listened, C.accent, m("listened", "true")); row.addSpacer(5);
    pill(row, "Aloud", !!p.practiced, C.accent, m("practiced", "true")); row.addSpacer(5);
    pill(row, "Shaky", p.confidence === "shaky", C.shaky, m("confidence", "shaky")); row.addSpacer(5);
    pill(row, "Okay", p.confidence === "okay", C.okay, m("confidence", "okay")); row.addSpacer(5);
    pill(row, "Solid", p.confidence === "solid", C.solid, m("confidence", "solid"));
  }

  if (fam === "large") {
    w.addSpacer(12);
    const i = tracks.indexOf(tr);
    tracks.slice(i + 1, i + 4).forEach(t => {
      const r = w.addStack();
      const d = r.addText(new Date(t.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", day: "numeric" }));
      d.font = Font.mediumMonospacedSystemFont(11); d.textColor = C.muted;
      r.addSpacer(8);
      const tt = r.addText(t.title.replace(/^Day \d+ · /, "")); tt.font = Font.systemFont(12); tt.textColor = C.ink; tt.lineLimit = 1;
      w.addSpacer(4);
    });
  }

  // refresh just after midnight, or within the hour
  const next = new Date(); next.setHours(24, 1, 0, 0);
  w.refreshAfterDate = new Date(Math.min(next.getTime(), Date.now() + 30 * 60e3));
  return w;
}

// ---------- entry ----------
const q = args.queryParameters || {};
if (q.action === "mark") {
  try {
    const val = await mark(q.id, q.k, q.v);
    const label = q.k === "confidence" ? (val ? `Marked ${val}` : "Cleared rating") : q.k === "listened" ? (val ? "Marked as heard" : "Unmarked heard") : (val ? "Marked answered out loud" : "Unmarked out loud");
    const n = new Notification(); n.title = "Interview Prep"; n.body = label + ". The widget updates in a few minutes."; n.schedule();
  } catch (e) {
    const a = new Alert(); a.title = "Couldn't save"; a.message = String(e.message || e); a.addAction("OK"); await a.presentAlert();
  }
  Script.complete();
} else if (config.runsInWidget) {
  Script.setWidget(await buildWidget());
  Script.complete();
} else {
  // Run in the app: set up or replace the token, then preview.
  const a = new Alert();
  a.title = "Interview Prep";
  a.message = token() ? "Token is saved. Preview the widget, or replace the token." : "Paste your GitHub token (the same one you used on the website) so widget taps can save marks.";
  a.addSecureTextField("github_pat_…", "");
  a.addAction(token() ? "Replace token" : "Save token");
  a.addAction("Preview widget");
  a.addCancelAction("Cancel");
  const i = await a.presentAlert();
  if (i === 0) {
    const v = a.textFieldValue(0).trim();
    if (v) { Keychain.set(KEY, v); }
  }
  if (i === 0 || i === 1) { const w = await buildWidget(); await w.presentMedium(); }
  Script.complete();
}
