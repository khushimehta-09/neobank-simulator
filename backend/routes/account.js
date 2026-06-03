const express = require('express');
const { getDb } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { generateReferenceId } = require('../utils/generators');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  const db = await getDb();
  const user = await db.get('SELECT id, name, accountNumber, ifscCode, upiId, balance, financialScore, cardNumber, cardExpiry, cardFrozen, onlinePayments, createdAt FROM users WHERE id = ?', [req.user.id]);
  res.json({ account: user, simulation: true, educationalNote: 'This is a virtual account. No real money is involved.' });
});

router.post('/deposit', authenticate, async (req, res) => {
  const { amount, category } = req.body;
  const numAmount = Number(amount);
  if (!numAmount || numAmount <= 0) return res.status(400).json({ error: 'Invalid deposit amount.' });

  const db = await getDb();
  const user = await db.get('SELECT balance FROM users WHERE id = ?', [req.user.id]);
  const newBalance = user.balance + numAmount;

  await db.run('UPDATE users SET balance = ?, updatedAt = datetime(\'now\') WHERE id = ?', [newBalance, req.user.id]);
  await db.run(`INSERT INTO transactions (receiverId, type, amount, status, category, description, referenceId, balanceAfter) VALUES (?, 'deposit', ?, 'completed', ?, ?, ?, ?)`, [req.user.id, numAmount, category || 'other', 'Virtual money deposit', generateReferenceId(), newBalance]);
  await db.run(`INSERT INTO notifications (userId, title, message, type, icon) VALUES (?, ?, ?, 'transaction', '💰')`, [req.user.id, '💰 Deposit Successful', `₹${numAmount.toLocaleString()} has been added to your virtual account.`]);

  res.json({ message: 'Deposit successful!', balance: newBalance, simulation: true });
});

router.post('/card/freeze', authenticate, async (req, res) => {
  const db = await getDb();
  const { pin } = req.body || {};
  const user = await db.get('SELECT cardFrozen, upiPin FROM users WHERE id = ?', [req.user.id]);
  const newState = user.cardFrozen ? 0 : 1;
  if (newState === 0) {
    if (!pin) return res.status(400).json({ error: 'PIN is required to unfreeze card.' });
    if (user.upiPin && user.upiPin !== pin) return res.status(400).json({ error: 'Incorrect 4-digit PIN.' });
  }
  await db.run('UPDATE users SET cardFrozen = ? WHERE id = ?', [newState, req.user.id]);
  res.json({ frozen: !!newState, message: newState ? 'Card frozen successfully.' : 'Card unfrozen successfully.' });
});

router.post('/card/change-pin', authenticate, async (req, res) => {
  const { currentPin, newPin } = req.body;
  const db = await getDb();
  const user = await db.get('SELECT cardPin FROM users WHERE id = ?', [req.user.id]);
  if (user.cardPin !== currentPin) return res.status(401).json({ error: 'Current PIN is incorrect.' });
  await db.run('UPDATE users SET cardPin = ? WHERE id = ?', [newPin, req.user.id]);
  res.json({ message: 'PIN changed successfully.' });
});

router.get('/card', authenticate, async (req, res) => {
  const db = await getDb();
  const user = await db.get('SELECT cardNumber, cardExpiry, cardCvv, cardFrozen, onlinePayments FROM users WHERE id = ?', [req.user.id]);
  res.json({ card: user, simulation: true });
});

module.exports = router;
