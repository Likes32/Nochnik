# Лендинг «Ночник» — план реализации

> **Для агентов:** ОБЯЗАТЕЛЬНЫЙ СУБ-СКИЛЛ: используйте superpowers:subagent-driven-development
> (рекомендуется) или superpowers:executing-plans для выполнения задача за задачей.
> Шаги размечены чекбоксами (`- [ ]`).

**Цель:** одностраничный лендинг несуществующего дома отдыха «Ночник» — один A-frame домик
в лесу, с рабочим календарём бронирования и световой драматургией по скроллу.

**Архитектура:** статический сайт без сборщика. Разметка в `index.html`, стили разбиты по
зонам ответственности, скрипты — модули ES. Логика бронирования вынесена в чистые функции
без DOM (`js/booking-core.js`) и покрыта тестами через встроенный в Node раннер; всё, что
касается DOM, тестируется глазами через локальный сервер.

**Стек:** HTML, CSS (кастомные свойства), ES-модули, GSAP + ScrollTrigger и Lenis
(вендорятся локально), `node --test` для юнит-тестов. Сборщика нет.

## Глобальные ограничения

Действуют для каждой задачи, повторять в задачах не нужно.

- **Палитра, ровно эти значения:** `--n0 #070A08`, `--n1 #0D130F`, `--n2 #16211A`,
  `--dawn #9FA898`, `--gold #F0B54A`, `--gold-dim #C99235`, `--cream #E8E3D6`,
  `--olive #8C9585`, `--hair #1E2820`.
- **Шрифты:** Cormorant Garamond 300/500 — заголовки; Onest 400/600 — текст;
  JetBrains Mono 400 — метки, цифры, данные.
- **Ни одного градиента в интерфейсе.** Свечение только там, где есть источник света.
- **Ни одного `display:none` на смысловых блоках.** Мобилка — своя раскладка, не урезание.
- **Моно-метки на мобиле не уменьшаются**, остаются 12px.
- **Ни одного CSS-фильтра на фотографиях.** Грейд впечён в JPEG.
- **Никакого `backdrop-filter` на мобиле.**
- **Lenis и GSAP не инициализируются на тач-устройствах** (`pointer:coarse`,
  `hover:none` или ширина ≤900px). На десктопе Lenis — `lerp: 0.14`, не `duration`.
- **Высоты только в `svh`**, не `vh`.
- **`overflow-x: clip`**, не `hidden`, и не на `body`.
- **Все фото ≤1600px по длинной стороне, JPEG q80**, `loading="lazy"` и
  `decoding="async"` везде кроме первого экрана.
- **Тарифы:** будни (вс–чт) 14 900 ₽, выходные (пт–сб) 18 900 ₽, уборка 2 500 ₽ разово,
  баня 3 500 ₽ по запросу, минимум 2 ночи, заезд с 15:00, выезд до 12:00.
- **Копирайт:** спокойный, скупой, без восклицаний. Конкретика вместо эпитетов.
- **Коммиты** после каждой задачи, сообщение по-русски, с трейлером
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

## Структура файлов

```
index.html               разметка всех секций
package.json             { "type": "module" } — чтобы Node и браузер читали модули одинаково
.claude/launch.json      локальный сервер для визуальной проверки
css/tokens.css           кастомные свойства: палитра, шкала, отступы, брейкпоинты
css/base.css             сброс, типографика, утилиты, состояния фокуса, .lite
css/sections.css         секции, рельса меток времени, сцены, практика
css/calendar.css         календарь и форма заявки
fonts/                   woff2, самохостинг
fonts.css                @font-face
js/booking-core.js       чистая логика бронирования, без DOM
js/calendar.js           рендер календаря и взаимодействие
js/night.js              переменная --night, прогресс скролла, параллакс героя
js/reveal.js             появления, счётчик долгих кадров, режим .lite
js/main.js               инициализация, определение тач-устройства
js/vendor/               gsap.min.js, ScrollTrigger.min.js, lenis.min.js
tests/booking-core.test.js
photos/                  кадры с впечённым грейдом
assets/                  логотип, фавикон
```

Медиазапросы живут рядом со своим компонентом, а не в отдельном `responsive.css` —
иначе мобильные правила отрываются от десктопных и начинают воевать за специфичность.

---

### Задача 1: Каркас, токены, шрифты, локальный сервер

**Файлы:**
- Создать: `package.json`, `.claude/launch.json`, `index.html`, `css/tokens.css`,
  `css/base.css`, `fonts.css`, `assets/logo-primary.svg`, `assets/logo-compact.svg`
- Создать: `fonts/` (10 файлов woff2)

**Интерфейсы:**
- Отдаёт: кастомные свойства из `css/tokens.css`, доступные всем последующим задачам —
  `--n0 --n1 --n2 --dawn --gold --gold-dim --cream --olive --hair`,
  `--display --body --mono`, `--step-1 … --step-6`, `--pad-section`, `--pad-side`.

- [ ] **Шаг 1: `package.json`**

```json
{
  "name": "nochnik",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test tests/"
  }
}
```

- [ ] **Шаг 2: скачать шрифты**

Google Fonts отдаёт woff2 по прямым ссылкам из CSS-ответа. Забрать нужные начертания:

```bash
cd "C:/Users/admin/Desktop/Ночник"
mkdir -p fonts
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120"
for spec in \
  "cormorant:Cormorant+Garamond:wght@300;500" \
  "onest:Onest:wght@400;600" \
  "mono:JetBrains+Mono:wght@400"; do
  name="${spec%%:*}"; fam="${spec#*:}"
  curl -s -A "$UA" "https://fonts.googleapis.com/css2?family=${fam}&display=swap" \
    | grep -oE "https://fonts.gstatic.com/[^)]+\.woff2" | sort -u \
    | while read -r url; do
        i=$((i+1)); curl -s -o "fonts/${name}-$(basename "$url")" "$url"
      done
done
ls -la fonts/
```

Ожидается: файлы `.woff2` в `fonts/`, каждый больше 5 КБ. Google отдаёт отдельные файлы
на latin и cyrillic — нужны оба, они подключаются через `unicode-range`.

- [ ] **Шаг 3: `fonts.css`**

Для каждого файла — свой `@font-face` с точным `unicode-range`. Кириллический диапазон
`U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116`, латинский
`U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD`.

```css
@font-face{
  font-family:"Cormorant Garamond"; font-style:normal; font-weight:300; font-display:swap;
  src:url("fonts/cormorant-<cyrillic>.woff2") format("woff2");
  unicode-range:U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116;
}
```

Повторить для каждой пары начертание × диапазон. Имена файлов подставить реальные,
полученные на шаге 2.

- [ ] **Шаг 4: `css/tokens.css`**

```css
:root{
  --n0:#070A08; --n1:#0D130F; --n2:#16211A; --dawn:#9FA898;
  --gold:#F0B54A; --gold-dim:#C99235;
  --cream:#E8E3D6; --olive:#8C9585; --hair:#1E2820;

  --display:"Cormorant Garamond",Georgia,serif;
  --body:"Onest",-apple-system,"Segoe UI",Roboto,sans-serif;
  --mono:"JetBrains Mono",ui-monospace,Consolas,monospace;

  --step-6:clamp(2.5rem,7vw,6.5rem);   /* H1 40→104px */
  --step-5:clamp(1.875rem,4vw,3.5rem); /* H2 30→56px  */
  --step-4:clamp(1.25rem,2vw,1.75rem);
  --step-3:1.0625rem;                  /* текст 17px  */
  --step-2:0.9375rem;
  --step-1:0.75rem;                    /* моно 12px, на мобиле не меняется */

  --pad-section:clamp(5.5rem,10vw,12.5rem); /* 88→200px */
  --pad-side:clamp(1.25rem,5vw,5rem);       /* 20→80px  */

  --night:0; /* 0 — ночь, 1 — рассвет; пишет js/night.js */
}
```

- [ ] **Шаг 5: `css/base.css`**

Сброс, `body` с фоном `var(--n1)` и цветом `var(--cream)`, базовая типографика,
`overflow-x:clip` на обёртке (не на `body`), видимый фокус
`outline:2px solid var(--gold); outline-offset:3px`, блок `@media (prefers-reduced-motion:reduce)`,
и класс `.lite`, снимающий переходы, тени и появления.

- [ ] **Шаг 6: `assets/logo-primary.svg` и `assets/logo-compact.svg`**

Код обоих знаков — в спеке, раздел 2. Скопировать дословно.

- [ ] **Шаг 7: `index.html` — скелет**

`<!doctype html>`, `lang="ru"`, мета viewport, `<title>Ночник — дом в лесу</title>`,
подключение `fonts.css`, `css/tokens.css`, `css/base.css`, фавикон из
`assets/logo-compact.svg`. Внутри — пустой `<main>` и шапка с основным знаком.
Preload двух критичных начертаний:

```html
<link rel="preload" as="font" type="font/woff2" crossorigin href="fonts/onest-<cyrillic>.woff2">
<link rel="preload" as="font" type="font/woff2" crossorigin href="fonts/cormorant-<cyrillic>.woff2">
```

- [ ] **Шаг 8: `.claude/launch.json`**

```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "nochnik",
      "runtimeExecutable": "npx",
      "runtimeArgs": ["--yes", "serve", "-l", "4321", "."],
      "port": 4321
    }
  ]
}
```

- [ ] **Шаг 9: проверить в браузере**

Запустить сервер через `preview_start` с именем `nochnik`, открыть страницу.
Ожидается: тёмный фон `#0D130F`, знак в шапке виден, заголовок набран антиквой
(не системным шрифтом — если антиква не применилась, ошибка в путях `fonts.css`).

- [ ] **Шаг 10: коммит**

```bash
git add -A && git commit -m "Каркас проекта: токены, шрифты, знаки, локальный сервер"
```

---

### Задача 2: Логика бронирования (TDD)

**Файлы:**
- Создать: `js/booking-core.js`, `tests/booking-core.test.js`

**Интерфейсы:**
- Отдаёт для задачи 4:
  - `RATES` — `{weekday:14900, weekend:18900, cleaning:2500, sauna:3500, minNights:2}`
  - `BLOCKED` — `string[]` дат вида `"2026-09-12"`
  - `toKey(date: Date): string` — дата в `"YYYY-MM-DD"` по локальному календарю
  - `isWeekendNight(key: string): boolean` — ночь с пятницы или субботы
  - `nightKeys(inKey: string, outKey: string): string[]` — ночи, выезд не включён
  - `isBlocked(key: string, blocked?: string[]): boolean`
  - `rangeIsFree(inKey: string, outKey: string, blocked?: string[]): boolean`
  - `quote(inKey: string, outKey: string, opts?: {sauna?: boolean}):
     {ok:true, nights:number, accommodation:number, cleaning:number, sauna:number, total:number}
     | {ok:false, reason:"min-nights"|"blocked"|"order"}`

Даты везде — строковые ключи `"YYYY-MM-DD"`, а не объекты `Date`. Это снимает целый класс
ошибок с часовыми поясами: `new Date("2026-09-12")` парсится как UTC-полночь и в
отрицательных смещениях уезжает на день назад.

- [ ] **Шаг 1: написать падающие тесты**

```js
// tests/booking-core.test.js
import test from "node:test";
import assert from "node:assert/strict";
import {
  RATES, toKey, isWeekendNight, nightKeys, isBlocked, rangeIsFree, quote,
} from "../js/booking-core.js";

test("toKey не уезжает на день из-за часового пояса", () => {
  assert.equal(toKey(new Date(2026, 8, 12)), "2026-09-12");
  assert.equal(toKey(new Date(2026, 0, 1)), "2026-01-01");
});

test("ночь считается выходной, если начинается в пятницу или субботу", () => {
  assert.equal(isWeekendNight("2026-09-11"), true);  // пятница
  assert.equal(isWeekendNight("2026-09-12"), true);  // суббота
  assert.equal(isWeekendNight("2026-09-13"), false); // воскресенье
  assert.equal(isWeekendNight("2026-09-10"), false); // четверг
});

test("nightKeys не включает дату выезда", () => {
  assert.deepEqual(nightKeys("2026-09-10", "2026-09-13"),
    ["2026-09-10", "2026-09-11", "2026-09-12"]);
});

test("nightKeys переходит через границу месяца", () => {
  assert.deepEqual(nightKeys("2026-09-29", "2026-10-02"),
    ["2026-09-29", "2026-09-30", "2026-10-01"]);
});

test("занятая дата внутри диапазона делает его недоступным", () => {
  const blocked = ["2026-09-11"];
  assert.equal(rangeIsFree("2026-09-10", "2026-09-13", blocked), false);
});

test("дата выезда может совпадать с занятой — в эту ночь мы уже не ночуем", () => {
  const blocked = ["2026-09-13"];
  assert.equal(rangeIsFree("2026-09-10", "2026-09-13", blocked), true);
});

test("минимум две ночи", () => {
  const q = quote("2026-09-10", "2026-09-11", { sauna: false });
  assert.equal(q.ok, false);
  assert.equal(q.reason, "min-nights");
});

test("выезд раньше заезда отбивается", () => {
  assert.equal(quote("2026-09-13", "2026-09-10").reason, "order");
});

test("расчёт смешивает будни и выходные", () => {
  // ночи: чт 10 (будни), пт 11 (вых), сб 12 (вых)
  const q = quote("2026-09-10", "2026-09-13", { sauna: false });
  assert.equal(q.ok, true);
  assert.equal(q.nights, 3);
  assert.equal(q.accommodation, 14900 + 18900 + 18900);
  assert.equal(q.cleaning, RATES.cleaning);
  assert.equal(q.sauna, 0);
  assert.equal(q.total, 14900 + 18900 + 18900 + 2500);
});

test("баня добавляется один раз, а не за ночь", () => {
  const q = quote("2026-09-10", "2026-09-13", { sauna: true });
  assert.equal(q.sauna, RATES.sauna);
  assert.equal(q.total, 14900 + 18900 + 18900 + 2500 + 3500);
});
```

- [ ] **Шаг 2: убедиться, что тесты падают**

Запустить: `npm test`
Ожидается: FAIL, `Cannot find module '../js/booking-core.js'`.

- [ ] **Шаг 3: реализовать**

```js
// js/booking-core.js
export const RATES = {
  weekday: 14900, weekend: 18900, cleaning: 2500, sauna: 3500, minNights: 2,
};

/** Занятые ночи. Выдуманы, но правдоподобны: выходные заняты плотнее будней. */
export const BLOCKED = [
  "2026-09-11","2026-09-12","2026-09-18","2026-09-19","2026-09-20",
  "2026-09-25","2026-09-26","2026-10-02","2026-10-03","2026-10-09",
  "2026-10-10","2026-10-16","2026-10-17","2026-10-23","2026-10-24",
  "2026-10-30","2026-10-31","2026-11-06","2026-11-07",
];

const pad = (n) => String(n).padStart(2, "0");

export function toKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Ключ → Date в локальной полуночи. Не через new Date(string) — тот парсит как UTC. */
export function fromKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function isWeekendNight(key) {
  const day = fromKey(key).getDay(); // 0 вс … 6 сб
  return day === 5 || day === 6;
}

export function nightlyRate(key) {
  return isWeekendNight(key) ? RATES.weekend : RATES.weekday;
}

export function nightKeys(inKey, outKey) {
  const out = [];
  const cursor = fromKey(inKey);
  const end = fromKey(outKey);
  while (cursor < end) {
    out.push(toKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

export function isBlocked(key, blocked = BLOCKED) {
  return blocked.includes(key);
}

export function rangeIsFree(inKey, outKey, blocked = BLOCKED) {
  return nightKeys(inKey, outKey).every((k) => !isBlocked(k, blocked));
}

export function quote(inKey, outKey, opts = {}) {
  const nights = nightKeys(inKey, outKey);
  if (nights.length === 0) return { ok: false, reason: "order" };
  if (nights.length < RATES.minNights) return { ok: false, reason: "min-nights" };
  if (!rangeIsFree(inKey, outKey, opts.blocked)) return { ok: false, reason: "blocked" };

  const accommodation = nights.reduce((sum, k) => sum + nightlyRate(k), 0);
  const sauna = opts.sauna ? RATES.sauna : 0;
  return {
    ok: true,
    nights: nights.length,
    accommodation,
    cleaning: RATES.cleaning,
    sauna,
    total: accommodation + RATES.cleaning + sauna,
  };
}
```

- [ ] **Шаг 4: убедиться, что тесты проходят**

Запустить: `npm test`
Ожидается: `pass 9`, `fail 0`.

- [ ] **Шаг 5: коммит**

```bash
git add -A && git commit -m "Логика бронирования: тарифы, занятость, расчёт стоимости"
```

---

### Задача 3: Фотографии и грейд

**Файлы:**
- Создать: `photos/*.jpg`, `tools/grade.ps1`

**Интерфейсы:**
- Отдаёт для задачи 5 ровно эти имена:
  `hero-wide.jpg`, `hero-tall.jpg`, `house.jpg`, `interior.jpg`, `sauna.jpg`,
  `fire.jpg`, `morning.jpg`, `road.jpg`.

- [ ] **Шаг 1: собрать исходники**

Каналы: Wikimedia Commons (thumbnails только бакетных ширин 1280 или 1920) и Pexels по
ID вида `images.pexels.com/photos/<id>/pexels-photo-<id>.jpeg?w=2000`.
Unsplash отдаёт 401 на скрейпинг — не использовать.

Нужны сумеречные и вечерние кадры соснового леса, интерьер с тёплым светом, парная,
костёр, утренний туман. Ночной кадр подсвеченного A-frame в банках редкость — берём
вечерние и доводим грейдом.

**Пропорции сверять с пропорцией слота до скачивания.** На «Косе» кадр 5.46:1 в слоте 3:2
растянуло вчетверо. `hero-wide` — примерно 16:9, `hero-tall` — 3:4 с домиком в нижней трети.

- [ ] **Шаг 2: `tools/grade.ps1`**

Приводит кадры к единому ночному грейду и впекает его в JPEG: понижение яркости,
сдвиг в холодную зелень в тенях, длинная сторона ≤1600, качество 80.

В PowerShell 5.1 конструктор `ColorMatrix` не принимает `[single[][]]` через
`New-Object` — создать identity-матрицу и присвоить свойства `Matrix00`…`Matrix44`
по одному. Иначе падает.

- [ ] **Шаг 3: прогнать и проверить**

```powershell
powershell -File tools/grade.ps1
```

Ожидается: все файлы в `photos/` не длиннее 1600px, суммарный вес меньше 4 МБ.

```bash
node -e "const fs=require('fs');let t=0;for(const f of fs.readdirSync('photos'))t+=fs.statSync('photos/'+f).size;console.log((t/1048576).toFixed(2)+' МБ')"
```

- [ ] **Шаг 4: коммит**

```bash
git add -A && git commit -m "Фотографии с впечённым ночным грейдом"
```

---

### Задача 4: Календарь и форма заявки

**Файлы:**
- Создать: `js/calendar.js`, `css/calendar.css`
- Изменить: `index.html` — секция бронирования

**Интерфейсы:**
- Потребляет из задачи 2: `RATES, BLOCKED, toKey, fromKey, isBlocked, rangeIsFree, quote`
- Отдаёт: `initCalendar(root: HTMLElement): void` — вызывается из `js/main.js`

- [ ] **Шаг 1: разметка секции в `index.html`**

Контейнер `<section id="booking">` с `<div class="cal" role="application" aria-label="Выбор дат">`,
двумя слотами месяцев, панелью расчёта и формой заявки (имя, телефон, чекбокс бани, кнопка).

- [ ] **Шаг 2: рендер месяцев**

Функция строит сетку месяца: заголовок, семь колонок с понедельника, кнопки дат.
Занятые даты — `disabled` и `aria-disabled="true"`. Каждая кнопка несёт `data-key`.
На десктопе два месяца рядом, на мобиле один с горизонтальным свайпом
(`scroll-snap-type:x mandatory`). Ячейка не меньше 44×44px.

- [ ] **Шаг 3: выбор диапазона**

Первый клик ставит заезд, второй — выезд. Если второй раньше первого, он становится новым
заездом. Наведение показывает предполагаемый диапазон. Если `rangeIsFree` возвращает
`false`, диапазон не фиксируется и показывается подсказка «В эти даты домик занят».

- [ ] **Шаг 4: расчёт**

При полном диапазоне вызывается `quote` и панель заполняется: количество ночей,
проживание, уборка, баня (если отмечена), итого. Числа через `Intl.NumberFormat("ru-RU")`
и `font-variant-numeric: tabular-nums`. При `ok:false` показывается причина:
`min-nights` → «Минимум две ночи», `blocked` → «В эти даты домик занят».

- [ ] **Шаг 5: клавиатура и ARIA**

Стрелки двигают фокус по дням, `Home`/`End` — на начало и конец недели,
`PageUp`/`PageDown` — на месяц. Выбранный диапазон помечается `aria-selected`.
Изменения расчёта объявляются через `aria-live="polite"`.

- [ ] **Шаг 6: отправка формы**

`submit` отменяется, форма заменяется сообщением «Заявка принята. Перезвоним в течение
часа». Никаких сетевых запросов.

- [ ] **Шаг 7: проверить в браузере**

Открыть локальный сервер, проверить: занятые даты некликабельны; выбор одной ночи даёт
«Минимум две ночи»; выбор с четверга по воскресенье даёт 3 ночи и 55 200 ₽ итого
(14 900 + 18 900 + 18 900 + 2 500); переключение бани добавляет 3 500 ₽; вкладка проходит
по календарю; на пресете 375px ячейки не мельче 44px.

- [ ] **Шаг 8: коммит**

```bash
git add -A && git commit -m "Календарь бронирования: выбор дат, расчёт, клавиатура"
```

---

### Задача 5: Секции и контент

**Файлы:**
- Изменить: `index.html`
- Создать: `css/sections.css`

- [ ] **Шаг 1: навигация**

Прозрачная строка со знаком и якорями. При скролле свыше 60px класс `scrolled` ужимает её
в скруглённую плашку. `backdrop-filter` только на десктопе — на мобиле сплошной фон.
Бургер раскрывает полноэкранное меню с пунктами не мельче 24px.

- [ ] **Шаг 2: первый экран, метка 17:40**

`100svh`, `<picture>` с `hero-tall.jpg` до 900px и `hero-wide.jpg` выше,
`fetchpriority="high"`. Поверх — H1 «Дом в лесу, который видно издалека», чипсы
(лес · баня · камин · до 4 гостей), «от 14 900 ₽ за ночь», кнопка «Выбрать даты».

- [ ] **Шаг 3: остальные шесть секций**

Метки `18:20` дом, `19:00` баня, `21:30` костёр, `23:00` тишина, `06:10` утро, плюс
практика. Содержание — в спеке, раздел 4. Метки времени набраны моно и вынесены на левое
поле как маргиналии.

Секция «Тишина» — только текст на `--n0`, без фотографии. Это пауза, и она должна быть
пустой.

- [ ] **Шаг 4: практика и футер**

Практика — четыре колонки: дорога, заезд и выезд, что взять, что включено. Футер с
контактами и пометкой «Демонстрационный проект. Объект вымышленный».

- [ ] **Шаг 5: проверить в браузере**

Все секции на месте, ни одна фотография не растянута, текст нигде не наезжает на текст.

- [ ] **Шаг 6: коммит**

```bash
git add -A && git commit -m "Разметка секций и контент"
```

---

### Задача 6: Адаптив

**Файлы:**
- Изменить: `css/sections.css`, `css/calendar.css`, `css/base.css`

- [ ] **Шаг 1: метки времени**

До 900px маргиналия превращается в строку-разделитель на всю ширину: метка, затем
волосяная линия во всю оставшуюся ширину через `flex:1`.

- [ ] **Шаг 2: секция «Дом»**

До 900px фотография выходит в край: `margin-inline:calc(var(--pad-side) * -1)`,
характеристики под ней в две моно-колонки.

- [ ] **Шаг 3: практика**

До 900px — не сетка, а вертикальный список с волосяными разделителями между пунктами
и типографикой не мельче основного текста.

- [ ] **Шаг 4: sticky-бар**

До 900px после первого экрана снизу появляется полоса: «от 14 900 ₽» слева, «Выбрать даты»
справа. Скрывается, когда секция бронирования попадает в вид (через `IntersectionObserver`,
не по скроллу). Учесть `env(safe-area-inset-bottom)`.

- [ ] **Шаг 5: проверить на трёх ширинах**

Через `resize_window`: 375, 768, 1440. Проверить, что ни один блок не пропал, горизонтальной
прокрутки нет нигде, моно-метки везде 12px.

- [ ] **Шаг 6: коммит**

```bash
git add -A && git commit -m "Адаптив: своя раскладка для мобилки без потери блоков"
```

---

### Задача 7: Свет, движение, производительность

**Файлы:**
- Создать: `js/night.js`, `js/reveal.js`, `js/main.js`, `js/vendor/*`

- [ ] **Шаг 1: вендорить библиотеки**

Скачать GSAP 3.12.5, ScrollTrigger и Lenis 1.0.42 в `js/vendor/`. Не CDN.

- [ ] **Шаг 2: `js/night.js`**

Один rAF-обработчик. Геометрия секций кэшируется в объекте и пересчитывается только на
`load` и `resize`; в кадре — только запись. Прогресс страницы отображается в
`--night` от 0 до 1, и фон обёртки интерполируется между `--n1`, `--n0` (к секции 23:00)
и `--dawn` (к 06:10). Интерполируется только `background-color` одного элемента.

`resize` игнорирует схлопывание адресной строки iOS: если ширина не менялась и
|Δвысоты| < 160, не пересчитывать.

- [ ] **Шаг 3: параллакс первого экрана**

Только hero, только на не-тач. `scrub: 1.1`, никакого `will-change` вручную —
GSAP ставит его сам на время анимации.

- [ ] **Шаг 4: анимация света в окне**

При загрузке окно домика разгорается, луч ложится на землю. Реализовать как
SVG-оверлей поверх фотографии с анимацией `opacity` и `transform`, не как фильтр.

- [ ] **Шаг 5: `js/reveal.js` и режим `.lite`**

Появления через `IntersectionObserver`. Счётчик долгих кадров: на первых 55 кадрах
реальной прокрутки считать доли кадров дольше 40 мс; если больше 22% — повесить
`document.documentElement.classList.add("lite")`. Без сниффинга User-Agent.

- [ ] **Шаг 6: `js/main.js`**

Определение тач-устройства:
```js
const isTouch = matchMedia("(pointer:coarse)").matches
  || matchMedia("(hover:none)").matches
  || innerWidth <= 900;
```
Lenis и GSAP инициализируются только при `!isTouch && !prefersReducedMotion`.
Lenis — `{ lerp: 0.14 }`. Календарь и появления инициализируются всегда.

- [ ] **Шаг 7: проверить**

Тесты не сломались: `npm test` → `pass 9`.
Синтаксис модулей: `node --check js/night.js` и так для каждого файла в `js/`.
В браузере: фон к концу страницы светлее, чем в начале; при выключенном JS
контент всё равно виден.

- [ ] **Шаг 8: коммит**

```bash
git add -A && git commit -m "Механика света, появления, авто-облегчение"
```

---

### Задача 8: Проверка и деплой

- [ ] **Шаг 1: полная проверка**

```bash
npm test
for f in js/*.js; do node --check "$f" || echo "СИНТАКСИС: $f"; done
```
Ожидается: `pass 9`, ни одной строки «СИНТАКСИС».

Проверить глазами на 375, 768 и 1440. Убедиться, что ни один смысловой блок не скрыт:
```bash
grep -rn "display:\s*none" css/ | grep -v "\.lite\|::before\|::after\|\[hidden\]"
```
Каждое совпадение объяснить или убрать.

- [ ] **Шаг 2: создать репозиторий**

`gh` не установлен. Токен достаётся из Git Credential Manager, печатать его нельзя:
```bash
printf 'protocol=https\nhost=github.com\n\n' | git credential fill
```
Дальше `POST /user/repos` с телом **только из ASCII** — кириллица в JSON даёт HTTP 400.
Имя репозитория `Nochnik`.

- [ ] **Шаг 3: включить Pages**

`POST /repos/Likes32/Nochnik/pages` с телом `{"source":{"branch":"main","path":"/"}}`.
Сборка занимает около полуминуты, до этого адрес отдаёт 404.

- [ ] **Шаг 4: запушить и проверить живой адрес**

```bash
git push -u origin main
curl -s -o /dev/null -w "%{http_code}\n" https://likes32.github.io/Nochnik/
```
Ожидается: `200`. Отдельно проверить `css/tokens.css`, `js/main.js` и одну фотографию.

- [ ] **Шаг 5: коммит и передача**

Отдать ссылку владельцу для проверки на живом телефоне.

---

## Самопроверка плана

**Покрытие спеки.** Разделы 1–3 (цель, бренд, концепция) — задачи 1 и 5. Раздел 4
(структура секций) — задача 5. Раздел 5 (палитра) — задача 1. Раздел 6 (типографика) —
задача 1. Раздел 7 (механика света) — задача 7. Раздел 8 (адаптив) — задача 6.
Раздел 9 (календарь) — задачи 2 и 4. Раздел 9a (цифры) — задача 2, зашиты в `RATES`.
Раздел 10 (производительность) — задачи 6 и 7 плюс глобальные ограничения.
Раздел 11 (стек) — задача 1. Раздел 12 (деплой) — задача 8. Раздел 14 (источники
фото) — задача 3. Пропусков нет.

**Отступление от спеки.** Спека предписывала вшить шрифты в data-URI. В плане —
самохостинг woff2 с `font-display:swap` и preload. Причина: data-URI был нужен «Косе»
ради работы с `file://`, а здесь визуальная проверка идёт через локальный сервер.
Base64 раздувает файлы на треть и блокирует рендер одним куском.

**Согласованность имён.** `toKey`, `fromKey`, `isWeekendNight`, `nightlyRate`,
`nightKeys`, `isBlocked`, `rangeIsFree`, `quote` определены в задаче 2 и вызываются
в задаче 4 в том же написании. `initCalendar` объявлена в задаче 4 и вызывается в
задаче 7. Имена фотографий из задачи 3 совпадают с используемыми в задаче 5.
