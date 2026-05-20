// クライアント PDF 添付ファイル用の Supabase Storage バケットを作成する。
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUCKET = "client-attachments";

const { data: existing } = await supabase.storage.getBucket(BUCKET);
if (existing) {
  console.log(`✓ bucket "${BUCKET}" already exists`);
} else {
  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ["application/pdf"],
  });
  if (error) throw new Error(error.message);
  console.log(`✓ bucket "${BUCKET}" created (private, 5MB limit, PDF only)`);
}
