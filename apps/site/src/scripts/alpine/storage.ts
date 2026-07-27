export function getStoredBoolean(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

export function setStoredBoolean(key: string, value: boolean): void {
  try {
    if (value) {
      window.localStorage.setItem(key, "true");
      return;
    }

    window.localStorage.removeItem(key);
  } catch {
    // Ignore private browsing or blocked storage. The form still works.
  }
}
