-- Skema database SkyBox (Supabase / PostgreSQL)
-- Jalankan di SQL Editor Supabase. Penulisan data dilakukan N8N (service_role, bypass RLS).
-- Frontend: admin login (Supabase Auth) + RLS berbasis kepemilikan (accounts.owner_id = auth.uid()).
-- Tiap admin hanya melihat akun WA miliknya beserta percakapan/pesan/order/notifikasinya.

-- ========== TABEL ==========

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade, -- admin pemilik nomor WA ini
  name text not null,
  phone text not null,
  color text default '#25D366',
  waha_session text not null,
  toggle_webhook_url text default '',
  send_message_webhook_url text default '',
  send_media_webhook_url text default '',
  confidence_threshold int not null default 75 check (confidence_threshold between 0 and 100),
  bank_account text default '',
  created_at timestamptz default now()
);

-- Tambah kolom owner_id bila tabel accounts sudah ada sebelum fitur auth.
alter table accounts add column if not exists owner_id uuid references auth.users(id) on delete cascade;
create index if not exists idx_accounts_owner on accounts(owner_id);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  customer_phone text not null,
  customer_name text default '',
  chat_id text default '',  -- JID/@lid asli WAHA untuk balas pesan (payload.from)
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

-- Naikkan unread + update preview/waktu secara atomic (dipanggil N8N saat pesan masuk).
create or replace function bump_unread(conv_id uuid, preview text)
returns void language sql as $$
  update conversations
  set unread = unread + 1,
      last_preview = preview,
      last_time = now(),
      updated_at = now()
  where id = conv_id;
$$;

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
-- Multi-admin: tiap admin (auth.users) hanya melihat akun WA miliknya (accounts.owner_id)
-- beserta conversations/messages/orders/notifications dari akun tsb.
-- N8N memakai service_role (BYPASS RLS) untuk menulis semua data.
alter table accounts enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table orders enable row level security;
alter table notifications enable row level security;

-- Bersihkan policy anon lama (era 1 CS tanpa auth).
drop policy if exists "anon read accounts" on accounts;
drop policy if exists "anon read conversations" on conversations;
drop policy if exists "anon read messages" on messages;
drop policy if exists "anon read orders" on orders;
drop policy if exists "anon read notifications" on notifications;
drop policy if exists "anon insert accounts" on accounts;
drop policy if exists "anon update accounts" on accounts;
drop policy if exists "anon delete accounts" on accounts;

-- accounts: admin CRUD hanya akun miliknya sendiri.
drop policy if exists "own accounts select" on accounts;
drop policy if exists "own accounts insert" on accounts;
drop policy if exists "own accounts update" on accounts;
drop policy if exists "own accounts delete" on accounts;
create policy "own accounts select" on accounts for select to authenticated using (owner_id = auth.uid());
create policy "own accounts insert" on accounts for insert to authenticated with check (owner_id = auth.uid());
create policy "own accounts update" on accounts for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own accounts delete" on accounts for delete to authenticated using (owner_id = auth.uid());

-- conversations: hanya milik akun admin (read-only dari frontend; N8N service_role yang menulis).
drop policy if exists "own conversations select" on conversations;
create policy "own conversations select" on conversations for select to authenticated
  using (account_id in (select id from accounts where owner_id = auth.uid()));

-- messages: hanya dari conversation pada akun admin.
drop policy if exists "own messages select" on messages;
create policy "own messages select" on messages for select to authenticated
  using (conversation_id in (
    select c.id from conversations c
    join accounts a on a.id = c.account_id
    where a.owner_id = auth.uid()
  ));

-- orders: hanya dari conversation pada akun admin.
drop policy if exists "own orders select" on orders;
create policy "own orders select" on orders for select to authenticated
  using (conversation_id in (
    select c.id from conversations c
    join accounts a on a.id = c.account_id
    where a.owner_id = auth.uid()
  ));

-- notifications: milik akun admin, plus notif global (account_id null) untuk semua admin.
drop policy if exists "own notifications select" on notifications;
create policy "own notifications select" on notifications for select to authenticated
  using (account_id is null or account_id in (select id from accounts where owner_id = auth.uid()));

-- ============================================================
-- TAMBAHAN: Katalog Produk & Basis Pengetahuan (per akun WA)
-- Murni additive: tabel baru, tidak menyentuh tabel/alur lama.
-- N8N (service_role) membaca ini untuk konteks AI; admin kelola dari dashboard.
-- ============================================================

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade, -- barang milik nomor WA ini
  name text not null,
  description text default '',
  price numeric,
  sku text default '',
  stock int,
  image_url text default '',
  category text default '',
  is_active boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists knowledge (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  title text not null,
  content text not null default '',
  tags text default '',
  created_at timestamptz default now()
);

create index if not exists idx_products_account on products(account_id);
create index if not exists idx_knowledge_account on knowledge(account_id);

-- RLS: admin hanya kelola produk/knowledge milik akunnya (pola sama seperti conversations).
alter table products enable row level security;
alter table knowledge enable row level security;

drop policy if exists "own products all" on products;
create policy "own products all" on products for all to authenticated
  using (account_id in (select id from accounts where owner_id = auth.uid()))
  with check (account_id in (select id from accounts where owner_id = auth.uid()));

drop policy if exists "own knowledge all" on knowledge;
create policy "own knowledge all" on knowledge for all to authenticated
  using (account_id in (select id from accounts where owner_id = auth.uid()))
  with check (account_id in (select id from accounts where owner_id = auth.uid()));

-- ============================================================
-- TAMBAHAN: dukungan Cek Ongkir (RajaOngkir/Komerce)
-- origin (asal kirim) per akun + weight (gram) per produk.
-- Dipakai N8N untuk hitung ongkir; API key ongkir hanya di N8N.
-- ============================================================
alter table accounts add column if not exists origin_city_id text default ''; -- ID kota/subdistrict asal (sesuai API ongkir)
alter table accounts add column if not exists origin_label text default '';   -- label kota asal (tampilan)
alter table products add column if not exists weight int;                      -- berat gram (untuk hitung ongkir)

-- TAMBAHAN: webhook analisis/rangkum percakapan (AI agent) per akun.
alter table accounts add column if not exists analyze_webhook_url text default '';

-- TAMBAHAN: detail order untuk Tracking Order (diisi N8N saat closing).
alter table orders add column if not exists items text default '';  -- barang yang dipesan
alter table orders add column if not exists note text default '';   -- catatan pengiriman

-- TAMBAHAN: verifikasi order oleh CS (cek ulang).
alter table orders add column if not exists verified boolean not null default false;

-- Izinkan admin meng-UPDATE order miliknya (untuk tandai verified dari dashboard).
drop policy if exists "own orders update" on orders;
create policy "own orders update" on orders for update to authenticated
  using (conversation_id in (
    select c.id from conversations c join accounts a on a.id = c.account_id where a.owner_id = auth.uid()
  ))
  with check (conversation_id in (
    select c.id from conversations c join accounts a on a.id = c.account_id where a.owner_id = auth.uid()
  ));
