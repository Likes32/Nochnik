#!/usr/bin/env node
/**
 * Тянет woff2 с Google Fonts и собирает локальный fonts.css.
 * Разбирает ответ css2, чтобы сохранить точные unicode-range,
 * а не выдумывать их руками.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "fonts");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const FAMILIES = [
  { slug: "cormorant", q: "Cormorant+Garamond:wght@300;500" },
  { slug: "onest", q: "Onest:wght@400;600" },
  { slug: "mono", q: "JetBrains+Mono:wght@400" },
];

/** Нас интересуют только эти два диапазона — латиница и кириллица. */
const WANTED = ["latin", "cyrillic"];

const get = async (url, asBuffer = false) => {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return asBuffer ? Buffer.from(await res.arrayBuffer()) : res.text();
};

/** Google помечает блоки комментарием вида `/* cyrillic *\/` перед @font-face. */
function parseFaces(css) {
  const faces = [];
  const re = /\/\*\s*([a-z-]+)\s*\*\/\s*@font-face\s*\{([^}]+)\}/g;
  let m;
  while ((m = re.exec(css))) {
    const [, subset, block] = m;
    const pick = (k) => (block.match(new RegExp(`${k}:\\s*([^;]+);`)) || [])[1]?.trim();
    const url = (block.match(/url\((https:[^)]+\.woff2)\)/) || [])[1];
    if (!url) continue;
    faces.push({
      subset,
      family: pick("font-family")?.replace(/['"]/g, ""),
      weight: pick("font-weight"),
      style: pick("font-style"),
      range: pick("unicode-range"),
      url,
    });
  }
  return faces;
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const blocks = [];
let downloaded = 0;
let bytes = 0;

for (const { slug, q } of FAMILIES) {
  const css = await get(`https://fonts.googleapis.com/css2?family=${q}&display=swap`);
  const faces = parseFaces(css).filter((f) => WANTED.includes(f.subset));
  if (!faces.length) throw new Error(`Не разобрал ни одного @font-face для ${q}`);

  // Google отдаёт вариативные шрифты: файл для 300 и 500 — один и тот же.
  // Группируем по диапазону символов и объявляем начертания интервалом.
  for (const subset of WANTED) {
    const group = faces.filter((f) => f.subset === subset);
    if (!group.length) continue;

    const weights = [...new Set(group.map((f) => Number(f.weight)))].sort((a, b) => a - b);
    const first = group[0];
    const file = `${slug}-${subset}.woff2`;
    const buf = await get(first.url, true);
    if (buf.length < 4000) throw new Error(`Подозрительно маленький файл: ${file}`);

    // Убеждаемся, что внутри группы это действительно один и тот же файл.
    const urls = new Set(group.map((f) => f.url));
    if (urls.size > 1)
      throw new Error(`${slug}/${subset}: Google отдал разные файлы на начертания — нужен статический разбор`);

    fs.writeFileSync(path.join(OUT, file), buf);
    downloaded++;
    bytes += buf.length;

    const weightDecl =
      weights.length > 1 ? `${weights[0]} ${weights[weights.length - 1]}` : `${weights[0]}`;
    blocks.push(
      `@font-face{\n` +
        `  font-family:"${first.family}";\n` +
        `  font-style:${first.style};\n` +
        `  font-weight:${weightDecl};\n` +
        `  font-display:swap;\n` +
        `  src:url("fonts/${file}") format("woff2");\n` +
        `  unicode-range:${first.range};\n` +
        `}`
    );
    console.log(`  ${file}  ${(buf.length / 1024).toFixed(1)} КБ  начертания ${weightDecl}`);
  }
}

fs.writeFileSync(
  path.join(ROOT, "fonts.css"),
  `/* Собран автоматически: node tools/fetch-fonts.js */\n\n${blocks.join("\n\n")}\n`
);
console.log(`\nСкачано файлов: ${downloaded}. fonts.css собран.`);
