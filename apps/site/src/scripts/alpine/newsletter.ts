import type { AlpineRuntime } from "./types";
import { burstConfetti } from "./confetti";

type NewsletterConfig = {
  source?: string;
};

type NewsletterStatus = "idle" | "loading" | "success" | "error";

export function registerNewsletter(Alpine: AlpineRuntime) {
  Alpine.data("newsletterSignup", (config: NewsletterConfig = {}) => ({
    email: "",
    status: "idle" as NewsletterStatus,
    message: "",

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
        burstConfetti();
      } catch {
        this.status = "error";
        this.message = "Could not subscribe right now. Try again.";
      }
    },
  }));
}
