const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();

const app = express();

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_here';

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// In-memory user store
let users = [];
const resetTokens = {};

// Generate JWT token
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

// ---------------- AUTH ROUTES ----------------

// Register
app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body;

  if (users.find((u) => u.email === email)) {
    return res.status(400).json({
      message: 'Email already registered',
    });
  }

  const id = Date.now().toString();

  users.push({
    id,
    username,
    email,
    password,
  });

  res.json({
    message: 'Registration successful',
  });
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  const user = users.find(
    (u) => u.email === email && u.password === password
  );

  if (!user) {
    return res.status(400).json({
      message: 'Invalid credentials',
    });
  }

  const token = generateToken(user);

  res.json({
    token,
  });
});

// Forgot password
app.post('/api/auth/forgot', (req, res) => {
  const { email } = req.body;

  const user = users.find((u) => u.email === email);

  if (!user) {
    return res.status(400).json({
      message: 'User not found',
    });
  }

  const token =
    Math.random().toString(36).substring(2) + Date.now();

  resetTokens[token] = user.id;

  console.log(
    `Password reset link: http://localhost:${PORT}/reset.html?token=${token}`
  );

  res.json({
    message: 'Reset link generated',
  });
});

// ---------------- MPESA DONATION ROUTE ----------------

app.post('/donate', async (req, res) => {
  const { phone, amount } = req.body;

  try {
    const auth = Buffer.from(
      `${process.env.CONSUMER_KEY}:${process.env.CONSUMER_SECRET}`
    ).toString('base64');

    const tokenResponse = await axios.get(
      `${process.env.BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );

    const accessToken = tokenResponse.data.access_token;

    const timestamp = new Date()
      .toISOString()
      .replace(/[-T:.Z]/g, '')
      .slice(0, 14);

    const password = Buffer.from(
      process.env.SHORTCODE +
        process.env.PASSKEY +
        timestamp
    ).toString('base64');

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

    res.json(response.data);
  } catch (error) {
    console.log(error.response?.data || error.message);

    res.status(500).json({
      message: 'Donation request failed',
      error: error.response?.data || error.message,
    });
  }
});

// ---------------- MPESA CALLBACK ----------------

app.post('/callback', (req, res) => {
  console.log('M-Pesa Callback Received');

  try {
    const callback = req.body.Body.stkCallback;

    console.log(callback);

    res.json({
      message: 'Callback received successfully',
      resultCode: callback.ResultCode,
      resultDesc: callback.ResultDesc,
    });
  } catch (error) {
    console.log(error.message);

    res.status(500).json({
      message: 'Callback processing failed',
    });
  }
});

// ---------------- DEFAULT ROUTE ----------------

app.get('/', (req, res) => {
  res.send('Server is running...');
});

// ---------------- START SERVER ----------------

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
