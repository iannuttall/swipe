import type { AlpineRuntime } from "./types";

type ProtectedEmailScope = {
  openEmail(event: MouseEvent): void;
};

// Kept out of the HTML and split into character codes so basic source and DOM
// harvesters never see a complete email address.
const addressCodes = [105, 97, 110, 64, 115, 119, 105, 112, 101, 46, 109, 100];

export function registerProtectedEmailLinks(Alpine: AlpineRuntime) {
  Alpine.data("protectedEmailLinks", () => ({
    openEmail(this: ProtectedEmailScope, event: MouseEvent) {
      const source = event.target;
      if (!(source instanceof Element)) return;

      const link = source.closest<HTMLAnchorElement>("[data-protected-email]");
      if (!link) return;

      event.preventDefault();
      const address = String.fromCharCode(...addressCodes);
      const subject = link.dataset.emailSubject?.trim();
      const query = subject ? `?subject=${encodeURIComponent(subject)}` : "";
      window.location.assign(`mailto:${address}${query}`);
    },
  }));
}
