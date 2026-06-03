const express = require('express');
const { getDb } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/dashboard', authenticate, async (req, res) => {
  const db = await getDb();
  const uid = req.user.id;

  const monthlySpendingRes = await db.get(`SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE senderId = ? AND timestamp > datetime('now','start of month') AND type IN ('transfer','bill_payment','qr_payment')`, [uid]);
  const monthlyIncomeRes = await db.get(`SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE receiverId = ? AND timestamp > datetime('now','start of month')`, [uid]);
  const totalTransactionsRes = await db.get(`SELECT COUNT(*) as cnt FROM transactions WHERE senderId = ? OR receiverId = ?`, [uid, uid]);
  const pendingBillsRes = await db.get(`SELECT COUNT(*) as cnt FROM bills WHERE userId = ? AND status = 'pending'`, [uid]);
  const user = await db.get('SELECT balance, financialScore, xp, level, savingsStreak, cardNumber, cardExpiry, accountNumber, upiId FROM users WHERE id = ?', [uid]);

  res.json({ monthlySpending: monthlySpendingRes?.total || 0, monthlyIncome: monthlyIncomeRes?.total || 0, totalTransactions: totalTransactionsRes?.cnt || 0, pendingBills: pendingBillsRes?.cnt || 0, ...user });
});

router.get('/categories', authenticate, async (req, res) => {
  const { period = '30' } = req.query;
  const db = await getDb();
  const cats = await db.all(`SELECT category, SUM(amount) as total, COUNT(*) as count FROM transactions WHERE senderId = ? AND timestamp > datetime('now', '-${Number(period)} days') AND type IN ('transfer','bill_payment','qr_payment') GROUP BY category ORDER BY total DESC`, [req.user.id]);
  res.json({ categories: cats });
});

router.get('/monthly-trend', authenticate, async (req, res) => {
  const db = await getDb();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const spendingRes = await db.get(`SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE senderId = ? AND timestamp BETWEEN datetime('now','start of month','-${i} months') AND datetime('now','start of month','-${i-1} months') AND type IN ('transfer','bill_payment','qr_payment')`, [req.user.id]);
    const incomeRes = await db.get(`SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE receiverId = ? AND timestamp BETWEEN datetime('now','start of month','-${i} months') AND datetime('now','start of month','-${i-1} months')`, [req.user.id]);
    const d = new Date(); d.setMonth(d.getMonth() - i);
    months.push({ month: d.toLocaleString('default', { month: 'short' }), year: d.getFullYear(), spending: Math.round(spendingRes?.total || 0), income: Math.round(incomeRes?.total || 0) });
  }
  res.json({ trend: months });
});

module.exports = router;
