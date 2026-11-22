# WeTalks × Cloudflare Workers & D1 セットアップガイド

WeTalks を Cloudflare (Cloudflare Workers & D1) で動かすための設定手順です。
Webダッシュボードからブラウザだけで完結する方法、または Wrangler CLI を使う方法のどちらでもセットアップできます。

---

## 方法 A: Cloudflare ダッシュボードからブラウザだけで設定する（簡単・推奨）

### ステップ 1: Cloudflare D1 データベースの作成
1. [Cloudflare ダッシュボード](https://dash.cloudflare.com/) にログインします。
2. 左メニューの **「Workers & Pages」** → **「D1 SQL データベース」** をクリックします。
3. **「データベースを作成 (Create Database)」** をクリックし、データベース名に `wetalks-db` と入力して作成します。
4. 作成後、`wetalks-db` を開き、**「コンソール (Console)」** タブを選択します。
5. `cloudflare/schema.sql` の内容（下記SQL）を貼り付けて **「実行 (Execute)」** をクリックします：

```sql
CREATE TABLE IF NOT EXISTS wetalks_users (
  username TEXT PRIMARY KEY,
  password_numeric TEXT NOT NULL,
  avatar_base64 TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS wetalks_rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS wetalks_messages (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  sender TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL
);

INSERT OR IGNORE INTO wetalks_rooms (id, name, type) VALUES 
  ('room-general', '全般グループ', 'group'),
  ('room-random', '雑談トーク', 'group'),
  ('room-announcements', 'お知らせ', 'group');

CREATE INDEX IF NOT EXISTS idx_messages_room_created ON wetalks_messages(room_id, created_at);
```

### ステップ 2: Cloudflare Worker の作成とコードの貼り付け
1. 左メニューの **「Workers & Pages」** → **「概要」** → **「作成 (Create application)」** → **「Worker を作成」** をクリックします。
2. Worker 名を `wetalks-backend` などにして「デプロイ」をクリックします。
3. デプロイ後、**「コードを編集 (Edit code)」** をクリックします。
4. エディタに `cloudflare/worker.js` の全コードをそのまま貼り付けて、**「保存してデプロイ (Save and deploy)」** をクリックします。

### ステップ 3: Worker に D1 データベースをバインドする
1. Worker の画面に戻り、**「設定 (Settings)」** → **「変数とシークレット (Variables and Secrets)」** または **「Bindings (バインディング)」** を開きます。
2. **「D1 データベース バインディングの追加 (Add D1 Database binding)」** をクリックします。
   - **変数名 (Variable name)**: `DB` （※必ず大文字で `DB` と入力）
   - **D1 データベース**: 先ほど作成した `wetalks-db` を選択
3. 「保存してデプロイ」をクリックします。

### ステップ 4: WeTalks アプリに Worker URL を設定
1. Worker の概要ページ上部に表示されている **URL**（例: `https://wetalks-backend.your-subdomain.workers.dev`）をコピーします。
2. WeTalks の **「設定 (⚙)」** アイコンを開きます（パスキー: `0123`）。
3. **「Cloudflare Worker 設定」** にコピーした URL を貼り付けて **「保存して戻る」** をクリックします。
4. 「接続テスト」ボタンで緑色の「接続成功」と表示されれば完了です！

---

## 方法 B: Wrangler CLI (コマンドライン) でデプロイする場合

```bash
# 1. ログイン
npx wrangler login

# 2. D1 データベースの作成
npx wrangler d1 create wetalks-db

# 3. 出力された database_id を wrangler.toml に記載

# 4. スキーマの適用
npx wrangler d1 execute wetalks-db --file=./cloudflare/schema.sql --remote

# 5. Worker のデプロイ
npx wrangler deploy
```
デプロイ後に表示される URL を WeTalks の設定画面に入力するだけで完了です。
