-- Skema database SkyBox (Supabase / PostgreSQL)
-- Jalankan di SQL Editor Supabase. Penulisan data dilakukan N8N (service_role, bypass RLS).
-- Frontend hanya membaca via anon key + policy SELECT di bawah.

-- ========== TABEL ==========

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  color text default '#25D366',
  waha_session text not null,
  toggle_webhook_url text default '',
  send_message_webhook_url text default '',
  send_media_webhook_url text default '',
  confidence_threshold int not null default 70 check (confidence_threshold between 0 and 100),
  bank_account text default '',
  created_at timestamptz default now()
);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  customer_phone text not null,
  customer_name text default '',
  handler text not null default 'ai' check (handler in ('ai','human')),
  order_status text not null default 'none' check (order_status in ('none','lead','waiting_payment','closing')),
  confidence int not null default 100 check (confidence between 0 and 100),
  last_preview text default '',
  last_time timestamptz default now(),
  unread int not null default 0,
  updated_at timestamptz default now(),
  unique (account_id, customer_phone)
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  external_message_id text unique, -- id pesan dari WAHA (payload.id) untuk cegah dobel insert
  direction text not null check (direction in ('in','out')),
  type text not null default 'text' check (type in ('text','image','document')),
  body text default '',
  media_url text,
  created_at timestamptz default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  type text not null check (type in ('tf','cod')),
  status text not null default 'waiting_payment',
  address text,
  amount numeric,
  created_at timestamptz default now()
);

-- Notifikasi sistem yang dikirim N8N ke dashboard (mis. workflow error, info).
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id) on delete cascade, -- opsional: notif terkait akun tertentu
  level text not null default 'info' check (level in ('info','success','warn','error')),
  message text not null,
  created_at timestamptz default now()
);

-- Indeks bantu
create index if not exists idx_conversations_account on conversations(account_id);
create index if not exists idx_messages_conversation on messages(conversation_id, created_at);
create index if not exists idx_orders_conversation on orders(conversation_id);

-- ========== REALTIME ==========
-- REPLICA IDENTITY FULL agar payload Realtime menyertakan baris lama (deteksi transisi handler/unread/order).
alter table conversations replica identity full;
alter table orders replica identity full;

-- Idempotent: hanya tambah tabel yang belum ada di publication.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='conversations') then
    alter publication supabase_realtime add table conversations;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='messages') then
    alter publication supabase_realtime add table messages;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='orders') then
    alter publication supabase_realtime add table orders;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='notifications') then
    alter publication supabase_realtime add table notifications;
  end if;
end $$;

-- ========== ROW LEVEL SECURITY ==========
-- anon hanya boleh BACA. Tidak ada policy insert/update untuk anon pada
-- conversations/messages/orders (R13). N8N memakai service_role.
alter table accounts enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table orders enable row level security;
alter table notifications enable row level security;

drop policy if exists "anon read accounts" on accounts;
drop policy if exists "anon read conversations" on conversations;
drop policy if exists "anon read messages" on messages;
drop policy if exists "anon read orders" on orders;
drop policy if exists "anon read notifications" on notifications;
create policy "anon read accounts" on accounts for select to anon using (true);
create policy "anon read conversations" on conversations for select to anon using (true);
create policy "anon read messages" on messages for select to anon using (true);
create policy "anon read orders" on orders for select to anon using (true);
create policy "anon read notifications" on notifications for select to anon using (true);

-- Pengecualian terbatas (tool internal 1 CS, belum ada auth): anon boleh KELOLA accounts
-- (config webhook/session) dari halaman Integrations. conversations/messages/orders TETAP read-only.
-- Perketat saat autentikasi CS ditambahkan.
drop policy if exists "anon insert accounts" on accounts;
drop policy if exists "anon update accounts" on accounts;
drop policy if exists "anon delete accounts" on accounts;
create policy "anon insert accounts" on accounts for insert to anon with check (true);
create policy "anon update accounts" on accounts for update to anon using (true) with check (true);
create policy "anon delete accounts" on accounts for delete to anon using (true);
