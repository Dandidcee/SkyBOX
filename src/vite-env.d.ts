/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL project Supabase, mis. https://xxxx.supabase.co */
  readonly VITE_SUPABASE_URL: string;
  /** Supabase anon/public key (aman di frontend, dibatasi RLS) */
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Catatan: URL webhook N8N disimpan per-akun (Account.toggleWebhookUrl dst), bukan env.
// service_role Supabase TIDAK PERNAH ada di frontend — hanya di N8N (server).
