import { env } from "cloudflare:workers";

const DEFAULT_API_URL = "https://list.ian.is";
const TOKEN_RE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

export function isNewsletterToken(value: string | undefined): value is string {
  return Boolean(value && value.length <= 2048 && TOKEN_RE.test(value));
}

export async function fetchNewsletterOrigin(
  request: Request,
  pathname: string,
  method: "GET" | "POST" = "GET",
): Promise<Response> {
  const url = new URL(pathname, env.NEWSLETTER_API_URL ?? DEFAULT_API_URL);
  const headers = new Headers();

  for (const name of ["user-agent", "accept", "accept-language"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const clientIp = request.headers.get("cf-connecting-ip");
  if (clientIp) headers.set("x-forwarded-for", clientIp);
  headers.set("x-forwarded-proto", "https");

  return fetch(url, {
    method,
    headers,
    redirect: "manual",
  });
}

export function originResponse(upstream: Response): Response {
  const headers = new Headers({
    "cache-control": "no-store",
    "content-type":
      upstream.headers.get("content-type") ?? "application/octet-stream",
  });

  const location = upstream.headers.get("location");
  if (location) headers.set("location", location);

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}
