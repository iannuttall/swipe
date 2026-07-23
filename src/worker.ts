import { handle } from "@astrojs/cloudflare/handler";

export default {
  fetch: handle,
} satisfies ExportedHandler<Env>;
