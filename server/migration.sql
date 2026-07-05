-- Tabel Kustom pengganti Supabase auth.users
CREATE TABLE IF NOT EXISTS auth_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Sesuaikan foreign key di tabel accounts
-- Hapus constraint lama jika ada (opsional)
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_owner_id_fkey;

-- Arahkan ke tabel auth_users yang baru
ALTER TABLE accounts
  ADD CONSTRAINT accounts_owner_id_fkey
  FOREIGN KEY (owner_id) REFERENCES auth_users(id) ON DELETE CASCADE;

-- Tambahkan meta_verify_token
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS meta_verify_token text;
