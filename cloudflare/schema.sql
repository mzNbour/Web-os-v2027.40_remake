-- Cloudflare D1 Schema for WeTalks
-- Execute this in Cloudflare Dashboard -> Workers & Pages -> D1 -> your-database -> Console

-- 1. Users table (ユーザーテーブル)
CREATE TABLE IF NOT EXISTS wetalks_users (
  username TEXT PRIMARY KEY,
  password_numeric TEXT NOT NULL DEFAULT '',
  password_hash TEXT DEFAULT '',
  token TEXT DEFAULT '',
  avatar_base64 TEXT DEFAULT ''
);

-- 2. Rooms table (トークルームテーブル)
CREATE TABLE IF NOT EXISTS wetalks_rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  members_json TEXT DEFAULT '',
  created_by TEXT DEFAULT ''
);

-- 3. Messages table (メッセージテーブル)
CREATE TABLE IF NOT EXISTS wetalks_messages (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  sender TEXT NOT NULL,
  text TEXT NOT NULL,
  image_base64 TEXT DEFAULT '',
  reply_to_json TEXT DEFAULT '',
  read_by_json TEXT DEFAULT '',
  created_at TEXT NOT NULL
);

-- 4. Deleted Rooms blocklist table (削除済みルーム管理)
CREATE TABLE IF NOT EXISTS wetalks_deleted_rooms (
  id TEXT PRIMARY KEY
);

-- 5. Active Presence table (リアルタイムオンライン管理)
CREATE TABLE IF NOT EXISTS wetalks_presence (
  client_id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  room_id TEXT DEFAULT '',
  last_seen INTEGER NOT NULL
);

-- Indices for high performance query
CREATE INDEX IF NOT EXISTS idx_messages_room_created ON wetalks_messages(room_id, created_at);
CREATE INDEX IF NOT EXISTS idx_users_token ON wetalks_users(token);
CREATE INDEX IF NOT EXISTS idx_presence_last_seen ON wetalks_presence(last_seen);
