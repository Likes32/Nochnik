/**
 * Появления блоков и аварийное облегчение.
 *
 * Появления — на IntersectionObserver, без покадрового кода.
 * Облегчение нужно для встроенных браузеров Telegram и Instagram:
 * они заметно слабее полноценных, и разметкой это не лечится.
 * Поэтому меряем реальные кадры и, если не укладываемся, снимаем
 * всё необязательное. UA не нюхаем — работает для любого слабого окружения.
 */

const TARGETS = [
  ".section__head",
  ".house__grid",
  ".plan__site",
  ".plan__level",
  ".plan__note",
  ".scene__media",
  ".scene__body",
  ".quiet__body",
  ".practice__list li",
  ".bk",
];

export function initReveal() {
  const nodes = document.querySelectorAll(TARGETS.join(","));
  nodes.forEach((n) => n.classList.add("reveal"));

  if (!("IntersectionObserver" in window)) {
    nodes.forEach((n) => n.classList.add("is-in"));
    return;
  }

  /* Страховка: если наблюдатель почему-то не отработал — старый браузер,
     вкладка без композита, отключённый API — контент обязан появиться
     сам. Невидимый навсегда блок хуже, чем блок без анимации. */
  const failsafe = setTimeout(() => {
    nodes.forEach((n) => n.classList.add("is-in"));
  }, 2500);

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        clearTimeout(failsafe);
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      }
    },
    { rootMargin: "0px 0px -12% 0px", threshold: 0.05 }
  );
  nodes.forEach((n) => io.observe(n));
}

/**
 * Считает долгие кадры на первых 55 кадрах реальной прокрутки.
 * Больше 22% долгих — вешаем `lite`, который снимает появления,
 * тени, фильтры и переходы. Контент при этом остаётся полным.
 */
export function initPerfGuard({ budget = 40, frames = 55, share = 0.22 } = {}) {
  const root = document.documentElement;
  let seen = 0;
  let slow = 0;
  let last = 0;
  let scheduled = false;

  function sample(now) {
    scheduled = false;
    if (last) {
      seen++;
      if (now - last > budget) slow++;
      if (seen >= frames) {
        stop();
        if (slow / seen > share) root.classList.add("lite");
        return;
      }
    }
    last = now;
  }

  function onScroll() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(sample);
  }

  function stop() {
    removeEventListener("scroll", onScroll);
  }

  addEventListener("scroll", onScroll, { passive: true });
}
