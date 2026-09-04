/**
 * Логика бронирования. Чистые функции, никакого DOM — поэтому покрыта тестами.
 *
 * Даты везде — строковые ключи "YYYY-MM-DD", а не объекты Date.
 * Это снимает целый класс ошибок с часовыми поясами: new Date("2026-09-12")
 * парсится как UTC-полночь и в отрицательных смещениях уезжает на день назад.
 */

export const RATES = {
  weekday: 14900,   // вс–чт
  weekend: 18900,   // ночь с пятницы и с субботы
  cleaning: 2500,   // разово за заезд
  sauna: 3500,      // разово, по запросу
  minNights: 1,   // можно и на одну ночь
};

/** Занятые ночи. Выдуманы, но правдоподобны: выходные заняты плотнее будней. */
export const BLOCKED = [
  "2026-09-11", "2026-09-12", "2026-09-18", "2026-09-19", "2026-09-20",
  "2026-09-25", "2026-09-26", "2026-10-02", "2026-10-03", "2026-10-09",
  "2026-10-10", "2026-10-16", "2026-10-17", "2026-10-23", "2026-10-24",
  "2026-10-30", "2026-10-31", "2026-11-06", "2026-11-07", "2026-11-13",
  "2026-11-14", "2026-11-20", "2026-11-21", "2026-12-04", "2026-12-05",
];

const pad = (n) => String(n).padStart(2, "0");

/** Date → "YYYY-MM-DD" по локальному календарю. */
export function toKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "YYYY-MM-DD" → Date в локальной полуночи. Не через new Date(string). */
export function fromKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Ночь дорогая, если начинается в пятницу или субботу. */
export function isWeekendNight(key) {
  const day = fromKey(key).getDay(); // 0 вс … 6 сб
  return day === 5 || day === 6;
}

export function nightlyRate(key) {
  return isWeekendNight(key) ? RATES.weekend : RATES.weekday;
}

/** Ночи между заездом и выездом. Дата выезда не включается — в эту ночь уже не спим. */
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

/** Сдвиг ключа на n дней. Нужен календарю для навигации с клавиатуры. */
export function addDays(key, n) {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

/**
 * Расчёт стоимости.
 * @returns {{ok:true, nights:number, accommodation:number, cleaning:number,
 *             sauna:number, total:number}}
 *        | {{ok:false, reason:"order"|"min-nights"|"blocked"}}
 */
export function quote(inKey, outKey, opts = {}) {
  const blocked = opts.blocked ?? BLOCKED;
  const nights = nightKeys(inKey, outKey);

  if (nights.length === 0) return { ok: false, reason: "order" };
  if (nights.length < RATES.minNights) return { ok: false, reason: "min-nights" };
  if (!rangeIsFree(inKey, outKey, blocked)) return { ok: false, reason: "blocked" };

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

/** Причина отказа человеческим языком — используется календарём. */
export const REASONS = {
  order: "Выезд должен быть позже заезда",
  "min-nights": "Выезд должен быть хотя бы на следующий день",
  blocked: "В эти даты домик занят",
};
