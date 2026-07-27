const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type TurnstileResponse = {
  success?: boolean;
  action?: string;
  hostname?: string;
  "error-codes"?: string[];
};

export type TurnstileVerification = {
  valid: boolean;
  errors: string[];
};

export async function verifyTurnstile(input: {
  secret: string;
  response: string;
  remoteIp?: string;
  expectedAction: string;
  expectedHostname: string;
}): Promise<TurnstileVerification> {
  const form = new URLSearchParams({
    secret: input.secret,
    response: input.response,
    idempotency_key: crypto.randomUUID(),
  });
  if (input.remoteIp) form.set("remoteip", input.remoteIp);

  let result: TurnstileResponse;
  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form,
    });
    if (!response.ok) {
      return { valid: false, errors: ["siteverify-unavailable"] };
    }
    result = (await response.json()) as TurnstileResponse;
  } catch {
    return { valid: false, errors: ["siteverify-unavailable"] };
  }

  const errors = result["error-codes"] ?? [];
  if (!result.success) return { valid: false, errors };
  if (result.action !== input.expectedAction) {
    return { valid: false, errors: ["action-mismatch"] };
  }
  if (
    !isLocalHostname(input.expectedHostname) &&
    result.hostname !== input.expectedHostname
  ) {
    return { valid: false, errors: ["hostname-mismatch"] };
  }
  return { valid: true, errors: [] };
}

function isLocalHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1"
  );
}
