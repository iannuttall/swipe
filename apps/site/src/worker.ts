import { handle } from "@astrojs/cloudflare/handler";

// Static HTML and prebuilt Markdown twins stay on the assets binding.
// Cloudflare URL Rewrite Rules negotiate Accept: text/markdown at the edge,
// so ordinary page and agent traffic does not run through this Worker.
export default {
  fetch: handle,
} satisfies ExportedHandler<Env>;
