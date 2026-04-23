import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type SearchResult = {
  id: string;
  type: "contact" | "property" | "appraisal";
  title: string;
  subtitle: string;
  href: string;
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const like = `%${q}%`;

  const [contactsRes, propertiesRes, appraisalsRes] = await Promise.all([
    supabase
      .from("contacts")
      .select("id, full_name, email, phone, type")
      .or(`full_name.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
      .limit(5),
    supabase
      .from("properties")
      .select("id, address, suburb, state, property_type")
      .or(`address.ilike.${like},suburb.ilike.${like}`)
      .limit(5),
    supabase
      .from("appraisals")
      .select(`id, appraisal_date, status, properties(address, suburb)`)
      .limit(5),
  ]);

  const results: SearchResult[] = [];

  for (const c of contactsRes.data ?? []) {
    results.push({
      id: c.id,
      type: "contact",
      title: c.full_name,
      subtitle: [c.email, c.phone].filter(Boolean).join(" · ") || c.type,
      href: `/contacts/${c.id}`,
    });
  }

  for (const p of propertiesRes.data ?? []) {
    results.push({
      id: p.id,
      type: "property",
      title: p.address,
      subtitle: [p.suburb, p.state, p.property_type].filter(Boolean).join(", "),
      href: `/properties`,
    });
  }

  // Filter appraisals by the search term against joined property address
  const appraisalData = (appraisalsRes.data ?? []) as unknown as Array<{
    id: string;
    appraisal_date: string;
    status: string;
    properties: { address: string; suburb: string } | null;
  }>;

  for (const a of appraisalData) {
    const addr = a.properties?.address ?? "";
    const suburb = a.properties?.suburb ?? "";
    if (!addr.toLowerCase().includes(q.toLowerCase()) && !suburb.toLowerCase().includes(q.toLowerCase())) continue;
    results.push({
      id: a.id,
      type: "appraisal",
      title: addr,
      subtitle: `Appraisal · ${suburb} · ${a.status}`,
      href: `/appraisals`,
    });
  }

  return NextResponse.json({ results });
}
