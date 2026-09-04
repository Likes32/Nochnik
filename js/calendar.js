/**
 * Календарь бронирования. Вся арифметика — в booking-core.js, здесь только
 * отрисовка и взаимодействие. Даты везде строковые ключи "YYYY-MM-DD".
 */
import {
  RATES, BLOCKED, REASONS, toKey, fromKey, addDays,
  isBlocked, isWeekendNight, rangeIsFree, quote, nightKeys,
} from "./booking-core.js";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

const money = new Intl.NumberFormat("ru-RU");
const dayMonth = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" });
const rub = (n) => `${money.format(n)} ₽`;

/** Склонение: 1 ночь, 2 ночи, 5 ночей. */
function nights(n) {
  const t = n % 100 > 10 && n % 100 < 20 ? 0 : n % 10;
  return `${n} ${t === 1 ? "ночь" : t >= 2 && t <= 4 ? "ночи" : "ночей"}`;
}

export function initCalendar(root) {
  const monthsBox = root.querySelector("[data-cal-months]");
  const title = root.querySelector("[data-cal-title]");
  const hint = root.querySelector("[data-cal-hint]");
  const quoteBox = root.querySelector("[data-cal-quote]");
  const saunaInput = root.querySelector("[data-cal-sauna]");
  const form = root.querySelector("[data-cal-form]");
  if (!monthsBox) return;

  const today = toKey(new Date());
  const state = {
    checkIn: null,
    checkOut: null,
    hover: null,
    focus: today,
    cursor: new Date(fromKey(today).getFullYear(), fromKey(today).getMonth(), 1),
    sauna: false,
  };

  /** Понедельник = 0. */
  const weekIndex = (date) => (date.getDay() + 6) % 7;

  const inSelection = (key) => {
    const { checkIn, checkOut, hover } = state;
    if (!checkIn) return false;
    const end = checkOut || (hover && hover > checkIn ? hover : null);
    if (!end) return key === checkIn;
    return key >= checkIn && key <= end;
  };

  function buildMonth(year, month) {
    const wrap = document.createElement("div");
    wrap.className = "cal__month";

    const cap = document.createElement("p");
    cap.className = "cal__caption mono";
    cap.textContent = `${MONTHS[month]} ${year}`;
    wrap.append(cap);

    const head = document.createElement("div");
    head.className = "cal__week";
    head.setAttribute("aria-hidden", "true");
    for (const d of WEEKDAYS) {
      const s = document.createElement("span");
      s.textContent = d;
      head.append(s);
    }
    wrap.append(head);

    const grid = document.createElement("div");
    grid.className = "cal__grid";
    grid.setAttribute("role", "grid");
    grid.setAttribute("aria-label", `${MONTHS[month]} ${year}`);

    const first = new Date(year, month, 1);
    const total = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < weekIndex(first); i++) {
      const pad = document.createElement("span");
      pad.className = "cal__pad";
      pad.setAttribute("aria-hidden", "true");
      grid.append(pad);
    }

    for (let day = 1; day <= total; day++) {
      const key = toKey(new Date(year, month, day));
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cal__day";
      btn.dataset.key = key;
      btn.textContent = String(day);
      btn.setAttribute("role", "gridcell");

      const past = key < today;
      const busy = isBlocked(key, BLOCKED);
      if (past || busy) {
        btn.disabled = true;
        btn.classList.add(busy ? "is-busy" : "is-past");
        btn.setAttribute("aria-disabled", "true");
        if (busy) btn.setAttribute("aria-label", `${day} ${MONTHS[month]} — занято`);
      }
      if (isWeekendNight(key)) btn.classList.add("is-weekend");
      btn.tabIndex = key === state.focus ? 0 : -1;
      grid.append(btn);
    }

    wrap.append(grid);
    return wrap;
  }

  function paint() {
    const { checkIn, checkOut } = state;
    for (const btn of monthsBox.querySelectorAll(".cal__day")) {
      const key = btn.dataset.key;
      btn.classList.toggle("is-in", key === checkIn);
      btn.classList.toggle("is-out", key === checkOut);
      btn.classList.toggle("is-range", inSelection(key) && key !== checkIn && key !== checkOut);
      btn.setAttribute("aria-selected", String(key === checkIn || key === checkOut));
      btn.tabIndex = key === state.focus ? 0 : -1;
    }
  }

  /**
   * Выбранные ночи загораются по очереди слева направо — как лампы вдоль
   * ряда. Один раз на выбор, не фоном: постоянная анимация в интерфейсе
   * бронирования только мешает считать деньги.
   */
  function lightUp() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (document.documentElement.classList.contains("lite")) return;

    const chosen = [...monthsBox.querySelectorAll(".cal__day.is-in, .cal__day.is-range, .cal__day.is-out")];
    chosen.forEach((el, i) => {
      el.style.setProperty("--i", i);
      el.classList.remove("is-lighting");
      void el.offsetWidth;            // перезапуск анимации
      el.classList.add("is-lighting");
    });
  }

  function render() {
    const y = state.cursor.getFullYear();
    const m = state.cursor.getMonth();
    monthsBox.replaceChildren(buildMonth(y, m), buildMonth(y, m + 1));
    title.textContent = `${MONTHS[m]} — ${MONTHS[(m + 1) % 12]}`;
    paint();
  }

  function showQuote() {
    const { checkIn, checkOut } = state;
    if (!checkIn || !checkOut) {
      quoteBox.innerHTML = `<p class="bk__empty">Выберите даты заезда и выезда — посчитаю стоимость.</p>`;
      return;
    }
    const q = quote(checkIn, checkOut, { sauna: state.sauna });
    if (!q.ok) {
      quoteBox.innerHTML = `<p class="bk__empty bk__empty--warn">${REASONS[q.reason]}</p>`;
      return;
    }
    const list = nightKeys(checkIn, checkOut);
    const weekend = list.filter((k) => [5, 6].includes(fromKey(k).getDay())).length;
    const weekday = q.nights - weekend;

    const rows = [
      weekday && [`${nights(weekday)} в будни`, weekday * RATES.weekday],
      weekend && [`${nights(weekend)} в выходные`, weekend * RATES.weekend],
      ["Уборка", q.cleaning],
      state.sauna && ["Баня", q.sauna],
    ].filter(Boolean);

    quoteBox.innerHTML = `
      <dl class="bk__rows">
        ${rows.map(([label, sum]) => `
          <div class="bk__row"><dt>${label}</dt><dd class="num">${rub(sum)}</dd></div>
        `).join("")}
      </dl>
      <p class="bk__total"><span>Итого</span> <span class="num">${rub(q.total)}</span></p>
      <p class="bk__meta mono">заезд с 15:00 · выезд до 12:00</p>`;
  }

  const human = (key) => dayMonth.format(fromKey(key));

  function announce() {
    const { checkIn, checkOut } = state;
    if (!checkIn) {
      hint.textContent = "Выберите первую ночь — можно и одну.";
      return;
    }
    if (!checkOut) {
      hint.textContent = `Заезд ${human(checkIn)}. Теперь выберите день выезда.`;
      return;
    }
    hint.textContent = `С ${human(checkIn)} по ${human(checkOut)} — ${nights(nightKeys(checkIn, checkOut).length)}.`;
  }

  function pick(key) {
    const { checkIn, checkOut } = state;

    // Начинаем заново, если диапазон уже полный или клик раньше заезда.
    if (!checkIn || checkOut || key <= checkIn) {
      state.checkIn = key;
      state.checkOut = null;
    } else if (!rangeIsFree(checkIn, key, BLOCKED)) {
      hint.textContent = "В этом промежутке есть занятые ночи — выберите другой.";
      state.checkIn = key;
      state.checkOut = null;
      paint();
      showQuote();
      return;
    } else if (nightKeys(checkIn, key).length < RATES.minNights) {
      hint.textContent = REASONS["min-nights"];
      paint();
      return;
    } else {
      state.checkOut = key;
    }
    state.hover = null;
    paint();
    if (state.checkIn && state.checkOut) lightUp();
    showQuote();
    announce();
  }

  monthsBox.addEventListener("click", (e) => {
    const btn = e.target.closest(".cal__day");
    if (btn && !btn.disabled) pick(btn.dataset.key);
  });

  monthsBox.addEventListener("pointerover", (e) => {
    const btn = e.target.closest(".cal__day");
    if (!btn || btn.disabled || !state.checkIn || state.checkOut) return;
    state.hover = btn.dataset.key;
    paint();
  });
  monthsBox.addEventListener("pointerleave", () => {
    if (state.hover) { state.hover = null; paint(); }
  });

  monthsBox.addEventListener("keydown", (e) => {
    const btn = e.target.closest(".cal__day");
    if (!btn) return;
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    let next = null;

    if (step) next = addDays(btn.dataset.key, step);
    else if (e.key === "Home") next = addDays(btn.dataset.key, -((fromKey(btn.dataset.key).getDay() + 6) % 7));
    else if (e.key === "End") next = addDays(btn.dataset.key, 6 - ((fromKey(btn.dataset.key).getDay() + 6) % 7));
    else if (e.key === "PageUp") next = addDays(btn.dataset.key, -28);
    else if (e.key === "PageDown") next = addDays(btn.dataset.key, 28);
    else return;

    e.preventDefault();
    state.focus = next;

    // Ушли за пределы показанных месяцев — перелистываем.
    if (!monthsBox.querySelector(`[data-key="${next}"]`)) {
      const d = fromKey(next);
      state.cursor = new Date(d.getFullYear(), d.getMonth(), 1);
      render();
    } else {
      paint();
    }
    monthsBox.querySelector(`[data-key="${next}"]`)?.focus();
  });

  root.querySelector("[data-cal-prev]")?.addEventListener("click", () => {
    state.cursor.setMonth(state.cursor.getMonth() - 1);
    render();
  });
  root.querySelector("[data-cal-next]")?.addEventListener("click", () => {
    state.cursor.setMonth(state.cursor.getMonth() + 1);
    render();
  });

  saunaInput?.addEventListener("change", () => {
    state.sauna = saunaInput.checked;
    showQuote();
  });

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const done = document.createElement("p");
    done.className = "bk__done";
    done.setAttribute("role", "status");
    done.textContent = "Заявка принята. Перезвоним в течение часа.";
    form.replaceWith(done);
  });

  render();
  showQuote();
  announce();
}
