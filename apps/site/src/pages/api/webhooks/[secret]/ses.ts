import { env } from "cloudflare:workers";
import type { APIContext } from "astro";

export const prerender = false;

const DEFAULT_API_URL = "https://list.ian.is";
const MAX_BODY_BYTES = 256 * 1024;

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
}

function safeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;

  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function readSnsMetadata(body: ArrayBuffer) {
  try {
    const parsed = JSON.parse(new TextDecoder().decode(body));
    return {
      type: typeof parsed.Type === "string" ? parsed.Type : "unknown",
      topicArn:
        typeof parsed.TopicArn === "string" ? parsed.TopicArn : "unknown",
    };
  } catch {
    return { type: "unknown", topicArn: "unknown" };
  }
}

function readUpstreamError(body: string) {
  try {
    const parsed = JSON.parse(body);
    return typeof parsed.error === "string" ? parsed.error : "unknown";
  } catch {
    return "unknown";
  }
}

export async function POST({ params, request }: APIContext) {
  const expectedSecret = env.NEWSLETTER_WEBHOOK_SECRET;
  if (!expectedSecret) {
    return json({ error: "Webhook is not configured." }, 503);
  }

  const suppliedSecret = params.secret ?? "";
  if (!suppliedSecret || !safeEqual(suppliedSecret, expectedSecret)) {
    return json({ error: "Not found" }, 404);
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return json({ error: "Payload is too large." }, 413);
  }

  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_BODY_BYTES) {
    return json({ error: "Payload is too large." }, 413);
  }
  const metadata = readSnsMetadata(body);

  const upstreamUrl = new URL(
    `/api/webhooks/${encodeURIComponent(suppliedSecret)}/ses`,
    env.NEWSLETTER_API_URL ?? DEFAULT_API_URL,
  );

  const headers = new Headers({
    "content-type": request.headers.get("content-type") ?? "application/json",
  });
  for (const name of [
    "x-amz-sns-message-id",
    "x-amz-sns-message-type",
    "x-amz-sns-subscription-arn",
    "x-amz-sns-topic-arn",
  ]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  try {
    const upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers,
      body,
      redirect: "manual",
    });
    const upstreamBody = upstream.ok ? upstream.body : await upstream.text();

    if (!upstream.ok) {
      console.error("SES webhook upstream rejected the request.", {
        type: metadata.type,
        topicArn: metadata.topicArn,
        status: upstream.status,
        error: readUpstreamError(upstreamBody as string),
      });
    }

    return new Response(upstreamBody, {
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get("content-type") ?? "application/json",
        "cache-control": "no-store",
      },
    });
  } catch {
    return json({ error: "Could not reach the newsletter service." }, 502);
  }
}
