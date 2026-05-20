import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY が未設定です");
    }
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

export interface SendEmailArgs {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  tags?: { name: string; value: string }[];
}

export interface SendEmailResult {
  id: string; // Resend のメッセージ ID
}

export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  const resend = getResend();
  const { data, error } = await resend.emails.send({
    from: args.from,
    to: args.to,
    subject: args.subject,
    text: args.text,
    html: args.html,
    tags: args.tags
  });
  if (error) {
    throw new Error(`Resend エラー: ${error.message}`);
  }
  if (!data?.id) {
    throw new Error("Resend からメッセージ ID が返りませんでした");
  }
  return { id: data.id };
}
