import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DOCUSEAL_API_URL = process.env.DOCUSEAL_API_URL ?? "https://api.docuseal.com";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { proposalId } = await req.json() as { proposalId: string };
  if (!proposalId) return NextResponse.json({ error: "proposalId required" }, { status: 400 });

  const { data: proposal } = await supabase
    .from("proposals")
    .select(`*, contacts(id, full_name, email), properties(address, suburb, state)`)
    .eq("id", proposalId)
    .single();

  if (!proposal) return NextResponse.json({ error: "Proposal not found" }, { status: 404 });

  const contact = (proposal as unknown as { contacts: { id: string; full_name: string; email: string } | null }).contacts;
  if (!contact?.email) return NextResponse.json({ error: "Contact has no email address" }, { status: 400 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const previewUrl = `${appUrl}/p/${proposalId}`;
  const apiKey = process.env.DOCUSEAL_API_KEY;

  if (!apiKey) {
    // No DocuSeal configured — just mark as sent and return preview URL
    await supabase
      .from("proposals")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", proposalId);
    return NextResponse.json({ success: true, signingUrl: previewUrl, fallback: true });
  }

  try {
    const docusealRes = await fetch(`${DOCUSEAL_API_URL}/submissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Token": apiKey,
      },
      body: JSON.stringify({
        template_id: process.env.DOCUSEAL_TEMPLATE_ID,
        send_email: true,
        submitters: [
          {
            role: "Signer",
            email: contact.email,
            name: contact.full_name,
            fields: [{ name: "Document URL", default_value: previewUrl }],
          },
        ],
        message: {
          subject: `${proposal.title} — Please review and sign`,
          body: `Hi ${contact.full_name},\n\nPlease review your proposal and sign the engagement agreement.\n\nView proposal: ${previewUrl}`,
        },
      }),
    });

    const docusealData = await docusealRes.json() as { id?: number; submitters?: Array<{ slug: string; embed_src: string }> };

    const signingUrl = docusealData.submitters?.[0]?.embed_src ?? previewUrl;

    await supabase
      .from("proposals")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        docuseal_submission_id: docusealData.id ? String(docusealData.id) : null,
        docuseal_signing_url: signingUrl,
      })
      .eq("id", proposalId);

    return NextResponse.json({ success: true, signingUrl });
  } catch {
    // Fallback: mark sent without DocuSeal
    await supabase
      .from("proposals")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", proposalId);
    return NextResponse.json({ success: true, signingUrl: previewUrl, fallback: true });
  }
}
