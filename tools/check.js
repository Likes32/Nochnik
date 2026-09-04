#!/usr/bin/env node
/**
 * Статические проверки, которые браузер не показывает.
 *
 * Повод: неверно обрезанный медиазапрос оставил лишнюю «}» в середине
 * floorplan.css — браузер молча отбросил всё, что шло ниже. Ни ошибки
 * в консоли, ни визуального слома; поймалось только через computed style.
 *
 *   node tools/check.js
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
let failed = 0;

const fail = (msg) => { console.error(`  ✖ ${msg}`); failed++; };
const ok = (msg) => console.log(`  ✓ ${msg}`);

/** Убираем комментарии и строки, чтобы скобки внутри них не считались. */
const stripCss = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/"[^"]*"|'[^']*'/g, '""');

console.log("\nCSS — баланс скобок");
for (const file of fs.readdirSync(path.join(ROOT, "css"))) {
  if (!file.endsWith(".css")) continue;
  const src = stripCss(fs.readFileSync(path.join(ROOT, "css", file), "utf8"));
  let depth = 0, line = 1, broke = false;
  for (const ch of src) {
    if (ch === "\n") line++;
    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth < 0) { fail(`css/${file}: лишняя } на строке ${line}`); broke = true; depth = 0; }
    }
  }
  if (depth !== 0) { fail(`css/${file}: не закрыто скобок: ${depth}`); broke = true; }
  if (!broke) ok(`css/${file}`);
}

console.log("\nCSS — прозрачные SVG-зоны ловят указатель");
{
  const all = fs.readdirSync(path.join(ROOT, "css"))
    .filter((f) => f.endsWith(".css"))
    .map((f) => stripCss(fs.readFileSync(path.join(ROOT, "css", f), "utf8")))
    .join("\n");
  // Правило вида .foo{...fill:transparent...} обязано нести pointer-events,
  // иначе указатель проваливается на фигуру под ней.
  const rules = all.match(/\.[a-z0-9_-]+[^{}]*\{[^{}]*fill:\s*(transparent|none)[^{}]*\}/gi) || [];
  const leaky = rules.filter(
    (r) => !/pointer-events/.test(r) && /(--outdoor|--zone|__fill)/.test(r)
  );
  if (leaky.length) leaky.forEach((r) => fail(`зона без pointer-events: ${r.slice(0, 70)}…`));
  else ok(`проверено правил с прозрачной заливкой: ${rules.length}`);
}

console.log("\nHTML — смысловые блоки не спрятаны");
{
  const all = fs.readdirSync(path.join(ROOT, "css"))
    .filter((f) => f.endsWith(".css"))
    .map((f) => `${f}::${stripCss(fs.readFileSync(path.join(ROOT, "css", f), "utf8"))}`)
    .join("\n");
  /**
   * Правило защищает содержание, а не оформление. Каждое исключение названо
   * поимённо и с причиной — расширять список только осознанно.
   */
  const ALLOWED = [
    /\.lite/,                    // аварийный облегчённый режим
    /::before|::after/,          // псевдоэлементы, не содержание
    /::-webkit-scrollbar/,       // полоса прокрутки, не содержание
    /\[hidden\]/,                // штатный атрибут
    /\.sr-only/,                 // наоборот, для скринридеров
    /nav__burger/,               // на десктопе бургер не нужен, меню видно целиком
    /\.hero__scroll/,            // подсказка «листайте вниз»: на тач-экране
                                 // прокрутка очевидна, и это подсказка, не текст
    /\.stickybar/,               // липкая панель с ценой: только узкие экраны,
                                 // на десктопе та же кнопка стоит в шапке
    /\.planner:not/,             // закрытый <dialog> обязан быть скрыт — это его
                                 // штатное поведение, а не спрятанное содержание
  ];
  const hits = (all.match(/[^{}]*\{[^{}]*display:\s*none[^{}]*\}/g) || []).filter(
    (r) => !ALLOWED.some((re) => re.test(r))
  );
  if (hits.length) hits.forEach((r) => fail(`display:none вне разрешённых случаев: ${r.trim().slice(0, 70)}…`));
  else ok("display:none только там, где положено");
}

console.log("\nHTML — интерактивные зоны доступны с клавиатуры");
{
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const zones = html.match(/<g[^>]*data-note[^>]*>/g) || [];
  const bad = zones.filter((z) => !/tabindex="0"/.test(z) || !/role="button"/.test(z));
  if (bad.length) bad.forEach((z) => fail(`зона без tabindex или role: ${z.slice(0, 60)}…`));
  else ok(`интерактивных зон: ${zones.length}, все с tabindex и role`);
}

console.log(failed ? `\nПровалено проверок: ${failed}\n` : "\nВсё чисто.\n");
process.exit(failed ? 1 : 0);
