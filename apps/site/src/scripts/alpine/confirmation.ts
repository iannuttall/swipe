import type { AlpineRuntime } from "./types";

type ConfirmationComponent = {
  status: string;
  message: string;
  token: string;
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
  Alpine.data("subscriptionConfirmation", () => ({
    status: "checking",
    message: "Checking this confirmation link...",
    token: "",

    async init(this: ConfirmationComponent) {
      const token =
        new URLSearchParams(window.location.search).get("token") ?? "";
      if (!isConfirmationToken(token)) {
        this.status = "error";
        this.message =
          "This confirmation link is invalid. Use the latest link from your inbox.";
        return;
      }
      this.token = token;

      const [turnstile, siteKey] = await Promise.all([
        waitForTurnstile(),
        fetchTurnstileSiteKey(),
      ]);
      const target = this.$refs.turnstile;
      if (!turnstile || !siteKey || !target) {
        this.status = "error";
        this.message = "Could not verify this request. Reload and try again.";
        return;
      }
      turnstile.render(target, {
        sitekey: siteKey,
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
          body: JSON.stringify({ token: this.token, turnstileToken }),
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
  }));
}

function isConfirmationToken(value: string): boolean {
  return (
    value.length <= 2048 && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)
  );
}

async function fetchTurnstileSiteKey(): Promise<string | undefined> {
  try {
    const response = await fetch("/api/confirm", {
      headers: { accept: "application/json" },
    });
    if (!response.ok) return undefined;
    const result = (await response.json()) as { siteKey?: unknown };
    return typeof result.siteKey === "string" && result.siteKey
      ? result.siteKey
      : undefined;
  } catch {
    return undefined;
  }
}

async function waitForTurnstile(): Promise<TurnstileApi | undefined> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (window.turnstile) return window.turnstile;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return undefined;
}
