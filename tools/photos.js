#!/usr/bin/env node
/**
 * Подбор кадров через Pexels.
 *
 *   node tools/photos.js find          — показать кандидатов по каждому слоту
 *   node tools/photos.js get <slot> <id>  — скачать выбранный кадр в photos/
 *
 * Лицензия Pexels разрешает коммерческое использование и переработку
 * без указания авторства, поэтому кадры годятся для проекта на продажу.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

/** Ключ берём из .env — он в .gitignore и в репозиторий не уезжает. */
function apiKey() {
  const env = path.join(ROOT, ".env");
  if (fs.existsSync(env)) {
    const m = fs.readFileSync(env, "utf8").match(/PEXELS_API_KEY=(.+)/);
    if (m) return m[1].trim();
  }
  if (process.env.PEXELS_API_KEY) return process.env.PEXELS_API_KEY.trim();
  throw new Error("Нет PEXELS_API_KEY: положите его в .env или в переменные окружения.");
}

/** Слоты страницы. Ориентация важна: вертикальный герой — отдельный кадр. */
export const SLOTS = {
  "hero-wide":  { q: "a frame cabin forest night lights", orientation: "landscape" },
  "hero-tall":  { q: "cabin forest night window light", orientation: "portrait" },
  "house":      { q: "wooden cabin pine forest evening", orientation: "landscape" },
  "terrace":    { q: "wooden terrace outdoor dining evening", orientation: "landscape" },
  "sauna":      { q: "sauna interior wood dark", orientation: "landscape" },
  "tub":        { q: "outdoor hot tub night steam", orientation: "landscape" },
  "morning":    { q: "foggy pine forest morning mist", orientation: "landscape" },
};

const api = async (url) => {
  const res = await fetch(url, { headers: { Authorization: apiKey() } });
  if (!res.ok) throw new Error(`Pexels ${res.status}: ${await res.text()}`);
  return res.json();
};

async function find() {
  for (const [slot, { q, orientation }] of Object.entries(SLOTS)) {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}`
      + `&orientation=${orientation}&per_page=6`;
    const data = await api(url);
    console.log(`\n── ${slot}  «${q}»  (${orientation})`);
    if (!data.photos?.length) { console.log("   ничего не нашлось"); continue; }
    for (const p of data.photos) {
      const alt = (p.alt || "").slice(0, 68);
      console.log(`   ${String(p.id).padEnd(9)} ${String(p.width).padStart(5)}×${String(p.height).padEnd(5)} ${alt}`);
    }
  }
  console.log("\nСкачать:  node tools/photos.js get <slot> <id>\n");
}

async function get(slot, id) {
  if (!SLOTS[slot]) throw new Error(`Неизвестный слот: ${slot}`);
  const p = await api(`https://api.pexels.com/v1/photos/${id}`);
  // large2x — примерно 1880px по длинной стороне, дальше пережмём до 1600.
  const src = p.src.large2x || p.src.original;
  const res = await fetch(src);
  if (!res.ok) throw new Error(`Скачивание ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const out = path.join(ROOT, "photos", `${slot}.jpg`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, buf);
  console.log(`${slot}.jpg — ${(buf.length / 1024).toFixed(0)} КБ, ${p.width}×${p.height}, автор ${p.photographer}`);
}

const [, , cmd, ...rest] = process.argv;
if (cmd === "find") await find();
else if (cmd === "get") await get(rest[0], rest[1]);
else console.log("Использование: node tools/photos.js find | get <slot> <id>");
