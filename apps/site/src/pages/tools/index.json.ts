import type { APIRoute } from "astro";
import { getVisibleTools, toolSearchItem } from "@/lib/tools";

export const prerender = true;

export const GET: APIRoute = async () => {
  const tools = await getVisibleTools();
  return new Response(JSON.stringify(tools.map(toolSearchItem)), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=0, must-revalidate",
    },
  });
};
