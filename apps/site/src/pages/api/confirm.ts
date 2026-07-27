import { env } from "cloudflare:workers";
import type { APIContext } from "astro";
import { isNewsletterToken } from "@/lib/newsletter-origin";
import { verifyTurnstile } from "@/lib/turnstile";

export const prerender = false;

const DEFAULT_API_URL = "https://list.ian.is";
const TURNSTILE_ACTION = "confirm_subscription";

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
}

function isTrustedRequest(request: Request): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "same-site") {
    return false;
  }
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export async function POST({ request }: APIContext) {
  if (!isTrustedRequest(request)) return json({ error: "Not found" }, 404);

  const apiToken = env.NEWSLETTER_API_TOKEN;
  const turnstileSecret = env.TURNSTILE_SECRET_KEY;
  if (!apiToken || !turnstileSecret) {
    return json({ error: "Confirmation is not configured yet." }, 503);
  }

  let body: { token?: unknown; turnstileToken?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  const token = typeof body.token === "string" ? body.token : undefined;
  const turnstileToken =
    typeof body.turnstileToken === "string" ? body.turnstileToken : "";
  if (!isNewsletterToken(token) || !turnstileToken) {
    return json({ error: "Invalid confirmation link." }, 400);
  }

  const requestUrl = new URL(request.url);
  const remoteIp = request.headers.get("cf-connecting-ip") ?? undefined;
  const verification = await verifyTurnstile({
    secret: turnstileSecret,
    response: turnstileToken,
    expectedAction: TURNSTILE_ACTION,
    expectedHostname: requestUrl.hostname,
    ...(remoteIp ? { remoteIp } : {}),
  });
  if (!verification.valid) {
    console.log(`confirmation Turnstile failed: ${verification.errors.join(",")}`);
    return json({ error: "Could not verify this request. Try again." }, 403);
  }

  try {
    const upstream = await fetch(
      new URL(
        "/api/confirmations/confirm",
        env.NEWSLETTER_API_URL ?? DEFAULT_API_URL,
      ),
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify({
          token,
          ...(remoteIp ? { ip: remoteIp } : {}),
          userAgent: request.headers.get("user-agent") ?? undefined,
          sourceUrl: `${requestUrl.origin}/confirm`,
        }),
      },
    );
    const result = (await upstream.json().catch(() => ({}))) as {
      status?: string;
      purpose?: string;
      alreadyConfirmed?: boolean;
    };
    if (upstream.ok) return json(result, 200);
    return json({ error: "This confirmation link is invalid or expired." }, 400);
  } catch {
    return json({ error: "Could not reach the newsletter service." }, 502);
  }
}
