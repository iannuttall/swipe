import { env } from "cloudflare:workers";
import type { APIContext } from "astro";

export const prerender = false;

const DEFAULT_API_URL = "https://list.ian.is";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  if (!isTrustedRequest(request)) {
    return json({ error: "Not found" }, 404);
  }

  const token = env.NEWSLETTER_API_TOKEN;
  if (!token) {
    return json({ error: "Newsletter signup is not configured yet." }, 503);
  }

  let body: { email?: unknown; source?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!EMAIL_RE.test(email)) {
    return json({ error: "Enter a valid email address." }, 400);
  }

  const source =
    typeof body.source === "string" && body.source.trim()
      ? body.source.trim().slice(0, 120)
      : "swipe.md";

  try {
    const upstream = await fetch(
      new URL("/api/subscribe", env.NEWSLETTER_API_URL ?? DEFAULT_API_URL),
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email, source }),
      },
    );

    if (upstream.ok) {
      return json({ ok: true }, 201);
    }

    console.log(
      `newsletter subscribe failed: ${upstream.status} ${(await upstream.text()).slice(0, 200)}`,
    );
    return json({ error: "Could not subscribe right now. Try again." }, 502);
  } catch {
    return json({ error: "Could not reach the newsletter service." }, 502);
  }
}
