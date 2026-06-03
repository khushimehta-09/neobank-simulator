const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { authenticate } = require('../middleware/auth');

// Get active challenges
router.get('/', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const challenges = await db.all(
      `SELECT gc.*, u.name as creatorName,
        (SELECT COUNT(*) FROM challenge_participants WHERE challengeId=gc.id) as participantCount,
        (SELECT completed FROM challenge_participants WHERE challengeId=gc.id AND userId=?) as myCompleted,
        (SELECT progress FROM challenge_participants WHERE challengeId=gc.id AND userId=?) as myProgress,
        (SELECT id FROM challenge_participants WHERE challengeId=gc.id AND userId=?) as myParticipation
       FROM group_challenges gc
       JOIN users u ON gc.creatorId = u.id
       WHERE gc.status='active'
       ORDER BY gc.createdAt DESC`,
      [req.user.id, req.user.id, req.user.id]
    );
    res.json({ challenges });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create challenge
router.post('/', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const { title, description, challengeType, targetAmount, targetDays = 7, xpReward = 100 } = req.body;
    const endsAt = new Date(Date.now() + targetDays * 86400000).toISOString();
    const result = await db.run(
      'INSERT INTO group_challenges (creatorId, title, description, challengeType, targetAmount, targetDays, xpReward, endsAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, title, description, challengeType, targetAmount, targetDays, xpReward, endsAt]
    );
    // Creator auto-joins
    await db.run(
      'INSERT INTO challenge_participants (challengeId, userId) VALUES (?, ?)',
      [result.lastID, req.user.id]
    );
    // Post to social feed
    await db.run(
      'INSERT INTO social_feed (userId, activityType, title, description, icon, xpEarned) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, 'challenge_created', `Created: ${title}`, description, '🏋️', 20]
    );
    const io = req.app.get('io');
    if (io) io.emit('new_challenge', { id: result.lastID, title });
    res.json({ success: true, challengeId: result.lastID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Join challenge
router.post('/:id/join', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const existing = await db.get(
      'SELECT id FROM challenge_participants WHERE challengeId=? AND userId=?',
      [req.params.id, req.user.id]
    );
    if (existing) return res.status(400).json({ error: 'Already joined' });
    await db.run(
      'INSERT INTO challenge_participants (challengeId, userId) VALUES (?, ?)',
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update progress
router.put('/:id/progress', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const { progress } = req.body;
    const challenge = await db.get('SELECT * FROM group_challenges WHERE id=?', [req.params.id]);
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
    
    const completed = progress >= challenge.targetAmount ? 1 : 0;
    await db.run(
      'UPDATE challenge_participants SET progress=?, completed=? WHERE challengeId=? AND userId=?',
      [progress, completed, req.params.id, req.user.id]
    );
    
    if (completed) {
      await db.run('UPDATE users SET xp=xp+? WHERE id=?', [challenge.xpReward, req.user.id]);
      await db.run(
        'INSERT INTO social_feed (userId, activityType, title, description, icon, xpEarned) VALUES (?, ?, ?, ?, ?, ?)',
        [req.user.id, 'challenge_completed', `Completed: ${challenge.title}`, `Earned ${challenge.xpReward} XP!`, '🏆', challenge.xpReward]
      );
    }
    res.json({ success: true, completed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get challenge leaderboard
router.get('/:id/leaderboard', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const leaderboard = await db.all(
      `SELECT cp.*, u.name, u.level FROM challenge_participants cp
       JOIN users u ON cp.userId=u.id WHERE cp.challengeId=?
       ORDER BY cp.progress DESC`,
      [req.params.id]
    );
    res.json({ leaderboard });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
