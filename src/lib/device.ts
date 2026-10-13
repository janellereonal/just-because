/**
 * A random id for this browser, kept in localStorage. Friends don't have
 * accounts, so this is how we count "different people" for plan caps.
 * It identifies nothing about the person and is never shown anywhere.
 */
const KEY = "jb:device";
let memory: string | null = null;

export function getDeviceId(): string {
  if (memory) return memory;
  try {
    const saved = window.localStorage.getItem(KEY);
    if (saved && /^[0-9a-f-]{36}$/i.test(saved)) return (memory = saved);
    const fresh = crypto.randomUUID();
    window.localStorage.setItem(KEY, fresh);
    return (memory = fresh);
  } catch {
    // Private browsing: one id for this visit, so the count falls back to roughly per visit.
    return (memory = crypto.randomUUID());
  }
}
