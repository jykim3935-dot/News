import { Resend } from "resend";
import { supabase, isSupabaseConfigured } from "./supabase";
import { localStore } from "./local-store";
import type { Recipient } from "./supabase";

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

export async function sendNewsletter(
  html: string,
  date: string,
  testEmail?: string
): Promise<{ sent: number; errors: string[] }> {
  const errors: string[] = [];
  let sent = 0;

  let emails: string[];

  if (testEmail) {
    emails = [testEmail];
  } else {
    let recipients: { email: string }[] | null = null;

    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase
          .from("recipients")
          .select("email")
          .eq("enabled", true);
        recipients = data;
      } catch { /* fall through */ }
    }

    if (!recipients) {
      recipients = localStore
        .select<Recipient>("recipients")
        .filter((r) => r.enabled)
        .map((r) => ({ email: r.email }));
    }

    emails = (recipients || []).map((r) => r.email);
  }

  if (emails.length === 0) {
    return { sent: 0, errors: ["No recipients found"] };
  }

  for (const email of emails) {
    try {
      await getResend().emails.send({
        from: process.env.SENDER_EMAIL || "noreply@acryl.ai",
        to: email,
        subject: `[ACRYL Intel] ${date} 경영정보 브리프`,
        html,
      });
      sent++;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(`${email}: ${msg}`);
      console.error(`[sender] Error sending to ${email}:`, msg);
    }
  }

  console.log(`[sender] Sent: ${sent}/${emails.length}`);
  return { sent, errors };
}
