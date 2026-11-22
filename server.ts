import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';
import {
  GEOGUESSR_MAPS,
  calculateGeoScore,
  getDuelMultiplier,
  haversineDistanceKm,
  pickRandomMapLocations,
  type GeoCoord,
  type GeoMapId,
  type GeoMoveMode,
} from './src/data/geoguessrLocations';

dotenv.config();

type GeoOnlineFormat = 'duels' | 'classic5';

interface GeoPlayerState {
  id: string;
  name: string;
  ws: WebSocket;
  hp: number;
  totalScore: number;
  guess: GeoCoord | null;
  softPin: GeoCoord | null;
  guessedAt: number | null;
  readyForNext: boolean;
  wantsRematch: boolean;
  connected: boolean;
}

interface GeoRoundHistoryEntry {
  roundNumber: number;
  actual: GeoCoord & { panoId?: string; locationLabel?: string };
  multiplier: number;
  results: Record<
    string,
    {
      guess: GeoCoord | null;
      distanceKm: number | null;
      score: number;
      damageDealt: number;
      damageTaken: number;
    }
  >;
}

interface GeoRoomState {
  roomCode: string;
  hostId: string;
  format: GeoOnlineFormat;
  mapId: GeoMapId;
  moveMode: GeoMoveMode;
  roundTimeSec: number;
  status: 'lobby' | 'playing' | 'round_result' | 'match_over';
  currentRound: number;
  maxRounds: number;
  target: GeoCoord & { heading: number; panoId?: string; sdUrl?: string; az?: number; locationLabel?: string };
  roundStartedAt: number | null;
  roundDeadlineAt: number | null;
  countdownEndAt: number | null;
  winnerId: string | null;
  players: GeoPlayerState[];
  history: GeoRoundHistoryEntry[];
  createdAt: number;
}

const geoRooms = new Map<string, GeoRoomState>();
const geoQueue: Array<{
  id: string;
  name: string;
  ws: WebSocket;
  format: GeoOnlineFormat;
  mapId: GeoMapId;
  moveMode: GeoMoveMode;
  roundTimeSec: number;
  joinedAt: number;
}> = [];

function generateGeoRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return geoRooms.has(code) ? generateGeoRoomCode() : code;
}

function serializeGeoRoom(room: GeoRoomState, viewerId: string) {
  const isRevealPhase = room.status === 'round_result' || room.status === 'match_over';
  const lastRound = room.history.length > 0 ? room.history[room.history.length - 1] : null;
  return {
    roomCode: room.roomCode,
    hostId: room.hostId,
    youId: viewerId,
    format: room.format,
    mapId: room.mapId,
    moveMode: room.moveMode,
    roundTimeSec: room.roundTimeSec,
    status: room.status,
    currentRound: room.currentRound,
    maxRounds: room.maxRounds,
    multiplier: room.format === 'duels' ? getDuelMultiplier(room.currentRound) : 1.0,
    target:
      room.status === 'lobby'
        ? null
        : isRevealPhase
        ? room.target
        : {
            lat: room.target.lat,
            lng: room.target.lng,
            heading: room.target.heading,
            panoId: room.target.panoId,
            sdUrl: room.target.sdUrl,
            az: room.target.az,
          },
    roundStartedAt: room.roundStartedAt,
    roundDeadlineAt: room.roundDeadlineAt,
    countdownEndAt: room.countdownEndAt,
    winnerId: room.winnerId,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      hp: p.hp,
      totalScore: p.totalScore,
      hasGuessed: p.guess !== null,
      guess: isRevealPhase || p.id === viewerId ? p.guess : null,
      readyForNext: p.readyForNext,
      wantsRematch: p.wantsRematch,
      connected: p.connected,
    })),
    lastRound,
    history: isRevealPhase ? room.history : [],
  };
}

function broadcastGeoRoom(room: GeoRoomState) {
  room.players.forEach((p) => {
    if (p.ws.readyState === WebSocket.OPEN) {
      p.ws.send(
        JSON.stringify({
          type: 'geo_room_state',
          room: serializeGeoRoom(room, p.id),
        })
      );
    }
  });
}

function startGeoRound(room: GeoRoomState, roundNumber: number) {
  const picked = pickRandomMapLocations(room.mapId, 1)[0];
  const now = Date.now();
  room.status = 'playing';
  room.currentRound = roundNumber;
  room.target = {
    lat: picked.lat,
    lng: picked.lng,
    heading: picked.heading,
    panoId: picked.panoId,
    sdUrl: picked.sdUrl,
    az: picked.az,
  };
  room.roundStartedAt = now;
  room.roundDeadlineAt = room.roundTimeSec > 0 ? now + room.roundTimeSec * 1000 : null;
  room.countdownEndAt = null;
  room.players.forEach((p) => {
    p.guess = null;
    p.softPin = null;
    p.guessedAt = null;
    p.readyForNext = false;
    p.wantsRematch = false;
  });
  broadcastGeoRoom(room);
}

function resolveGeoRound(room: GeoRoomState) {
  if (room.status !== 'playing') return;
  const mapCfg = GEOGUESSR_MAPS[room.mapId] || GEOGUESSR_MAPS.world;
  const multiplier = room.format === 'duels' ? getDuelMultiplier(room.currentRound) : 1.0;

  // Auto-submit soft pins if a player placed one before timeout
  room.players.forEach((p) => {
    if (!p.guess && p.softPin) {
      p.guess = p.softPin;
    }
  });

  const roundScores = room.players.map((p) => {
    if (!p.guess) {
      return { id: p.id, guess: null, distanceKm: null, score: 0 };
    }
    const distanceKm = haversineDistanceKm(p.guess, room.target);
    const score = calculateGeoScore(distanceKm, mapCfg.scaleKm);
    return { id: p.id, guess: p.guess, distanceKm, score };
  });

  const p0 = room.players[0];
  const p1 = room.players[1];
  const s0 = roundScores[0]?.score ?? 0;
  const s1 = roundScores[1]?.score ?? 0;

  if (p0) p0.totalScore += s0;
  if (p1) p1.totalScore += s1;

  let dmgTo0 = 0;
  let dmgTo1 = 0;

  if (room.format === 'duels' && p0 && p1) {
    if (s0 > s1) {
      dmgTo1 = Math.round((s0 - s1) * multiplier);
      p1.hp = Math.max(0, p1.hp - dmgTo1);
    } else if (s1 > s0) {
      dmgTo0 = Math.round((s1 - s0) * multiplier);
      p0.hp = Math.max(0, p0.hp - dmgTo0);
    }
  }

  const results: GeoRoundHistoryEntry['results'] = {};
  if (p0) {
    results[p0.id] = {
      guess: roundScores[0].guess,
      distanceKm: roundScores[0].distanceKm,
      score: s0,
      damageDealt: dmgTo1,
      damageTaken: dmgTo0,
    };
  }
  if (p1) {
    results[p1.id] = {
      guess: roundScores[1].guess,
      distanceKm: roundScores[1].distanceKm,
      score: s1,
      damageDealt: dmgTo0,
      damageTaken: dmgTo1,
    };
  }

  room.history.push({
    roundNumber: room.currentRound,
    actual: { ...room.target },
    multiplier,
    results,
  });

  // Check match end conditions
  if (room.format === 'duels' && p0 && p1 && (p0.hp <= 0 || p1.hp <= 0)) {
    room.status = 'match_over';
    room.winnerId = p0.hp > p1.hp ? p0.id : p1.id;
  } else if (room.format === 'classic5' && room.currentRound >= room.maxRounds) {
    room.status = 'match_over';
    if (p0 && p1) {
      if (p0.totalScore > p1.totalScore) room.winnerId = p0.id;
      else if (p1.totalScore > p0.totalScore) room.winnerId = p1.id;
      else room.winnerId = null; // Draw
    }
  } else {
    room.status = 'round_result';
  }

  room.countdownEndAt = null;
  room.roundDeadlineAt = null;
  broadcastGeoRoom(room);
}

function removePlayerFromGeoQueue(playerId: string) {
  const idx = geoQueue.findIndex((q) => q.id === playerId);
  if (idx !== -1) {
    geoQueue.splice(idx, 1);
  }
}

function leavePlayerGeoRoom(playerId: string) {
  geoRooms.forEach((room, code) => {
    const idx = room.players.findIndex((p) => p.id === playerId);
    if (idx !== -1) {
      room.players.splice(idx, 1);
      if (room.players.length === 0) {
        geoRooms.delete(code);
      } else {
        room.hostId = room.players[0].id;
        room.players.forEach((remaining) => {
          if (remaining.ws.readyState === WebSocket.OPEN) {
            remaining.ws.send(
              JSON.stringify({
                type: 'geo_opponent_left',
                roomCode: code,
              })
            );
          }
        });
        if (room.status === 'playing' || room.status === 'round_result') {
          room.status = 'match_over';
          room.winnerId = room.players[0].id;
        }
        broadcastGeoRoom(room);
      }
    }
  });
}

setInterval(() => {
  const now = Date.now();
  geoRooms.forEach((room) => {
    if (room.status === 'playing') {
      const effectiveDeadline =
        room.countdownEndAt && room.roundDeadlineAt
          ? Math.min(room.countdownEndAt, room.roundDeadlineAt)
          : room.countdownEndAt || room.roundDeadlineAt;
      if (effectiveDeadline && now >= effectiveDeadline) {
        resolveGeoRound(room);
      }
    }
  });
}, 500);


const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Enable CORS for API routes
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-passcode');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// WeTalks Shared Database Types & Helpers
interface WeTalksUser {
  id?: string;
  username: string;
  password_numeric?: string;
  password_hash?: string;
  token?: string;
  avatar_base64: string;
}

interface WeTalksRoom {
  id: string;
  name: string;
  type: string;
  members?: string[];
  created_by?: string;
}

interface WeTalksReplyRef {
  id: string;
  sender: string;
  text: string;
  has_image?: boolean;
}

interface WeTalksMessage {
  id: string;
  room_id: string;
  sender: string;
  text: string;
  image_base64?: string;
  image_expired?: boolean;
  reply_to?: WeTalksReplyRef | null;
  read_by?: string[];
  created_at: string;
}

interface WeTalksDB {
  users: WeTalksUser[];
  rooms: WeTalksRoom[];
  messages: WeTalksMessage[];
  deleted_rooms?: string[];
}

const DB_FILE = path.join(process.cwd(), 'wetalks_db.json');
const IMAGE_RETENTION_DAYS = 10;
const IMAGE_RETENTION_MS = IMAGE_RETENTION_DAYS * 24 * 60 * 60 * 1000;
const ADMIN_PASSCODES = new Set(['mozunbu1203']);

function pruneExpiredWeTalksImages(db: WeTalksDB): number {
  const now = Date.now();
  let pruned = 0;
  if (!Array.isArray(db.messages)) return 0;
  db.messages.forEach(m => {
    if (m && m.image_base64) {
      const createdMs = Date.parse(m.created_at || '');
      if (!Number.isNaN(createdMs) && now - createdMs >= IMAGE_RETENTION_MS) {
        delete m.image_base64;
        m.image_expired = true;
        pruned++;
      }
    }
  });
  if (pruned > 0) {
    writeWeTalksDB(db);
  }
  return pruned;
}

function isAdminAuthorized(req: express.Request): boolean {
  const headerCode = req.headers['x-admin-passcode'];
  const queryCode = req.query.passcode;
  const bodyCode = req.body && req.body.passcode;
  const code = String(headerCode || queryCode || bodyCode || '').trim();
  return ADMIN_PASSCODES.has(code);
}

function readWeTalksDB(): WeTalksDB {
  const defaultRooms: WeTalksRoom[] = [];

  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      const db: WeTalksDB = JSON.parse(data);
      if (!db.deleted_rooms) db.deleted_rooms = [];
      if (!Array.isArray(db.users)) db.users = [];
      if (!Array.isArray(db.messages)) db.messages = [];
      if (!db.rooms) {
        db.rooms = defaultRooms.filter(r => !db.deleted_rooms!.includes(r.id));
        writeWeTalksDB(db);
      } else {
        db.rooms = db.rooms.filter(r => !db.deleted_rooms!.includes(r.id));
      }
      pruneExpiredWeTalksImages(db);
      return db;
    }
  } catch (e) {
    console.error('Error reading wetalks db:', e);
  }
  const initialDB: WeTalksDB = { users: [], rooms: defaultRooms, messages: [], deleted_rooms: [] };
  writeWeTalksDB(initialDB);
  return initialDB;
}

function writeWeTalksDB(db: WeTalksDB) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing wetalks db:', e);
  }
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, user: WeTalksUser): boolean {
  if (user.password_hash) {
    const [salt, storedHash] = user.password_hash.split(':');
    if (!salt || !storedHash) return false;
    const derived = crypto.scryptSync(password, salt, 64).toString('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(storedHash, 'hex'));
    } catch {
      return false;
    }
  }
  if (user.password_numeric) {
    return user.password_numeric === password;
  }
  return false;
}

function getRequestToken(req: express.Request): string {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  if (req.body && req.body.token) {
    return String(req.body.token).trim();
  }
  return '';
}

function authenticateUser(req: express.Request, db: WeTalksDB): WeTalksUser | null {
  const token = getRequestToken(req);
  if (!token) return null;
  return db.users.find(u => u.token && u.token === token) || null;
}

function isUserMemberOfRoom(room: WeTalksRoom, username: string): boolean {
  if (!room || !username || username === 'ゲスト') return false;
  if (Array.isArray(room.members)) {
    return room.members.includes(username);
  }
  if (room.type === 'direct' && room.name) {
    const parts = room.name.replace(/@/g, '').split(' & ');
    return parts.length === 2 && (parts[0] === username || parts[1] === username);
  }
  return false;
}

function markRoomMessagesAsRead(db: WeTalksDB, roomId: string, readerUsername: string): number {
  if (!roomId || !readerUsername || readerUsername === 'ゲスト') return 0;
  let updatedCount = 0;
  db.messages.forEach(m => {
    if (m && m.room_id === roomId && m.sender !== readerUsername) {
      const current = Array.isArray(m.read_by) ? m.read_by.filter(u => u && u !== m.sender) : [];
      if (!current.includes(readerUsername)) {
        current.push(readerUsername);
        m.read_by = current;
        updatedCount++;
      } else if (!Array.isArray(m.read_by)) {
        m.read_by = current;
      }
    }
  });
  if (updatedCount > 0) {
    writeWeTalksDB(db);
  }
  return updatedCount;
}

// WeTalks API Routes
app.get('/api/wetalks/health', (req, res) => {
  res.json({ status: 'ok', service: 'WeTalks Express Server', time: new Date().toISOString() });
});

app.get('/api/wetalks/users', (req, res) => {
  const db = readWeTalksDB();
  res.json(
    db.users.map(u => ({
      username: u.username,
      avatar_base64: u.avatar_base64 || ''
    }))
  );
});

function handleRegisterUser(req: express.Request, res: express.Response) {
  const { username, password, password_numeric, avatar_base64 } = req.body || {};
  const cleanUsername = String(username || '').trim();
  const rawPassword = String(password ?? password_numeric ?? '').trim();

  if (!cleanUsername || !rawPassword) {
    return res.status(400).json({ error: 'ユーザー名とパスワードを入力してください。' });
  }
  if (cleanUsername === 'ゲスト') {
    return res.status(400).json({ error: 'このユーザー名は使用できません。' });
  }
  if (cleanUsername.length > 24) {
    return res.status(400).json({ error: 'ユーザー名は24文字以内で入力してください。' });
  }
  if (rawPassword.length < 4) {
    return res.status(400).json({ error: 'パスワードは4文字以上で入力してください。' });
  }

  const db = readWeTalksDB();
  const lowerUser = cleanUsername.toLowerCase();
  if (db.users.some(u => u.username.toLowerCase().trim() === lowerUser)) {
    return res.status(409).json({ error: 'このユーザー名は既に登録されています。' });
  }

  const token = crypto.randomBytes(24).toString('hex');
  const newUser: WeTalksUser = {
    id: 'u-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex'),
    username: cleanUsername,
    password_hash: hashPassword(rawPassword),
    token,
    avatar_base64: avatar_base64 || ''
  };
  db.users.push(newUser);
  writeWeTalksDB(db);
  res.json({
    success: true,
    token,
    user: {
      username: newUser.username,
      avatar_base64: newUser.avatar_base64
    }
  });
}

app.post('/api/wetalks/register', handleRegisterUser);
app.post('/api/wetalks/users', handleRegisterUser);

app.post('/api/wetalks/login', (req, res) => {
  const { username, password } = req.body || {};
  const cleanUsername = String(username || '').trim();
  const rawPassword = String(password || '').trim();
  if (!cleanUsername || !rawPassword) {
    return res.status(400).json({ error: 'ユーザー名とパスワードを入力してください。' });
  }
  const db = readWeTalksDB();
  const user = db.users.find(u => u.username.toLowerCase().trim() === cleanUsername.toLowerCase());
  if (!user || !verifyPassword(rawPassword, user)) {
    return res.status(401).json({ error: 'ユーザー名またはパスワードが正しくありません。' });
  }
  if (!user.token) {
    user.token = crypto.randomBytes(24).toString('hex');
    writeWeTalksDB(db);
  }
  res.json({
    success: true,
    token: user.token,
    user: {
      username: user.username,
      avatar_base64: user.avatar_base64 || ''
    }
  });
});

app.get('/api/wetalks/auth/me', (req, res) => {
  const db = readWeTalksDB();
  const user = authenticateUser(req, db);
  if (!user) {
    return res.status(401).json({ error: '認証が必要です。' });
  }
  res.json({
    success: true,
    user: {
      username: user.username,
      avatar_base64: user.avatar_base64 || ''
    }
  });
});

app.post('/api/wetalks/auth/me', (req, res) => {
  const db = readWeTalksDB();
  const user = authenticateUser(req, db);
  if (!user) {
    return res.status(401).json({ error: '認証が必要です。' });
  }
  res.json({
    success: true,
    user: {
      username: user.username,
      avatar_base64: user.avatar_base64 || ''
    }
  });
});

app.post('/api/wetalks/users/avatar', (req, res) => {
  const { avatar_base64 } = req.body || {};
  const db = readWeTalksDB();
  const authUser = authenticateUser(req, db);
  if (!authUser) {
    return res.status(401).json({ error: 'ログインが必要です。' });
  }
  authUser.avatar_base64 = avatar_base64 || '';
  writeWeTalksDB(db);
  return res.json({ success: true });
});

app.post('/api/wetalks/users/rename', (req, res) => {
  const { newUsername } = req.body || {};
  const newTrimmed = String(newUsername || '').trim();
  const db = readWeTalksDB();
  const authUser = authenticateUser(req, db);
  if (!authUser) {
    return res.status(401).json({ error: 'ログインが必要です。再ログインしてください。' });
  }
  if (!newTrimmed) {
    return res.status(400).json({ error: '新しいユーザー名を入力してください。' });
  }
  if (newTrimmed === 'ゲスト') {
    return res.status(400).json({ error: 'このユーザー名は使用できません。' });
  }
  if (newTrimmed.length > 24) {
    return res.status(400).json({ error: 'ユーザー名は24文字以内で入力してください。' });
  }

  const oldName = authUser.username;
  if (newTrimmed === oldName) {
    return res.json({ success: true, username: newTrimmed });
  }

  const conflict = db.users.some(
    u =>
      u !== authUser &&
      u.username.toLowerCase().trim() === newTrimmed.toLowerCase()
  );
  if (conflict) {
    return res.status(409).json({ error: 'このユーザー名は既に使用されているため変更できません。' });
  }

  authUser.username = newTrimmed;
  db.messages.forEach(m => {
    if (m.sender === oldName) {
      m.sender = newTrimmed;
    }
    if (m.reply_to && m.reply_to.sender === oldName) {
      m.reply_to.sender = newTrimmed;
    }
    if (Array.isArray(m.read_by) && m.read_by.includes(oldName)) {
      m.read_by = Array.from(new Set(m.read_by.map(r => (r === oldName ? newTrimmed : r)).filter(r => r && r !== m.sender)));
    }
  });
  db.rooms.forEach(r => {
    if (r.created_by === oldName) {
      r.created_by = newTrimmed;
    }
    if (Array.isArray(r.members)) {
      r.members = Array.from(new Set(r.members.map(m => (m === oldName ? newTrimmed : m))));
    }
    if (r.type === 'direct' && r.name) {
      const parts = r.name.replace(/@/g, '').split(' & ');
      if (parts.length === 2 && (parts[0] === oldName || parts[1] === oldName)) {
        const updatedParts = parts.map(p => (p === oldName ? newTrimmed : p)).sort();
        r.name = '@' + updatedParts[0] + ' & @' + updatedParts[1];
      }
    }
  });
  writeWeTalksDB(db);
  res.json({ success: true, username: newTrimmed });
});

const wetalksPresence = new Map<string, { username: string; roomId: string | null; lastSeen: number }>();

app.post('/api/wetalks/presence', (req, res) => {
  const { clientId, username, roomId, offline } = req.body || {};
  const db = readWeTalksDB();
  const authUser = authenticateUser(req, db);
  const resolvedName = authUser ? authUser.username : String(username || '').trim();
  const now = Date.now();
  if (offline && clientId) {
    wetalksPresence.delete(String(clientId));
  } else if (clientId && resolvedName && resolvedName !== 'ゲスト') {
    wetalksPresence.set(String(clientId), {
      username: resolvedName,
      roomId: roomId ? String(roomId) : null,
      lastSeen: now
    });
  }
  for (const [key, val] of wetalksPresence.entries()) {
    if (now - val.lastSeen > 20000) {
      wetalksPresence.delete(key);
    }
  }
  const activeClients = Array.from(wetalksPresence.values());
  const userMap = new Map<string, string>();
  activeClients.forEach(c => {
    const uname = String(c.username || '').trim();
    if (uname && uname !== 'ゲスト') {
      const k = uname.toLowerCase();
      if (!userMap.has(k)) userMap.set(k, uname);
    }
  });
  const onlineUsers = Array.from(userMap.values());
  const roomMembers = roomId
    ? Array.from(new Set(activeClients.filter(c => c.roomId === roomId && c.username !== 'ゲスト').map(c => c.username)))
    : [];
  const fallbackSelf = (!offline && resolvedName && resolvedName !== 'ゲスト') ? 1 : 0;
  res.json({
    presenceSupported: true,
    onlineCount: onlineUsers.length > 0 ? onlineUsers.length : fallbackSelf,
    onlineUsers,
    roomMembers
  });
});

app.get('/api/wetalks/rooms', (req, res) => {
  const db = readWeTalksDB();
  const authUser = authenticateUser(req, db);
  if (!authUser) {
    return res.json([]);
  }
  const visibleRooms = db.rooms.filter(r => isUserMemberOfRoom(r, authUser.username));
  res.json(visibleRooms);
});

app.post('/api/wetalks/rooms', (req, res) => {
  const { id, name, type, members } = req.body || {};
  if (!id || !name || !type) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  const db = readWeTalksDB();
  const authUser = authenticateUser(req, db);
  if (!authUser) {
    return res.status(401).json({ error: 'ログインが必要です。' });
  }
  if (!db.deleted_rooms) db.deleted_rooms = [];
  db.deleted_rooms = db.deleted_rooms.filter(delId => delId !== id);

  if (type === 'direct') {
    const memberSet = new Set<string>([authUser.username]);
    if (Array.isArray(members)) {
      members.forEach((m: unknown) => {
        const s = String(m || '').trim();
        if (s && s !== 'ゲスト') memberSet.add(s);
      });
    }
    if (memberSet.size < 2 && typeof name === 'string') {
      const parts = name.replace(/@/g, '').split(' & ').map(s => s.trim()).filter(Boolean);
      parts.forEach(p => { if (p !== 'ゲスト') memberSet.add(p); });
    }
    const finalMembers = Array.from(memberSet).slice(0, 2);
    if (finalMembers.length !== 2) {
      return res.status(400).json({ error: '1対1トークには相手のユーザーが必要です。' });
    }
    const sorted = [...finalMembers].sort();
    const canonicalName = '@' + sorted[0] + ' & @' + sorted[1];
    const existingDirect = db.rooms.find(r => {
      if (r.type !== 'direct') return false;
      if (Array.isArray(r.members) && r.members.length === 2) {
        return r.members.includes(sorted[0]) && r.members.includes(sorted[1]);
      }
      return r.name === canonicalName;
    });
    if (existingDirect) {
      if (!Array.isArray(existingDirect.members)) {
        existingDirect.members = sorted;
        writeWeTalksDB(db);
      }
      return res.json({ success: true, room: existingDirect });
    }
    const existingById = db.rooms.find(r => r.id === id);
    if (existingById) {
      return res.json({ success: true, room: existingById });
    }
    const newDirectRoom: WeTalksRoom = {
      id,
      name: canonicalName,
      type: 'direct',
      members: sorted,
      created_by: authUser.username
    };
    db.rooms.push(newDirectRoom);
    writeWeTalksDB(db);
    return res.json({ success: true, room: newDirectRoom });
  }

  const existing = db.rooms.find(r => r.id === id);
  if (existing) {
    if (!isUserMemberOfRoom(existing, authUser.username)) {
      return res.status(403).json({ error: 'このルームにアクセスする権限がありません。' });
    }
    return res.json({ success: true, room: existing });
  }

  const registeredUsernames = new Set(db.users.map(u => u.username));
  const memberSet = new Set<string>([authUser.username]);
  if (Array.isArray(members)) {
    members.forEach((m: unknown) => {
      const s = String(m || '').trim();
      if (s && s !== 'ゲスト' && registeredUsernames.has(s)) {
        memberSet.add(s);
      }
    });
  }
  const newRoom: WeTalksRoom = {
    id,
    name: String(name).trim(),
    type: 'group',
    members: Array.from(memberSet),
    created_by: authUser.username
  };
  db.rooms.push(newRoom);
  writeWeTalksDB(db);
  res.json({ success: true, room: newRoom });
});

app.post('/api/wetalks/rooms/:id/invite', (req, res) => {
  const { id } = req.params;
  const { members, username } = req.body || {};
  const db = readWeTalksDB();
  const authUser = authenticateUser(req, db);
  if (!authUser) {
    return res.status(401).json({ error: 'ログインが必要です。' });
  }
  const room = db.rooms.find(r => r.id === id);
  if (!room) {
    return res.status(404).json({ error: 'トークルームが見つかりません。' });
  }
  if (room.type !== 'group') {
    return res.status(400).json({ error: 'グループトークのみメンバーを招待できます。' });
  }
  if (!isUserMemberOfRoom(room, authUser.username)) {
    return res.status(403).json({ error: 'このグループのメンバーのみ招待できます。' });
  }

  const candidates: string[] = [];
  if (Array.isArray(members)) {
    members.forEach((m: unknown) => candidates.push(String(m || '').trim()));
  }
  if (username) {
    candidates.push(String(username).trim());
  }
  const registeredUsernames = new Set(db.users.map(u => u.username));
  const currentMembers = Array.isArray(room.members) ? [...room.members] : [authUser.username];
  const memberSet = new Set<string>(currentMembers);
  const addedMembers: string[] = [];
  candidates.forEach(c => {
    if (c && c !== 'ゲスト' && registeredUsernames.has(c) && !memberSet.has(c)) {
      memberSet.add(c);
      addedMembers.push(c);
    }
  });
  room.members = Array.from(memberSet);
  writeWeTalksDB(db);
  res.json({ success: true, room, addedMembers });
});

app.delete('/api/wetalks/rooms/:id', (req, res) => {
  const { id } = req.params;
  const db = readWeTalksDB();
  if (!db.deleted_rooms) db.deleted_rooms = [];
  if (!db.deleted_rooms.includes(id)) {
    db.deleted_rooms.push(id);
  }
  db.rooms = db.rooms.filter(r => r.id !== id);
  db.messages = db.messages.filter(m => m.room_id !== id);
  writeWeTalksDB(db);
  res.json({ success: true });
});

app.post('/api/wetalks/rooms/:id/read', (req, res) => {
  const { id } = req.params;
  const db = readWeTalksDB();
  const authUser = authenticateUser(req, db);
  if (!authUser) {
    return res.status(401).json({ error: 'ログインが必要です。' });
  }
  const room = db.rooms.find(r => r.id === id);
  if (room && !isUserMemberOfRoom(room, authUser.username)) {
    return res.status(403).json({ error: 'このトークルームを閲覧する権限がありません。' });
  }
  const updatedCount = markRoomMessagesAsRead(db, id, authUser.username);
  if (updatedCount > 0) {
    broadcastWetalksEvent('read', id);
  }
  res.json({ success: true, updatedCount });
});

app.get('/api/wetalks/messages/:roomId', (req, res) => {
  const { roomId } = req.params;
  const db = readWeTalksDB();
  const authUser = authenticateUser(req, db);
  if (!authUser) {
    return res.status(401).json({ error: 'ログインが必要です。' });
  }
  const room = db.rooms.find(r => r.id === roomId);
  if (room && !isUserMemberOfRoom(room, authUser.username)) {
    return res.status(403).json({ error: 'このトークルームを閲覧する権限がありません。' });
  }
  const markRead = req.query.markRead === '1' || req.query.markRead === 'true';
  if (markRead) {
    const updatedCount = markRoomMessagesAsRead(db, roomId, authUser.username);
    if (updatedCount > 0) {
      broadcastWetalksEvent('read', roomId);
    }
  }
  const isSummary = req.query.summary === '1' || req.query.summary === 'true';
  let filtered = db.messages.filter(m => m.room_id === roomId);
  if (isSummary && filtered.length > 30) {
    filtered = filtered.slice(-30);
  }
  const msgs = filtered.map(m => {
    const cleanReadBy = Array.isArray(m.read_by) ? m.read_by.filter(u => u && u !== m.sender) : [];
    if (isSummary) {
      return {
        id: m.id,
        room_id: m.room_id,
        sender: m.sender,
        text: m.text,
        has_image: !!m.image_base64,
        image_expired: !!m.image_expired,
        read_by: cleanReadBy,
        created_at: m.created_at
      };
    }
    return {
      ...m,
      read_by: cleanReadBy
    };
  });
  res.json(msgs);
});

app.post('/api/wetalks/messages', (req, res) => {
  const { id, room_id, text, image_base64, reply_to, created_at } = req.body || {};
  const cleanText = String(text || '').trim();
  const cleanImage = typeof image_base64 === 'string' ? image_base64.trim() : '';
  if (!room_id || (!cleanText && !cleanImage)) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  if (cleanImage) {
    if (!/^data:image\/(png|jpeg|jpg|gif|webp|bmp);base64,[A-Za-z0-9+/=]+$/i.test(cleanImage)) {
      return res.status(400).json({ error: '無効な画像形式です。' });
    }
    if (cleanImage.length > 5 * 1024 * 1024) {
      return res.status(413).json({ error: '画像サイズが大きすぎます。' });
    }
  }
  const db = readWeTalksDB();
  const authUser = authenticateUser(req, db);
  if (!authUser) {
    return res.status(401).json({ error: 'ログインが必要です。' });
  }
  const room = db.rooms.find(r => r.id === room_id);
  if (room && !isUserMemberOfRoom(room, authUser.username)) {
    return res.status(403).json({ error: 'このトークルームに送信する権限がありません。' });
  }
  const msgId = id || ('m-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4));
  const existing = db.messages.find(m => m.id === msgId);
  if (existing) {
    return res.json({ success: true, message: existing });
  }
  let cleanReply: WeTalksReplyRef | null = null;
  if (reply_to && typeof reply_to === 'object' && reply_to.id) {
    cleanReply = {
      id: String(reply_to.id).slice(0, 120),
      sender: String(reply_to.sender || '').slice(0, 40),
      text: String(reply_to.text || '').slice(0, 200),
      ...(reply_to.has_image ? { has_image: true } : {})
    };
  }
  const newMsg: WeTalksMessage = {
    id: msgId,
    room_id,
    sender: authUser.username,
    text: cleanText,
    ...(cleanImage ? { image_base64: cleanImage } : {}),
    ...(cleanReply ? { reply_to: cleanReply } : {}),
    read_by: [],
    created_at: created_at || new Date().toISOString()
  };
  db.messages.push(newMsg);
  writeWeTalksDB(db);
  broadcastWetalksEvent('message', room_id, {
    message: {
      id: newMsg.id,
      room_id,
      sender: authUser.username,
      text: cleanText.slice(0, 300),
      has_image: !!cleanImage,
      created_at: newMsg.created_at
    },
    roomName: room?.name || '',
    members: Array.isArray(room?.members) ? room.members : undefined
  });
  res.json({ success: true, message: newMsg });
});

// Admin Overview & Management Routes
app.get('/api/wetalks/admin/overview', (req, res) => {
  if (!isAdminAuthorized(req)) {
    return res.status(401).json({ error: '管理者認証が必要です。' });
  }
  const db = readWeTalksDB();
  const roomMap = new Map(db.rooms.map(r => [r.id, r.name]));
  const imagesCount = db.messages.filter(m => !!m.image_base64).length;

  const users = db.users.map(u => ({
    username: u.username,
    has_password: !!(u.password_hash || u.password_numeric),
    password_storage: u.password_hash ? 'scrypt暗号化保存済み' : (u.password_numeric ? '保存済み' : '未設定'),
    avatar_base64: u.avatar_base64 || ''
  }));

  const rooms = db.rooms.map(r => ({
    id: r.id,
    name: r.name,
    type: r.type,
    members: Array.isArray(r.members) ? r.members : [],
    message_count: db.messages.filter(m => m.room_id === r.id).length
  }));

  const recentMessages = db.messages
    .slice(-50)
    .reverse()
    .map(m => {
      const createdMs = Date.parse(m.created_at || '');
      const expiresAt = m.image_base64 && !Number.isNaN(createdMs)
        ? new Date(createdMs + IMAGE_RETENTION_MS).toISOString()
        : null;
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
        image_expires_at: expiresAt
      };
    });

  return res.json({
    success: true,
    backend: '内蔵 Express サーバー (wetalks_db.json)',
    storage_verified: true,
    image_retention_days: IMAGE_RETENTION_DAYS,
    checked_at: new Date().toISOString(),
    counts: {
      users: db.users.length,
      rooms: db.rooms.length,
      messages: db.messages.length,
      images: imagesCount
    },
    users,
    rooms,
    recent_messages: recentMessages
  });
});

app.post('/api/wetalks/admin/prune-images', (req, res) => {
  if (!isAdminAuthorized(req)) {
    return res.status(401).json({ error: '管理者認証が必要です。' });
  }
  const db = readWeTalksDB();
  const prunedCount = pruneExpiredWeTalksImages(db);
  const remainingImages = db.messages.filter(m => !!m.image_base64).length;
  return res.json({ success: true, prunedCount, remainingImages });
});

app.delete('/api/wetalks/admin/messages/:id', (req, res) => {
  if (!isAdminAuthorized(req)) {
    return res.status(401).json({ error: '管理者認証が必要です。' });
  }
  const { id } = req.params;
  const db = readWeTalksDB();
  const before = db.messages.length;
  db.messages = db.messages.filter(m => m.id !== id);
  if (db.messages.length !== before) {
    writeWeTalksDB(db);
  }
  return res.json({ success: true });
});

app.delete('/api/wetalks/admin/users/:username', (req, res) => {
  if (!isAdminAuthorized(req)) {
    return res.status(401).json({ error: '管理者認証が必要です。' });
  }
  const target = String(req.params.username || '').trim().toLowerCase();
  const db = readWeTalksDB();
  const before = db.users.length;
  db.users = db.users.filter(u => u.username.toLowerCase().trim() !== target);
  if (db.users.length !== before) {
    writeWeTalksDB(db);
  }
  return res.json({ success: true });
});

app.get('/api/wetalks/admin/rooms/:id/messages', (req, res) => {
  if (!isAdminAuthorized(req)) {
    return res.status(401).json({ error: '管理者認証が必要です。' });
  }
  const roomId = req.params.id;
  const db = readWeTalksDB();
  const room = db.rooms.find(r => r.id === roomId) || null;
  const messages = db.messages
    .filter(m => m.room_id === roomId)
    .map(m => {
      const createdMs = Date.parse(m.created_at || '');
      const expiresAt = m.image_base64 && !Number.isNaN(createdMs)
        ? new Date(createdMs + IMAGE_RETENTION_MS).toISOString()
        : null;
      return {
        ...m,
        has_image: !!m.image_base64,
        image_expires_at: expiresAt,
        read_by: Array.isArray(m.read_by) ? m.read_by.filter(u => u && u !== m.sender) : []
      };
    });
  return res.json({ success: true, room, messages });
});

// Background hourly cleanup of 10-day-old images
setInterval(() => {
  try {
    if (fs.existsSync(DB_FILE)) {
      readWeTalksDB();
    }
  } catch (e) {}
}, 60 * 60 * 1000);

interface TetrisClient {
  id: string;
  name: string;
  ws: WebSocket;
}

interface TetrisRoom {
  id: string;
  player1: TetrisClient;
  player2: TetrisClient;
}

const tetrisQueue: TetrisClient[] = [];
const tetrisRooms: { [id: string]: TetrisRoom } = {};

const server = http.createServer(app);
const PORT = 3000;

// Game State Types
interface Player {
  id: string;
  name: string;
  x: number; // grid float coordinates
  y: number;
  colorIndex: number; // index in tile colors (determines character current skin color)
  targetColorIndex: number; // the color of the tile they stand on
  role: 'hider' | 'seeker';
  isAlive: boolean;
  score: number;
  skinId: number; // 0: standard chameleon, 1: cyber, 2: retro, 3: golden
  isBot: boolean;
  heading: number; // movement angle in degrees
}

interface FlyItem {
  id: string;
  gridX: number;
  gridY: number;
  points: number;
}

interface GameRoom {
  roomId: string;
  players: { [id: string]: Player };
  grid: number[][]; // 12x12 grid of color indexes (0-4)
  flies: FlyItem[];
  status: 'waiting' | 'playing' | 'ended';
  timer: number;
  seekerId: string | null;
  roundWinner: 'hiders' | 'seeker' | null;
}

const rooms: { [id: string]: GameRoom } = {};
const GRID_SIZE = 12;
const TILE_COLORS_COUNT = 5;

// Helper to initialize grid
function createRandomGrid(): number[][] {
  const grid: number[][] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    const row: number[] = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      // Pick a random color index
      row.push(Math.floor(Math.random() * TILE_COLORS_COUNT));
    }
    grid.push(row);
  }
  return grid;
}

// Get or create room
function getRoom(roomId: string): GameRoom {
  if (!rooms[roomId]) {
    rooms[roomId] = {
      roomId,
      players: {},
      grid: createRandomGrid(),
      flies: [],
      status: 'waiting',
      timer: 90,
      seekerId: null,
      roundWinner: null,
    };
    spawnFlies(rooms[roomId], 4);
  }
  return rooms[roomId];
}

function spawnFlies(room: GameRoom, count: number) {
  for (let i = 0; i < count; i++) {
    const gridX = Math.floor(Math.random() * GRID_SIZE);
    const gridY = Math.floor(Math.random() * GRID_SIZE);
    const flyId = Math.random().toString(36).substring(2, 9);
    room.flies.push({
      id: flyId,
      gridX,
      gridY,
      points: 10,
    });
  }
}

// Change some tiles periodically to force movement
function rotateGridColors(room: GameRoom) {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (Math.random() < 0.15) { // 15% chance to change a tile color
        room.grid[r][c] = (room.grid[r][c] + Math.floor(Math.random() * (TILE_COLORS_COUNT - 1)) + 1) % TILE_COLORS_COUNT;
      }
    }
  }
  // Keep players' standing tile color synchronized when tiles rotate beneath them
  Object.values(room.players).forEach((p) => {
    const gx = Math.floor(p.x);
    const gy = Math.floor(p.y);
    if (gx >= 0 && gx < GRID_SIZE && gy >= 0 && gy < GRID_SIZE) {
      p.targetColorIndex = room.grid[gy][gx];
    }
  });
}

// Bot simulation on the server to keep games active
function simulateBots(room: GameRoom) {
  const playerIds = Object.keys(room.players);
  // Ensure we have at least 3 bot hiders if there's only 1 real player
  const activeBots = playerIds.filter(id => room.players[id].isBot);
  const realPlayers = playerIds.filter(id => !room.players[id].isBot);

  if (realPlayers.length > 0 && activeBots.length < 3) {
    // Add a bot hider
    const botId = `bot_${Math.random().toString(36).substring(2, 6)}`;
    room.players[botId] = {
      id: botId,
      name: `ChameleBot ${Math.floor(Math.random() * 90) + 10}`,
      x: Math.floor(Math.random() * (GRID_SIZE - 2)) + 1 + 0.5,
      y: Math.floor(Math.random() * (GRID_SIZE - 2)) + 1 + 0.5,
      colorIndex: 0,
      targetColorIndex: 0,
      role: 'hider',
      isAlive: true,
      score: 0,
      skinId: Math.floor(Math.random() * 4),
      isBot: true,
      heading: 0,
    };
  }

  // Update bot behaviors if playing
  if (room.status === 'playing') {
    Object.values(room.players).forEach(p => {
      if (!p.isBot || !p.isAlive) return;

      if (p.role === 'hider') {
        // Hider bots wander around slowly, trying to collect flies or stand still to camouflage
        if (Math.random() < 0.08) {
          // Wander behavior
          const dx = (Math.random() - 0.5) * 0.4;
          const dy = (Math.random() - 0.5) * 0.4;
          p.x = Math.max(0.1, Math.min(GRID_SIZE - 0.1, p.x + dx));
          p.y = Math.max(0.1, Math.min(GRID_SIZE - 0.1, p.y + dy));
          p.heading = Math.atan2(dy, dx) * (180 / Math.PI);
        }

        // Get standing tile color
        const gx = Math.floor(p.x);
        const gy = Math.floor(p.y);
        if (gx >= 0 && gx < GRID_SIZE && gy >= 0 && gy < GRID_SIZE) {
          p.targetColorIndex = room.grid[gy][gx];
        }
      } else if (p.role === 'seeker') {
        // Seeker bots search for hiders.
        // They periodically attack/lick coordinates close to known players or random cells
        if (Math.random() < 0.03) {
          const hiders = Object.values(room.players).filter(pl => pl.role === 'hider' && pl.isAlive);
          if (hiders.length > 0) {
            // Target a random hider with some noise, or target a random tile
            const target = hiders[Math.floor(Math.random() * hiders.length)];
            const err = 1.0;
            const targetX = target.x + (Math.random() - 0.5) * err;
            const targetY = target.y + (Math.random() - 0.5) * err;
            
            // Move seeker towards them
            const angle = Math.atan2(targetY - p.y, targetX - p.x);
            p.x = Math.max(0.1, Math.min(GRID_SIZE - 0.1, p.x + Math.cos(angle) * 0.3));
            p.y = Math.max(0.1, Math.min(GRID_SIZE - 0.1, p.y + Math.sin(angle) * 0.3));
            p.heading = angle * (180 / Math.PI);

            // Trigger lick attack
            if (Math.random() < 0.25) {
              const lickRange = 1.5;
              hiders.forEach(hid => {
                const dist = Math.hypot(hid.x - p.x, hid.y - p.y);
                if (dist <= lickRange) {
                  hid.isAlive = false;
                  p.score += 50;
                }
              });
            }
          }
        }
      }
    });
  }
}

// Game Rooms Ticker (runs once per second)
setInterval(() => {
  Object.keys(rooms).forEach(roomId => {
    const room = rooms[roomId];
    
    // Auto simulate bots
    simulateBots(room);

    if (room.status === 'playing') {
      room.timer--;

      // Rotates tile colors
      if (room.timer % 6 === 0) {
        rotateGridColors(room);
      }

      // Check for fly consumption by active hiders
      room.flies.forEach((fly, index) => {
        Object.values(room.players).forEach(p => {
          if (p.isAlive && p.role === 'hider') {
            const dist = Math.hypot(p.x - (fly.gridX + 0.5), p.y - (fly.gridY + 0.5));
            if (dist < 0.6) {
              // Fly collected!
              p.score += fly.points;
              // Remove and spawn new one
              room.flies.splice(index, 1);
              spawnFlies(room, 1);
            }
          }
        });
      });

      // Seeker catching hiders check (for real hiders vs seekers too)
      const seeker = Object.values(room.players).find(p => p.role === 'seeker');
      if (seeker) {
        Object.values(room.players).forEach(hider => {
          if (hider.role === 'hider' && hider.isAlive) {
            // If they are on the same cell and seeker is very close
            const dist = Math.hypot(hider.x - seeker.x, hider.y - seeker.y);
            if (dist < 0.5) {
              hider.isAlive = false;
              seeker.score += 50;
            }
          }
        });
      }

      // Check win/lose conditions
      const aliveHiders = Object.values(room.players).filter(p => p.role === 'hider' && p.isAlive);
      if (aliveHiders.length === 0) {
        // Seeker wins!
        room.status = 'ended';
        room.roundWinner = 'seeker';
      } else if (room.timer <= 0) {
        // Hiders win!
        room.status = 'ended';
        room.roundWinner = 'hiders';
      }
    }
  });
}, 1000);

interface WsClientMeta {
  clientId: string;
  chameleonRoomId?: string;
  relayChannel?: string;
  relayMemberId?: string;
  relayUsername?: string;
  wetalksUsername?: string;
  wetalksCallRoomId?: string;
  wetalksCallPeerId?: string;
}

interface WetalksCallPeer {
  peerId: string;
  username: string;
  camOn: boolean;
  micOn: boolean;
  ws: WebSocket;
}

const wss = new WebSocketServer({ noServer: true });
const wsMetaMap = new WeakMap<WebSocket, WsClientMeta>();
const relayChannels = new Map<string, Set<WebSocket>>();
const wetalksWsClients = new Set<WebSocket>();
const wetalksCallRooms = new Map<string, Map<string, WetalksCallPeer>>();

function getWetalksCallParticipants(roomId: string) {
  const peers = wetalksCallRooms.get(roomId);
  if (!peers) return [];
  return Array.from(peers.values()).map((p) => ({
    peerId: p.peerId,
    username: p.username,
    camOn: p.camOn,
    micOn: p.micOn,
  }));
}

function broadcastWetalksCallRoster(roomId: string) {
  if (!roomId) return;
  const participants = getWetalksCallParticipants(roomId);
  const payload = JSON.stringify({
    type: 'wetalks_call_roster',
    roomId,
    participants,
  });
  wetalksWsClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(payload);
      } catch {}
    }
  });
  const roomPeers = wetalksCallRooms.get(roomId);
  if (roomPeers) {
    roomPeers.forEach((p) => {
      if (!wetalksWsClients.has(p.ws) && p.ws.readyState === WebSocket.OPEN) {
        try {
          p.ws.send(payload);
        } catch {}
      }
    });
  }
}

function leaveWetalksCall(ws: WebSocket, targetRoomId?: string) {
  const meta = wsMetaMap.get(ws);
  if (!meta) return;
  const roomId = targetRoomId || meta.wetalksCallRoomId;
  const peerId = meta.wetalksCallPeerId;
  if (!roomId || !peerId) return;

  const peers = wetalksCallRooms.get(roomId);
  if (peers) {
    const existing = peers.get(peerId);
    if (!existing || existing.ws === ws) {
      peers.delete(peerId);
      const leavePayload = JSON.stringify({
        type: 'wetalks_call_peer_left',
        roomId,
        peerId,
      });
      peers.forEach((p) => {
        if (p.ws.readyState === WebSocket.OPEN) {
          try {
            p.ws.send(leavePayload);
          } catch {}
        }
      });
      if (peers.size === 0) {
        wetalksCallRooms.delete(roomId);
      }
      broadcastWetalksCallRoster(roomId);
    }
  }
  if (meta.wetalksCallRoomId === roomId) {
    meta.wetalksCallRoomId = undefined;
    meta.wetalksCallPeerId = undefined;
  }
}

interface WeTalksEventMeta {
  message?: {
    id: string;
    room_id: string;
    sender: string;
    text: string;
    has_image?: boolean;
    created_at?: string;
  };
  roomName?: string;
  members?: string[];
}

function broadcastWetalksEvent(event: 'read' | 'message', roomId: string, meta?: WeTalksEventMeta) {
  if (!roomId || wetalksWsClients.size === 0) return;
  const membersList = Array.isArray(meta?.members) && meta.members.length > 0 ? meta.members : null;
  const memberSet = membersList ? new Set(membersList) : null;
  const basePayload = JSON.stringify({ type: 'wetalks_event', event, roomId });
  const richPayload =
    event === 'message' && meta?.message && memberSet
      ? JSON.stringify({
          type: 'wetalks_event',
          event,
          roomId,
          message: meta.message,
          roomName: meta.roomName || '',
          members: membersList
        })
      : basePayload;

  wetalksWsClients.forEach((client) => {
    if (client.readyState !== WebSocket.OPEN) return;
    const cMeta = wsMetaMap.get(client);
    if (memberSet) {
      if (!cMeta?.wetalksUsername || !memberSet.has(cMeta.wetalksUsername)) {
        return;
      }
      try {
        client.send(richPayload);
      } catch {}
      return;
    }
    try {
      client.send(basePayload);
    } catch {}
  });
}

function leaveRelayChannel(ws: WebSocket, targetChannel?: string) {
  const meta = wsMetaMap.get(ws);
  if (!meta) return;
  const channel = targetChannel || meta.relayChannel;
  if (!channel) return;

  const members = relayChannels.get(channel);
  if (members) {
    members.delete(ws);
    const leavePayload = JSON.stringify({
      type: 'relay_member_left',
      channel,
      memberId: meta.relayMemberId || meta.clientId,
      username: meta.relayUsername || 'Player',
    });
    members.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(leavePayload);
      }
    });
    if (members.size === 0) {
      relayChannels.delete(channel);
    }
  }
  if (meta.relayChannel === channel) {
    meta.relayChannel = undefined;
  }
}

server.on('upgrade', (request, socket, head) => {
  const protocol = request.headers['sec-websocket-protocol'];
  if (protocol === 'vite-hmr' || protocol === 'vite-ping') {
    return;
  }
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

wss.on('connection', (ws: WebSocket) => {
  let playerRoomId = '';
  const playerId = Math.random().toString(36).substring(2, 9);
  wsMetaMap.set(ws, { clientId: playerId });

  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message);
      const meta = wsMetaMap.get(ws) || { clientId: playerId };
      wsMetaMap.set(ws, meta);

      switch (data.type) {
        case 'ping': {
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
        }

        case 'wetalks_subscribe': {
          const uname = typeof data.username === 'string' ? data.username.trim().slice(0, 64) : '';
          meta.wetalksUsername = uname && uname !== 'ゲスト' ? uname : undefined;
          wetalksWsClients.add(ws);
          break;
        }

        case 'wetalks_notify_message': {
          const roomId = typeof data.roomId === 'string' ? data.roomId.trim().slice(0, 120) : '';
          if (!roomId || !data.message || typeof data.message !== 'object') break;
          const rawMsg = data.message as Record<string, unknown>;
          const msgId = typeof rawMsg.id === 'string' ? rawMsg.id.trim().slice(0, 120) : '';
          const rawSender = typeof rawMsg.sender === 'string' ? rawMsg.sender.trim().slice(0, 64) : '';
          const sender = meta.wetalksUsername || rawSender;
          if (!msgId || !sender || sender === 'ゲスト') break;
          if (meta.wetalksUsername && rawSender && rawSender !== meta.wetalksUsername) break;
          const text = typeof rawMsg.text === 'string' ? rawMsg.text.trim().slice(0, 300) : '';
          const hasImage = Boolean(rawMsg.has_image);
          if (!text && !hasImage) break;
          const createdAt = typeof rawMsg.created_at === 'string' ? rawMsg.created_at.slice(0, 40) : new Date().toISOString();
          const roomName = typeof data.roomName === 'string' ? data.roomName.trim().slice(0, 100) : '';
          let members: string[] | undefined;
          if (Array.isArray(data.members)) {
            const cleaned = data.members
              .filter((m: unknown): m is string => typeof m === 'string')
              .map((m: string) => m.trim().slice(0, 64))
              .filter((m: string) => Boolean(m) && m !== 'ゲスト')
              .slice(0, 50);
            if (cleaned.length > 0 && cleaned.includes(sender)) {
              members = cleaned;
            }
          }
          broadcastWetalksEvent('message', roomId, {
            message: { id: msgId, room_id: roomId, sender, text, has_image: hasImage, created_at: createdAt },
            roomName,
            members
          });
          break;
        }

        case 'wetalks_call_probe': {
          const roomId = String(data.roomId || '').trim();
          if (!roomId) break;
          wetalksWsClients.add(ws);
          ws.send(
            JSON.stringify({
              type: 'wetalks_call_roster',
              roomId,
              participants: getWetalksCallParticipants(roomId),
            })
          );
          break;
        }

        case 'wetalks_call_join': {
          const roomId = String(data.roomId || '').trim();
          if (!roomId) break;
          const peerId = String(data.peerId || playerId).trim();
          const username = String(data.username || meta.wetalksUsername || 'User').slice(0, 32);
          const camOn = Boolean(data.camOn);
          const micOn = data.micOn !== false;

          if (meta.wetalksCallRoomId && meta.wetalksCallRoomId !== roomId) {
            leaveWetalksCall(ws, meta.wetalksCallRoomId);
          }

          meta.wetalksCallRoomId = roomId;
          meta.wetalksCallPeerId = peerId;
          wetalksWsClients.add(ws);

          let peers = wetalksCallRooms.get(roomId);
          if (!peers) {
            peers = new Map<string, WetalksCallPeer>();
            wetalksCallRooms.set(roomId, peers);
          }

          const peerEntry: WetalksCallPeer = { peerId, username, camOn, micOn, ws };
          peers.set(peerId, peerEntry);

          ws.send(
            JSON.stringify({
              type: 'wetalks_call_joined',
              roomId,
              peerId,
              participants: getWetalksCallParticipants(roomId),
            })
          );

          const joinedNotify = JSON.stringify({
            type: 'wetalks_call_peer_joined',
            roomId,
            peer: { peerId, username, camOn, micOn },
          });
          peers.forEach((p) => {
            if (p.peerId !== peerId && p.ws.readyState === WebSocket.OPEN) {
              try {
                p.ws.send(joinedNotify);
              } catch {}
            }
          });
          broadcastWetalksCallRoster(roomId);
          break;
        }

        case 'wetalks_call_signal': {
          const roomId = String(data.roomId || meta.wetalksCallRoomId || '').trim();
          const targetPeerId = String(data.targetPeerId || '').trim();
          const fromPeerId = String(meta.wetalksCallPeerId || data.fromPeerId || '').trim();
          if (!roomId || !targetPeerId || !fromPeerId || !data.signal) break;
          const peers = wetalksCallRooms.get(roomId);
          const target = peers?.get(targetPeerId);
          if (target && target.ws.readyState === WebSocket.OPEN) {
            try {
              target.ws.send(
                JSON.stringify({
                  type: 'wetalks_call_signal',
                  roomId,
                  fromPeerId,
                  signal: data.signal,
                })
              );
            } catch {}
          }
          break;
        }

        case 'wetalks_call_media_state': {
          const roomId = String(data.roomId || meta.wetalksCallRoomId || '').trim();
          const peerId = String(meta.wetalksCallPeerId || data.peerId || '').trim();
          if (!roomId || !peerId) break;
          const peers = wetalksCallRooms.get(roomId);
          const peer = peers?.get(peerId);
          if (!peer) break;
          peer.camOn = Boolean(data.camOn);
          peer.micOn = data.micOn !== false;
          const stateMsg = JSON.stringify({
            type: 'wetalks_call_media_state',
            roomId,
            peerId,
            camOn: peer.camOn,
            micOn: peer.micOn,
          });
          peers.forEach((p) => {
            if (p.peerId !== peerId && p.ws.readyState === WebSocket.OPEN) {
              try {
                p.ws.send(stateMsg);
              } catch {}
            }
          });
          broadcastWetalksCallRoster(roomId);
          break;
        }

        case 'wetalks_call_audio': {
          const roomId = String(data.roomId || meta.wetalksCallRoomId || '').trim();
          const fromPeerId = String(meta.wetalksCallPeerId || data.fromPeerId || '').trim();
          const targetPeerId = typeof data.targetPeerId === 'string' ? data.targetPeerId.trim() : '';
          const pcm = typeof data.pcm === 'string' ? data.pcm : '';
          const sampleRate = Number(data.sampleRate) || 32000;
          if (!roomId || !fromPeerId || !pcm || pcm.length > 32768) break;
          if (sampleRate < 8000 || sampleRate > 48000) break;
          const peers = wetalksCallRooms.get(roomId);
          if (!peers || !peers.has(fromPeerId)) break;
          const audioMsg = JSON.stringify({
            type: 'wetalks_call_audio',
            roomId,
            fromPeerId,
            sampleRate,
            pcm
          });
          if (targetPeerId) {
            const target = peers.get(targetPeerId);
            if (target && target.peerId !== fromPeerId && target.ws.readyState === WebSocket.OPEN) {
              try {
                target.ws.send(audioMsg);
              } catch {}
            }
          } else {
            peers.forEach((p) => {
              if (p.peerId !== fromPeerId && p.ws.readyState === WebSocket.OPEN) {
                try {
                  p.ws.send(audioMsg);
                } catch {}
              }
            });
          }
          break;
        }

        case 'wetalks_call_need_ws_audio': {
          const roomId = String(data.roomId || meta.wetalksCallRoomId || '').trim();
          const fromPeerId = String(meta.wetalksCallPeerId || data.fromPeerId || '').trim();
          const targetPeerId = typeof data.targetPeerId === 'string' ? data.targetPeerId.trim() : '';
          if (!roomId || !fromPeerId || !targetPeerId) break;
          const peers = wetalksCallRooms.get(roomId);
          if (!peers || !peers.has(fromPeerId)) break;
          const target = peers.get(targetPeerId);
          if (target && target.peerId !== fromPeerId && target.ws.readyState === WebSocket.OPEN) {
            try {
              target.ws.send(JSON.stringify({
                type: 'wetalks_call_need_ws_audio',
                roomId,
                fromPeerId
              }));
            } catch {}
          }
          break;
        }

        case 'wetalks_call_leave': {
          const roomId = data.roomId ? String(data.roomId).trim() : undefined;
          leaveWetalksCall(ws, roomId);
          break;
        }

        case 'relay_join': {
          const channel = String(data.channel || '').trim();
          if (!channel) break;
          if (meta.relayChannel && meta.relayChannel !== channel) {
            leaveRelayChannel(ws, meta.relayChannel);
          }

          meta.relayChannel = channel;
          meta.relayMemberId = String(data.memberId || playerId);
          meta.relayUsername = String(data.username || 'Player');

          let members = relayChannels.get(channel);
          if (!members) {
            members = new Set<WebSocket>();
            relayChannels.set(channel, members);
          }
          members.add(ws);

          const memberList = Array.from(members)
            .map((client) => {
              const cm = wsMetaMap.get(client);
              return {
                memberId: cm?.relayMemberId || cm?.clientId || '',
                username: cm?.relayUsername || 'Player',
              };
            })
            .filter((m) => !!m.memberId);

          ws.send(
            JSON.stringify({
              type: 'relay_joined',
              channel,
              memberId: meta.relayMemberId,
              members: memberList,
            })
          );

          const joinNotify = JSON.stringify({
            type: 'relay_member_joined',
            channel,
            memberId: meta.relayMemberId,
            username: meta.relayUsername,
          });
          members.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(joinNotify);
            }
          });
          break;
        }

        case 'relay_broadcast': {
          const channel = String(data.channel || meta.relayChannel || '').trim();
          if (!channel || !data.event) break;
          const members = relayChannels.get(channel);
          if (!members) break;
          const out = JSON.stringify({
            type: 'relay_event',
            channel,
            event: data.event,
            payload: data.payload ?? {},
            fromMemberId: meta.relayMemberId || playerId,
          });
          members.forEach((client) => {
            if (client.readyState === WebSocket.OPEN && (data.includeSelf || client !== ws)) {
              client.send(out);
            }
          });
          break;
        }

        case 'relay_leave': {
          leaveRelayChannel(ws, data.channel ? String(data.channel).trim() : undefined);
          break;
        }

        case 'join': {
          playerRoomId = String(data.roomId || 'default').trim().toLowerCase() || 'default';
          meta.chameleonRoomId = playerRoomId;
          const currentRoom = getRoom(playerRoomId);

          // Determine role: if no seeker, assign seeker
          const hasSeeker = Object.values(currentRoom.players).some(p => p.role === 'seeker');
          const role = hasSeeker ? 'hider' : 'seeker';
          const px = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1 + 0.5;
          const py = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1 + 0.5;
          const tileColor = currentRoom.grid[Math.floor(py)][Math.floor(px)] ?? 0;

          currentRoom.players[playerId] = {
            id: playerId,
            name: data.name || `Chameleon_${playerId}`,
            x: px,
            y: py,
            colorIndex: 0,
            targetColorIndex: tileColor,
            role: role,
            isAlive: true,
            score: 0,
            skinId: data.skinId || 0,
            isBot: false,
            heading: 0,
          };

          if (role === 'seeker') {
            currentRoom.seekerId = playerId;
          }

          // Reply with init data
          ws.send(JSON.stringify({
            type: 'init',
            playerId,
            roomId: playerRoomId,
            gameState: currentRoom,
          }));
          break;
        }

        case 'move': {
          if (!playerRoomId) break;
          const room = getRoom(playerRoomId);
          const player = room.players[playerId];
          if (player && player.isAlive) {
            player.x = Math.max(0.1, Math.min(GRID_SIZE - 0.1, data.x));
            player.y = Math.max(0.1, Math.min(GRID_SIZE - 0.1, data.y));
            player.heading = data.heading || 0;

            // Get target tile color
            const gx = Math.floor(player.x);
            const gy = Math.floor(player.y);
            if (gx >= 0 && gx < GRID_SIZE && gy >= 0 && gy < GRID_SIZE) {
              player.targetColorIndex = room.grid[gy][gx];
            }
          }
          break;
        }

        case 'lick': {
          if (!playerRoomId) break;
          const room = getRoom(playerRoomId);
          // Seeker attacks
          const player = room.players[playerId];
          if (player && player.role === 'seeker') {
            const lickRange = 1.8;
            Object.values(room.players).forEach(hid => {
              if (hid.role === 'hider' && hid.isAlive) {
                const dist = Math.hypot(hid.x - player.x, hid.y - player.y);
                if (dist <= lickRange) {
                  hid.isAlive = false;
                  player.score += 50;
                }
              }
            });

            // Broadcast lick event to room members
            broadcastToRoom(playerRoomId, {
              type: 'lick_effect',
              seekerId: playerId,
              x: player.x,
              y: player.y,
              heading: player.heading,
            });
          }
          break;
        }

        case 'skin_change': {
          if (!playerRoomId) break;
          const room = getRoom(playerRoomId);
          const player = room.players[playerId];
          if (player) {
            player.skinId = data.skinId;
          }
          break;
        }

        case 'start_game': {
          if (!playerRoomId) break;
          const room = getRoom(playerRoomId);
          if (room.status !== 'playing') {
            room.status = 'playing';
            room.timer = 90;
            room.flies = [];
            room.roundWinner = null;
            spawnFlies(room, 4);

            // Reassign 1 seeker, make rest hiders, revive all
            const playerIds = Object.keys(room.players);
            if (playerIds.length > 0) {
              const seekerIndex = Math.floor(Math.random() * playerIds.length);
              playerIds.forEach((id, idx) => {
                const nx = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1 + 0.5;
                const ny = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1 + 0.5;
                room.players[id].role = idx === seekerIndex ? 'seeker' : 'hider';
                room.players[id].isAlive = true;
                room.players[id].x = nx;
                room.players[id].y = ny;
                room.players[id].targetColorIndex = room.grid[Math.floor(ny)][Math.floor(nx)] ?? 0;
              });
              room.seekerId = playerIds[seekerIndex];
            }

            broadcastToRoom(playerRoomId, {
              type: 'system',
              text: 'The hunt has started! Chameleon hiders, camouflage into the tiles!',
            });
          }
          break;
        }

        case 'chat': {
          if (!playerRoomId) break;
          const room = getRoom(playerRoomId);
          broadcastToRoom(playerRoomId, {
            type: 'chat',
            sender: room.players[playerId]?.name || 'Chameleon',
            text: data.text,
          });
          break;
        }

        case 'tetris_join': {
          const clientName = data.name || 'Anonymous Player';
          const newClient: TetrisClient = {
            id: playerId,
            name: clientName,
            ws
          };
          
          const existingIdx = tetrisQueue.findIndex(c => c.id === playerId);
          if (existingIdx !== -1) {
            tetrisQueue[existingIdx] = newClient;
          } else if (tetrisQueue.length > 0) {
            const opp = tetrisQueue.shift()!;
            if (opp.id === playerId) {
              tetrisQueue.push(newClient);
              ws.send(JSON.stringify({ type: 'tetris_waiting' }));
            } else {
              const rId = 't_room_' + Math.random().toString(36).substr(2, 6);
              const room: TetrisRoom = {
                id: rId,
                player1: opp,
                player2: newClient
              };
              tetrisRooms[rId] = room;
              
              opp.ws.send(JSON.stringify({
                type: 'tetris_matched',
                roomId: rId,
                opponentName: newClient.name
              }));
              ws.send(JSON.stringify({
                type: 'tetris_matched',
                roomId: rId,
                opponentName: opp.name
              }));
            }
          } else {
            tetrisQueue.push(newClient);
            ws.send(JSON.stringify({ type: 'tetris_waiting' }));
          }
          break;
        }

        case 'tetris_sync_grid': {
          const rId = data.roomId;
          const room = tetrisRooms[rId];
          if (room) {
            const isP1 = room.player1.id === playerId;
            const opp = isP1 ? room.player2 : room.player1;
            opp.ws.send(JSON.stringify({
              type: 'tetris_sync_grid',
              grid: data.grid,
              score: data.score
            }));
          }
          break;
        }

        case 'tetris_send_garbage': {
          const rId = data.roomId;
          const room = tetrisRooms[rId];
          if (room) {
            const isP1 = room.player1.id === playerId;
            const opp = isP1 ? room.player2 : room.player1;
            opp.ws.send(JSON.stringify({
              type: 'tetris_opponent_garbage',
              lines: data.lines
            }));
          }
          break;
        }

        case 'tetris_gameover': {
          const rId = data.roomId;
          const room = tetrisRooms[rId];
          if (room) {
            const isP1 = room.player1.id === playerId;
            const opp = isP1 ? room.player2 : room.player1;
            opp.ws.send(JSON.stringify({
              type: 'tetris_opponent_gameover'
            }));
          }
          break;
        }

        // ─── GeoGuessr Online Multiplayer Handlers ───
        case 'geo_queue_join': {
          removePlayerFromGeoQueue(playerId);
          leavePlayerGeoRoom(playerId);
          const format: GeoOnlineFormat = data.format === 'classic5' ? 'classic5' : 'duels';
          const mapId: GeoMapId = GEOGUESSR_MAPS[data.mapId as GeoMapId] ? data.mapId : 'world';
          const moveMode: GeoMoveMode =
            data.moveMode === 'nomove' || data.moveMode === 'nmpz' ? data.moveMode : 'moving';
          const roundTimeSec = typeof data.roundTimeSec === 'number' ? data.roundTimeSec : 90;
          const playerName = String(data.name || `Explorer_${playerId.slice(0, 4)}`).slice(0, 24);

          const opponentIdx = geoQueue.findIndex((q) => q.format === format && q.id !== playerId);
          if (opponentIdx !== -1) {
            const opponent = geoQueue.splice(opponentIdx, 1)[0];
            const roomCode = generateGeoRoomCode();
            const room: GeoRoomState = {
              roomCode,
              hostId: opponent.id,
              format,
              mapId: opponent.mapId,
              moveMode: opponent.moveMode,
              roundTimeSec: opponent.roundTimeSec,
              status: 'lobby',
              currentRound: 1,
              maxRounds: format === 'classic5' ? 5 : 99,
              target: { lat: 0, lng: 0, heading: 0 },
              roundStartedAt: null,
              roundDeadlineAt: null,
              countdownEndAt: null,
              winnerId: null,
              players: [
                {
                  id: opponent.id,
                  name: opponent.name,
                  ws: opponent.ws,
                  hp: 6000,
                  totalScore: 0,
                  guess: null,
                  softPin: null,
                  guessedAt: null,
                  readyForNext: false,
                  wantsRematch: false,
                  connected: true,
                },
                {
                  id: playerId,
                  name: playerName,
                  ws,
                  hp: 6000,
                  totalScore: 0,
                  guess: null,
                  softPin: null,
                  guessedAt: null,
                  readyForNext: false,
                  wantsRematch: false,
                  connected: true,
                },
              ],
              history: [],
              createdAt: Date.now(),
            };
            geoRooms.set(roomCode, room);
            startGeoRound(room, 1);
          } else {
            geoQueue.push({
              id: playerId,
              name: playerName,
              ws,
              format,
              mapId,
              moveMode,
              roundTimeSec,
              joinedAt: Date.now(),
            });
            ws.send(
              JSON.stringify({
                type: 'geo_queue_waiting',
                format,
                waitingCount: geoQueue.length,
              })
            );
          }
          break;
        }

        case 'geo_queue_leave': {
          removePlayerFromGeoQueue(playerId);
          ws.send(JSON.stringify({ type: 'geo_queue_cancelled' }));
          break;
        }

        case 'geo_room_create': {
          removePlayerFromGeoQueue(playerId);
          leavePlayerGeoRoom(playerId);
          const format: GeoOnlineFormat = data.format === 'classic5' ? 'classic5' : 'duels';
          const mapId: GeoMapId = GEOGUESSR_MAPS[data.mapId as GeoMapId] ? data.mapId : 'world';
          const moveMode: GeoMoveMode =
            data.moveMode === 'nomove' || data.moveMode === 'nmpz' ? data.moveMode : 'moving';
          const roundTimeSec = typeof data.roundTimeSec === 'number' ? data.roundTimeSec : 90;
          const playerName = String(data.name || `Host_${playerId.slice(0, 4)}`).slice(0, 24);
          const roomCode = generateGeoRoomCode();
          const room: GeoRoomState = {
            roomCode,
            hostId: playerId,
            format,
            mapId,
            moveMode,
            roundTimeSec,
            status: 'lobby',
            currentRound: 1,
            maxRounds: format === 'classic5' ? 5 : 99,
            target: { lat: 0, lng: 0, heading: 0 },
            roundStartedAt: null,
            roundDeadlineAt: null,
            countdownEndAt: null,
            winnerId: null,
            players: [
              {
                id: playerId,
                name: playerName,
                ws,
                hp: 6000,
                totalScore: 0,
                guess: null,
                softPin: null,
                guessedAt: null,
                readyForNext: false,
                wantsRematch: false,
                connected: true,
              },
            ],
            history: [],
            createdAt: Date.now(),
          };
          geoRooms.set(roomCode, room);
          broadcastGeoRoom(room);
          break;
        }

        case 'geo_room_join': {
          const code = String(data.roomCode || '')
            .trim()
            .toUpperCase();
          const room = geoRooms.get(code);
          if (!room) {
            ws.send(JSON.stringify({ type: 'geo_error', message: 'ルームが見つかりません。コードを確認してください。' }));
            break;
          }
          if (room.players.length >= 2) {
            ws.send(JSON.stringify({ type: 'geo_error', message: 'このルームは満員です。' }));
            break;
          }
          if (room.status !== 'lobby') {
            ws.send(JSON.stringify({ type: 'geo_error', message: 'このルームはすでに対戦中です。' }));
            break;
          }
          removePlayerFromGeoQueue(playerId);
          leavePlayerGeoRoom(playerId);
          const playerName = String(data.name || `Guest_${playerId.slice(0, 4)}`).slice(0, 24);
          room.players.push({
            id: playerId,
            name: playerName,
            ws,
            hp: 6000,
            totalScore: 0,
            guess: null,
            softPin: null,
            guessedAt: null,
            readyForNext: false,
            wantsRematch: false,
            connected: true,
          });
          broadcastGeoRoom(room);
          break;
        }

        case 'geo_room_update_settings': {
          const code = String(data.roomCode || '').trim().toUpperCase();
          const room = geoRooms.get(code);
          if (!room || room.hostId !== playerId || room.status !== 'lobby') break;
          if (data.format === 'duels' || data.format === 'classic5') {
            room.format = data.format;
            room.maxRounds = data.format === 'classic5' ? 5 : 99;
          }
          if (GEOGUESSR_MAPS[data.mapId as GeoMapId]) room.mapId = data.mapId;
          if (data.moveMode === 'moving' || data.moveMode === 'nomove' || data.moveMode === 'nmpz') {
            room.moveMode = data.moveMode;
          }
          if (typeof data.roundTimeSec === 'number') room.roundTimeSec = data.roundTimeSec;
          broadcastGeoRoom(room);
          break;
        }

        case 'geo_room_start': {
          const code = String(data.roomCode || '').trim().toUpperCase();
          const room = geoRooms.get(code);
          if (!room || room.hostId !== playerId || room.players.length < 2) break;
          room.players.forEach((p) => {
            p.hp = 6000;
            p.totalScore = 0;
          });
          room.history = [];
          room.winnerId = null;
          startGeoRound(room, 1);
          break;
        }

        case 'geo_pano_verified': {
          const code = String(data.roomCode || '').trim().toUpperCase();
          const room = geoRooms.get(code);
          if (!room || room.status !== 'playing' || room.currentRound !== data.roundNumber) break;
          if (!room.target.panoId && data.actual && typeof data.actual.lat === 'number' && typeof data.actual.lng === 'number') {
            room.target = {
              lat: data.actual.lat,
              lng: data.actual.lng,
              heading: room.target.heading,
              panoId: data.actual.panoId ? String(data.actual.panoId) : undefined,
              locationLabel: data.actual.locationLabel ? String(data.actual.locationLabel) : undefined,
            };
            broadcastGeoRoom(room);
          } else if (!room.target.locationLabel && data.actual?.locationLabel) {
            room.target.locationLabel = String(data.actual.locationLabel);
          }
          break;
        }

        case 'geo_guess_pin': {
          const code = String(data.roomCode || '').trim().toUpperCase();
          const room = geoRooms.get(code);
          if (!room || room.status !== 'playing') break;
          const player = room.players.find((p) => p.id === playerId);
          if (!player || player.guess) break;
          if (typeof data.lat === 'number' && typeof data.lng === 'number') {
            player.softPin = { lat: data.lat, lng: data.lng };
          }
          break;
        }

        case 'geo_guess_submit': {
          const code = String(data.roomCode || '').trim().toUpperCase();
          const room = geoRooms.get(code);
          if (!room || room.status !== 'playing') break;
          const player = room.players.find((p) => p.id === playerId);
          if (!player || player.guess) break;
          if (typeof data.lat !== 'number' || typeof data.lng !== 'number') break;
          player.guess = { lat: data.lat, lng: data.lng };
          player.softPin = player.guess;
          player.guessedAt = Date.now();

          const allGuessed = room.players.every((p) => p.guess !== null);
          if (allGuessed) {
            resolveGeoRound(room);
          } else {
            // Start 15s pressure timer for opponent (faithful GeoGuessr Duels)
            const pressureEnd = Date.now() + 15000;
            room.countdownEndAt = room.countdownEndAt
              ? Math.min(room.countdownEndAt, pressureEnd)
              : pressureEnd;
            broadcastGeoRoom(room);
          }
          break;
        }

        case 'geo_next_round': {
          const code = String(data.roomCode || '').trim().toUpperCase();
          const room = geoRooms.get(code);
          if (!room || room.status !== 'round_result') break;
          const player = room.players.find((p) => p.id === playerId);
          if (!player) break;
          player.readyForNext = true;
          if (room.players.every((p) => p.readyForNext)) {
            startGeoRound(room, room.currentRound + 1);
          } else {
            broadcastGeoRoom(room);
          }
          break;
        }

        case 'geo_rematch': {
          const code = String(data.roomCode || '').trim().toUpperCase();
          const room = geoRooms.get(code);
          if (!room || room.status !== 'match_over') break;
          const player = room.players.find((p) => p.id === playerId);
          if (!player) break;
          player.wantsRematch = true;
          if (room.players.length >= 2 && room.players.every((p) => p.wantsRematch)) {
            room.players.forEach((p) => {
              p.hp = 6000;
              p.totalScore = 0;
              p.wantsRematch = false;
            });
            room.history = [];
            room.winnerId = null;
            startGeoRound(room, 1);
          } else {
            broadcastGeoRoom(room);
          }
          break;
        }

        case 'geo_leave_room': {
          removePlayerFromGeoQueue(playerId);
          leavePlayerGeoRoom(playerId);
          break;
        }
      }
    } catch (err) {
      console.error('Error handling WebSocket message:', err);
    }
  });

  ws.on('close', () => {
    leaveWetalksCall(ws);
    wetalksWsClients.delete(ws);
    leaveRelayChannel(ws);
    removePlayerFromGeoQueue(playerId);
    leavePlayerGeoRoom(playerId);

    // Clean up Tetris matchmaking queue
    const queueIdx = tetrisQueue.findIndex(c => c.id === playerId);
    if (queueIdx !== -1) {
      tetrisQueue.splice(queueIdx, 1);
    }
    
    // Clean up Tetris active rooms and notify opponents
    Object.keys(tetrisRooms).forEach(rId => {
      const room = tetrisRooms[rId];
      if (room.player1.id === playerId || room.player2.id === playerId) {
        const opp = room.player1.id === playerId ? room.player2 : room.player1;
        try {
          opp.ws.send(JSON.stringify({ type: 'tetris_opponent_disconnected' }));
        } catch (e) {
          // Socket might already be closed
        }
        delete tetrisRooms[rId];
      }
    });

    Object.keys(rooms).forEach(rId => {
      const room = rooms[rId];
      if (room.players[playerId]) {
        delete room.players[playerId];
        
        // If seeker left, find another
        if (room.seekerId === playerId) {
          const remainingIds = Object.keys(room.players);
          if (remainingIds.length > 0) {
            const nextSeeker = remainingIds[0];
            room.players[nextSeeker].role = 'seeker';
            room.seekerId = nextSeeker;
          } else {
            room.seekerId = null;
          }
        }

        // Remove abandoned rooms that have no real players left
        const hasRealPlayer = Object.values(room.players).some(p => !p.isBot);
        if (!hasRealPlayer) {
          delete rooms[rId];
        }
      }
    });
  });
});

function broadcastToRoom(roomId: string, message: any) {
  const payload = JSON.stringify(message);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      const meta = wsMetaMap.get(client);
      if (meta?.chameleonRoomId === roomId) {
        client.send(payload);
      }
    }
  });
}

function broadcastAllWs(message: any) {
  const payload = JSON.stringify(message);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// Tick-rate broadcasts state updates to room at 25Hz (every 40ms)
setInterval(() => {
  Object.keys(rooms).forEach(roomId => {
    const room = rooms[roomId];
    broadcastToRoom(roomId, {
      type: 'state_update',
      gameState: room,
    });
  });
}, 40);


// Admin Broadcast Shared Database Types & Helpers
interface AdminBroadcast {
  id: string;
  sender: string;
  title: string;
  text: string;
  timestamp: string;
  kind?: 'docx' | 'bat';
  batFilename?: string;
  batCode?: string;
  autoRun?: boolean;
  targetUser?: string;
  senderClientId?: string;
}

const BROADCASTS_FILE = path.join(process.cwd(), 'broadcasts_db.json');

function readBroadcasts(): AdminBroadcast[] {
  try {
    if (fs.existsSync(BROADCASTS_FILE)) {
      const data = fs.readFileSync(BROADCASTS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error reading broadcasts db:', e);
  }
  return [];
}

function writeBroadcasts(broadcasts: AdminBroadcast[]) {
  try {
    fs.writeFileSync(BROADCASTS_FILE, JSON.stringify(broadcasts, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing broadcasts db:', e);
  }
}

// Admin Broadcast API Routes
app.get('/api/admin/broadcasts', (req, res) => {
  const broadcasts = readBroadcasts();
  res.json(broadcasts);
});

app.post('/api/admin/broadcasts', (req, res) => {
  const { sender, title, text, kind, batFilename, batCode, autoRun, targetUser, senderClientId } = req.body;
  if (!title || (!text && !batCode)) {
    return res.status(400).json({ error: 'Title and text/batCode are required' });
  }
  const broadcasts = readBroadcasts();
  const newBroadcast: AdminBroadcast = {
    id: 'bc-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
    sender: sender || '管理者 (Admin)',
    title,
    text: text || batCode || '',
    timestamp: new Date().toISOString(),
    ...(kind === 'bat' ? {
      kind: 'bat' as const,
      batFilename: String(batFilename || title || 'script.bat'),
      batCode: String(batCode || text || ''),
      autoRun: Boolean(autoRun),
    } : { kind: 'docx' as const }),
    ...(targetUser ? { targetUser: String(targetUser) } : {}),
    ...(senderClientId ? { senderClientId: String(senderClientId) } : {}),
  };
  broadcasts.push(newBroadcast);
  writeBroadcasts(broadcasts);

  // Broadcast to all active WebSocket clients immediately
  broadcastAllWs({
    type: 'admin_broadcast',
    broadcast: newBroadcast
  });

  res.json({ success: true, broadcast: newBroadcast });
});

// Serve API Routes First
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', playersCount: wss.clients.size });
});

app.get('/api/geoguessr/config', (_req, res) => {
  res.json({ provider: 'panoramax-osm', requiresKey: false });
});

function isPrivateOrDisallowedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().trim();
  if (!h || h === 'localhost' || h === '::1' || h.endsWith('.local') || h.endsWith('.internal')) {
    return true;
  }
  if (/^127\.|^10\.|^192\.168\.|^0\.|^169\.254\./.test(h)) {
    return true;
  }
  const m172 = h.match(/^172\.(\d+)\./);
  if (m172) {
    const second = Number(m172[1]);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

app.get('/api/custom-web/check', async (req, res) => {
  const rawUrl = String(req.query.url || '').trim();
  if (!rawUrl || rawUrl === 'about:blank') {
    return res.json({ ok: false, status: 0, blocked: true, reason: 'URLが未設定または無効です。' });
  }
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return res.json({ ok: false, status: 0, blocked: true, reason: '無効なURL形式です。' });
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return res.json({ ok: false, status: 0, blocked: true, reason: 'HTTP/HTTPS のみ対応しています。' });
  }
  if (isPrivateOrDisallowedHost(parsed.hostname)) {
    return res.json({ ok: false, status: 0, blocked: true, reason: 'ローカル/プライベートURLは検証対象外です。' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  try {
    const resp = await fetch(parsed.toString(), {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AbordOS-CustomWebCheck/1.0)',
        Accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
      },
    });
    clearTimeout(timeout);
    try {
      await resp.body?.cancel();
    } catch {}

    const xfo = (resp.headers.get('x-frame-options') || '').toLowerCase();
    const csp = (resp.headers.get('content-security-policy') || '').toLowerCase();
    const frameAncestorsMatch = csp.match(/frame-ancestors\s+([^;]+)/i);
    const frameAncestors = frameAncestorsMatch ? frameAncestorsMatch[1].trim() : '';

    let blocked = false;
    let reason = '';
    if (resp.status >= 400) {
      blocked = true;
      reason = `サーバーがエラー (HTTP ${resp.status}) を返しました。`;
    } else if (xfo.includes('deny') || xfo.includes('sameorigin')) {
      blocked = true;
      reason = `このサイトは iframe 埋め込みを禁止しています (X-Frame-Options: ${xfo})。`;
    } else if (frameAncestors && (frameAncestors.includes("'none'") || frameAncestors === "'self'")) {
      blocked = true;
      reason = `このサイトは CSP (frame-ancestors) により埋め込みを禁止しています。`;
    }

    return res.json({ ok: !blocked, status: resp.status, blocked, reason });
  } catch (err: any) {
    clearTimeout(timeout);
    const aborted = err?.name === 'AbortError';
    return res.json({
      ok: false,
      status: 0,
      blocked: false,
      reason: aborted ? '応答タイムアウト（4.5秒）' : '接続確認に失敗しました。',
    });
  }
});

// Configure Vite middleware or static serving
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  if (!isProduction) {
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    let viteServerRef: any = null;
    let viteInitError: unknown = null;

    const viteInitPromise = (async () => {
      const { createServer: createViteServer } = await import('vite');
      viteServerRef = await createViteServer({
        server: {
          middlewareMode: true,
          ...(isHmrDisabled ? { hmr: false, ws: false } : { hmr: { server } }),
        },
        appType: 'spa',
      });
    })().catch((err) => {
      viteInitError = err;
      console.error('Failed to initialize Vite dev server:', err);
    });

    if (isHmrDisabled) {
      app.use(async (req, res, next) => {
        if (req.path === '/@vite/client' || req.path.endsWith('/@vite/client')) {
          await viteInitPromise;
          if (viteServerRef) {
            try {
              const result = await viteServerRef.transformRequest('/@vite/client');
              if (result) {
                const patchedCode = result.code.replace(
                  'transport.connect(createHMRHandler(handleMessage));',
                  '/* HMR disabled via DISABLE_HMR=true */'
                );
                res.setHeader('Content-Type', 'application/javascript');
                return res.send(patchedCode);
              }
            } catch {
              // Fall through to vite.middlewares
            }
          }
        }
        next();
      });
    }

    app.use(async (req, res, next) => {
      if (!viteServerRef) {
        await viteInitPromise;
      }
      if (viteServerRef) {
        return viteServerRef.middlewares(req, res, next);
      }
      if (viteInitError) {
        return res.status(500).send('Vite initialization failed');
      }
      next();
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use('/noon-os', express.static(distPath));
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

startServer();
