const express = require('express');
const { getDb } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  const db = await getDb();
  const notifications = await db.all('SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT 50', [req.user.id]);
  const unreadCount = await db.get('SELECT COUNT(*) as cnt FROM notifications WHERE userId = ? AND readStatus = 0', [req.user.id]);
  res.json({ notifications, unreadCount: unreadCount?.cnt || 0 });
});

router.put('/:id/read', authenticate, async (req, res) => {
  const db = await getDb();
  await db.run('UPDATE notifications SET readStatus = 1 WHERE id = ? AND userId = ?', [req.params.id, req.user.id]);
  res.json({ message: 'Marked as read.' });
});

module.exports = router;
