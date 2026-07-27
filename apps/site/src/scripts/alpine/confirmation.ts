import type { AlpineRuntime } from "./types";

type ConfirmationConfig = {
  token: string;
  siteKey: string;
};

type ConfirmationComponent = {
  status: string;
  message: string;
  $refs: { turnstile: HTMLElement };
  init: () => Promise<void>;
  confirm: (turnstileToken: string) => Promise<void>;
  failed: () => void;
};

type TurnstileApi = {
  render: (
    target: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      appearance: "interaction-only";
      callback: (token: string) => void;
      "error-callback": () => void;
      "expired-callback": () => void;
    },
  ) => string;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export function registerConfirmation(Alpine: AlpineRuntime) {
  Alpine.data(
    "subscriptionConfirmation",
    (config: ConfirmationConfig) => ({
      status: "checking",
      message: "Checking this confirmation link...",

      async init(this: ConfirmationComponent) {
        const turnstile = await waitForTurnstile();
        const target = this.$refs.turnstile;
        if (!turnstile || !target) {
          this.status = "error";
          this.message = "Could not verify this request. Reload and try again.";
          return;
        }
        turnstile.render(target, {
          sitekey: config.siteKey,
          action: "confirm_subscription",
          appearance: "interaction-only",
          callback: (token) => this.confirm(token),
          "error-callback": () => this.failed(),
          "expired-callback": () => this.failed(),
        });
      },

      async confirm(this: ConfirmationComponent, turnstileToken: string) {
        if (this.status === "submitting" || this.status === "success") return;
        this.status = "submitting";
        this.message = "Confirming your subscription...";
        try {
          const response = await fetch("/api/confirm", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ token: config.token, turnstileToken }),
          });
          const result = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          if (!response.ok) {
            this.status = "error";
            this.message =
              result.error ?? "Could not confirm this subscription.";
            return;
          }
          this.status = "success";
          this.message = "You're confirmed. The next Swipe issue is on its way.";
        } catch {
          this.failed();
        }
      },

      failed(this: ConfirmationComponent) {
        this.status = "error";
        this.message = "Could not verify this request. Reload and try again.";
      },
    }),
  );
}

async function waitForTurnstile(): Promise<TurnstileApi | undefined> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (window.turnstile) return window.turnstile;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return undefined;
}
