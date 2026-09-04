import test from "node:test";
import assert from "node:assert/strict";
import { shade, STOPS } from "../js/night.js";

const rgb = ([r, g, b]) => `rgb(${r},${g},${b})`;

test("в начале страницы — вечерний фон", () => {
  assert.equal(shade(0, 0.6), rgb(STOPS[0]));
});

test("в тёмной точке — самый тёмный фон", () => {
  assert.equal(shade(0.6, 0.6), rgb(STOPS[1]));
});

test("в конце страницы — рассветный фон", () => {
  assert.equal(shade(1, 0.6), rgb(STOPS[2]));
});

test("до тёмной точки фон темнеет, после — светлеет", () => {
  const яркость = (s) =>
    s.match(/\d+/g).reduce((a, v) => a + Number(v), 0);

  assert.ok(яркость(shade(0.3, 0.6)) < яркость(shade(0, 0.6)),
    "к середине должно стать темнее");
  assert.ok(яркость(shade(0.8, 0.6)) > яркость(shade(0.6, 0.6)),
    "после тёмной точки должно светлеть");
});

test("рассвет остаётся тёмным — иначе кремовый текст перестанет читаться", () => {
  const [r, g, b] = STOPS[2];
  // Относительная яркость по WCAG у фона должна оставаться очень низкой.
  const lin = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const контраст = (1.0 + 0.05) / (L + 0.05); // против почти белого текста
  assert.ok(контраст > 12, `контраст с кремовым текстом ${контраст.toFixed(1)} — мало`);
});

test("крайние значения прогресса не ломают расчёт", () => {
  for (const p of [-0.5, 0, 0.5, 1, 1.5]) {
    for (const d of [0, 0.5, 1]) {
      const s = shade(p, d);
      assert.match(s, /^rgb\(\d+,\d+,\d+\)$/, `сломалось на p=${p} d=${d}`);
      for (const v of s.match(/\d+/g)) {
        assert.ok(Number(v) >= 0 && Number(v) <= 255, `канал вне диапазона: ${s}`);
      }
    }
  }
});
