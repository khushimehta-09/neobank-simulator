const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { authenticate } = require('../middleware/auth');

// Get trust score
router.get('/', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    let trust = await db.get('SELECT * FROM trust_scores WHERE userId=?', [req.user.id]);
    if (!trust) {
      await db.run(
        'INSERT INTO trust_scores (userId, score, scamAwareness, challengeCompletion, safeBehavior, paymentReliability) VALUES (?, 70, 70, 70, 70, 70)',
        [req.user.id]
      );
      trust = await db.get('SELECT * FROM trust_scores WHERE userId=?', [req.user.id]);
    }
    
    // Calculate composite score
    const composite = Math.round(
      (trust.scamAwareness * 0.3) +
      (trust.challengeCompletion * 0.2) +
      (trust.safeBehavior * 0.25) +
      (trust.paymentReliability * 0.25)
    );
    
    await db.run('UPDATE trust_scores SET score=? WHERE userId=?', [composite, req.user.id]);
    
    res.json({
      ...trust,
      score: composite,
      grade: composite >= 90 ? 'A+' : composite >= 80 ? 'A' : composite >= 70 ? 'B' : composite >= 60 ? 'C' : 'D',
      breakdown: {
        scamAwareness: { value: trust.scamAwareness, weight: '30%', label: 'Scam Awareness' },
        safeBehavior: { value: trust.safeBehavior, weight: '25%', label: 'Safe Behavior' },
        paymentReliability: { value: trust.paymentReliability, weight: '25%', label: 'Payment Reliability' },
        challengeCompletion: { value: trust.challengeCompletion, weight: '20%', label: 'Challenge Completion' }
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get trust leaderboard
router.get('/leaderboard', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const leaderboard = await db.all(
      `SELECT ts.score, ts.scamAwareness, ts.challengeCompletion, u.id, u.name, u.level
       FROM trust_scores ts JOIN users u ON ts.userId=u.id
       ORDER BY ts.score DESC LIMIT 20`
    );
    res.json({ leaderboard });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
