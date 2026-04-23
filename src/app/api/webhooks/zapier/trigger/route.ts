import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAgencyIdForUser } from "@/lib/integrations";
import type { ZapierEvent } from "../route";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const agencyId = await getAgencyIdForUser(user.id);
  if (!agencyId) return NextResponse.json({ error: "No agency" }, { status: 400 });

  const { event, data } = await req.json() as { event: ZapierEvent; data: Record<string, unknown> };
  if (!event) return NextResponse.json({ error: "event required" }, { status: 400 });

  const { data: webhooks } = await supabase
    .from("zapier_webhooks")
    .select("id, url, secret")
    .eq("agency_id", agencyId)
    .eq("active", true)
    .contains("events", [event]);

  if (!webhooks?.length) return NextResponse.json({ fired: 0 });

  const payload = {
    event,
    agency_id: agencyId,
    timestamp: new Date().toISOString(),
    data,
  };

  const results = await Promise.allSettled(
    webhooks.map(async (wh) => {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (wh.secret) headers["X-Zapier-Secret"] = wh.secret;

      const res = await fetch(wh.url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });

      return { id: wh.id, status: res.status, ok: res.ok };
    })
  );

  const fired = results.filter((r) => r.status === "fulfilled" && (r.value as { ok: boolean }).ok).length;
  const failed = results.length - fired;

  return NextResponse.json({ fired, failed, total: results.length });
}
