CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. auth_users
CREATE TABLE IF NOT EXISTS auth_users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 2. accounts
CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id uuid REFERENCES auth_users(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL,
  color text,
  n8n_webhook_url text,
  confidence_threshold integer DEFAULT 75,
  bank_account text,
  admin_notify_phone text,
  wa_phone_number_id text,
  wa_access_token text,
  meta_verify_token text,
  session_status text,
  webhook_url text,
  origin_city_id text,
  origin_label text,
  created_at timestamptz DEFAULT now()
);

-- 3. conversations
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
  customer_phone text NOT NULL,
  customer_name text,
  chat_id text,
  handler text DEFAULT 'ai',
  order_status text DEFAULT 'none',
  confidence integer DEFAULT 100,
  last_preview text,
  last_time timestamptz,
  unread integer DEFAULT 0,
  tags text,
  summary text,
  created_at timestamptz DEFAULT now()
);

-- 4. messages
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  external_message_id text,
  reply_to_message_id text,
  direction text NOT NULL,
  type text NOT NULL,
  content text NOT NULL,
  media_url text,
  status text,
  from_me boolean,
  created_at timestamptz DEFAULT now()
);

-- 5. orders
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  type text NOT NULL,
  status text NOT NULL,
  address text,
  amount numeric,
  items text,
  note text,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 6. notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
  level text NOT NULL,
  message text NOT NULL,
  conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
  customer_phone text,
  created_at timestamptz DEFAULT now()
);

-- 7. products
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric,
  sku text,
  stock integer,
  image_url text,
  category text,
  is_active boolean DEFAULT true,
  variants text,
  created_at timestamptz DEFAULT now()
);

-- 8. knowledge
CREATE TABLE IF NOT EXISTS knowledge (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  tags text,
  created_at timestamptz DEFAULT now()
);

-- 9. promos
CREATE TABLE IF NOT EXISTS promos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  banner_url text,
  product_ids jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 10. quick_replies
CREATE TABLE IF NOT EXISTS quick_replies (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id uuid REFERENCES auth_users(id) ON DELETE CASCADE,
  shortcut text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 11. templates
CREATE TABLE IF NOT EXISTS templates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
  trigger_text text NOT NULL,
  reply_text text NOT NULL,
  image_url text,
  variants text,
  created_at timestamptz DEFAULT now()
);
