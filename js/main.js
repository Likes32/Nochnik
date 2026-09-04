/** Точка входа. Тяжёлое подключаем только там, где оно уместно. */
import { initFloorplan } from "./floorplan.js";
import { initCalendar } from "./calendar.js";
import { initNight } from "./night.js";
import { initPlanner } from "./planner.js";
import { initReveal, initPerfGuard } from "./reveal.js";

/** Тач-устройство: Lenis и GSAP на нём не запускаем — родная инерция плавнее. */
export const isTouch =
  matchMedia("(pointer:coarse)").matches ||
  matchMedia("(hover:none)").matches ||
  window.innerWidth <= 900;

export const prefersReduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

const planner = document.querySelector("#planner");
if (planner) { initFloorplan(planner); initPlanner(planner); }

const booking = document.querySelector("#booking");
if (booking) initCalendar(booking);

/* Навигация: плотная плашка после прокрутки. */
const nav = document.querySelector("#nav");
if (nav) {
  let scrolled = false;
  const onScroll = () => {
    const next = window.scrollY > 60;
    if (next !== scrolled) {
      scrolled = next;
      nav.classList.toggle("scrolled", next);
    }
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const burger = nav.querySelector(".nav__burger");
  burger?.addEventListener("click", () => {
    const open = nav.classList.toggle("menu-open");
    burger.setAttribute("aria-expanded", String(open));
    document.body.style.overflow = open ? "hidden" : "";
  });
  nav.querySelectorAll(".nav__menu a").forEach((a) =>
    a.addEventListener("click", () => {
      nav.classList.remove("menu-open");
      burger?.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    })
  );
}

/* Липкая панель с ценой. Появляется, когда первый экран ушёл, и
   прячется у формы бронирования — там своя кнопка, дублировать незачем.
   Оба состояния через IntersectionObserver, а не через обработчик
   прокрутки: наблюдатель не будит поток на каждый кадр. */
const sticky = document.querySelector("[data-sticky]");
if (sticky && isTouch) {
  sticky.hidden = false;
  const hero = document.querySelector("#hero");
  const booking = document.querySelector("#booking");
  let heroGone = false;
  let atForm = false;

  const apply = () => sticky.classList.toggle("is-in", heroGone && !atForm);

  if (hero) {
    new IntersectionObserver(
      ([e]) => { heroGone = !e.isIntersecting; apply(); },
      { rootMargin: "-40% 0px 0px 0px" }
    ).observe(hero);
  }
  if (booking) {
    new IntersectionObserver(
      ([e]) => { atForm = e.isIntersecting; apply(); },
      { rootMargin: "0px 0px -35% 0px" }
    ).observe(booking);
  }
}

/* Зажигание первого экрана после загрузки кадра. Ждём именно картинку,
   а не DOMContentLoaded: иначе вуаль снимется с ещё пустого места. */
const heroEl = document.querySelector("#hero");
if (heroEl) {
  const img = heroEl.querySelector(".hero__media img");
  const light = () => heroEl.classList.add("is-lit");
  // rAF нужен только чтобы браузер успел отрисовать исходное состояние,
  // иначе переход не проиграется. В страховке его быть не должно:
  // там, где rAF не работает, страховка обязана сработать без него.
  const lightNextFrame = () => requestAnimationFrame(light);

  if (!img || img.complete) lightNextFrame();
  else {
    img.addEventListener("load", lightNextFrame, { once: true });
    img.addEventListener("error", light, { once: true });
  }
  setTimeout(light, 2000);
}

/* Появления и страховка по производительности — везде. */
initReveal();
initPerfGuard();

/* Механика ночи. Параллакс первого экрана только там, где он уместен:
   на тач-устройствах полноэкранный кадр, двигающийся покадрово, —
   первая причина рывков. */
initNight({ parallax: !isTouch && !prefersReduced });

/* Плавная прокрутка только на десктопе: на телефоне родная инерция
   плавнее любой эмуляции, а перехват тача — главный источник рывков.
   lerp, а не duration: сглаживание не зависит от частоты кадров
   и не тянет страницу ещё полторы секунды после отпускания колеса. */
if (!isTouch && !prefersReduced) {
  const s = document.createElement("script");
  s.src = "js/vendor/lenis.min.js";
  s.onload = () => {
    if (!window.Lenis) return;
    const lenis = new window.Lenis({ lerp: 0.14 });
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  };
  document.head.append(s);
}
