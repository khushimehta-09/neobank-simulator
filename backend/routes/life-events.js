const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { authenticate } = require('../middleware/auth');

// Get user's life events
router.get('/', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const events = await db.all(
      'SELECT * FROM life_events WHERE userId=? ORDER BY createdAt DESC LIMIT 20',
      [req.user.id]
    );
    const stats = await db.get(
      `SELECT 
        COUNT(*) as totalEvents,
        SUM(CASE WHEN financialImpact > 0 THEN financialImpact ELSE 0 END) as totalGains,
        SUM(CASE WHEN financialImpact < 0 THEN ABS(financialImpact) ELSE 0 END) as totalLosses,
        AVG(stressImpact) as avgStress
       FROM life_events WHERE userId=?`,
      [req.user.id]
    );
    res.json({ events, stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Resolve a life event (take action)
router.put('/:id/resolve', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const { action } = req.body;
    await db.run(
      'UPDATE life_events SET resolved=1 WHERE id=? AND userId=?',
      [req.params.id, req.user.id]
    );
    
    // Award XP for dealing with life events
    await db.run('UPDATE users SET xp=xp+20 WHERE id=?', [req.user.id]);
    
    // Update trust score for responsible behavior
    await db.run(
      `INSERT INTO trust_scores (userId, safeBehavior) VALUES (?, 72)
       ON CONFLICT(userId) DO UPDATE SET safeBehavior=MIN(100, safeBehavior+1), lastUpdated=datetime('now')`,
      [req.user.id]
    );
    
    res.json({ success: true, xpEarned: 20, message: 'Life event resolved! +20 XP' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
