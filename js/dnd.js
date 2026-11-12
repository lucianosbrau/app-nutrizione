export function enableDrag({ cards, slots, pool, onDrop }) {
  let ghost = null;
  let activeCard = null;
  let hoverSlot = null;

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
  }

  cards.forEach((card) => {
    card.addEventListener("pointerdown", (e) => {
      if (e.button && e.button !== 0) return;
      activeCard = card;
      card.setPointerCapture(e.pointerId);
      ghost = card.cloneNode(true);
      ghost.classList.add("ghost");
      ghost.style.left = `${e.clientX - 60}px`;
      ghost.style.top = `${e.clientY - 30}px`;
      document.body.appendChild(ghost);
      card.classList.add("dragging");
    });

    card.addEventListener("pointermove", (e) => {
      if (!ghost) return;
      ghost.style.left = `${e.clientX - 60}px`;
      ghost.style.top = `${e.clientY - 30}px`;
      setHighlight(findSlot(e.clientX, e.clientY));
    });

    card.addEventListener("pointerup", (e) => {
      if (!activeCard) return;
      const slot = findSlot(e.clientX, e.clientY);
      const slotIndex = slot ? +slot.dataset.slot : null;
      const inPool = pool.contains(slot);
      const pairId = activeCard.dataset.pairId;
      cleanup();
      if (slot && !inPool) onDrop(pairId, slotIndex);
      else if (!slot || inPool) onDrop(pairId, null);
    });

    card.addEventListener("pointercancel", cleanup);
  });
}
