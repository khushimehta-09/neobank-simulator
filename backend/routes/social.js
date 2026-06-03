const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { authenticate } = require('../middleware/auth');

// Get social feed (friends' activities)
router.get('/feed', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    const feed = await db.all(
      `SELECT sf.*, u.name, u.level, u.financialScore
       FROM social_feed sf
       JOIN users u ON sf.userId = u.id
       WHERE sf.userId IN (
         SELECT CASE WHEN requesterId=? THEN receiverId ELSE requesterId END
         FROM friends WHERE (requesterId=? OR receiverId=?) AND status='accepted'
       ) OR sf.userId = ?
       ORDER BY sf.createdAt DESC LIMIT ? OFFSET ?`,
      [req.user.id, req.user.id, req.user.id, req.user.id, limit, offset]
    );
    res.json({ feed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Post activity to feed
router.post('/post', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const { activityType, title, description, icon = '🏆', xpEarned = 0 } = req.body;
    const result = await db.run(
      'INSERT INTO social_feed (userId, activityType, title, description, icon, xpEarned) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, activityType, title, description, icon, xpEarned]
    );
    const post = await db.get(
      `SELECT sf.*, u.name, u.level FROM social_feed sf JOIN users u ON sf.userId=u.id WHERE sf.id=?`,
      [result.lastID]
    );
    const io = req.app.get('io');
    if (io) io.emit('new_feed_post', post);
    res.json({ success: true, post });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// React to a feed post
router.post('/react/:postId', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const { emoji } = req.body;
    const post = await db.get('SELECT reactions FROM social_feed WHERE id=?', [req.params.postId]);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    
    let reactions = {};
    try { reactions = JSON.parse(post.reactions || '{}'); } catch(e) {}
    
    if (!reactions[emoji]) reactions[emoji] = [];
    const idx = reactions[emoji].indexOf(req.user.id);
    if (idx > -1) {
      reactions[emoji].splice(idx, 1);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      reactions[emoji].push(req.user.id);
    }
    
    await db.run('UPDATE social_feed SET reactions=? WHERE id=?', [JSON.stringify(reactions), req.params.postId]);
    res.json({ success: true, reactions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Community stats
router.get('/stats', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const totalUsers = await db.get('SELECT COUNT(*) as count FROM users');
    const totalTransactions = await db.get('SELECT COUNT(*) as count FROM transactions');
    const topUsers = await db.all(`
      SELECT u.id, u.name, u.level, u.xp, u.financialScore, u.balance,
        COUNT(DISTINCT t.id) as transactionCount,
        COALESCE(SUM(CASE WHEN t.type IN ('game_profit','game_loss') THEN 1 ELSE 0 END),0) as gameCount,
        COUNT(DISTINCT sf.id) as socialCount,
        COALESCE(ts.score, 70) as trustScore,
        ROUND((u.xp * 1.0) + (u.financialScore * 1.5) + (COALESCE(ts.score,70) * 2) + (COUNT(DISTINCT t.id) * 10) + (COUNT(DISTINCT sf.id) * 8) + (u.balance / 1000), 0) as totalScore
      FROM users u
      LEFT JOIN transactions t ON (t.senderId=u.id OR t.receiverId=u.id)
      LEFT JOIN social_feed sf ON sf.userId=u.id
      LEFT JOIN trust_scores ts ON ts.userId=u.id
      GROUP BY u.id
      ORDER BY totalScore DESC
      LIMIT 10
    `);
    const recentActivity = await db.all(
      `SELECT sf.*, u.name FROM social_feed sf JOIN users u ON sf.userId=u.id ORDER BY sf.createdAt DESC LIMIT 5`
    );
    res.json({
      totalUsers: totalUsers.count,
      totalTransactions: totalTransactions.count,
      topUsers,
      recentActivity
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
