import { Resend } from "resend";
import { supabase, isSupabaseConfigured } from "./supabase";
import { localStore } from "./local-store";
import type { Recipient } from "./supabase";

let _resend: Resend | null = null;
function getResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY 환경변수가 설정되지 않았습니다. Vercel 대시보드에서 설정하세요.");
  }
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

  // Validate sender email
  const senderEmail = process.env.SENDER_EMAIL;
  if (!senderEmail) {
    console.warn("[sender] SENDER_EMAIL not set, using default noreply@acryl.ai");
  }

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
    return { sent: 0, errors: ["수신자가 없습니다. 수신자 탭에서 이메일을 추가하세요."] };
  }

  console.log(`[sender] Sending to ${emails.length} recipients...`);

  for (const email of emails) {
    try {
      await getResend().emails.send({
        from: senderEmail || "noreply@acryl.ai",
        to: email,
        subject: `[ACRYL Intel] ${date} 경영정보 브리프`,
        html,
      });
      sent++;
      console.log(`[sender] Sent to ${email}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(`${email}: ${msg}`);
      console.error(`[sender] Failed to send to ${email}:`, msg);
    }
  }

  console.log(`[sender] Done: ${sent}/${emails.length} sent, ${errors.length} errors`);
  return { sent, errors };
}
