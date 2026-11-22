/**
 * Cloudflare Worker for WeTalks Messenger
 * Supports Cloudflare D1 Database and Cloudflare KV Storage
 * - Salted PBKDF2 password hashing & Bearer token authentication
 * - Anti-hijack username rename & server-enforced sender
 * - Automatic 10-day image expiration (on read + scheduled cron + manual admin prune)
 * - Admin inspection & management endpoints (/api/wetalks/admin/*)
 */

const IMAGE_RETENTION_DAYS = 10;
const IMAGE_RETENTION_MS = IMAGE_RETENTION_DAYS * 24 * 60 * 60 * 1000;
const ADMIN_PASSCODES = new Set(['mozunbu1203']);

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

function timingSafeEqualHex(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function hashPassword(password) {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return 'pbkdf2:' + toHex(salt) + ':' + toHex(bits);
}

async function verifyPassword(password, user) {
  const hashStr = user.password_hash || (String(user.password_numeric || '').startsWith('pbkdf2:') ? user.password_numeric : '');
  if (hashStr && hashStr.startsWith('pbkdf2:')) {
    const parts = hashStr.split(':');
    if (parts.length !== 3) return false;
    const salt = fromHex(parts[1]);
    const expectedHex = parts[2];
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      256
    );
    return timingSafeEqualHex(toHex(bits), expectedHex);
  }
  if (user.password_numeric) {
    return String(user.password_numeric) === String(password);
  }
  return false;
}

function generateToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

function getRequestToken(request, body) {
  const auth = request.headers.get('Authorization') || '';
  if (auth.startsWith('Bearer ')) {
    return auth.slice(7).trim();
  }
  if (body && body.token) {
    return String(body.token).trim();
  }
  return '';
}

function isAdminAuthorized(request, url, body) {
  const headerCode = request.headers.get('x-admin-passcode');
  const queryCode = url.searchParams.get('passcode');
  const bodyCode = body && body.passcode;
  const code = String(headerCode || queryCode || bodyCode || '').trim();
  return ADMIN_PASSCODES.has(code);
}

let d1SchemaReady = false;

async function ensureD1Schema(db) {
  if (!db || d1SchemaReady) return;
  const stmts = [
    'CREATE TABLE IF NOT EXISTS wetalks_users (username TEXT PRIMARY KEY, password_numeric TEXT NOT NULL DEFAULT "", password_hash TEXT DEFAULT "", token TEXT DEFAULT "", avatar_base64 TEXT DEFAULT "")',
    'CREATE TABLE IF NOT EXISTS wetalks_rooms (id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL, members_json TEXT DEFAULT "", created_by TEXT DEFAULT "")',
    'CREATE TABLE IF NOT EXISTS wetalks_messages (id TEXT PRIMARY KEY, room_id TEXT NOT NULL, sender TEXT NOT NULL, text TEXT NOT NULL, image_base64 TEXT DEFAULT "", reply_to_json TEXT DEFAULT "", read_by_json TEXT DEFAULT "", created_at TEXT NOT NULL)',
    'CREATE TABLE IF NOT EXISTS wetalks_deleted_rooms (id TEXT PRIMARY KEY)',
    'CREATE TABLE IF NOT EXISTS wetalks_presence (client_id TEXT PRIMARY KEY, username TEXT NOT NULL, room_id TEXT DEFAULT "", last_seen INTEGER NOT NULL)',
  ];
  let allCreateOk = true;
  for (const sql of stmts) {
    try {
      await db.prepare(sql).run();
    } catch (e) {
      allCreateOk = false;
    }
  }
  const alters = [
    'ALTER TABLE wetalks_users ADD COLUMN password_hash TEXT DEFAULT ""',
    'ALTER TABLE wetalks_users ADD COLUMN token TEXT DEFAULT ""',
    'ALTER TABLE wetalks_users ADD COLUMN avatar_base64 TEXT DEFAULT ""',
    'ALTER TABLE wetalks_rooms ADD COLUMN members_json TEXT DEFAULT ""',
    'ALTER TABLE wetalks_rooms ADD COLUMN created_by TEXT DEFAULT ""',
    'ALTER TABLE wetalks_messages ADD COLUMN image_base64 TEXT DEFAULT ""',
    'ALTER TABLE wetalks_messages ADD COLUMN reply_to_json TEXT DEFAULT ""',
    'ALTER TABLE wetalks_messages ADD COLUMN read_by_json TEXT DEFAULT ""',
  ];
  for (const sql of alters) {
    try { await db.prepare(sql).run(); } catch (e) {}
  }
  if (allCreateOk) {
    d1SchemaReady = true;
  }
}

function parseJsonSafe(raw, fallback = null) {
  if (!raw || typeof raw !== 'string') return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function serializeRoomRow(r) {
  if (!r) return null;
  let members = Array.isArray(r.members) ? r.members : null;
  if (!members && typeof r.members_json === 'string' && r.members_json.trim()) {
    const parsed = parseJsonSafe(r.members_json, null);
    if (Array.isArray(parsed)) members = parsed;
  }
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    members: Array.isArray(members) ? members : [],
    created_by: r.created_by || '',
  };
}

function isUserMemberOfRoom(room, username) {
  if (!room || !username || username === 'ゲスト') return false;
  if (Array.isArray(room.members) && room.members.length > 0) {
    return room.members.includes(username);
  }
  if (room.type === 'direct' && room.name) {
    const parts = String(room.name).replace(/@/g, '').split(' & ');
    return parts.length === 2 && (parts[0] === username || parts[1] === username);
  }
  return false;
}

function serializeMessageRow(m) {
  if (!m) return null;
  let replyTo = m.reply_to && typeof m.reply_to === 'object' ? m.reply_to : null;
  if (!replyTo && typeof m.reply_to_json === 'string' && m.reply_to_json.trim()) {
    const parsed = parseJsonSafe(m.reply_to_json, null);
    if (parsed && typeof parsed === 'object' && parsed.id) replyTo = parsed;
  }
  let readBy = Array.isArray(m.read_by) ? m.read_by : null;
  if (!readBy && typeof m.read_by_json === 'string' && m.read_by_json.trim()) {
    const parsedRead = parseJsonSafe(m.read_by_json, null);
    if (Array.isArray(parsedRead)) readBy = parsedRead;
  }
  const cleanReadBy = Array.isArray(readBy)
    ? Array.from(new Set(readBy.map((u) => String(u || '').trim()).filter((u) => u && u !== 'ゲスト' && u !== m.sender)))
    : [];
  const out = {
    id: m.id,
    room_id: m.room_id,
    sender: m.sender,
    text: m.text || '',
    image_base64: m.image_base64 || '',
    read_by: cleanReadBy,
    created_at: m.created_at,
  };
  if (m.image_expired) out.image_expired = true;
  if (replyTo) out.reply_to = replyTo;
  return out;
}

async function markMessagesAsRead(env, roomId, readerUsername) {
  if (!roomId || !readerUsername || readerUsername === 'ゲスト') return 0;
  let updatedCount = 0;
  if (env.DB) {
    await ensureD1Schema(env.DB);
    const { results } = await env.DB.prepare(
      'SELECT id, sender, read_by_json FROM wetalks_messages WHERE room_id = ? AND sender != ?'
    ).bind(roomId, readerUsername).all();
    for (const row of results || []) {
      const parsed = parseJsonSafe(row.read_by_json, []);
      const list = Array.isArray(parsed)
        ? parsed.map((u) => String(u || '').trim()).filter((u) => u && u !== 'ゲスト' && u !== row.sender)
        : [];
      if (!list.includes(readerUsername)) {
        list.push(readerUsername);
        await env.DB.prepare('UPDATE wetalks_messages SET read_by_json = ? WHERE id = ?')
          .bind(JSON.stringify(list), row.id).run();
        updatedCount++;
      }
    }
    return updatedCount;
  }
  if (env.WETALKS_KV) {
    const msgs = (await env.WETALKS_KV.get(`messages:${roomId}`, 'json')) || [];
    let changed = false;
    msgs.forEach((m) => {
      if (m && m.sender !== readerUsername) {
        const list = Array.isArray(m.read_by)
          ? m.read_by.map((u) => String(u || '').trim()).filter((u) => u && u !== 'ゲスト' && u !== m.sender)
          : [];
        if (!list.includes(readerUsername)) {
          list.push(readerUsername);
          m.read_by = list;
          changed = true;
          updatedCount++;
        }
      }
    });
    if (changed) {
      await env.WETALKS_KV.put(`messages:${roomId}`, JSON.stringify(msgs));
    }
  }
  return updatedCount;
}

async function authenticateUser(request, env, body) {
  const token = getRequestToken(request, body);
  if (!token) return null;

  if (env.DB) {
    await ensureD1Schema(env.DB);
    const user = await env.DB.prepare(
      'SELECT username, password_numeric, password_hash, token, avatar_base64 FROM wetalks_users WHERE token = ?'
    ).bind(token).first();
    return user || null;
  }
  if (env.WETALKS_KV) {
    const users = (await env.WETALKS_KV.get('users', 'json')) || [];
    return users.find((u) => u.token && u.token === token) || null;
  }
  return null;
}

async function pruneExpiredImages(env, specificRoomId = null) {
  const cutoffMs = Date.now() - IMAGE_RETENTION_MS;
  const cutoffIso = new Date(cutoffMs).toISOString();
  let pruned = 0;

  if (env.DB) {
    await ensureD1Schema(env.DB);
    try {
      const res = await env.DB.prepare(
        'UPDATE wetalks_messages SET image_base64 = "", text = CASE WHEN TRIM(text) = "" THEN "🖼️ 10日経過により画像は自動削除されました" ELSE text END WHERE image_base64 IS NOT NULL AND image_base64 != "" AND created_at <= ?'
      ).bind(cutoffIso).run();
      pruned = (res && res.meta && res.meta.changes) ? res.meta.changes : 0;
    } catch (e) {}
    return pruned;
  }

  if (env.WETALKS_KV) {
    const roomIds = new Set();
    if (specificRoomId) {
      roomIds.add(specificRoomId);
    } else {
      const rooms = (await env.WETALKS_KV.get('rooms', 'json')) || [];
      rooms.forEach((r) => { if (r && r.id) roomIds.add(r.id); });
    }
    for (const rId of roomIds) {
      const msgs = (await env.WETALKS_KV.get(`messages:${rId}`, 'json')) || [];
      let changed = false;
      msgs.forEach((m) => {
        if (m && m.image_base64) {
          const createdMs = Date.parse(m.created_at || '');
          if (!Number.isNaN(createdMs) && createdMs <= cutoffMs) {
            delete m.image_base64;
            m.image_expired = true;
            changed = true;
            pruned++;
          }
        }
      });
      if (changed) {
        await env.WETALKS_KV.put(`messages:${rId}`, JSON.stringify(msgs));
      }
    }
  }
  return pruned;
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(pruneExpiredImages(env));
  },

  async fetch(request, env, ctx) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-custom-auth, x-admin-passcode',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    const jsonResponse = (data, status = 200) => {
      return new Response(JSON.stringify(data), {
        status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json; charset=utf-8',
        },
      });
    };

    const errorResponse = (msg, status = 400) => {
      return jsonResponse({ error: msg, success: false }, status);
    };

    try {
      // 1. Health check / Ping
      if (path === '/' || path === '/api/wetalks/health' || path === '/health') {
        return jsonResponse({
          status: 'ok',
          service: 'WeTalks Cloudflare Worker',
          hasD1: !!env.DB,
          hasKV: !!env.WETALKS_KV,
          imageRetentionDays: IMAGE_RETENTION_DAYS,
          time: new Date().toISOString(),
        });
      }

      // 2. GET /api/wetalks/users (Public sanitized list: NO passwords or tokens)
      if (path === '/api/wetalks/users' && request.method === 'GET') {
        if (env.DB) {
          await ensureD1Schema(env.DB);
          const { results } = await env.DB.prepare(
            'SELECT username, avatar_base64 FROM wetalks_users ORDER BY username ASC'
          ).all();
          return jsonResponse(results || []);
        } else if (env.WETALKS_KV) {
          const data = (await env.WETALKS_KV.get('users', 'json')) || [];
          return jsonResponse(
            data.map((u) => ({ username: u.username, avatar_base64: u.avatar_base64 || '' }))
          );
        }
        return jsonResponse([]);
      }

      // 3. POST /api/wetalks/register & POST /api/wetalks/users (Register)
      if ((path === '/api/wetalks/register' || path === '/api/wetalks/users') && request.method === 'POST') {
        const body = await request.json();
        const cleanUsername = String(body.username || '').trim();
        const rawPassword = String(body.password ?? body.password_numeric ?? '').trim();
        const avatar_base64 = String(body.avatar_base64 || '');

        if (!cleanUsername || !rawPassword) {
          return errorResponse('ユーザー名とパスワードを入力してください。', 400);
        }
        if (cleanUsername === 'ゲスト') {
          return errorResponse('このユーザー名は使用できません。', 400);
        }
        if (cleanUsername.length > 24) {
          return errorResponse('ユーザー名は24文字以内で入力してください。', 400);
        }
        if (rawPassword.length < 4) {
          return errorResponse('パスワードは4文字以上で入力してください。', 400);
        }

        const password_hash = await hashPassword(rawPassword);
        const token = generateToken();

        if (env.DB) {
          await ensureD1Schema(env.DB);
          const existing = await env.DB.prepare(
            'SELECT username FROM wetalks_users WHERE LOWER(TRIM(username)) = LOWER(?)'
          ).bind(cleanUsername).first();
          if (existing) {
            return errorResponse('このユーザー名は既に登録されています。', 409);
          }

          await env.DB.prepare(
            'INSERT INTO wetalks_users (username, password_numeric, password_hash, token, avatar_base64) VALUES (?, ?, ?, ?, ?)'
          ).bind(cleanUsername, password_hash, password_hash, token, avatar_base64).run();

          return jsonResponse({
            success: true,
            token,
            user: { username: cleanUsername, avatar_base64 },
          });
        } else if (env.WETALKS_KV) {
          let users = (await env.WETALKS_KV.get('users', 'json')) || [];
          if (users.some((u) => u.username.toLowerCase().trim() === cleanUsername.toLowerCase())) {
            return errorResponse('このユーザー名は既に登録されています。', 409);
          }
          users.push({ username: cleanUsername, password_hash, token, avatar_base64 });
          await env.WETALKS_KV.put('users', JSON.stringify(users));
          return jsonResponse({
            success: true,
            token,
            user: { username: cleanUsername, avatar_base64 },
          });
        }

        return errorResponse('Cloudflare D1 または KV がバインドされていません。', 503);
      }

      // 3b. POST /api/wetalks/login
      if (path === '/api/wetalks/login' && request.method === 'POST') {
        const body = await request.json();
        const cleanUsername = String(body.username || '').trim();
        const rawPassword = String(body.password ?? body.password_numeric ?? '').trim();

        if (!cleanUsername || !rawPassword) {
          return errorResponse('ユーザー名とパスワードを入力してください。', 400);
        }

        if (env.DB) {
          await ensureD1Schema(env.DB);
          const user = await env.DB.prepare(
            'SELECT username, password_numeric, password_hash, token, avatar_base64 FROM wetalks_users WHERE LOWER(TRIM(username)) = LOWER(?)'
          ).bind(cleanUsername).first();

          if (!user || !(await verifyPassword(rawPassword, user))) {
            return errorResponse('ユーザー名またはパスワードが正しくありません。', 401);
          }

          const token = user.token || generateToken();
          const newHash = user.password_hash || (String(user.password_numeric || '').startsWith('pbkdf2:') ? user.password_numeric : await hashPassword(rawPassword));
          await env.DB.prepare(
            'UPDATE wetalks_users SET token = ?, password_hash = ? WHERE username = ?'
          ).bind(token, newHash, user.username).run();

          return jsonResponse({
            success: true,
            token,
            user: { username: user.username, avatar_base64: user.avatar_base64 || '' },
          });
        } else if (env.WETALKS_KV) {
          let users = (await env.WETALKS_KV.get('users', 'json')) || [];
          const idx = users.findIndex((u) => u.username.toLowerCase().trim() === cleanUsername.toLowerCase());
          if (idx === -1 || !(await verifyPassword(rawPassword, users[idx]))) {
            return errorResponse('ユーザー名またはパスワードが正しくありません。', 401);
          }
          if (!users[idx].token) users[idx].token = generateToken();
          if (!users[idx].password_hash) {
            users[idx].password_hash = await hashPassword(rawPassword);
            delete users[idx].password_numeric;
          }
          await env.WETALKS_KV.put('users', JSON.stringify(users));
          return jsonResponse({
            success: true,
            token: users[idx].token,
            user: { username: users[idx].username, avatar_base64: users[idx].avatar_base64 || '' },
          });
        }

        return errorResponse('Cloudflare D1 または KV がバインドされていません。', 503);
      }

      // 3c. GET / POST /api/wetalks/auth/me
      if (path === '/api/wetalks/auth/me' && (request.method === 'GET' || request.method === 'POST')) {
        const body = request.method === 'POST' ? await request.json().catch(() => ({})) : {};
        const authUser = await authenticateUser(request, env, body);
        if (!authUser) {
          return errorResponse('認証されていません。', 401);
        }
        return jsonResponse({
          authenticated: true,
          user: { username: authUser.username, avatar_base64: authUser.avatar_base64 || '' },
        });
      }

      // 4. POST /api/wetalks/users/avatar
      if (path === '/api/wetalks/users/avatar' && request.method === 'POST') {
        const body = await request.json();
        const authUser = await authenticateUser(request, env, body);
        if (!authUser) {
          return errorResponse('ログインが必要です。', 401);
        }
        const avatar = String(body.avatar_base64 || '');

        if (env.DB) {
          await env.DB.prepare(
            'UPDATE wetalks_users SET avatar_base64 = ? WHERE username = ?'
          ).bind(avatar, authUser.username).run();
          return jsonResponse({ success: true });
        } else if (env.WETALKS_KV) {
          let users = (await env.WETALKS_KV.get('users', 'json')) || [];
          const idx = users.findIndex((u) => u.username === authUser.username);
          if (idx !== -1) {
            users[idx].avatar_base64 = avatar;
            await env.WETALKS_KV.put('users', JSON.stringify(users));
          }
          return jsonResponse({ success: true });
        }
        return jsonResponse({ success: true });
      }

      // 4b. POST /api/wetalks/users/rename (Authenticated, prevents hijacking)
      if (path === '/api/wetalks/users/rename' && request.method === 'POST') {
        const body = await request.json();
        const authUser = await authenticateUser(request, env, body);
        if (!authUser) {
          return errorResponse('ログインが必要です。再ログインしてください。', 401);
        }
        const newTrimmed = String(body.newUsername || '').trim();
        if (!newTrimmed) return errorResponse('新しいユーザー名を入力してください。', 400);
        if (newTrimmed === 'ゲスト') return errorResponse('このユーザー名は使用できません。', 400);
        if (newTrimmed.length > 24) return errorResponse('ユーザー名は24文字以内で入力してください。', 400);

        const oldName = authUser.username;
        if (newTrimmed === oldName) {
          return jsonResponse({ success: true, username: newTrimmed });
        }

        if (env.DB) {
          const conflict = await env.DB.prepare(
            'SELECT username FROM wetalks_users WHERE LOWER(TRIM(username)) = LOWER(?) AND username != ?'
          ).bind(newTrimmed, oldName).first();
          if (conflict) return errorResponse('このユーザー名は既に使用されているため変更できません。', 409);

          await env.DB.prepare(
            'UPDATE wetalks_users SET username = ? WHERE username = ?'
          ).bind(newTrimmed, oldName).run();
          await env.DB.prepare(
            'UPDATE wetalks_messages SET sender = ? WHERE sender = ?'
          ).bind(newTrimmed, oldName).run();

          const { results: allRooms } = await env.DB.prepare(
            'SELECT id, name, type, members_json, created_by FROM wetalks_rooms'
          ).all();
          for (const r of allRooms || []) {
            const sr = serializeRoomRow(r);
            let nextName = r.name;
            let nextMembers = sr.members;
            let changed = false;
            if (Array.isArray(nextMembers) && nextMembers.includes(oldName)) {
              nextMembers = Array.from(new Set(nextMembers.map((m) => (m === oldName ? newTrimmed : m))));
              changed = true;
            }
            let nextCreatedBy = sr.created_by;
            if (nextCreatedBy === oldName) {
              nextCreatedBy = newTrimmed;
              changed = true;
            }
            if (r.type === 'direct') {
              const parts = String(r.name || '').replace(/@/g, '').split(' & ');
              if (parts.length === 2 && (parts[0] === oldName || parts[1] === oldName)) {
                const updatedParts = parts.map((p) => (p === oldName ? newTrimmed : p)).sort();
                nextName = '@' + updatedParts[0] + ' & @' + updatedParts[1];
                changed = true;
              }
            }
            if (changed) {
              await env.DB.prepare(
                'UPDATE wetalks_rooms SET name = ?, members_json = ?, created_by = ? WHERE id = ?'
              ).bind(nextName, JSON.stringify(nextMembers), nextCreatedBy, r.id).run();
            }
          }
          const { results: replyMsgs } = await env.DB.prepare(
            'SELECT id, sender, reply_to_json, read_by_json FROM wetalks_messages WHERE (reply_to_json IS NOT NULL AND reply_to_json != "") OR (read_by_json IS NOT NULL AND read_by_json != "")'
          ).all();
          for (const rm of replyMsgs || []) {
            let nextReply = rm.reply_to_json;
            let nextReadBy = rm.read_by_json;
            let changedMsg = false;
            if (rm.reply_to_json) {
              const parsed = parseJsonSafe(rm.reply_to_json, null);
              if (parsed && parsed.sender === oldName) {
                parsed.sender = newTrimmed;
                nextReply = JSON.stringify(parsed);
                changedMsg = true;
              }
            }
            if (rm.read_by_json) {
              const parsedRead = parseJsonSafe(rm.read_by_json, null);
              if (Array.isArray(parsedRead) && parsedRead.includes(oldName)) {
                const updatedRead = Array.from(new Set(parsedRead.map((r) => (r === oldName ? newTrimmed : r)).filter((r) => r && r !== rm.sender)));
                nextReadBy = JSON.stringify(updatedRead);
                changedMsg = true;
              }
            }
            if (changedMsg) {
              await env.DB.prepare('UPDATE wetalks_messages SET reply_to_json = ?, read_by_json = ? WHERE id = ?')
                .bind(nextReply || '', nextReadBy || '', rm.id).run();
            }
          }
          return jsonResponse({ success: true, username: newTrimmed });
        } else if (env.WETALKS_KV) {
          let users = (await env.WETALKS_KV.get('users', 'json')) || [];
          const conflict = users.some(
            (u) => u.username.toLowerCase().trim() === newTrimmed.toLowerCase() && u.username !== oldName
          );
          if (conflict) return errorResponse('このユーザー名は既に使用されているため変更できません。', 409);
          const idx = users.findIndex((u) => u.username === oldName);
          if (idx !== -1) {
            users[idx].username = newTrimmed;
            await env.WETALKS_KV.put('users', JSON.stringify(users));
          }
          let rooms = (await env.WETALKS_KV.get('rooms', 'json')) || [];
          rooms.forEach((r) => {
            if (r.created_by === oldName) r.created_by = newTrimmed;
            if (Array.isArray(r.members)) {
              r.members = Array.from(new Set(r.members.map((m) => (m === oldName ? newTrimmed : m))));
            }
            if (r.type === 'direct' && r.name) {
              const parts = r.name.replace(/@/g, '').split(' & ');
              if (parts.length === 2 && (parts[0] === oldName || parts[1] === oldName)) {
                const updatedParts = parts.map((p) => (p === oldName ? newTrimmed : p)).sort();
                r.name = '@' + updatedParts[0] + ' & @' + updatedParts[1];
              }
            }
          });
          await env.WETALKS_KV.put('rooms', JSON.stringify(rooms));
          for (const r of rooms) {
            const rms = (await env.WETALKS_KV.get(`messages:${r.id}`, 'json')) || [];
            let msgChanged = false;
            rms.forEach((m) => {
              if (m.sender === oldName) { m.sender = newTrimmed; msgChanged = true; }
              if (m.reply_to && m.reply_to.sender === oldName) { m.reply_to.sender = newTrimmed; msgChanged = true; }
              if (Array.isArray(m.read_by) && m.read_by.includes(oldName)) {
                m.read_by = Array.from(new Set(m.read_by.map((rb) => (rb === oldName ? newTrimmed : rb)).filter((rb) => rb && rb !== m.sender)));
                msgChanged = true;
              }
            });
            if (msgChanged) {
              await env.WETALKS_KV.put(`messages:${r.id}`, JSON.stringify(rms));
            }
          }
          return jsonResponse({ success: true, username: newTrimmed });
        }
        return jsonResponse({ success: true, username: newTrimmed });
      }

      // 4c. POST /api/wetalks/presence (Real active online presence with 20s TTL, deduplicated by username)
      if (path === '/api/wetalks/presence' && request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const authUser = await authenticateUser(request, env, body);
        const clientId = String(body.clientId || '').trim();
        const rawUsername = authUser ? authUser.username : String(body.username || '').trim();
        const roomId = body.roomId ? String(body.roomId) : '';
        const isOffline = body.offline === true;
        const now = Date.now();
        const ttlCutoff = now - 20000;

        let onlineUsers = [];
        let roomMembers = [];

        if (env.DB) {
          await ensureD1Schema(env.DB);
          if (isOffline && clientId) {
            await env.DB.prepare('DELETE FROM wetalks_presence WHERE client_id = ?').bind(clientId).run();
          } else if (clientId && rawUsername && rawUsername !== 'ゲスト') {
            await env.DB.prepare(
              'INSERT OR REPLACE INTO wetalks_presence (client_id, username, room_id, last_seen) VALUES (?, ?, ?, ?)'
            ).bind(clientId, rawUsername, roomId, now).run();
          }
          await env.DB.prepare('DELETE FROM wetalks_presence WHERE last_seen < ?').bind(ttlCutoff).run();
          const { results } = await env.DB.prepare(
            'SELECT client_id, username, room_id FROM wetalks_presence WHERE last_seen >= ?'
          ).bind(ttlCutoff).all();

          const userMap = new Map();
          const roomSet = new Set();
          (results || []).forEach((r) => {
            const uname = String(r.username || '').trim();
            if (uname && uname !== 'ゲスト') {
              const key = uname.toLowerCase();
              if (!userMap.has(key)) userMap.set(key, uname);
              if (roomId && r.room_id === roomId) roomSet.add(uname);
            }
          });
          onlineUsers = Array.from(userMap.values());
          roomMembers = Array.from(roomSet);
        } else if (env.WETALKS_KV) {
          let list = (await env.WETALKS_KV.get('presence', 'json')) || [];
          list = list.filter((p) => p && p.last_seen >= ttlCutoff && !(isOffline && clientId && p.client_id === clientId));
          if (!isOffline && clientId && rawUsername && rawUsername !== 'ゲスト') {
            const idx = list.findIndex((p) => p.client_id === clientId);
            const entry = { client_id: clientId, username: rawUsername, room_id: roomId, last_seen: now };
            if (idx >= 0) list[idx] = entry;
            else list.push(entry);
          }
          await env.WETALKS_KV.put('presence', JSON.stringify(list));

          const userMap = new Map();
          const roomSet = new Set();
          list.forEach((p) => {
            const uname = String(p.username || '').trim();
            if (uname && uname !== 'ゲスト') {
              const key = uname.toLowerCase();
              if (!userMap.has(key)) userMap.set(key, uname);
              if (roomId && p.room_id === roomId) roomSet.add(uname);
            }
          });
          onlineUsers = Array.from(userMap.values());
          roomMembers = Array.from(roomSet);
        }

        const fallbackSelf = (!isOffline && rawUsername && rawUsername !== 'ゲスト') ? 1 : 0;
        return jsonResponse({
          presenceSupported: true,
          onlineCount: onlineUsers.length > 0 ? onlineUsers.length : fallbackSelf,
          onlineUsers,
          roomMembers,
        });
      }

      // 5. GET /api/wetalks/rooms (Strict membership filtering)
      if (path === '/api/wetalks/rooms' && request.method === 'GET') {
        const authUser = await authenticateUser(request, env, null);
        if (!authUser) {
          return jsonResponse([]);
        }
        if (env.DB) {
          await ensureD1Schema(env.DB);
          let deletedSet = new Set();
          try {
            const { results: delRes } = await env.DB.prepare('SELECT id FROM wetalks_deleted_rooms').all();
            if (delRes) delRes.forEach((r) => deletedSet.add(r.id));
          } catch (e) {}
          const { results } = await env.DB.prepare('SELECT id, name, type, members_json, created_by FROM wetalks_rooms').all();
          const rooms = (results || [])
            .filter((r) => !deletedSet.has(r.id))
            .map(serializeRoomRow)
            .filter((r) => isUserMemberOfRoom(r, authUser.username));
          return jsonResponse(rooms);
        } else if (env.WETALKS_KV) {
          let deletedRooms = (await env.WETALKS_KV.get('deleted_rooms', 'json')) || [];
          let rooms = (await env.WETALKS_KV.get('rooms', 'json')) || [];
          const visible = rooms
            .filter((r) => !deletedRooms.includes(r.id))
            .map(serializeRoomRow)
            .filter((r) => isUserMemberOfRoom(r, authUser.username));
          return jsonResponse(visible);
        }
        return jsonResponse([]);
      }

      // 6. POST /api/wetalks/rooms (Create Room with selected members - Authenticated)
      if (path === '/api/wetalks/rooms' && request.method === 'POST') {
        const body = await request.json();
        const authUser = await authenticateUser(request, env, body);
        if (!authUser) {
          return errorResponse('ログインが必要です。', 401);
        }
        const { id, name, type, members } = body;
        if (!id || !name || !type) return errorResponse('Missing fields');

        let roomName = String(name).trim();
        let finalMembers = [authUser.username];

        if (type === 'direct') {
          const memberSet = new Set([authUser.username]);
          if (Array.isArray(members)) {
            members.forEach((m) => {
              const s = String(m || '').trim();
              if (s && s !== 'ゲスト') memberSet.add(s);
            });
          }
          if (memberSet.size < 2 && roomName) {
            const parts = roomName.replace(/@/g, '').split(' & ').map((s) => s.trim()).filter(Boolean);
            parts.forEach((p) => { if (p !== 'ゲスト') memberSet.add(p); });
          }
          const pair = Array.from(memberSet).slice(0, 2);
          if (pair.length !== 2) {
            return errorResponse('1対1トークには相手のユーザーが必要です。', 400);
          }
          pair.sort();
          roomName = '@' + pair[0] + ' & @' + pair[1];
          finalMembers = pair;
        } else {
          const memberSet = new Set([authUser.username]);
          if (Array.isArray(members)) {
            members.forEach((m) => {
              const s = String(m || '').trim();
              if (s && s !== 'ゲスト') memberSet.add(s);
            });
          }
          finalMembers = Array.from(memberSet);
        }

        if (env.DB) {
          await ensureD1Schema(env.DB);
          try {
            await env.DB.prepare('DELETE FROM wetalks_deleted_rooms WHERE id = ?').bind(id).run();
          } catch (e) {}

          if (type === 'direct') {
            const { results: existingDirects } = await env.DB.prepare(
              'SELECT id, name, type, members_json, created_by FROM wetalks_rooms WHERE type = "direct"'
            ).all();
            const dup = (existingDirects || []).map(serializeRoomRow).find((r) =>
              r && ((r.members.includes(finalMembers[0]) && r.members.includes(finalMembers[1])) || r.name === roomName)
            );
            if (dup) {
              return jsonResponse({ success: true, room: dup });
            }
          }

          const existingById = await env.DB.prepare(
            'SELECT id, name, type, members_json, created_by FROM wetalks_rooms WHERE id = ?'
          ).bind(id).first();
          if (existingById) {
            const sr = serializeRoomRow(existingById);
            if (!isUserMemberOfRoom(sr, authUser.username)) {
              return errorResponse('このルームにアクセスする権限がありません。', 403);
            }
            return jsonResponse({ success: true, room: sr });
          }

          await env.DB.prepare(
            'INSERT INTO wetalks_rooms (id, name, type, members_json, created_by) VALUES (?, ?, ?, ?, ?)'
          ).bind(id, roomName, type, JSON.stringify(finalMembers), authUser.username).run();
          return jsonResponse({
            success: true,
            room: { id, name: roomName, type, members: finalMembers, created_by: authUser.username },
          });
        } else if (env.WETALKS_KV) {
          let deletedRooms = (await env.WETALKS_KV.get('deleted_rooms', 'json')) || [];
          deletedRooms = deletedRooms.filter((delId) => delId !== id);
          await env.WETALKS_KV.put('deleted_rooms', JSON.stringify(deletedRooms));

          let rooms = (await env.WETALKS_KV.get('rooms', 'json')) || [];
          if (type === 'direct') {
            const dup = rooms.map(serializeRoomRow).find((r) =>
              r && r.type === 'direct' && ((r.members.includes(finalMembers[0]) && r.members.includes(finalMembers[1])) || r.name === roomName)
            );
            if (dup) {
              return jsonResponse({ success: true, room: dup });
            }
          }
          const existing = rooms.find((r) => r.id === id);
          if (existing) {
            return jsonResponse({ success: true, room: serializeRoomRow(existing) });
          }
          const roomObj = { id, name: roomName, type, members: finalMembers, created_by: authUser.username };
          rooms.push(roomObj);
          await env.WETALKS_KV.put('rooms', JSON.stringify(rooms));
          return jsonResponse({ success: true, room: roomObj });
        }
        return jsonResponse({ success: true, room: { id, name: roomName, type, members: finalMembers, created_by: authUser.username } });
      }

      // 6b. POST /api/wetalks/rooms/:id/invite (Invite members to existing group)
      if (path.startsWith('/api/wetalks/rooms/') && path.endsWith('/invite') && request.method === 'POST') {
        const roomId = decodeURIComponent(path.slice('/api/wetalks/rooms/'.length, -'/invite'.length));
        const body = await request.json().catch(() => ({}));
        const authUser = await authenticateUser(request, env, body);
        if (!authUser) {
          return errorResponse('ログインが必要です。', 401);
        }
        const candidates = [];
        if (Array.isArray(body.members)) body.members.forEach((m) => candidates.push(String(m || '').trim()));
        if (body.username) candidates.push(String(body.username).trim());

        if (env.DB) {
          await ensureD1Schema(env.DB);
          const row = await env.DB.prepare(
            'SELECT id, name, type, members_json, created_by FROM wetalks_rooms WHERE id = ?'
          ).bind(roomId).first();
          if (!row) return errorResponse('トークルームが見つかりません。', 404);
          const room = serializeRoomRow(row);
          if (room.type !== 'group') return errorResponse('グループトークのみメンバーを招待できます。', 400);
          if (!isUserMemberOfRoom(room, authUser.username)) return errorResponse('このグループのメンバーのみ招待できます。', 403);

          const { results: dbUsers } = await env.DB.prepare('SELECT username FROM wetalks_users').all();
          const validUsers = new Set((dbUsers || []).map((u) => u.username));
          const memberSet = new Set(room.members || [authUser.username]);
          const addedMembers = [];
          candidates.forEach((c) => {
            if (c && c !== 'ゲスト' && validUsers.has(c) && !memberSet.has(c)) {
              memberSet.add(c);
              addedMembers.push(c);
            }
          });
          room.members = Array.from(memberSet);
          await env.DB.prepare('UPDATE wetalks_rooms SET members_json = ? WHERE id = ?')
            .bind(JSON.stringify(room.members), roomId).run();
          return jsonResponse({ success: true, room, addedMembers });
        } else if (env.WETALKS_KV) {
          const users = (await env.WETALKS_KV.get('users', 'json')) || [];
          const validUsers = new Set(users.map((u) => u.username));
          let rooms = (await env.WETALKS_KV.get('rooms', 'json')) || [];
          const idx = rooms.findIndex((r) => r.id === roomId);
          if (idx === -1) return errorResponse('トークルームが見つかりません。', 404);
          const room = serializeRoomRow(rooms[idx]);
          if (room.type !== 'group') return errorResponse('グループトークのみメンバーを招待できます。', 400);
          if (!isUserMemberOfRoom(room, authUser.username)) return errorResponse('このグループのメンバーのみ招待できます。', 403);

          const memberSet = new Set(room.members || [authUser.username]);
          const addedMembers = [];
          candidates.forEach((c) => {
            if (c && c !== 'ゲスト' && validUsers.has(c) && !memberSet.has(c)) {
              memberSet.add(c);
              addedMembers.push(c);
            }
          });
          room.members = Array.from(memberSet);
          rooms[idx] = room;
          await env.WETALKS_KV.put('rooms', JSON.stringify(rooms));
          return jsonResponse({ success: true, room, addedMembers });
        }
        return errorResponse('Cloudflare D1 または KV がバインドされていません。', 503);
      }

      // 7. DELETE /api/wetalks/rooms/:id
      if (path.startsWith('/api/wetalks/rooms/') && request.method === 'DELETE') {
        const roomId = decodeURIComponent(path.replace('/api/wetalks/rooms/', ''));
        if (env.DB) {
          await ensureD1Schema(env.DB);
          await env.DB.prepare('INSERT OR IGNORE INTO wetalks_deleted_rooms (id) VALUES (?)').bind(roomId).run();
          await env.DB.prepare('DELETE FROM wetalks_rooms WHERE id = ?').bind(roomId).run();
          await env.DB.prepare('DELETE FROM wetalks_messages WHERE room_id = ?').bind(roomId).run();
          return jsonResponse({ success: true });
        } else if (env.WETALKS_KV) {
          let deletedRooms = (await env.WETALKS_KV.get('deleted_rooms', 'json')) || [];
          if (!deletedRooms.includes(roomId)) {
            deletedRooms.push(roomId);
            await env.WETALKS_KV.put('deleted_rooms', JSON.stringify(deletedRooms));
          }
          let rooms = (await env.WETALKS_KV.get('rooms', 'json')) || [];
          rooms = rooms.filter((r) => r.id !== roomId);
          await env.WETALKS_KV.put('rooms', JSON.stringify(rooms));
          await env.WETALKS_KV.delete(`messages:${roomId}`);
          return jsonResponse({ success: true });
        }
        return jsonResponse({ success: true });
      }

      // 7b. POST /api/wetalks/rooms/:id/read (Mark room messages as read)
      if (path.startsWith('/api/wetalks/rooms/') && path.endsWith('/read') && request.method === 'POST') {
        const roomId = decodeURIComponent(path.slice('/api/wetalks/rooms/'.length, -'/read'.length));
        const body = await request.json().catch(() => ({}));
        const authUser = await authenticateUser(request, env, body);
        if (!authUser) {
          return errorResponse('ログインが必要です。', 401);
        }
        if (env.DB) {
          await ensureD1Schema(env.DB);
          const roomRow = await env.DB.prepare(
            'SELECT id, name, type, members_json, created_by FROM wetalks_rooms WHERE id = ?'
          ).bind(roomId).first();
          if (roomRow && !isUserMemberOfRoom(serializeRoomRow(roomRow), authUser.username)) {
            return errorResponse('このトークルームを閲覧する権限がありません。', 403);
          }
        } else if (env.WETALKS_KV) {
          const rooms = (await env.WETALKS_KV.get('rooms', 'json')) || [];
          const foundRoom = rooms.find((r) => r.id === roomId);
          if (foundRoom && !isUserMemberOfRoom(serializeRoomRow(foundRoom), authUser.username)) {
            return errorResponse('このトークルームを閲覧する権限がありません。', 403);
          }
        }
        const updatedCount = await markMessagesAsRead(env, roomId, authUser.username);
        return jsonResponse({ success: true, updatedCount });
      }

      // 8. GET /api/wetalks/messages/:roomId (Strict room membership check + optional ?markRead=1 + auto-prune 10-day images)
      if (path.startsWith('/api/wetalks/messages/') && request.method === 'GET') {
        const roomId = decodeURIComponent(path.replace('/api/wetalks/messages/', ''));
        const authUser = await authenticateUser(request, env, null);
        if (!authUser) {
          return errorResponse('ログインが必要です。', 401);
        }
        const markRead = url.searchParams.get('markRead') === '1' || url.searchParams.get('markRead') === 'true';
        await pruneExpiredImages(env, roomId);
        if (env.DB) {
          await ensureD1Schema(env.DB);
          const roomRow = await env.DB.prepare(
            'SELECT id, name, type, members_json, created_by FROM wetalks_rooms WHERE id = ?'
          ).bind(roomId).first();
          if (roomRow && !isUserMemberOfRoom(serializeRoomRow(roomRow), authUser.username)) {
            return errorResponse('このトークルームを閲覧する権限がありません。', 403);
          }
          if (markRead) {
            await markMessagesAsRead(env, roomId, authUser.username);
          }
          const { results } = await env.DB.prepare(
            'SELECT id, room_id, sender, text, image_base64, reply_to_json, read_by_json, created_at FROM wetalks_messages WHERE room_id = ? ORDER BY created_at ASC LIMIT 200'
          ).bind(roomId).all();
          return jsonResponse((results || []).map(serializeMessageRow));
        } else if (env.WETALKS_KV) {
          const rooms = (await env.WETALKS_KV.get('rooms', 'json')) || [];
          const foundRoom = rooms.find((r) => r.id === roomId);
          if (foundRoom && !isUserMemberOfRoom(serializeRoomRow(foundRoom), authUser.username)) {
            return errorResponse('このトークルームを閲覧する権限がありません。', 403);
          }
          if (markRead) {
            await markMessagesAsRead(env, roomId, authUser.username);
          }
          const msgs = (await env.WETALKS_KV.get(`messages:${roomId}`, 'json')) || [];
          return jsonResponse(msgs.map(serializeMessageRow));
        }
        return jsonResponse([]);
      }

      // 9. POST /api/wetalks/messages (Authenticated, anti-spoofing, strict membership, supports image_base64 & reply_to)
      if (path === '/api/wetalks/messages' && request.method === 'POST') {
        const body = await request.json();
        const authUser = await authenticateUser(request, env, body);
        if (!authUser) {
          return errorResponse('ログインが必要です。', 401);
        }
        const { id, room_id, text, image_base64, reply_to, created_at } = body;
        const cleanText = String(text || '').trim();
        const cleanImage = typeof image_base64 === 'string' ? image_base64.trim() : '';
        if (!room_id || (!cleanText && !cleanImage)) return errorResponse('Missing fields');
        if (cleanImage) {
          if (!/^data:image\/(png|jpeg|jpg|gif|webp|bmp);base64,[A-Za-z0-9+/=]+$/i.test(cleanImage)) {
            return errorResponse('無効な画像形式です。', 400);
          }
          if (cleanImage.length > 5 * 1024 * 1024) {
            return errorResponse('画像サイズが大きすぎます。', 413);
          }
        }

        let cleanReply = null;
        if (reply_to && typeof reply_to === 'object' && reply_to.id) {
          cleanReply = {
            id: String(reply_to.id).slice(0, 120),
            sender: String(reply_to.sender || '').slice(0, 40),
            text: String(reply_to.text || '').slice(0, 200),
            ...(reply_to.has_image ? { has_image: true } : {}),
          };
        }

        const newMsg = {
          id: id || ('m-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6)),
          room_id,
          sender: authUser.username,
          text: cleanText,
          image_base64: cleanImage,
          ...(cleanReply ? { reply_to: cleanReply } : {}),
          read_by: [],
          created_at: created_at || new Date().toISOString(),
        };

        if (env.DB) {
          await ensureD1Schema(env.DB);
          const roomRow = await env.DB.prepare(
            'SELECT id, name, type, members_json, created_by FROM wetalks_rooms WHERE id = ?'
          ).bind(room_id).first();
          if (roomRow && !isUserMemberOfRoom(serializeRoomRow(roomRow), authUser.username)) {
            return errorResponse('このトークルームに送信する権限がありません。', 403);
          }
          await env.DB.prepare(
            'INSERT OR IGNORE INTO wetalks_messages (id, room_id, sender, text, image_base64, reply_to_json, read_by_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
          ).bind(
            newMsg.id,
            newMsg.room_id,
            newMsg.sender,
            newMsg.text,
            newMsg.image_base64,
            cleanReply ? JSON.stringify(cleanReply) : '',
            '[]',
            newMsg.created_at
          ).run();
          return jsonResponse({ success: true, message: newMsg });
        } else if (env.WETALKS_KV) {
          const rooms = (await env.WETALKS_KV.get('rooms', 'json')) || [];
          const foundRoom = rooms.find((r) => r.id === room_id);
          if (foundRoom && !isUserMemberOfRoom(serializeRoomRow(foundRoom), authUser.username)) {
            return errorResponse('このトークルームに送信する権限がありません。', 403);
          }
          let msgs = (await env.WETALKS_KV.get(`messages:${room_id}`, 'json')) || [];
          if (!msgs.some((m) => m.id === newMsg.id)) {
            msgs.push(newMsg);
            if (msgs.length > 300) msgs = msgs.slice(-300);
            await env.WETALKS_KV.put(`messages:${room_id}`, JSON.stringify(msgs));
          }
          return jsonResponse({ success: true, message: newMsg });
        }

        return errorResponse('Cloudflare D1 または KV がバインドされていません。', 503);
      }

      // 10. Admin Overview & Management Endpoints
      if (path === '/api/wetalks/admin/overview' && request.method === 'GET') {
        if (!isAdminAuthorized(request, url, null)) {
          return errorResponse('管理者認証が必要です。', 401);
        }
        await pruneExpiredImages(env);

        if (env.DB) {
          await ensureD1Schema(env.DB);
          const { results: dbUsers } = await env.DB.prepare(
            'SELECT username, password_numeric, password_hash, avatar_base64 FROM wetalks_users ORDER BY username ASC'
          ).all();
          const { results: dbRooms } = await env.DB.prepare(
            'SELECT id, name, type, members_json, created_by FROM wetalks_rooms'
          ).all();
          const { results: dbMsgs } = await env.DB.prepare(
            'SELECT id, room_id, sender, text, image_base64, created_at FROM wetalks_messages ORDER BY created_at DESC LIMIT 50'
          ).all();
          const totalMsgRow = await env.DB.prepare('SELECT COUNT(*) as cnt FROM wetalks_messages').first();
          const totalImgRow = await env.DB.prepare('SELECT COUNT(*) as cnt FROM wetalks_messages WHERE image_base64 IS NOT NULL AND image_base64 != ""').first();
          const { results: msgCounts } = await env.DB.prepare(
            'SELECT room_id, COUNT(*) as cnt FROM wetalks_messages GROUP BY room_id'
          ).all();

          const countMap = new Map((msgCounts || []).map((r) => [r.room_id, Number(r.cnt || 0)]));
          const roomMap = new Map((dbRooms || []).map((r) => [r.id, r.name]));

          return jsonResponse({
            success: true,
            backend: 'Cloudflare D1',
            hasD1: true,
            hasKV: !!env.WETALKS_KV,
            storage_verified: true,
            image_retention_days: IMAGE_RETENTION_DAYS,
            checked_at: new Date().toISOString(),
            counts: {
              users: (dbUsers || []).length,
              rooms: (dbRooms || []).length,
              messages: Number((totalMsgRow && totalMsgRow.cnt) || 0),
              images: Number((totalImgRow && totalImgRow.cnt) || 0),
            },
            users: (dbUsers || []).map((u) => ({
              username: u.username,
              has_password: !!(u.password_hash || u.password_numeric),
              password_storage: u.password_hash ? 'PBKDF2暗号化保存済み' : (u.password_numeric ? '保存済み' : '未設定'),
              avatar_base64: u.avatar_base64 || '',
            })),
            rooms: (dbRooms || []).map((r) => {
              const sr = serializeRoomRow(r);
              return {
                id: sr.id,
                name: sr.name,
                type: sr.type,
                members: sr.members,
                message_count: countMap.get(sr.id) || 0,
              };
            }),
            recent_messages: (dbMsgs || []).map((m) => {
              const createdMs = Date.parse(m.created_at || '');
              return {
                id: m.id,
                room_id: m.room_id,
                room_name: roomMap.get(m.room_id) || m.room_id,
                sender: m.sender,
                text: m.text,
                has_image: !!m.image_base64,
                image_base64: m.image_base64 || '',
                image_expired: false,
                created_at: m.created_at,
                image_expires_at: m.image_base64 && !Number.isNaN(createdMs)
                  ? new Date(createdMs + IMAGE_RETENTION_MS).toISOString()
                  : null,
              };
            }),
          });
        } else if (env.WETALKS_KV) {
          const kvUsers = (await env.WETALKS_KV.get('users', 'json')) || [];
          const kvRooms = (await env.WETALKS_KV.get('rooms', 'json')) || [];
          const roomMap = new Map(kvRooms.map((r) => [r.id, r.name]));
          let allMsgs = [];
          const roomList = [];
          for (const r of kvRooms) {
            const rms = (await env.WETALKS_KV.get(`messages:${r.id}`, 'json')) || [];
            roomList.push({ ...r, message_count: rms.length });
            allMsgs = allMsgs.concat(rms);
          }
          allMsgs.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
          const imagesCount = allMsgs.filter((m) => !!m.image_base64).length;

          return jsonResponse({
            success: true,
            backend: 'Cloudflare KV',
            hasD1: false,
            hasKV: true,
            storage_verified: true,
            image_retention_days: IMAGE_RETENTION_DAYS,
            checked_at: new Date().toISOString(),
            counts: {
              users: kvUsers.length,
              rooms: kvRooms.length,
              messages: allMsgs.length,
              images: imagesCount,
            },
            users: kvUsers.map((u) => ({
              username: u.username,
              has_password: !!(u.password_hash || u.password_numeric),
              password_storage: u.password_hash ? 'PBKDF2暗号化保存済み' : (u.password_numeric ? '保存済み' : '未設定'),
              avatar_base64: u.avatar_base64 || '',
            })),
            rooms: roomList,
            recent_messages: allMsgs.slice(0, 50).map((m) => {
              const createdMs = Date.parse(m.created_at || '');
              return {
                id: m.id,
                room_id: m.room_id,
                room_name: roomMap.get(m.room_id) || m.room_id,
                sender: m.sender,
                text: m.text,
                has_image: !!m.image_base64,
                image_base64: m.image_base64 || '',
                image_expired: !!m.image_expired,
                created_at: m.created_at,
                image_expires_at: m.image_base64 && !Number.isNaN(createdMs)
                  ? new Date(createdMs + IMAGE_RETENTION_MS).toISOString()
                  : null,
              };
            }),
          });
        }

        return jsonResponse({
          success: true,
          backend: 'Cloudflare (D1/KV未バインド)',
          hasD1: false,
          hasKV: false,
          storage_verified: false,
          image_retention_days: IMAGE_RETENTION_DAYS,
          checked_at: new Date().toISOString(),
          counts: { users: 0, rooms: 0, messages: 0, images: 0 },
          users: [],
          rooms: [],
          recent_messages: [],
        });
      }

      if (path === '/api/wetalks/admin/prune-images' && request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        if (!isAdminAuthorized(request, url, body)) {
          return errorResponse('管理者認証が必要です。', 401);
        }
        const prunedCount = await pruneExpiredImages(env);
        return jsonResponse({ success: true, prunedCount });
      }

      if (path.startsWith('/api/wetalks/admin/messages/') && request.method === 'DELETE') {
        if (!isAdminAuthorized(request, url, null)) {
          return errorResponse('管理者認証が必要です。', 401);
        }
        const msgId = decodeURIComponent(path.replace('/api/wetalks/admin/messages/', ''));
        if (env.DB) {
          await env.DB.prepare('DELETE FROM wetalks_messages WHERE id = ?').bind(msgId).run();
        } else if (env.WETALKS_KV) {
          const kvRooms = (await env.WETALKS_KV.get('rooms', 'json')) || [];
          for (const r of kvRooms) {
            const rms = (await env.WETALKS_KV.get(`messages:${r.id}`, 'json')) || [];
            const filtered = rms.filter((m) => m.id !== msgId);
            if (filtered.length !== rms.length) {
              await env.WETALKS_KV.put(`messages:${r.id}`, JSON.stringify(filtered));
            }
          }
        }
        return jsonResponse({ success: true });
      }

      if (path.startsWith('/api/wetalks/admin/users/') && request.method === 'DELETE') {
        if (!isAdminAuthorized(request, url, null)) {
          return errorResponse('管理者認証が必要です。', 401);
        }
        const target = decodeURIComponent(path.replace('/api/wetalks/admin/users/', '')).trim().toLowerCase();
        if (env.DB) {
          await env.DB.prepare('DELETE FROM wetalks_users WHERE LOWER(TRIM(username)) = ?').bind(target).run();
        } else if (env.WETALKS_KV) {
          const users = (await env.WETALKS_KV.get('users', 'json')) || [];
          const filtered = users.filter((u) => u.username.toLowerCase().trim() !== target);
          await env.WETALKS_KV.put('users', JSON.stringify(filtered));
        }
        return jsonResponse({ success: true });
      }

      if (path.startsWith('/api/wetalks/admin/rooms/') && path.endsWith('/messages') && request.method === 'GET') {
        if (!isAdminAuthorized(request, url, null)) {
          return errorResponse('管理者認証が必要です。', 401);
        }
        const roomId = decodeURIComponent(path.slice('/api/wetalks/admin/rooms/'.length, -'/messages'.length));
        await pruneExpiredImages(env, roomId);
        if (env.DB) {
          await ensureD1Schema(env.DB);
          const roomRow = await env.DB.prepare(
            'SELECT id, name, type, members_json, created_by FROM wetalks_rooms WHERE id = ?'
          ).bind(roomId).first();
          const { results } = await env.DB.prepare(
            'SELECT id, room_id, sender, text, image_base64, reply_to_json, read_by_json, created_at FROM wetalks_messages WHERE room_id = ? ORDER BY created_at ASC LIMIT 500'
          ).bind(roomId).all();
          const messages = (results || []).map((m) => {
            const sm = serializeMessageRow(m);
            const createdMs = Date.parse(sm.created_at || '');
            return {
              ...sm,
              has_image: !!sm.image_base64,
              image_expires_at: sm.image_base64 && !Number.isNaN(createdMs)
                ? new Date(createdMs + IMAGE_RETENTION_MS).toISOString()
                : null,
            };
          });
          return jsonResponse({
            success: true,
            room: roomRow ? serializeRoomRow(roomRow) : null,
            messages,
          });
        } else if (env.WETALKS_KV) {
          const kvRooms = (await env.WETALKS_KV.get('rooms', 'json')) || [];
          const foundRoom = kvRooms.find((r) => r.id === roomId);
          const msgs = (await env.WETALKS_KV.get(`messages:${roomId}`, 'json')) || [];
          const messages = msgs.map((m) => {
            const sm = serializeMessageRow(m);
            const createdMs = Date.parse(sm.created_at || '');
            return {
              ...sm,
              has_image: !!sm.image_base64,
              image_expires_at: sm.image_base64 && !Number.isNaN(createdMs)
                ? new Date(createdMs + IMAGE_RETENTION_MS).toISOString()
                : null,
            };
          });
          return jsonResponse({
            success: true,
            room: foundRoom ? serializeRoomRow(foundRoom) : null,
            messages,
          });
        }
        return jsonResponse({ success: true, room: null, messages: [] });
      }

      return errorResponse('Endpoint not found: ' + path, 404);
    } catch (e) {
      console.error('Worker error:', e);
      return jsonResponse({ error: e.message || 'Internal Server Error', success: false }, 500);
    }
  },
};
