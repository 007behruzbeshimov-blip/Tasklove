/**
 * TaskBall — Node.js Express Backend
 * Ishlatish: npm install && node server.js
 * So'ng brauzerda: http://localhost:3000
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'db.json');

// ─── Middleware ────────────────────────────────────────────
app.use(express.json());
app.use(express.static(__dirname));

// Simple session store (in-memory)
const sessions = {}; // token -> userId

// ─── DB Helpers ───────────────────────────────────────────
function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initial = { users: [], tasks: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function genId() {
  return Date.now().toString() + Math.random().toString(36).slice(2, 6);
}

function genToken() {
  return crypto.randomBytes(24).toString('hex');
}

// ─── Auth Middleware ───────────────────────────────────────
function auth(req, res, next) {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token || !sessions[token]) {
    return res.status(401).json({ error: 'Tizimga kiring!' });
  }
  const db = readDB();
  req.user = db.users.find(u => u.id === sessions[token]);
  if (!req.user) return res.status(401).json({ error: 'Foydalanuvchi topilmadi!' });
  next();
}

// ─── AUTH ROUTES ──────────────────────────────────────────

// POST /api/register
app.post('/api/register', (req, res) => {
  const { name, username, password } = req.body;

  if (!name || !username || !password)
    return res.status(400).json({ error: 'Barcha maydonlarni to\'ldiring!' });
  if (username.length < 3)
    return res.status(400).json({ error: 'Username kamida 3 ta belgi!' });
  if (!/^[a-z0-9_]+$/.test(username))
    return res.status(400).json({ error: 'Username faqat lotin va raqamlardan iborat bo\'lsin!' });
  if (password.length < 4)
    return res.status(400).json({ error: 'Parol kamida 4 ta belgi!' });

  const db = readDB();
  if (db.users.find(u => u.username === username.toLowerCase()))
    return res.status(400).json({ error: 'Bu username band!' });

  const newUser = {
    id: genId(),
    name: name.trim(),
    username: username.toLowerCase(),
    password, // NOTE: production'da hash ishlatilsin (bcrypt)
    points: 0,
    collabPoints: 0,
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  writeDB(db);

  res.json({ message: 'Hisob yaratildi!' });
});

// POST /api/login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const db = readDB();
  const user = db.users.find(u => u.username === username?.toLowerCase() && u.password === password);

  if (!user) return res.status(401).json({ error: 'Username yoki parol noto\'g\'ri!' });

  const token = genToken();
  sessions[token] = user.id;

  const { password: _, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

// POST /api/logout
app.post('/api/logout', auth, (req, res) => {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  delete sessions[token];
  res.json({ message: 'Chiqildi' });
});

// GET /api/me
app.get('/api/me', auth, (req, res) => {
  const { password: _, ...safeUser } = req.user;
  res.json(safeUser);
});

// ─── USER ROUTES ──────────────────────────────────────────

// GET /api/users — Barcha foydalanuvchilar (ball bilan)
app.get('/api/users', auth, (req, res) => {
  const db = readDB();
  const users = db.users
    .map(({ password, ...u }) => u)
    .sort((a, b) => (b.points || 0) - (a.points || 0));
  res.json(users);
});

// ─── TASK ROUTES ──────────────────────────────────────────

// GET /api/tasks — Barcha vazifalar
app.get('/api/tasks', auth, (req, res) => {
  const db = readDB();
  const tasks = [...db.tasks].sort((a, b) => {
    if (a.done && !b.done) return 1;
    if (!a.done && b.done) return -1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  res.json(tasks);
});

// POST /api/tasks — Yangi vazifa qo'shish
app.post('/api/tasks', auth, (req, res) => {
  const { title, desc, type, partnerId } = req.body;

  if (!title || !title.trim())
    return res.status(400).json({ error: 'Sarlavha kiritish shart!' });
  if (!['solo', 'collab'].includes(type))
    return res.status(400).json({ error: 'Noto\'g\'ri tur!' });
  if (type === 'collab' && !partnerId)
    return res.status(400).json({ error: 'Hamkorlik vazifasida hamkor tanlang!' });

  const db = readDB();

  if (type === 'collab' && partnerId) {
    const partner = db.users.find(u => u.id === partnerId);
    if (!partner) return res.status(400).json({ error: 'Hamkor topilmadi!' });
    if (partnerId === req.user.id) return res.status(400).json({ error: 'O\'zingizni hamkor qilib bo\'lmaydi!' });
  }

  const newTask = {
    id: genId(),
    title: title.trim(),
    desc: (desc || '').trim(),
    type,
    creatorId: req.user.id,
    partnerId: type === 'collab' ? partnerId : null,
    done: false,
    winnerId: null,
    doneAt: null,
    createdAt: new Date().toISOString()
  };

  db.tasks.push(newTask);
  writeDB(db);

  res.status(201).json(newTask);
});

// PATCH /api/tasks/:id/complete — Vazifani bajarildi deb belgilash
app.patch('/api/tasks/:id/complete', auth, (req, res) => {
  const db = readDB();
  const task = db.tasks.find(t => t.id === req.params.id);

  if (!task) return res.status(404).json({ error: 'Vazifa topilmadi!' });
  if (task.done) return res.status(400).json({ error: 'Vazifa allaqachon bajarilgan!' });

  // Permission check
  if (task.type === 'solo' && task.creatorId !== req.user.id)
    return res.status(403).json({ error: 'Bu sizning vazifangiz emas!' });

  if (task.type === 'collab' &&
    task.creatorId !== req.user.id &&
    task.partnerId !== req.user.id)
    return res.status(403).json({ error: 'Bu hamkorlik vazifasida siz yo\'qsiz!' });

  // Mark done
  task.done = true;
  task.doneAt = new Date().toISOString();
  task.winnerId = req.user.id;

  // Award point
  const user = db.users.find(u => u.id === req.user.id);
  if (user) {
    user.points = (user.points || 0) + 1;
    if (task.type === 'collab') user.collabPoints = (user.collabPoints || 0) + 1;
  }

  writeDB(db);

  const { password: _, ...safeUser } = user;
  res.json({ task, user: safeUser });
});

// DELETE /api/tasks/:id — Vazifani o'chirish (faqat yaratuvchi)
app.delete('/api/tasks/:id', auth, (req, res) => {
  const db = readDB();
  const taskIdx = db.tasks.findIndex(t => t.id === req.params.id);

  if (taskIdx === -1) return res.status(404).json({ error: 'Vazifa topilmadi!' });

  const task = db.tasks[taskIdx];
  if (task.creatorId !== req.user.id)
    return res.status(403).json({ error: 'Faqat yaratuvchi o\'chira oladi!' });
  if (task.done)
    return res.status(400).json({ error: 'Bajarilgan vazifani o\'chirib bo\'lmaydi!' });

  db.tasks.splice(taskIdx, 1);
  writeDB(db);

  res.json({ message: 'Vazifa o\'chirildi' });
});

// ─── Start Server ──────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 TaskBall server ishlamoqda: http://localhost:${PORT}\n`);
  console.log('📌 API Endpoints:');
  console.log('   POST   /api/register       — Ro\'yxatdan o\'tish');
  console.log('   POST   /api/login          — Tizimga kirish');
  console.log('   GET    /api/users          — Barcha foydalanuvchilar');
  console.log('   GET    /api/tasks          — Barcha vazifalar');
  console.log('   POST   /api/tasks          — Yangi vazifa');
  console.log('   PATCH  /api/tasks/:id/complete — Bajarildi');
  console.log('   DELETE /api/tasks/:id      — O\'chirish');
});
