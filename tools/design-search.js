#!/usr/bin/env node
/**
 * Поиск по базам знаний дизайн-скилла ui-ux-pro-max без Python.
 * Оригинальные search.py читают те же CSV и ранжируют по BM25;
 * здесь то же самое на Node, который есть на машине.
 *
 *   node tools/design-search.js style   "minimalist geometric negative space"
 *   node tools/design-search.js color   "dark forest warm gold"
 *   node tools/design-search.js industry "hospitality hotel nature retreat"
 *   node tools/design-search.js brief   "<запрос>"      — сводка по всем трём
 */

const fs = require("fs");
const path = require("path");

const DATA = path.join(
  process.env.USERPROFILE || process.env.HOME,
  ".claude/plugins/cache/ui-ux-pro-max-skill/ui-ux-pro-max/2.11.0",
  ".claude/skills/design/data/logo"
);

const FILES = {
  style: "styles.csv",
  color: "colors.csv",
  industry: "industries.csv",
};

/** Разбор CSV с кавычками и запятыми внутри полей. */
function parseCSV(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift();
  return rows
    .filter((r) => r.length > 1 && r.some((v) => v.trim()))
    .map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] || "").trim()])));
}

const tokenize = (s) => s.toLowerCase().match(/[a-zа-я0-9#]+/gi) || [];

/** BM25 по объединённому тексту строки. */
function rank(rows, query, limit = 5) {
  const q = tokenize(query);
  const docs = rows.map((r) => tokenize(Object.values(r).join(" ")));
  const avgLen = docs.reduce((a, d) => a + d.length, 0) / docs.length;
  const df = {};
  for (const term of new Set(q))
    df[term] = docs.filter((d) => d.includes(term)).length;

  const k1 = 1.5, b = 0.75;
  return rows
    .map((row, i) => {
      const d = docs[i];
      let score = 0;
      for (const term of q) {
        const f = d.filter((w) => w === term).length;
        if (!f) continue;
        const idf = Math.log(1 + (docs.length - df[term] + 0.5) / (df[term] + 0.5));
        score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * d.length) / avgLen)));
      }
      return { row, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function show(domain, query, limit) {
  const file = path.join(DATA, FILES[domain]);
  if (!fs.existsSync(file)) {
    console.error(`Нет файла данных: ${file}`);
    process.exit(1);
  }
  const rows = parseCSV(fs.readFileSync(file, "utf8"));
  const hits = rank(rows, query, limit);
  console.log(`\n── ${domain.toUpperCase()} · «${query}» · ${rows.length} записей в базе`);
  if (!hits.length) return console.log("  совпадений нет");
  for (const { row, score } of hits) {
    const name = row["Style Name"] || row["Palette Name"] || row["Industry"];
    console.log(`\n  ${name}   [${score.toFixed(2)}]`);
    for (const [k, v] of Object.entries(row)) {
      if (!v || k === "No" || k === name) continue;
      if (["Style Name", "Palette Name", "Industry", "Keywords"].includes(k)) continue;
      console.log(`    ${k}: ${v}`);
    }
  }
}

const [, , domain, ...rest] = process.argv;
const query = rest.join(" ");
if (!domain || !query) {
  console.log("Использование: node tools/design-search.js <style|color|industry|brief> \"запрос\"");
  process.exit(1);
}
if (domain === "brief") {
  for (const d of ["industry", "style", "color"]) show(d, query, 3);
} else if (FILES[domain]) {
  show(domain, query, 5);
} else {
  console.error(`Неизвестная область: ${domain}`);
  process.exit(1);
}
