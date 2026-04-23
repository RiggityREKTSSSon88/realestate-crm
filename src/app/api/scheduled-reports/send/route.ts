import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import type { ScheduledReport } from "@/types/database";

const resend = new Resend(process.env.RESEND_API_KEY);

function computeNextRunAt(frequency: ScheduledReport["frequency"], from: Date): string {
  const next = new Date(from);
  if (frequency === "weekly") {
    next.setDate(next.getDate() + 7);
  } else {
    next.setMonth(next.getMonth() + 1);
  }
  return next.toISOString();
}

function reportTypeLabel(reportType: ScheduledReport["report_type"]): string {
  const labels: Record<ScheduledReport["report_type"], string> = {
    agent_performance: "Agent Performance",
    kpi: "KPI",
    stocklist: "Stocklist",
    geo_breakdown: "Geo Breakdown",
    staff_comparison: "Staff Comparison",
  };
  return labels[reportType];
}

async function sendReport(report: ScheduledReport): Promise<number> {
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "noreply@estateiq.com.au";
  const label = reportTypeLabel(report.report_type);

  const recipients = report.recipients as string[];

  const subject = `Your ${label} Report is Ready — EstateIQ`;
  const html = `<p>Your <strong>${label}</strong> report is ready.</p><p>Log in to <a href="https://estateiq.com.au">EstateIQ</a> to view it.</p>`;
  const text = `Your ${label} report is ready. Log in to EstateIQ to view it.`;

  let sentCount = 0;

  for (const email of recipients) {
    try {
      await resend.emails.send({
        from: fromEmail,
        to: email,
        subject,
        html,
        text,
      });
      sentCount++;
    } catch {
      // continue sending to remaining recipients
    }
  }

  return sentCount;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { reportId?: string } = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text) as { reportId?: string };
  } catch {
    // empty body is allowed
  }

  const now = new Date();
  let totalSent = 0;

  if (body.reportId) {
    const { data: report, error } = await supabase
      .from("scheduled_reports")
      .select("*")
      .eq("id", body.reportId)
      .single();

    if (error || !report) {
      return NextResponse.json({ error: "Scheduled report not found" }, { status: 404 });
    }

    const sentTo = await sendReport(report as ScheduledReport);
    totalSent = sentTo;

    await supabase
      .from("scheduled_reports")
      .update({
        last_run_at: now.toISOString(),
        next_run_at: computeNextRunAt((report as ScheduledReport).frequency, now),
      })
      .eq("id", report.id);
  } else {
    const { data: dueReports } = await supabase
      .from("scheduled_reports")
      .select("*")
      .eq("active", true)
      .lte("next_run_at", now.toISOString());

    if (dueReports && dueReports.length > 0) {
      for (const report of dueReports as ScheduledReport[]) {
        const sentTo = await sendReport(report);
        totalSent += sentTo;

        await supabase
          .from("scheduled_reports")
          .update({
            last_run_at: now.toISOString(),
            next_run_at: computeNextRunAt(report.frequency, now),
          })
          .eq("id", report.id);
      }
    }
  }

  return NextResponse.json({ success: true, sentTo: totalSent });
}
