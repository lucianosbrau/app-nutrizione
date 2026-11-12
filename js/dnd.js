export function enableDrag({ cards, slots, pool, onDrop, onTap }) {
  let ghost = null;
  let activeCard = null;
  let hoverSlot = null;
  let startX = 0;
  let startY = 0;
  let moved = false;
  const THRESHOLD = 10;

  function findSlot(x, y) {
    const el = document.elementFromPoint(x, y);
    return el ? el.closest(".day") : null;
  }

  function setHighlight(slot) {
    if (hoverSlot) hoverSlot.classList.remove("slot-highlight");
    hoverSlot = slot;
    if (hoverSlot) hoverSlot.classList.add("slot-highlight");
  }

  function cleanup() {
    if (ghost) ghost.remove();
    ghost = null;
    setHighlight(null);
    if (activeCard) activeCard.classList.remove("dragging");
    activeCard = null;
    moved = false;
  }

  cards.forEach((card) => {
    card.addEventListener("pointerdown", (e) => {
      if (e.button && e.button !== 0) return;
      activeCard = card;
      startX = e.clientX;
      startY = e.clientY;
      moved = false;
      card.setPointerCapture(e.pointerId);
    });

    card.addEventListener("pointermove", (e) => {
      if (!activeCard) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!moved && Math.hypot(dx, dy) < THRESHOLD) return;
      if (!moved) {
        moved = true;
        ghost = card.cloneNode(true);
        ghost.classList.add("ghost");
        document.body.appendChild(ghost);
        card.classList.add("dragging");
      }
      if (ghost) {
        ghost.style.left = `${e.clientX - 60}px`;
        ghost.style.top = `${e.clientY - 30}px`;
        setHighlight(findSlot(e.clientX, e.clientY));
      }
    });

    card.addEventListener("pointerup", (e) => {
      if (!activeCard) return;
      const pairId = activeCard.dataset.pairId;
      const wasDrag = moved;
      const slot = wasDrag ? findSlot(e.clientX, e.clientY) : null;
      cleanup();
      if (!wasDrag) {
        if (onTap) onTap(pairId);
        return;
      }
      const inPool = pool && pool.contains(slot);
      if (slot && !inPool) onDrop(pairId, +slot.dataset.slot);
      else onDrop(pairId, null);
    });

    card.addEventListener("pointercancel", cleanup);
  });
}
