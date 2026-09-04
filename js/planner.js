/**
 * Планы открываются поверх страницы. Нативный <dialog> взят намеренно:
 * он сам ловит фокус внутри, закрывается по Esc и возвращает фокус
 * на кнопку — руками это пишется втрое длиннее и хуже.
 */

export function initPlanner(dialog) {
  if (!dialog) return;

  const openers = document.querySelectorAll("[data-plans-open]");
  const closer = dialog.querySelector("[data-plans-close]");
  const tabs = [...dialog.querySelectorAll('[role="tab"]')];
  const panels = tabs.map((t) => dialog.querySelector("#" + t.getAttribute("aria-controls")));

  /* Старым браузерам без showModal оставляем обычный блок на странице. */
  const modal = typeof dialog.showModal === "function";

  function select(i) {
    tabs.forEach((t, k) => {
      const on = k === i;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      panels[k].hidden = !on;
    });
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => select(i));
    tab.addEventListener("keydown", (e) => {
      const step = { ArrowLeft: -1, ArrowRight: 1, Home: -i, End: tabs.length - 1 - i }[e.key];
      if (step === undefined) return;
      e.preventDefault();
      const next = (i + step + tabs.length) % tabs.length;
      select(next);
      tabs[next].focus();
    });
  });

  function open() {
    if (modal) dialog.showModal();
    else dialog.setAttribute("open", "");
    // Страница под диалогом не должна ехать вместе с ним.
    document.documentElement.style.overflow = "hidden";
    select(0);
    tabs[0]?.focus();
  }

  function close() {
    if (modal) dialog.close();
    else dialog.removeAttribute("open");
    document.documentElement.style.overflow = "";
  }

  openers.forEach((b) => b.addEventListener("click", open));
  closer?.addEventListener("click", close);
  dialog.addEventListener("close", () => { document.documentElement.style.overflow = ""; });

  /* Клик по подложке вокруг содержимого тоже закрывает. */
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) close();
  });
}
