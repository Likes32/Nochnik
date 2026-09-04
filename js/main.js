/** Точка входа. Тяжёлое подключаем только там, где оно уместно. */
import { initFloorplan } from "./floorplan.js";
import { initCalendar } from "./calendar.js";

/** Тач-устройство: Lenis и GSAP на нём не запускаем — родная инерция плавнее. */
export const isTouch =
  matchMedia("(pointer:coarse)").matches ||
  matchMedia("(hover:none)").matches ||
  window.innerWidth <= 900;

export const prefersReduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

const plan = document.querySelector("#plan");
if (plan) initFloorplan(plan);

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
