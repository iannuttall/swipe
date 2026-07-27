import { newsletterSubscribedKey } from "@/lib/newsletter";
import { getStoredBoolean, setStoredBoolean } from "./storage";
import type { AlpineRuntime } from "./types";

type NewsletterConfig = {
  source?: string;
};

type NewsletterStatus = "idle" | "loading" | "success" | "error";

function hasSubscribed() {
  return getStoredBoolean(newsletterSubscribedKey);
}

export function registerNewsletter(Alpine: AlpineRuntime) {
  /**
   * Wraps a block that exists only to sell the newsletter, so the whole thing
   * can come out once this browser has subscribed.
   */
  Alpine.data("newsletterShell", () => ({
    subscribed: false,

    init() {
      this.subscribed = hasSubscribed();
    },
  }));

  Alpine.data("newsletterSignup", (config: NewsletterConfig = {}) => ({
    email: "",
    status: "idle" as NewsletterStatus,
    message: "",
    // Hidden outright for a browser that already subscribed. Kept separate from
    // `status` so a fresh success still shows its confirmation before the form
    // disappears on the next visit.
    visible: true,

    init() {
      this.visible = !hasSubscribed();
    },

    get ready() {
      const email = String(this.email).trim();
      return email.length > 3 && email.includes("@");
    },

    async submit() {
      if (this.status === "loading" || !this.ready) return;

      this.status = "loading";
      this.message = "";

      try {
        const response = await fetch("/api/subscribe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            email: String(this.email).trim(),
            source: config.source ?? "swipe.md",
          }),
        });
        const result = (await response.json().catch(() => ({}))) as {
          error?: string;
        };

        if (!response.ok) {
          this.status = "error";
          this.message =
            result.error ?? "Could not subscribe right now. Try again.";
          return;
        }

        this.status = "success";
        this.email = "";
        setStoredBoolean(newsletterSubscribedKey, true);
      } catch {
        this.status = "error";
        this.message = "Could not subscribe right now. Try again.";
      }
    },
  }));
}
