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

-- WhatsApp Official API credentials
alter table accounts add column if not exists wa_phone_number_id text default '';
alter table accounts add column if not exists wa_access_token text default '';

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  customer_phone text not null,
  customer_name text default '',
  chat_id text default '',  -- JID/@lid asli WAHA untuk balas pesan (payload.from)
  handler text not null default 'ai' check (handler in ('ai','human')),
  order_status text not null default 'none' check (order_status in ('none','lead','waiting_payment','closing','complaint')),
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
  reply_to_message_id text, -- id pesan yang sedang direply (jika ada)
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

-- Izinkan admin men-DELETE percakapan (untuk fitur Hapus Chat).
drop policy if exists "own conversations delete" on conversations;
create policy "own conversations delete" on conversations for delete to authenticated
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

-- TAMBAHAN: nomor WA admin untuk notifikasi (takeover, bukti TF, dll). N8N format ke @c.us.
alter table accounts add column if not exists admin_notify_phone text default '';

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

-- Izinkan admin men-DELETE order miliknya (untuk fitur Reject/Hapus dari dashboard).
drop policy if exists "own orders delete" on orders;
create policy "own orders delete" on orders for delete to authenticated
  using (conversation_id in (
    select c.id from conversations c join accounts a on a.id = c.account_id where a.owner_id = auth.uid()
  ));


-- ============================================================
-- TAMBAHAN: Varian/Spesifikasi produk + tabel Promo (per akun WA)
-- Murni additive. N8N (service_role) baca untuk konteks AI.
-- ============================================================

-- Varian/spesifikasi produk (ukuran, warna, dll). Teks bebas, dibaca AI.
alter table products add column if not exists variants text default '';

-- Promo per akun. product_ids kosong = berlaku untuk SEMUA produk.
create table if not exists promos (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  title text not null,
  description text default '',
  banner_url text default '',           -- URL banner (auto-convert Drive → CDN di frontend)
  product_ids uuid[] default '{}',      -- daftar produk yang kena promo; kosong = semua
  is_active boolean not null default true,
  created_at timestamptz default now()
);

create index if not exists idx_promos_account on promos(account_id);

alter table promos enable row level security;
drop policy if exists "promos owner all" on promos;
create policy "promos owner all" on promos for all to authenticated
  using (account_id in (select id from accounts where owner_id = auth.uid()))
  with check (account_id in (select id from accounts where owner_id = auth.uid()));

-- ============================================================
-- FUNCTION: get_ai_context — kumpulkan konteks 1 percakapan untuk AI (dipanggil N8N via RPC).
-- Mengembalikan produk (aktif) + knowledge + promo (aktif) + 20 pesan terakhir + fase order.
-- ============================================================
create or replace function public.get_ai_context(p_conversation_id uuid, p_session text)
returns json as $$
declare
  v_account_id uuid;
  v_bank_account text;
  v_conversation record;
  v_messages json;
  v_products json;
  v_knowledge json;
  v_promos json;
begin
  select id, bank_account into v_account_id, v_bank_account from accounts where waha_session = p_session limit 1;
  select * into v_conversation from conversations where id = p_conversation_id;

  select json_agg(row_to_json(m)) into v_messages
  from (
    select direction, body, type, created_at
    from messages where conversation_id = p_conversation_id
    order by created_at desc limit 20
  ) m;

  select json_agg(row_to_json(p)) into v_products
  from (
    select name, description, price, stock, image_url, category, variants
    from products where account_id = v_account_id and is_active = true
  ) p;

  select json_agg(row_to_json(k)) into v_knowledge
  from (
    select title, content, tags
    from knowledge where account_id = v_account_id
  ) k;

  select json_agg(row_to_json(pr)) into v_promos
  from (
    select title, description, banner_url, product_ids
    from promos where account_id = v_account_id and is_active = true
  ) pr;

  return json_build_object(
    'dataBarang', coalesce(v_products, '[]'::json),
    'dataToko', coalesce(v_knowledge, '[]'::json),
    'dataPromo', coalesce(v_promos, '[]'::json),
    'riwayat', coalesce(v_messages, '[]'::json),
    'fase', coalesce(v_conversation.order_status, 'none'),
    'orderStatus', coalesce(v_conversation.order_status, 'none'),
    'rekeningTF', coalesce(v_bank_account, '')
  );
end;
$$ language plpgsql security definer;

-- ============================================================
-- TAMBAHAN: Kolom untuk link chat di notifikasi
-- ============================================================
alter table notifications add column if not exists conversation_id uuid references conversations(id) on delete cascade;
alter table notifications add column if not exists customer_phone text;

-- ============================================================
-- TRIGGER: Notifikasi Otomatis untuk Komplain & Confidence Rendah
-- ============================================================
create or replace function public.trg_conversations_notify() returns trigger as $$
declare
  v_threshold int;
begin
  select confidence_threshold into v_threshold from accounts where id = NEW.account_id;

  -- Cek Komplain
  if NEW.order_status = 'complaint' and OLD.order_status != 'complaint' then
    insert into notifications (account_id, level, message, conversation_id, customer_phone)
    values (NEW.account_id, 'error', 'Ada komplain baru dari pelanggan', NEW.id, NEW.customer_phone);
  end if;

  -- Cek Confidence
  if NEW.confidence < v_threshold and OLD.confidence >= v_threshold then
    insert into notifications (account_id, level, message, conversation_id, customer_phone)
    values (NEW.account_id, 'warn', 'Confidence AI rendah (' || NEW.confidence || '%), butuh bantuan manusia', NEW.id, NEW.customer_phone);
  end if;

  -- Cek Takeover (Diambil alih)
  if NEW.handler = 'human' and OLD.handler = 'ai' then
    insert into notifications (account_id, level, message, conversation_id, customer_phone)
    values (NEW.account_id, 'info', 'Percakapan diambil alih (Mode Manusia)', NEW.id, NEW.customer_phone);
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists on_conversation_change on conversations;
create trigger on_conversation_change
  after update on conversations
  for each row execute function public.trg_conversations_notify();

-- ============================================================
-- TRIGGER: Notifikasi Otomatis untuk Order Baru
-- ============================================================
create or replace function public.trg_orders_notify() returns trigger as $$
declare
  v_account_id uuid;
  v_phone text;
begin
  select account_id, customer_phone into v_account_id, v_phone from conversations where id = NEW.conversation_id;
  
  insert into notifications (account_id, level, message, conversation_id, customer_phone)
  values (v_account_id, 'success', 'Order baru (' || upper(NEW.type) || ') telah masuk', NEW.conversation_id, v_phone);
  
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists on_order_insert on orders;
create trigger on_order_insert
  after insert on orders
  for each row execute function public.trg_orders_notify();



-- ============================================================
-- TAMBAHAN: pgvector untuk RAG (Retrieval Augmented Generation)
-- AI cari knowledge yang RELEVAN dengan pertanyaan, bukan semua.
-- Hemat token + AI fokus + jawaban lebih akurat.
-- ============================================================

-- Aktifkan extension pgvector (gratis, bawaan Supabase).
create extension if not exists vector;

-- Tambah kolom embedding di knowledge (1536 dimensi untuk OpenAI text-embedding-3-small).
alter table knowledge add column if not exists embedding vector(1536);

-- Index buat search cepat (cosine similarity).
create index if not exists idx_knowledge_embedding on knowledge
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Function: cari top-N knowledge paling mirip dengan embedding query.
-- Dipanggil N8N via RPC: /rest/v1/rpc/match_knowledge
create or replace function public.match_knowledge(
  query_embedding vector(1536),
  p_account_id uuid,
  match_count int default 3
)
returns table (
  id uuid,
  title text,
  content text,
  tags text,
  similarity float
)
language sql stable as $$
  select
    k.id,
    k.title,
    k.content,
    k.tags,
    1 - (k.embedding <=> query_embedding) as similarity
  from knowledge k
  where k.account_id = p_account_id
    and k.embedding is not null
  order by k.embedding <=> query_embedding
  limit match_count;
$$;

 
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = 
 
 - -   F I T U R :   B a l a s a n   C e p a t   ( Q u i c k   R e p l i e s ) 
 
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = 
 
 c r e a t e   t a b l e   i f   n o t   e x i s t s   q u i c k _ r e p l i e s   ( 
 
     i d   u u i d   p r i m a r y   k e y   d e f a u l t   g e n _ r a n d o m _ u u i d ( ) , 
 
     o w n e r _ i d   u u i d   n o t   n u l l   r e f e r e n c e s   a u t h . u s e r s ( i d )   o n   d e l e t e   c a s c a d e , 
 
     s h o r t c u t   t e x t   n o t   n u l l , 
 
     c o n t e n t   t e x t   n o t   n u l l , 
 
     c r e a t e d _ a t   t i m e s t a m p t z   d e f a u l t   n o w ( ) 
 
 ) ; 
 
 
 
 c r e a t e   i n d e x   i f   n o t   e x i s t s   i d x _ q u i c k _ r e p l i e s _ o w n e r   o n   q u i c k _ r e p l i e s ( o w n e r _ i d ) ; 
 
 
 
 a l t e r   t a b l e   q u i c k _ r e p l i e s   e n a b l e   r o w   l e v e l   s e c u r i t y ; 
 
 
 
 d r o p   p o l i c y   i f   e x i s t s   " o w n   q u i c k _ r e p l i e s   a l l "   o n   q u i c k _ r e p l i e s ; 
 
 c r e a t e   p o l i c y   " o w n   q u i c k _ r e p l i e s   a l l "   o n   q u i c k _ r e p l i e s   f o r   a l l   t o   a u t h e n t i c a t e d 
 
     u s i n g   ( o w n e r _ i d   =   a u t h . u i d ( ) ) 
 
     w i t h   c h e c k   ( o w n e r _ i d   =   a u t h . u i d ( ) ) ; 
 
 


-- Izinkan admin menghapus notifikasi (dari dashboard, tombol Hapus Semua).
drop policy if exists "own notifications delete" on notifications;
create policy "own notifications delete" on notifications for delete to authenticated
  using (account_id is null or account_id in (select id from accounts where owner_id = auth.uid()));
