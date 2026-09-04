/**
 * Механика ночи: фон страницы медленно меняется по мере прокрутки —
 * от вечера к самой тёмной точке у секции «Тишина» и дальше к рассвету.
 *
 * Правила, из-за которых всё написано именно так:
 *  — геометрия кэшируется и пересчитывается только на resize и load;
 *    в кадре идут только записи, ни одного чтения раскладки;
 *  — интерполируется background-color одного элемента, больше ничего;
 *  — кадр планируется событием прокрутки, а не крутится постоянно.
 */

/** Опорные цвета. Светлеем ощутимо, но остаёмся тёмными: текст кремовый. */
export const STOPS = [
  [0x0d, 0x13, 0x0f], // вечер, --n1
  [0x07, 0x0a, 0x08], // самая тёмная точка, --n0
  [0x1b, 0x27, 0x21], // рассвет, --n3
];

const lerp = (a, b, t) => a + (b - a) * t;

/** Цвет между тремя опорными по прогрессу 0…1, с изломом в тёмной точке. */
export function shade(p, darkAt) {
  const [from, to, t] =
    p <= darkAt
      ? [STOPS[0], STOPS[1], darkAt ? p / darkAt : 0]
      : [STOPS[1], STOPS[2], (p - darkAt) / (1 - darkAt || 1)];
  const c = from.map((v, i) => Math.round(lerp(v, to[i], t)));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

export function initNight({ parallax = false } = {}) {
  const shell = document.querySelector(".shell");
  const hero = document.querySelector("#hero");
  const heroImg = hero?.querySelector(".hero__media img");
  const quiet = document.querySelector("#quiet");
  const root = document.documentElement;
  if (!shell) return;

  /** Кэш раскладки. Всё, что требует чтения, живёт только здесь. */
  const geo = { max: 1, darkAt: 0.6, heroH: 1 };
  let lastW = window.innerWidth;
  let lastH = window.innerHeight;

  function measure() {
    geo.max = Math.max(1, root.scrollHeight - window.innerHeight);
    geo.heroH = hero ? hero.offsetHeight : window.innerHeight;
    if (quiet) {
      const top = quiet.offsetTop + quiet.offsetHeight / 2 - window.innerHeight / 2;
      geo.darkAt = Math.min(0.92, Math.max(0.08, top / geo.max));
    }
  }

  let ticking = false;
  function frame() {
    ticking = false;
    const y = window.scrollY;
    const p = Math.min(1, Math.max(0, y / geo.max));

    root.style.setProperty("--night", p.toFixed(4));
    shell.style.backgroundColor = shade(p, geo.darkAt);

    if (parallax && heroImg) {
      // Только первый экран: остальные кадры при прокрутке не двигаем,
      // иначе каждый из них пересобирается покадрово.
      const local = Math.min(1, y / geo.heroH);
      heroImg.style.transform = `translate3d(0, ${(local * 6).toFixed(2)}%, 0)`;
    }
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(frame);
    }
  }

  function onResize() {
    // Схлопывание адресной строки в iOS шлёт resize, хотя раскладка та же.
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (w === lastW && Math.abs(h - lastH) < 160) return;
    lastW = w;
    lastH = h;
    measure();
    onScroll();
  }

  measure();
  frame();
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onResize);
  addEventListener("load", () => { measure(); onScroll(); });
}
