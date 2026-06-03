const express = require('express');
const { getDb } = require('../config/database');
const { authenticate, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Admin dashboard stats
router.get('/stats', authenticate, adminOnly, async (req, res) => {
  try {
    const db = await getDb();
    const totalUsers = await db.get("SELECT COUNT(*) as cnt FROM users WHERE role = 'user'");
    const totalTransactions = await db.get('SELECT COUNT(*) as cnt FROM transactions');
    const totalVolume = await db.get('SELECT COALESCE(SUM(amount), 0) as total FROM transactions');
    const fraudAlerts = await db.get('SELECT COUNT(*) as cnt FROM fraud_alerts WHERE resolved = 0');
    const activeGoals = await db.get("SELECT COUNT(*) as cnt FROM savings_goals WHERE status = 'active'");
    const completedLessons = await db.get('SELECT COUNT(*) as cnt FROM learning_progress WHERE completed = 1');

    res.json({
      totalUsers: totalUsers?.cnt || 0,
      totalTransactions: totalTransactions?.cnt || 0,
      totalVolume: Math.round(totalVolume?.total || 0),
      fraudAlerts: fraudAlerts?.cnt || 0,
      activeGoals: activeGoals?.cnt || 0,
      completedLessons: completedLessons?.cnt || 0
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Failed to fetch admin stats.' });
  }
});

// List users
router.get('/users', authenticate, adminOnly, async (req, res) => {
  try {
    const db = await getDb();
    const users = await db.all("SELECT id, name, email, phone, accountNumber, upiId, balance, financialScore, xp, level, role, createdAt FROM users ORDER BY createdAt DESC");
    res.json({ users });
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// List all transactions
router.get('/transactions', authenticate, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const db = await getDb();
    const offset = (page - 1) * limit;

    const total = await db.get('SELECT COUNT(*) as cnt FROM transactions');
    const txs = await db.all(`
      SELECT t.*, s.name as senderName, r.name as receiverName 
      FROM transactions t 
      LEFT JOIN users s ON t.senderId = s.id 
      LEFT JOIN users r ON t.receiverId = r.id 
      ORDER BY t.timestamp DESC 
      LIMIT ? OFFSET ?
    `, [Number(limit), Number(offset)]);

    res.json({
      transactions: txs,
      total: total?.cnt || 0,
      page: Number(page),
      totalPages: Math.ceil((total?.cnt || 0) / limit)
    });
  } catch (err) {
    console.error('Admin transactions error:', err);
    res.status(500).json({ error: 'Failed to fetch transactions.' });
  }
});

// Fraud alerts
router.get('/fraud-alerts', authenticate, adminOnly, async (req, res) => {
  try {
    const db = await getDb();
    const alerts = await db.all(`
      SELECT f.*, u.name as userName, u.email 
      FROM fraud_alerts f 
      JOIN users u ON f.userId = u.id 
      ORDER BY f.createdAt DESC 
      LIMIT 50
    `);
    res.json({ alerts });
  } catch (err) {
    console.error('Admin fraud alerts error:', err);
    res.status(500).json({ error: 'Failed to fetch fraud alerts.' });
  }
});

// Resolve fraud alert
router.put('/fraud-alerts/:id/resolve', authenticate, adminOnly, async (req, res) => {
  try {
    const db = await getDb();
    await db.run('UPDATE fraud_alerts SET resolved = 1 WHERE id = ?', [req.params.id]);
    res.json({ message: 'Alert resolved.' });
  } catch (err) {
    console.error('Admin resolve fraud error:', err);
    res.status(500).json({ error: 'Failed to resolve alert.' });
  }
});

module.exports = router;
