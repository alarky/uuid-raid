import { RaidRoom } from "./raid-room.js";

export { RaidRoom };

export interface Env {
  RAID_ROOM: DurableObjectNamespace;
  DEV_MODE?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS headers for web client
    const corsHeaders: Record<string, string> = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // WebSocket upgrade → Durable Object
    if (url.pathname === "/ws") {
      const id = env.RAID_ROOM.idFromName("raid-main");
      const stub = env.RAID_ROOM.get(id);
      return stub.fetch(request);
    }

    // Health check
    if (url.pathname === "/") {
      return new Response(
        JSON.stringify({ status: "ok", game: "UUID Raid" }),
        {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Seed endpoint (dev only)
    if (url.pathname === "/seed" && request.method === "POST" && env.DEV_MODE === "true") {
      const count = parseInt(url.searchParams.get("count") ?? "1000", 10);
      const id = env.RAID_ROOM.idFromName("raid-main");
      const stub = env.RAID_ROOM.get(id);
      const res = await stub.fetch(new Request(`https://internal/seed?count=${count}`));
      const body = await res.text();
      return new Response(body, {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Stats endpoint
    if (url.pathname === "/stats") {
      const id = env.RAID_ROOM.idFromName("raid-main");
      const stub = env.RAID_ROOM.get(id);
      return stub.fetch(new Request("https://internal/stats"));
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  },
};
