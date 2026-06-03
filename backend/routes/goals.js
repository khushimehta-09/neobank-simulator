const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getDb } = require('../config/database');

async function creditInterestIfDue(db, userId) {
  try {
    const lastInterest = await db.get(
      `SELECT timestamp FROM transactions 
       WHERE receiverId = ? AND type = 'deposit' AND category = 'interest' AND description LIKE 'Weekly Savings Interest%'
       ORDER BY timestamp DESC LIMIT 1`,
      [userId]
    );

    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    if (lastInterest) {
      const lastTime = new Date(lastInterest.timestamp).getTime();
      if (now - lastTime < oneWeekMs) {
        return; // Not due yet
      }
    }

    // Calculate total savings from goals
    const goals = await db.all("SELECT currentAmount FROM savings_goals WHERE userId = ? AND status = 'active'", [userId]);
    const totalSavings = goals.reduce((sum, g) => sum + (g.currentAmount || 0), 0);
    
    if (totalSavings <= 0) return;

    const interestAmount = Math.min(50, Math.round(totalSavings * 0.02));
    if (interestAmount <= 0) return;

    await db.run('BEGIN TRANSACTION');
    try {
      const user = await db.get('SELECT balance FROM users WHERE id = ?', [userId]);
      const newBalance = (user.balance || 0) + interestAmount;
      
      // Update user balance
      await db.run('UPDATE users SET balance = ? WHERE id = ?', [newBalance, userId]);

      // Log transaction
      const refId = 'INT' + Date.now().toString(36).toUpperCase();
      await db.run(
        `INSERT INTO transactions (receiverId, type, amount, status, category, description, referenceId, balanceAfter) 
         VALUES (?, 'deposit', ?, 'completed', 'interest', 'Weekly Savings Interest Credit (2%)', ?, ?)`,
        [userId, interestAmount, refId, newBalance]
      );

      // Log notification
      await db.run(
        `INSERT INTO notifications (userId, title, message, type, icon) 
         VALUES (?, '📈 Savings Interest Credited', ?, 'transaction', '📈')`,
        [userId, `₹${interestAmount} credited as 2% weekly interest on your active goals!`]
      );

      await db.run('COMMIT');
    } catch (err) {
      await db.run('ROLLBACK');
      throw err;
    }
  } catch (err) {
    console.error('Failed to credit interest:', err);
  }
}

// Get all goals for user
router.get('/', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    await creditInterestIfDue(db, req.user.id);
    const goals = await db.all('SELECT * FROM savings_goals WHERE userId = ? ORDER BY createdAt DESC', [req.user.id]);
    res.json({ goals });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
});

// Create a new goal
router.post('/', authenticate, async (req, res) => {
  const { title, targetAmount, icon, deadline } = req.body;
  
  if (!title || !targetAmount) {
    return res.status(400).json({ error: 'Title and target amount are required' });
  }

  try {
    const db = await getDb();
    const result = await db.run(`
      INSERT INTO savings_goals (userId, title, targetAmount, icon, deadline)
      VALUES (?, ?, ?, ?, ?)
    `, [req.user.id, title, targetAmount, icon || '🎯', deadline || null]);

    const newGoal = await db.get('SELECT * FROM savings_goals WHERE id = ?', [result.lastID]);
    res.json({ goal: newGoal });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

// Delete a goal
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    
    // Ensure the goal belongs to the user
    const goal = await db.get('SELECT id FROM savings_goals WHERE id = ? AND userId = ?', [req.params.id, req.user.id]);
    if (!goal) return res.status(404).json({ error: 'Goal not found' });

    await db.run('DELETE FROM savings_goals WHERE id = ?', [req.params.id]);
    res.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete goal' });
  }
});

// Contribute to a goal
router.post('/:id/contribute', authenticate, async (req, res) => {
  const { amount } = req.body;
  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Invalid contribution amount.' });
  }

  try {
    const db = await getDb();
    const goal = await db.get('SELECT * FROM savings_goals WHERE id = ? AND userId = ?', [req.params.id, req.user.id]);
    if (!goal) return res.status(404).json({ error: 'Goal not found' });

    const user = await db.get('SELECT balance, cardFrozen FROM users WHERE id = ?', [req.user.id]);
    if (user.cardFrozen) {
      return res.status(400).json({ error: 'Your virtual card is frozen. Please unfreeze it in Settings or Card controls first.' });
    }
    if (user.balance < numAmount) {
      return res.status(400).json({ error: 'Insufficient balance to contribute to goal.' });
    }

    const newGoalAmount = (goal.currentAmount || 0) + numAmount;
    const newUserBalance = user.balance - numAmount;
    const refId = 'SAV' + Date.now().toString(36).toUpperCase();

    await db.run('BEGIN TRANSACTION');
    try {
      await db.run('UPDATE savings_goals SET currentAmount = ? WHERE id = ?', [newGoalAmount, goal.id]);
      await db.run('UPDATE users SET balance = ? WHERE id = ?', [newUserBalance, req.user.id]);
      
      // Log transaction
      await db.run(
        `INSERT INTO transactions (senderId, type, amount, status, category, description, referenceId, balanceAfter) 
         VALUES (?, ?, 'transfer', ?, 'completed', 'savings', ?, ?, ?)`,
        [req.user.id, req.user.id, numAmount, `Goal Contribution: ${goal.title}`, refId, newUserBalance]
      );

      // Notification
      await db.run(
        `INSERT INTO notifications (userId, title, message, type, icon) 
         VALUES (?, '🎯 Goal Contribution', ?, 'transaction', '🎯')`,
        [req.user.id, `₹${numAmount.toLocaleString()} added to your goal: ${goal.title}.`]
      );

      await db.run('COMMIT');
    } catch (err) {
      await db.run('ROLLBACK');
      throw err;
    }

    res.json({
      message: 'Goal contribution successful!',
      currentAmount: newGoalAmount,
      balance: newUserBalance
    });
  } catch (err) {
    console.error('Goal contribution error:', err);
    res.status(500).json({ error: 'Failed to contribute to goal.' });
  }
});

module.exports = router;
