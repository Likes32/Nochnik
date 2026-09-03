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
  assert.equal(rangeIsFree("2026-09-10", "2026-09-13", ["2026-09-11"]), false);
});

test("дата выезда может совпадать с занятой — в эту ночь мы уже не ночуем", () => {
  assert.equal(rangeIsFree("2026-09-10", "2026-09-13", ["2026-09-13"]), true);
});

test("isBlocked работает по переданному списку", () => {
  assert.equal(isBlocked("2026-09-11", ["2026-09-11"]), true);
  assert.equal(isBlocked("2026-09-10", ["2026-09-11"]), false);
});

test("минимум две ночи", () => {
  const q = quote("2026-09-10", "2026-09-11", { blocked: [] });
  assert.equal(q.ok, false);
  assert.equal(q.reason, "min-nights");
});

test("выезд раньше заезда отбивается", () => {
  assert.equal(quote("2026-09-13", "2026-09-10", { blocked: [] }).reason, "order");
});

test("заезд и выезд в один день отбивается", () => {
  assert.equal(quote("2026-09-10", "2026-09-10", { blocked: [] }).reason, "order");
});

test("расчёт смешивает будни и выходные", () => {
  // ночи: чт 10 (будни), пт 11 (вых), сб 12 (вых)
  const q = quote("2026-09-10", "2026-09-13", { sauna: false, blocked: [] });
  assert.equal(q.ok, true);
  assert.equal(q.nights, 3);
  assert.equal(q.accommodation, 14900 + 18900 + 18900);
  assert.equal(q.cleaning, RATES.cleaning);
  assert.equal(q.sauna, 0);
  assert.equal(q.total, 14900 + 18900 + 18900 + 2500);
});

test("баня добавляется один раз, а не за ночь", () => {
  const q = quote("2026-09-10", "2026-09-13", { sauna: true, blocked: [] });
  assert.equal(q.sauna, RATES.sauna);
  assert.equal(q.total, 14900 + 18900 + 18900 + 2500 + 3500);
});

test("занятый диапазон не считается", () => {
  const q = quote("2026-09-10", "2026-09-13", { blocked: ["2026-09-11"] });
  assert.equal(q.ok, false);
  assert.equal(q.reason, "blocked");
});
