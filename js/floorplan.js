/** План дома: подсветка помещения и подпись при наведении, касании или фокусе. */

export function initFloorplan(root) {
  const note = root.querySelector("[data-floorplan-note]");
  if (!note) return;

  const zones = root.querySelectorAll("[data-note]");
  if (!zones.length) return;

  const base = note.textContent.trim();

  const show = (el) => {
    zones.forEach((z) => z.classList.toggle("is-active", z === el));
    note.textContent = el.dataset.note;
  };

  const clear = () => {
    zones.forEach((z) => z.classList.remove("is-active"));
    note.textContent = base;
  };

  zones.forEach((zone) => {
    zone.addEventListener("pointerenter", () => show(zone));
    zone.addEventListener("focus", () => show(zone));
    zone.addEventListener("blur", clear);
    zone.addEventListener("click", () => show(zone));
    zone.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        show(zone);
      }
    });
  });

  // Уводим подсветку, только когда указатель покинул схему целиком,
  // иначе она мигает при переходе между соседними помещениями.
  root.addEventListener("pointerleave", clear);
}
