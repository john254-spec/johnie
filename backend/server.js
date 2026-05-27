
const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();

const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET || '1234567890';

// ---------------- MIDDLEWARE ----------------

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend files
app.use(express.static(path.join(__dirname, '../public')));

// ---------------- TEMP STORAGE ----------------
// Replace with MongoDB later

let users = [];
const resetTokens = {};

// ---------------- JWT TOKEN ----------------

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

// ---------------- AUTH ROUTES ----------------

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        message: 'All fields are required',
      });
    }

    const existingUser = users.find(
      (u) => u.email === email
    );

    if (existingUser) {
      return res.status(400).json({
        message: 'Email already registered',
      });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const newUser = {
      id: Date.now().toString(),
      username,
      email,
      password: hashedPassword,
    };

    users.push(newUser);

    res.status(201).json({
      message: 'Registration successful',
    });
  } catch (error) {
    console.log(error.message);

    res.status(500).json({
      message: 'Registration failed',
    });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = users.find(
      (u) => u.email === email
    );

    if (!user) {
      return res.status(400).json({
        message: 'Invalid credentials',
      });
    }

    const validPassword = bcrypt.compareSync(
      password,
      user.password
    );

    if (!validPassword) {
      return res.status(400).json({
        message: 'Invalid credentials',
      });
    }

    const token = generateToken(user);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.log(error.message);

    res.status(500).json({
      message: 'Login failed',
    });
  }
});

// Forgot password
app.post('/api/auth/forgot', (req, res) => {
  try {
    const { email } = req.body;

    const user = users.find(
      (u) => u.email === email
    );

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    const token =
      Math.random().toString(36).substring(2) +
      Date.now();

    resetTokens[token] = user.id;

    const resetLink =
      `https://johnie-1.onrender.com/reset.html?token=${token}`;

    console.log('Password Reset Link:', resetLink);

    res.json({
      message: 'Reset link generated',
      resetLink,
    });
  } catch (error) {
    console.log(error.message);

    res.status(500).json({
      message: 'Forgot password failed',
    });
  }
});

// Reset password
app.post('/api/auth/reset', (req, res) => {
  try {
    const { token, password } = req.body;

    const userId = resetTokens[token];

    if (!userId) {
      return res.status(400).json({
        message: 'Invalid or expired token',
      });
    }

    const user = users.find(
      (u) => u.id === userId
    );

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    user.password = bcrypt.hashSync(password, 10);

    delete resetTokens[token];

    res.json({
      message: 'Password reset successful',
    });
  } catch (error) {
    console.log(error.message);

    res.status(500).json({
      message: 'Password reset failed',
    });
  }
});

// ---------------- JWT AUTH MIDDLEWARE ----------------

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  const token =
    authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      message: 'Access token required',
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        message: 'Invalid token',
      });
    }

    req.user = user;

    next();
  });
}

// Protected route example
app.get('/api/profile', authenticateToken, (req, res) => {
  res.json({
    message: 'Protected profile data',
    user: req.user,
  });
});

// ---------------- MPESA DONATION ROUTE ----------------

app.post('/donate', async (req, res) => {
  try {
    const { phone, amount } = req.body;

    if (!phone || !amount) {
      return res.status(400).json({
        message: 'Phone and amount are required',
      });
    }

    const auth = Buffer.from(
      `${process.env.CONSUMER_KEY}:${process.env.CONSUMER_SECRET}`
    ).toString('base64');

    // Generate access token
    const tokenResponse = await axios.get(
      `${process.env.BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );

    const accessToken =
      tokenResponse.data.access_token;

    // Generate timestamp
    const timestamp = new Date()
      .toISOString()
      .replace(/[-T:.Z]/g, '')
      .slice(0, 14);

    // Generate password
    const password = Buffer.from(
      process.env.SHORTCODE +
        process.env.PASSKEY +
        timestamp
    ).toString('base64');

    // STK Push request
    const response = await axios.post(
      `${process.env.BASE_URL}/mpesa/stkpush/v1/processrequest`,
      {
        BusinessShortCode: process.env.SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: phone,
        PartyB: process.env.SHORTCODE,
        PhoneNumber: phone,
        CallBackURL:
          'https://johnie-1.onrender.com/callback',
        AccountReference: 'Donation',
        TransactionDesc: 'Website Donation',
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    res.json({
      message: 'STK Push sent successfully',
      data: response.data,
    });
  } catch (error) {
    console.log(
      error.response?.data || error.message
    );

    res.status(500).json({
      message: 'Donation request failed',
      error:
        error.response?.data || error.message,
    });
  }
});

// ---------------- MPESA CALLBACK ----------------

app.post('/callback', (req, res) => {
  try {
    console.log('M-Pesa Callback Received');

    const callback =
      req.body.Body?.stkCallback;

    console.log(JSON.stringify(callback, null, 2));

    res.json({
      ResultCode: 0,
      ResultDesc: 'Accepted',
    });
  } catch (error) {
    console.log(error.message);

    res.status(500).json({
      message: 'Callback processing failed',
    });
  }
});

// ---------------- DEFAULT ROUTES ----------------

app.get('/', (req, res) => {
  res.send('Server is running successfully...');
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    uptime: process.uptime(),
  });
});

// ---------------- START SERVER ----------------

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
