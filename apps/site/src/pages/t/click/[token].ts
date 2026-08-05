import {
  fetchNewsletterOrigin,
  isNewsletterToken,
  originResponse,
} from "@/lib/newsletter-origin";
import type { APIContext } from "astro";

export const prerender = false;

export async function GET({ params, request }: APIContext) {
  const token = params.token;
  if (!isNewsletterToken(token)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const upstream = await fetchNewsletterOrigin(
      request,
      `/t/click/${encodeURIComponent(token)}`,
    );
    return originResponse(upstream);
  } catch {
    return new Response("Tracking redirect temporarily unavailable", {
      status: 503,
      headers: {
        "cache-control": "no-store",
        "retry-after": "5",
      },
    });
  }
}
