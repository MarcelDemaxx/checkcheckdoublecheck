"use strict";

// HomeCare scope-check — small standalone Express app.
//
//  GET  /f/:token            serve the form (role/name locked from token),
//                            log openedAt on first open; if already submitted
//                            show the "already used" page; unknown token -> 404
//  POST /f/:token            store answers, set submittedAt, lock the token,
//                            show a thank-you page; refuses if already submitted
//  GET  /admin/:adminToken   protected status page: per person name, role,
//                            status, and links to view/download the answers
//  GET  /admin/:adminToken/r/:role           view one person's answers
//  GET  /admin/:adminToken/r/:role/download  download that person's JSON file
//
// It also serves the existing static checkcheckdoublecheck.com homepage so the
// whole site can run from one place without changing the static files.

const express = require("express");
const fs = require("fs");
const path = require("path");

const { AREAS, STATUS_LABELS, META_GROUPS, TOTAL } = require("./lib/areas");

const ROOT = __dirname;
const PORT = parseInt(process.env.PORT, 10) || 8090;
const CONFIG_PATH = process.env.CONFIG_PATH
  ? path.resolve(process.env.CONFIG_PATH)
  : path.join(ROOT, "config.json");
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(ROOT, "data", "responses");
const VIEWS = path.join(ROOT, "views");

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

function loadConfig() {
  // Prefer env-provided tokens if present; otherwise read config.json.
  if (process.env.ADMIN_TOKEN && process.env.KIAN_TOKEN && process.env.SANTI_TOKEN) {
    return {
      adminToken: process.env.ADMIN_TOKEN,
      people: [
        { token: process.env.KIAN_TOKEN, name: "Kian", role: "Kian" },
        { token: process.env.SANTI_TOKEN, name: "Santi", role: "Santi" }
      ]
    };
  }
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error(`\n  Missing config.json at ${CONFIG_PATH}.`);
    console.error(`  Run "npm run setup" to generate tokens, or set ADMIN_TOKEN / KIAN_TOKEN / SANTI_TOKEN.\n`);
    process.exit(1);
  }
  const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  if (!cfg.adminToken || !Array.isArray(cfg.people)) {
    console.error(`\n  config.json is malformed: expected { adminToken, people: [...] }.\n`);
    process.exit(1);
  }
  return cfg;
}

const config = loadConfig();

function findPersonByToken(token) {
  return config.people.find((p) => p.token === token) || null;
}

function findPersonByRole(role) {
  return config.people.find((p) => slug(p.role) === slug(role)) || null;
}

// ---------------------------------------------------------------------------
// Per-person JSON store (one file each, so people never overwrite each other)
// ---------------------------------------------------------------------------

function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function responsePath(role) {
  return path.join(DATA_DIR, slug(role) + ".json");
}

function emptyResponse(person) {
  return {
    token: person.token,
    name: person.name,
    role: person.role,
    openedAt: null,
    submittedAt: null,
    answers: null
  };
}

function readResponse(person) {
  const p = responsePath(person.role);
  if (!fs.existsSync(p)) return emptyResponse(person);
  try {
    const data = JSON.parse(fs.readFileSync(p, "utf8"));
    // Keep identity authoritative from config in case it changed.
    data.token = person.token;
    data.name = person.name;
    data.role = person.role;
    return data;
  } catch (e) {
    console.error(`  Could not read ${p}: ${e.message}`);
    return emptyResponse(person);
  }
}

function writeResponse(resp) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const p = responsePath(resp.role);
  const tmp = p + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(resp, null, 2) + "\n");
  fs.renameSync(tmp, p); // atomic on same filesystem
}

// ---------------------------------------------------------------------------
// Tiny HTML helpers (no template engine — keep it light)
// ---------------------------------------------------------------------------

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function readView(name) {
  return fs.readFileSync(path.join(VIEWS, name + ".html"), "utf8");
}

function fillView(name, vars) {
  let html = readView(name);
  for (const [k, v] of Object.entries(vars || {})) {
    html = html.split("{{" + k + "}}").join(v);
  }
  return html;
}

function fmtDateTime(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("nl-NL", {
      timeZone: "Europe/Amsterdam",
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  } catch (e) {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

const app = express();
app.disable("x-powered-by");
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

// --- Existing static homepage (checkcheckdoublecheck.com) -------------------
// Serve only the known static assets; never expose server.js, config.json,
// data/, lib/, scripts/, or views/.
app.use("/assets", express.static(path.join(ROOT, "assets")));
app.use("/fonts", express.static(path.join(ROOT, "fonts")));
app.get("/", (req, res) => res.sendFile(path.join(ROOT, "index.html")));
app.get("/styles.css", (req, res) => res.sendFile(path.join(ROOT, "styles.css")));
app.get("/colors_and_type.css", (req, res) => res.sendFile(path.join(ROOT, "colors_and_type.css")));
app.get("/hub.css", (req, res) => res.sendFile(path.join(ROOT, "hub.css")));
app.get("/hub-v3.css", (req, res) => res.sendFile(path.join(ROOT, "hub-v3.css")));
app.get("/favicon.svg", (req, res) => res.sendFile(path.join(ROOT, "favicon.svg")));

// --- Form: GET --------------------------------------------------------------
app.get("/f/:token", (req, res) => {
  const person = findPersonByToken(req.params.token);
  if (!person) return res.status(404).send(readView("notfound"));

  const resp = readResponse(person);
  if (resp.submittedAt) {
    return res.status(410).send(fillView("already", {
      NAME: esc(person.name),
      ROLE: esc(person.role),
      SUBMITTED: esc(fmtDateTime(resp.submittedAt))
    }));
  }

  if (!resp.openedAt) {
    resp.openedAt = new Date().toISOString();
    writeResponse(resp);
  }

  res.send(fillView("form", {
    NAME: esc(person.name),
    ROLE: esc(person.role),
    TOKEN: esc(person.token),
    AREAS_JSON: JSON.stringify(AREAS)
  }));
});

// --- Form: POST -------------------------------------------------------------
app.post("/f/:token", (req, res) => {
  const person = findPersonByToken(req.params.token);
  if (!person) return res.status(404).send(readView("notfound"));

  const resp = readResponse(person);
  if (resp.submittedAt) {
    // Already used: refuse, show the same "already used" page.
    return res.status(410).send(fillView("already", {
      NAME: esc(person.name),
      ROLE: esc(person.role),
      SUBMITTED: esc(fmtDateTime(resp.submittedAt))
    }));
  }

  let answers = null;
  try {
    answers = JSON.parse(req.body.payload || "null");
  } catch (e) {
    return res.status(400).send(readView("badrequest"));
  }
  if (!answers || typeof answers !== "object") {
    return res.status(400).send(readView("badrequest"));
  }

  if (!resp.openedAt) resp.openedAt = new Date().toISOString();
  resp.submittedAt = new Date().toISOString();
  resp.answers = answers;
  writeResponse(resp);

  res.send(fillView("thanks", {
    NAME: esc(person.name),
    ROLE: esc(person.role)
  }));
});

// --- Admin: status overview -------------------------------------------------
function requireAdmin(req, res) {
  if (req.params.adminToken !== config.adminToken) {
    res.status(404).send(readView("notfound"));
    return false;
  }
  return true;
}

app.get("/admin/:adminToken", (req, res) => {
  if (!requireAdmin(req, res)) return;

  const rows = config.people.map((person) => {
    const resp = readResponse(person);
    let status, cls;
    if (resp.submittedAt) {
      status = "Ingediend op " + fmtDateTime(resp.submittedAt);
      cls = "submitted";
    } else if (resp.openedAt) {
      status = "Geopend op " + fmtDateTime(resp.openedAt);
      cls = "opened";
    } else {
      status = "Nog niet geopend";
      cls = "notopened";
    }
    const link = `/f/${esc(person.token)}`;
    const viewLink = `/admin/${esc(config.adminToken)}/r/${esc(slug(person.role))}`;
    const dlLink = viewLink + "/download";
    return `
      <tr>
        <td><strong>${esc(person.name)}</strong></td>
        <td>${esc(person.role)}</td>
        <td><span class="badge ${cls}">${esc(status)}</span></td>
        <td>
          ${resp.submittedAt
            ? `<a class="btn" href="${viewLink}">Bekijk antwoorden</a>
               <a class="btn ghost" href="${dlLink}">Download</a>`
            : `<span class="muted">—</span>`}
        </td>
        <td><a class="linkcell" href="${link}">${esc(person.token)}</a></td>
      </tr>`;
  }).join("");

  res.send(fillView("admin", {
    ROWS: rows,
    ADMIN_TOKEN: esc(config.adminToken)
  }));
});

// --- Admin: view one response ----------------------------------------------
app.get("/admin/:adminToken/r/:role", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const person = findPersonByRole(req.params.role);
  if (!person) return res.status(404).send(readView("notfound"));

  const resp = readResponse(person);
  if (!resp.submittedAt || !resp.answers) {
    return res.status(404).send(fillView("notfound", {}));
  }

  const items = (resp.answers.items) || {};
  const meta = (resp.answers.meta) || {};

  // Status-per-area blocks
  let areasHtml = "";
  let answered = 0;
  const tally = { live: 0, partial: 0, notyet: 0, nsure: 0, notneeded: 0 };
  AREAS.forEach((area, ai) => {
    let rows = "";
    area[1].forEach((q, ii) => {
      const it = items[ai + "_" + ii] || { status: "", note: "" };
      if (it.status) { answered++; if (tally[it.status] != null) tally[it.status]++; }
      const label = STATUS_LABELS[it.status] != null ? STATUS_LABELS[it.status] : "(not answered)";
      rows += `
        <tr>
          <td class="q">${esc(q)}</td>
          <td><span class="badge st-${esc(it.status || "none")}">${esc(label)}</span></td>
          <td class="note">${esc(it.note || "")}</td>
        </tr>`;
    });
    areasHtml += `
      <h3>${esc(area[0])}</h3>
      <table class="answers">
        <thead><tr><th>Item</th><th>Status</th><th>Notitie</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  });

  // Intake meta blocks
  let metaHtml = "";
  META_GROUPS.forEach(([title, fields]) => {
    let rows = "";
    fields.forEach(([key, label]) => {
      const v = meta[key];
      if (v == null || v === "") return;
      rows += `<tr><td class="q">${esc(label)}</td><td>${esc(v)}</td></tr>`;
    });
    if (rows) {
      metaHtml += `<h3>${esc(title)}</h3><table class="answers"><tbody>${rows}</tbody></table>`;
    }
  });

  res.send(fillView("response", {
    NAME: esc(person.name),
    ROLE: esc(person.role),
    SUBMITTED: esc(fmtDateTime(resp.submittedAt)),
    OPENED: esc(fmtDateTime(resp.openedAt)),
    TALLY: `Live ${tally.live} · Partial ${tally.partial} · Not yet ${tally.notyet} · Not sure ${tally.nsure} · Not needed ${tally.notneeded} — ${answered}/${TOTAL} beantwoord`,
    META: metaHtml,
    AREAS: areasHtml,
    BACK: `/admin/${esc(config.adminToken)}`,
    DOWNLOAD: `/admin/${esc(config.adminToken)}/r/${esc(slug(person.role))}/download`
  }));
});

// --- Admin: download one response as a file --------------------------------
app.get("/admin/:adminToken/r/:role/download", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const person = findPersonByRole(req.params.role);
  if (!person) return res.status(404).send(readView("notfound"));

  const p = responsePath(person.role);
  if (!fs.existsSync(p)) return res.status(404).send(readView("notfound"));

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="scope-check-${slug(person.role)}.json"`);
  res.send(fs.readFileSync(p, "utf8"));
});

// --- Fallback 404 -----------------------------------------------------------
app.use((req, res) => res.status(404).send(readView("notfound")));

app.listen(PORT, () => {
  console.log(`\n  HomeCare scope-check running on http://localhost:${PORT}`);
  console.log(`  Config: ${CONFIG_PATH}`);
  console.log(`  Data:   ${DATA_DIR}`);
  console.log(`  Run "npm run links" to print the personal + admin links.\n`);
});
