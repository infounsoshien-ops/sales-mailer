/**
 * Supabase テーブルの TypeScript 型。
 * 公式の `supabase gen types typescript` を使わず、手書きで管理する。
 * (DB スキーマを変更したら supabase/migrations と合わせてこのファイルも更新)
 */

export type ContactStatus = "pending" | "sent" | "replied" | "unsubscribed" | "failed";

export interface Client {
  id: string;
  user_id: string;
  name: string;
  service_description: string | null;
  strengths: string | null;
  signature: string | null;
  from_email: string | null;
  daily_limit: number;
  send_time: string;
  skip_weekends: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplate {
  id: string;
  client_id: string;
  name: string;
  subject: string;
  body: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  user_id: string;
  client_id: string | null;
  company_name: string;
  industry: string | null;
  person_name: string | null;
  email: string;
  note: string | null;
  status: ContactStatus;
  replied: boolean;
  replied_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailDraft {
  id: string;
  contact_id: string;
  subject: string;
  body: string;
  created_at: string;
}

export interface EmailLog {
  id: string;
  contact_id: string;
  resend_id: string | null;
  subject: string | null;
  body: string | null;
  sent_at: string;
  opened_at: string | null;
  bounced: boolean;
  error_message: string | null;
  retry_count: number;
}

/**
 * user_settings は「現在選択中の顧問先 ID を記録するためのワークスペース設定」に簡素化。
 * 個別の自社情報・送信元・送信時刻などは clients テーブルへ移行。
 */
export interface UserSettings {
  user_id: string;
  current_client_id: string | null;
  updated_at: string;
}

export type Database = {
  public: {
    Tables: {
      contacts: {
        Row: Contact;
        Insert: Omit<Contact, "id" | "created_at" | "updated_at" | "replied" | "replied_at" | "status"> &
          Partial<Pick<Contact, "status" | "replied" | "replied_at">>;
        Update: Partial<Omit<Contact, "id" | "user_id" | "created_at">>;
        Relationships: [];
      };
      email_drafts: {
        Row: EmailDraft;
        Insert: Omit<EmailDraft, "id" | "created_at">;
        Update: Partial<Omit<EmailDraft, "id" | "contact_id" | "created_at">>;
        Relationships: [];
      };
      email_logs: {
        Row: EmailLog;
        Insert: Omit<EmailLog, "id" | "sent_at"> & Partial<Pick<EmailLog, "sent_at">>;
        Update: Partial<Omit<EmailLog, "id" | "contact_id">>;
        Relationships: [];
      };
      user_settings: {
        Row: UserSettings;
        Insert: Partial<UserSettings> & Pick<UserSettings, "user_id">;
        Update: Partial<Omit<UserSettings, "user_id">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
