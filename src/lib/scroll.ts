/**
 * Scroll `el` to the middle of its nearest scrolling box (or `box` if given), and nothing else.
 * Plain scrollIntoView also scrolls every overflow:hidden ancestor, which shifts phone previews
 * and whole pages sideways.
 */
export function centerInScroller(el: Element, box?: HTMLElement | null, behavior: ScrollBehavior = "smooth") {
  let host: HTMLElement | null = box ?? null;
  if (!host) {
    let node = el.parentElement;
    while (node && node !== document.body) {
      const oy = getComputedStyle(node).overflowY;
      if ((oy === "auto" || oy === "scroll") && node.scrollHeight > node.clientHeight) {
        host = node;
        break;
      }
      node = node.parentElement;
    }
  }
  const a = el.getBoundingClientRect();
  if (!host) {
    window.scrollTo({ top: window.scrollY + a.top - window.innerHeight / 2 + a.height / 2, behavior });
    return;
  }
  const b = host.getBoundingClientRect();
  host.scrollTo({ top: host.scrollTop + a.top - b.top - host.clientHeight / 2 + a.height / 2, behavior });
}
