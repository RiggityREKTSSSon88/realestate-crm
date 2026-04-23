import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { contactIds, message } = body as { contactIds: string[]; message: string };

  if (!contactIds?.length || !message) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    return NextResponse.json({ error: "Twilio not configured" }, { status: 500 });
  }

  const client = twilio(accountSid, authToken);

  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, full_name, phone, agency_id")
    .in("id", contactIds);

  if (!contacts?.length) return NextResponse.json({ error: "No contacts found" }, { status: 404 });

  const agencyId = contacts[0].agency_id;
  const results: { contactId: string; success: boolean; error?: string }[] = [];

  for (const contact of contacts) {
    if (!contact.phone) {
      results.push({ contactId: contact.id, success: false, error: "No phone number" });
      continue;
    }

    const personalised = message.replace(/\{\{name\}\}/g, contact.full_name);

    try {
      await client.messages.create({
        body: personalised,
        from: fromNumber,
        to: contact.phone,
      });

      await supabase.from("communications").insert({
        agency_id: agencyId,
        contact_id: contact.id,
        type: "sms",
        subject: null,
        body: personalised,
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
