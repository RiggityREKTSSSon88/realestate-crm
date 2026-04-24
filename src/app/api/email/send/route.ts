import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY ?? "");
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { contactIds, subject, htmlBody, templateId } = body as {
    contactIds: string[];
    subject: string;
    htmlBody: string;
    templateId?: string;
  };

  if (!contactIds?.length || !subject || !htmlBody) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, full_name, email, agency_id")
    .in("id", contactIds);

  if (!contacts?.length) return NextResponse.json({ error: "No contacts found" }, { status: 404 });

  const agencyId = contacts[0].agency_id;
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "noreply@estateiq.com.au";

  const results: { contactId: string; success: boolean; error?: string }[] = [];

  for (const contact of contacts) {
    if (!contact.email) {
      results.push({ contactId: contact.id, success: false, error: "No email address" });
      continue;
    }

    try {
      await resend.emails.send({
        from: fromEmail,
        to: contact.email,
        subject,
        html: htmlBody.replace(/\{\{name\}\}/g, contact.full_name),
      });

      await supabase.from("communications").insert({
        agency_id: agencyId,
        contact_id: contact.id,
        type: "email",
        subject,
        body: htmlBody,
        sent_by: authData.user.id,
        sent_at: new Date().toISOString(),
        sentiment: "neutral",
      });

      results.push({ contactId: contact.id, success: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      results.push({ contactId: contact.id, success: false, error: message });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  return NextResponse.json({ results, successCount, totalCount: contacts.length });
}
