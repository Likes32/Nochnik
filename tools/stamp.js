#!/usr/bin/env node
/**
 * Проставляет версию к ссылкам на стили и скрипты.
 *
 * Зачем: GitHub Pages отдаёт css и js с Cache-Control max-age=600.
 * После выкладки телефон десять минут может держать старые стили —
 * и показывать новую разметку со старым оформлением. Со стороны это
 * выглядит как «сайт сломался», хотя сломан только кеш.
 *
 *   node tools/stamp.js        — перед коммитом выкладки
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const file = path.join(ROOT, "index.html");

/** Метка времени, а не хеш коммита: хеш на момент правки ещё старый
    и отстаёт на выкладку, а нам нужно значение, меняющееся всегда. */
const v = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 12);

let html = fs.readFileSync(file, "utf8");
let n = 0;

html = html.replace(
  /(href|src)="((?:css|js)\/[^"?]+\.(?:css|js))(?:\?v=[^"]*)?"/g,
  (_, attr, url) => { n++; return `${attr}="${url}?v=${v}"`; }
);
html = html.replace(
  /href="(fonts\.css)(?:\?v=[^"]*)?"/g,
  (_, url) => { n++; return `href="${url}?v=${v}"`; }
);

fs.writeFileSync(file, html);
console.log(`версия ${v} проставлена ссылкам: ${n}`);
