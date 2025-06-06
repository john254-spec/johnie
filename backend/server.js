const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_here';

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// In‑memory user store (for demo purposes)
let users = [];          // { id, username, email, password }
const resetTokens = {};  // token -> userId

function generateToken(user) {
  return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
}

// ----------- Auth routes -----------
app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body;
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ message: 'Email already registered' });
  }
  const id = Date.now().toString();
  users.push({ id, username, email, password });
  res.json({ message: 'Registration successful' });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }
  const token = generateToken(user);
  res.json({ token });
});

app.post('/api/auth/forgot', (req, res) => {
  const { email } = req.body;
  const user = users.find(u => u.email === email);
  if (!user) {
    return res.status(400).json({ message: 'User not found' });
  }
  const token = `${Math.random().toString(36).substring(2)}${Date.now()}`;
  resetTokens[token] = user.id;
  console.log(`Password reset link: http://localhost:${PORT}/reset.html?token=${token}`);
  res.json({ message: 'Reset link generated (check server console)' });
});

app.post('/api/auth/reset', (req, res) => {
  const { token, password } = req.body;
  const userId = resetTokens[token];
  if (!userId) {
    return res.status(400).json({ message: 'Invalid or expired token' });
  }
  const user = users.find(u => u.id === userId);
  user.password = password;
  delete resetTokens[token];
  res.json({ message: 'Password updated successfully' });
});

// ----------- Music upload/download -----------
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token required' });
  try {
    const data = jwt.verify(token, JWT_SECRET);
    req.user = data;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
}

app.post('/api/music/upload', authMiddleware, upload.single('track'), (req, res) => {
  res.json({ filename: req.file.filename, originalname: req.file.originalname });
});

app.get('/api/music/list', (req, res) => {
  fs.readdir(uploadsDir, (err, files) => {
    if (err) return res.status(500).json({ message: 'Unable to read uploads' });
    res.json(files);
  });
});

app.get('/api/music/download/:file', (req, res) => {
  const filepath = path.join(uploadsDir, req.params.file);
  res.download(filepath);
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});