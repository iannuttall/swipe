/// <reference types="astro/client" />

declare namespace Cloudflare {
  interface Env {
    NEWSLETTER_API_TOKEN?: string;
    NEWSLETTER_API_URL?: string;
    NEWSLETTER_WEBHOOK_SECRET?: string;
    TURNSTILE_SECRET_KEY?: string;
    TURNSTILE_SITE_KEY?: string;
  }
}
