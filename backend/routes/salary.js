const express = require('express');
const { getDb } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Get salary information (claim status, cooldown, amount)
router.get('/info', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const user = await db.get('SELECT level FROM users WHERE id = ?', [req.user.id]);
    
    // Check transaction history for last salary claim in the last 7 days
    const lastClaim = await db.get(
      `SELECT timestamp, amount, description FROM transactions 
       WHERE receiverId = ? AND type = 'deposit' AND (description LIKE 'Weekly Student Allowance%' OR description LIKE 'Part-Time Internship Salary%')
       ORDER BY timestamp DESC LIMIT 1`,
      [req.user.id]
    );

    let canClaim = true;
    let secondsLeft = 0;
    let nextClaimDate = null;

    if (lastClaim) {
      const lastClaimTime = new Date(lastClaim.timestamp).getTime();
      const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      
      if (now - lastClaimTime < oneWeekMs) {
        canClaim = false;
        secondsLeft = Math.ceil((oneWeekMs - (now - lastClaimTime)) / 1000);
        nextClaimDate = new Date(lastClaimTime + oneWeekMs).toISOString();
      }
    }

    const allowanceAmount = user.level >= 3 ? 500 : 200;
    const allowanceName = user.level >= 3 ? 'Part-Time Internship Salary' : 'Weekly Student Allowance';

    res.json({
      canClaim,
      secondsLeft,
      nextClaimDate,
      allowanceAmount,
      allowanceName,
      level: user.level
    });
  } catch (err) {
    console.error('Salary info error:', err);
    res.status(500).json({ error: 'Failed to retrieve salary parameters.' });
  }
});

// Claim weekly salary
router.post('/claim', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const user = await db.get('SELECT level, balance, xp FROM users WHERE id = ?', [req.user.id]);
    
    // Check cooldown
    const lastClaim = await db.get(
      `SELECT timestamp FROM transactions 
       WHERE receiverId = ? AND type = 'deposit' AND (description LIKE 'Weekly Student Allowance%' OR description LIKE 'Part-Time Internship Salary%')
       ORDER BY timestamp DESC LIMIT 1`,
      [req.user.id]
    );

    if (lastClaim) {
      const lastClaimTime = new Date(lastClaim.timestamp).getTime();
      const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - lastClaimTime < oneWeekMs) {
        const hoursLeft = Math.ceil((oneWeekMs - (Date.now() - lastClaimTime)) / (1000 * 60 * 60));
        return res.status(400).json({ error: `Allowance already claimed this week. Please wait ${hoursLeft} hours.` });
      }
    }

    const allowanceAmount = user.level >= 3 ? 500 : 200;
    const allowanceName = user.level >= 3 ? 'Part-Time Internship Salary' : 'Weekly Student Allowance';
    const xpReward = user.level >= 3 ? 100 : 50;

    const newBalance = user.balance + allowanceAmount;
    const newXp = user.xp + xpReward;

    const refId = 'SAL' + Date.now().toString(36).toUpperCase();

    await db.run('BEGIN TRANSACTION');
    try {
      // Update balance & XP
      await db.run('UPDATE users SET balance = ?, xp = ? WHERE id = ?', [newBalance, newXp, req.user.id]);
      
      // Log transaction
      await db.run(
        `INSERT INTO transactions (receiverId, type, amount, status, category, description, referenceId, balanceAfter) 
         VALUES (?, 'deposit', ?, 'completed', 'salary', ?, ?, ?)`,
        [req.user.id, allowanceAmount, `${allowanceName} (Level ${user.level})`, refId, newBalance]
      );

      // Log notification
      await db.run(
        `INSERT INTO notifications (userId, title, message, type, icon) 
         VALUES (?, '💼 Virtual Salary Credited', ?, 'transaction', '💼')`,
        [req.user.id, `₹${allowanceAmount.toLocaleString()} credited from your virtual ${allowanceName}. (+${xpReward} XP)`]
      );

      await db.run('COMMIT');
    } catch (err) {
      await db.run('ROLLBACK');
      throw err;
    }

    res.json({
      message: 'Weekly virtual salary claimed!',
      allowanceAmount,
      allowanceName,
      balance: newBalance,
      xpEarned: xpReward
    });
  } catch (err) {
    console.error('Salary claim error:', err);
    res.status(500).json({ error: 'Failed to process weekly virtual salary.' });
  }
});

module.exports = router;
