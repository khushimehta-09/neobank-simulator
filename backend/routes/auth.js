const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { generateAccountNumber, generateIFSC, generateUPI, generateCardNumber, generateCardExpiry, generateCVV } = require('../utils/generators');
const nodemailer = require('nodemailer');

const router = express.Router();

router.post('/signup', authLimiter, async (req, res) => {
  try {
    const { name, email, password, phone, dob, upiPin } = req.body;
    if (!name || !email || !password || !upiPin) return res.status(400).json({ error: 'Name, email, password, and UPI PIN are required.' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    if (upiPin.length !== 4) return res.status(400).json({ error: 'UPI PIN must be exactly 4 digits.' });

    const db = await getDb();
    const existing = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) return res.status(409).json({ error: 'Email already registered.' });

    const hashedPassword = bcrypt.hashSync(password, 12);
    const accountNumber = generateAccountNumber();
    const ifscCode = generateIFSC();
    const upiId = generateUPI(name);
    const cardNumber = generateCardNumber();
    const cardExpiry = generateCardExpiry();
    const cardCvv = generateCVV();

    const result = await db.run(`
      INSERT INTO users (name, email, password, phone, dob, accountNumber, ifscCode, upiId, balance, cardNumber, cardExpiry, cardCvv, upiPin)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [name, email, hashedPassword, phone || null, dob || null, accountNumber, ifscCode, upiId, 50000, cardNumber, cardExpiry, cardCvv, upiPin]);

    const userId = result.lastID;

    await db.run(`INSERT INTO notifications (userId, title, message, type, icon) VALUES (?, ?, ?, ?, ?)`, [userId, '🎉 Welcome to NeoBank Simulator!', 'Your virtual bank account has been created with ₹50,000 virtual balance. Start exploring digital banking!', 'system', '🏦']);
    await db.run(`INSERT INTO transactions (receiverId, type, amount, status, category, description, referenceId, balanceAfter) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [userId, 'deposit', 50000, 'completed', 'other', 'Welcome bonus — Virtual starting balance', 'WEL' + Date.now().toString(36).toUpperCase(), 50000]);

    const billTypes = [
      { type: 'electricity', provider: 'NeoSim Power Corp', amount: 1850 + Math.floor(Math.random() * 500) },
      { type: 'internet', provider: 'NeoSim Broadband', amount: 799 + Math.floor(Math.random() * 200) },
      { type: 'mobile', provider: 'NeoSim Mobile', amount: 399 + Math.floor(Math.random() * 200) },
      { type: 'water', provider: 'NeoSim Water Utility', amount: 350 + Math.floor(Math.random() * 150) },
    ];
    for (const b of billTypes) {
      const dueDate = new Date(Date.now() + (7 + Math.floor(Math.random() * 20)) * 86400000).toISOString().slice(0, 10);
      await db.run(`INSERT INTO bills (userId, billType, provider, accountId, amount, dueDate) VALUES (?, ?, ?, ?, ?, ?)`, [userId, b.type, b.provider, 'ACC' + Math.floor(Math.random() * 999999), b.amount, dueDate]);
    }

    await db.run('UPDATE users SET xp = xp + 100 WHERE id = ?', [userId]);
    await db.run(`INSERT INTO achievements (userId, badge, title, description, xpReward) VALUES (?, ?, ?, ?, ?)`, [userId, '🚀', 'Early Adopter', 'Created your NeoBank Simulator account', 100]);

    const token = jwt.sign({ id: userId, role: 'user' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    const user = await db.get('SELECT id, name, email, accountNumber, upiId, balance, financialScore, xp, level, role, darkMode, learningMode, onboarded FROM users WHERE id = ?', [userId]);

    res.status(201).json({ message: 'Account created successfully!', token, user, simulation: true, educationalNote: 'Your virtual account has been created with ₹50,000 simulation money. This is not real money.' });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Failed to create account.' });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

    const db = await getDb();
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return res.status(401).json({ error: 'Invalid email or password.' });

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password.' });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    const { password: _, cardCvv, cardPin, ...safeUser } = user;
    res.json({ message: 'Login successful!', token, user: safeUser, simulation: true });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed.' });
  }
});

router.get('/me', authenticate, async (req, res) => {
  const db = await getDb();
  const user = await db.get('SELECT id, name, email, phone, dob, accountNumber, ifscCode, upiId, balance, financialScore, xp, level, role, cardNumber, cardExpiry, cardFrozen, onlinePayments, darkMode, learningMode, onboarded, savingsStreak, createdAt FROM users WHERE id = ?', [req.user.id]);
  res.json({ user, simulation: true });
});

router.put('/profile', authenticate, async (req, res) => {
  const { name, phone, dob, darkMode, learningMode } = req.body;
  const db = await getDb();
  await db.run(`UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone), dob = COALESCE(?, dob), darkMode = COALESCE(?, darkMode), learningMode = COALESCE(?, learningMode), updatedAt = datetime('now') WHERE id = ?`, [name, phone, dob, darkMode, learningMode, req.user.id]);
  const user = await db.get('SELECT id, name, email, phone, dob, darkMode, learningMode FROM users WHERE id = ?', [req.user.id]);
  res.json({ message: 'Profile updated.', user });
});

router.post('/onboard', authenticate, async (req, res) => {
  const db = await getDb();
  await db.run('UPDATE users SET onboarded = 1 WHERE id = ?', [req.user.id]);
  res.json({ message: 'Onboarding completed.' });
});

// Nodemailer Test Account Setup
let transporter;
const simulatedEmails = [];

nodemailer.createTestAccount().then(testAccount => {
  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });
});

router.get('/simulated-emails', (req, res) => {
  const { email } = req.query;
  if (email) {
    return res.json({ emails: simulatedEmails.filter(e => e.email.toLowerCase() === email.toLowerCase()) });
  }
  res.json({ emails: simulatedEmails });
});

router.post('/forgot', async (req, res) => {
  const { email, type } = req.body; // type: 'password' or 'pin'
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const db = await getDb();
    const user = await db.get('SELECT id, name FROM users WHERE email = ?', [email]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Generate a secure reset link (simulated)
    const resetToken = require('crypto').randomBytes(32).toString('hex');
    const resetLink = `http://localhost:5173/reset-${type}?token=${resetToken}&email=${email}`;

    // Push into simulated sandbox mailbox
    simulatedEmails.unshift({
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      email,
      name: user.name,
      subject: type === 'pin' ? '🔑 UPI PIN Reset Request' : '🔒 Password Reset Request',
      resetLink,
      type,
      timestamp: new Date().toISOString()
    });

    const info = await transporter.sendMail({
      from: '"NeoBank Support" <neobank@gmail.com>',
      to: email,
      subject: type === 'pin' ? 'UPI PIN Reset Request' : 'Password Reset Request',
      text: `Hi ${user.name},\n\nPlease click the link to reset your ${type.toUpperCase()}: ${resetLink}\n\nIf you didn't request this, ignore this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-w-md mx-auto p-6 bg-gray-100 rounded-xl text-center">
          <h2>Reset Your NeoBank ${type === 'pin' ? 'UPI PIN' : 'Password'}</h2>
          <p>Hi ${user.name}, you requested a ${type} reset.</p>
          <a href="${resetLink}" style="display:inline-block; padding: 10px 20px; background-color: #4361EE; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px;">Reset ${type === 'pin' ? 'UPI PIN' : 'Password'}</a>
          <p style="margin-top: 20px; font-size: 12px; color: #666;">Educational simulation only.</p>
        </div>
      `
    });

    console.log(`\n==========================================`);
    console.log(`📧 EMAIL SENT TO: ${email}`);
    console.log(`🔗 VIEW IN BROWSER: ${nodemailer.getTestMessageUrl(info)}`);
    console.log(`==========================================\n`);

    res.json({ message: `Reset link has been sent to your simulated sandbox mailbox!` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

router.post('/reset-password', async (req, res) => {
  const { email, token, newPassword } = req.body;
  if (!email || !newPassword) return res.status(400).json({ error: 'Email and new password are required.' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  try {
    const db = await getDb();
    const user = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const hashedPassword = bcrypt.hashSync(newPassword, 12);
    await db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id]);
    
    // Add security notification
    await db.run(`INSERT INTO notifications (userId, title, message, type, icon) VALUES (?, '🔒 Password Changed', 'Your account password was updated successfully via secure email link.', 'system', '🔑')`, [user.id]);

    res.json({ message: 'Password has been successfully updated!' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

router.post('/reset-pin', async (req, res) => {
  const { email, token, newPin } = req.body;
  if (!email || !newPin) return res.status(400).json({ error: 'Email and new UPI PIN are required.' });
  if (newPin.length !== 4) return res.status(400).json({ error: 'UPI PIN must be exactly 4 digits.' });

  try {
    const db = await getDb();
    const user = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    await db.run('UPDATE users SET upiPin = ? WHERE id = ?', [newPin, user.id]);

    // Add security notification
    await db.run(`INSERT INTO notifications (userId, title, message, type, icon) VALUES (?, '🔑 UPI PIN Reset', 'Your 4-digit UPI/ATM card PIN was successfully reset via secure email link.', 'system', '🔒')`, [user.id]);

    res.json({ message: 'UPI PIN has been successfully updated!' });
  } catch (err) {
    console.error('Reset pin error:', err);
    res.status(500).json({ error: 'Failed to reset PIN.' });
  }
});

module.exports = router;
