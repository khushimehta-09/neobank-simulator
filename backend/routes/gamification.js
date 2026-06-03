const express = require('express');
const { getDb } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/stats', authenticate, async (req, res) => {
  const db = await getDb();
  const user = await db.get('SELECT xp, level, savingsStreak, financialScore FROM users WHERE id = ?', [req.user.id]);
  const achievements = await db.all('SELECT * FROM achievements WHERE userId = ? ORDER BY unlockedAt DESC', [req.user.id]);
  const nextLevel = user.level * 500;
  const progress = Math.min(100, Math.round((user.xp % 500) / 5));
  res.json({ ...user, achievements, nextLevelXp: nextLevel, levelProgress: progress });
});

router.post('/daily-reward', authenticate, async (req, res) => {
  const db = await getDb();
  const user = await db.get('SELECT dailyRewardDate, savingsStreak, balance FROM users WHERE id = ?', [req.user.id]);
  const today = new Date().toISOString().slice(0, 10);

  if (user.dailyRewardDate === today) return res.status(400).json({ error: 'Daily reward already claimed today.' });

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const newStreak = user.dailyRewardDate === yesterday ? user.savingsStreak + 1 : 1;
  const streakDay = ((newStreak - 1) % 7) + 1;

  // Exact Small Amount Economy schedule
  const rewardsMap = {
    1: 10,
    2: 20,
    3: 30,
    4: 40,
    5: 50,
    6: 60,
    7: 100 // Day 7 bonus
  };
  const bonusMoney = rewardsMap[streakDay] || 10;
  const xpReward = 15 + streakDay * 5; // Balanced XP

  const newBalance = user.balance + bonusMoney;

  await db.run('BEGIN TRANSACTION');
  try {
    await db.run('UPDATE users SET xp = xp + ?, balance = ?, dailyRewardDate = ?, savingsStreak = ? WHERE id = ?', [xpReward, newBalance, today, newStreak, req.user.id]);
    await db.run(`INSERT INTO daily_rewards (userId, rewardType, amount, xpAmount) VALUES (?, 'daily_login', ?, ?)`, [req.user.id, bonusMoney, xpReward]);
    
    // Log in Transaction history as deposit
    const refId = 'DLY' + Date.now().toString(36).toUpperCase();
    await db.run(`INSERT INTO transactions (receiverId, type, amount, status, category, description, referenceId, balanceAfter) VALUES (?, 'game_profit', ?, 'completed', 'game', ?, ?, ?)`, [req.user.id, bonusMoney, `Daily Reward (Day ${streakDay})`, refId, newBalance]);

    await db.run(`INSERT INTO notifications (userId, title, message, type, icon) VALUES (?, '🎁 Daily Reward', ?, 'achievement', '🎁')`, [req.user.id, `Claimed Day ${streakDay} reward! Earned ₹${bonusMoney} virtual cash and ${xpReward} XP. Streak: ${newStreak} days.`]);

    const updated = await db.get('SELECT xp, level FROM users WHERE id = ?', [req.user.id]);
    const newLevel = Math.floor(updated.xp / 500) + 1;
    if (newLevel > updated.level) {
      await db.run('UPDATE users SET level = ? WHERE id = ?', [newLevel, req.user.id]);
      await db.run(`INSERT INTO achievements (userId, badge, title, description, xpReward) VALUES (?, '⭐', ?, ?, 0)`, [req.user.id, `Level ${newLevel}`, `Reached level ${newLevel}`]);
    }
    await db.run('COMMIT');
  } catch (err) {
    await db.run('ROLLBACK');
    return res.status(500).json({ error: 'Failed to process daily reward.' });
  }

  res.json({ message: 'Daily reward claimed!', xpReward, bonusMoney, streak: newStreak, streakDay });
});



router.post('/mini-job', authenticate, async (req, res) => {
  const { title = 'Mini Job', correct = true } = req.body;
  const db = await getDb();
  const user = await db.get('SELECT balance FROM users WHERE id=?', [req.user.id]);
  const profit = !!correct;
  const amount = profit ? (50 + Math.floor(Math.random() * 151)) : (20 + Math.floor(Math.random() * 81));
  const newBalance = profit ? user.balance + amount : Math.max(0, user.balance - amount);
  const type = profit ? 'game_profit' : 'game_loss';
  const desc = profit ? `Game profit: ${title}` : `Game loss: ${title}`;
  await db.run('BEGIN TRANSACTION');
  try {
    await db.run('UPDATE users SET balance=?, xp=xp+? WHERE id=?', [newBalance, profit ? 20 : 5, req.user.id]);
    await db.run(`INSERT INTO transactions (receiverId, senderId, type, amount, status, category, description, referenceId, balanceAfter)
                  VALUES (?, ?, ?, ?, 'completed', 'game', ?, ?, ?)`,
      [profit ? req.user.id : null, profit ? null : req.user.id, type, amount, desc, 'GAME' + Date.now().toString(36).toUpperCase(), newBalance]);
    await db.run('INSERT INTO social_feed (userId, activityType, title, description, icon, xpEarned) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, 'game', profit ? 'Won a mini job reward' : 'Lost a mini job round', `${title}: ${profit ? '+' : '-'}₹${amount}`, profit ? '🎮' : '⚠️', profit ? 20 : 5]);
    await db.run('COMMIT');
    res.json({ success: true, type, amount, balance: newBalance, xp: profit ? 20 : 5, message: profit ? `Correct! You earned ₹${amount}.` : `Wrong answer. You lost ₹${amount}.` });
  } catch (err) { await db.run('ROLLBACK'); res.status(500).json({ error: 'Mini job failed.' }); }
});

router.get('/goals', authenticate, async (req, res) => {
  const db = await getDb();
  const goals = await db.all('SELECT * FROM savings_goals WHERE userId = ? ORDER BY createdAt DESC', [req.user.id]);
  res.json({ goals });
});

router.post('/goals', authenticate, async (req, res) => {
  const { title, targetAmount, icon, deadline } = req.body;
  const db = await getDb();
  const result = await db.run(`INSERT INTO savings_goals (userId, title, targetAmount, icon, deadline) VALUES (?, ?, ?, ?, ?)`, [req.user.id, title, Number(targetAmount), icon || '🎯', deadline || null]);
  await db.run('UPDATE users SET xp = xp + 20 WHERE id = ?', [req.user.id]);
  const goal = await db.get('SELECT * FROM savings_goals WHERE id = ?', [result.lastID]);
  res.status(201).json({ message: 'Goal created!', goal });
});

router.post('/goals/:id/contribute', authenticate, async (req, res) => {
  const { amount } = req.body;
  const numAmount = Number(amount);
  const db = await getDb();
  const goal = await db.get('SELECT * FROM savings_goals WHERE id = ? AND userId = ?', [req.params.id, req.user.id]);
  if (!goal || goal.status !== 'active') return res.status(400).json({ error: 'Goal is not active.' });

  const user = await db.get('SELECT balance FROM users WHERE id = ?', [req.user.id]);
  if (user.balance < numAmount) return res.status(400).json({ error: 'Insufficient balance.' });

  const newCurrent = goal.currentAmount + numAmount;
  const completed = newCurrent >= goal.targetAmount;

  try {
    await db.run('BEGIN TRANSACTION');
    await db.run('UPDATE users SET balance = balance - ? WHERE id = ?', [numAmount, req.user.id]);
    await db.run('UPDATE savings_goals SET currentAmount = ?, status = ? WHERE id = ?', [newCurrent, completed ? 'completed' : 'active', goal.id]);
    await db.run(`INSERT INTO transactions (senderId, type, amount, status, category, description, referenceId, balanceAfter) VALUES (?, 'transfer', ?, 'completed', 'savings', ?, ?, ?)`, [req.user.id, numAmount, `Savings: ${goal.title}`, 'SAV' + Date.now().toString(36).toUpperCase(), user.balance - numAmount]);
    await db.run('UPDATE users SET xp = xp + 10 WHERE id = ?', [req.user.id]);
    if (completed) {
      await db.run(`INSERT INTO achievements (userId, badge, title, description, xpReward) VALUES (?, '🏆', ?, ?, 200)`, [req.user.id, `Goal: ${goal.title}`, `Completed savings goal "${goal.title}"`]);
      await db.run('UPDATE users SET xp = xp + 200 WHERE id = ?', [req.user.id]);
    }
    await db.run('COMMIT');
  } catch(e) {
    await db.run('ROLLBACK');
  }

  res.json({ message: completed ? 'Goal completed! 🎉' : 'Contribution added!', goal: { ...goal, currentAmount: newCurrent, status: completed ? 'completed' : 'active' } });
});

module.exports = router;
