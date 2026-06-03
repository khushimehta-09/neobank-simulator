const express = require('express');
const { getDb } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { generateInsights, getBudgetRecommendations } = require('../services/aiAssistant');

const router = express.Router();

const MODULES = [
  { id: 'banking-basics', name: 'Banking Basics', category: 'fundamentals', lessons: [{ title: 'What is a Bank Account?', content: 'A bank account is a financial arrangement where a bank holds your money safely...' }] },
  { id: 'fraud-prevention', name: 'Fraud Prevention', category: 'security', lessons: [{ title: 'Phishing Scams', content: 'Phishing involves fake emails, SMS, or websites mimicking banks...' }] },
];

router.get('/modules', authenticate, async (req, res) => {
  const db = await getDb();
  const progress = await db.all('SELECT moduleId, completed, score FROM learning_progress WHERE userId = ?', [req.user.id]);
  const progressMap = {};
  if (progress) progress.forEach(p => { progressMap[p.moduleId] = p; });

  const modulesWithProgress = MODULES.map(m => ({
    ...m,
    lessonsCount: m.lessons.length,
    completed: progressMap[m.id]?.completed || 0,
    score: progressMap[m.id]?.score || 0,
  }));

  res.json({ modules: modulesWithProgress, totalModules: MODULES.length });
});

router.post('/modules/:id/complete', authenticate, async (req, res) => {
  const mod = MODULES.find(m => m.id === req.params.id);
  if (!mod) return res.status(404).json({ error: 'Module not found.' });

  const db = await getDb();
  const user = await db.get('SELECT balance FROM users WHERE id = ?', [req.user.id]);
  const bonusMoney = req.params.id === 'banking-basics' ? 20 : 30;
  const newBalance = user.balance + bonusMoney;

  await db.run('BEGIN TRANSACTION');
  try {
    await db.run(`INSERT INTO learning_progress (userId, moduleId, moduleName, category, completed, score, completedAt) VALUES (?, ?, ?, ?, 1, 100, datetime('now')) ON CONFLICT(userId, moduleId) DO UPDATE SET completed = 1, score = 100, completedAt = datetime('now')`, [req.user.id, mod.id, mod.name, mod.category]);
    await db.run('UPDATE users SET xp = xp + 50, balance = ? WHERE id = ?', [newBalance, req.user.id]);
    
    // Log transaction
    const refId = 'LRN' + Date.now().toString(36).toUpperCase();
    await db.run(`INSERT INTO transactions (receiverId, type, amount, status, category, description, referenceId, balanceAfter) VALUES (?, 'game_profit', ?, 'completed', 'game', ?, ?, ?)`, [req.user.id, bonusMoney, `Module Completed: ${mod.name}`, refId, newBalance]);

    await db.run(`INSERT INTO notifications (userId, title, message, type, icon) VALUES (?, '📚 Lesson Completed', ?, 'transaction', '📚')`, [req.user.id, `Completed module "${mod.name}"! Earned ₹${bonusMoney} and 50 XP.`]);
    
    await db.run('COMMIT');
  } catch (err) {
    await db.run('ROLLBACK');
    return res.status(500).json({ error: 'Failed to record module completion.' });
  }

  res.json({ message: 'Module completed!', xpEarned: 50, bonusMoney, balance: newBalance });
});


router.get('/ai-insights', authenticate, async (req, res) => {
  const insights = await generateInsights(req.user.id);
  const recommendations = await getBudgetRecommendations(req.user.id);
  res.json({ insights, recommendations, simulation: true });
});

router.get('/fraud-scenarios', authenticate, (req, res) => {
  res.json({ scenarios: [{ id: 1, title: 'Phishing Email', type: 'phishing', severity: 'high', scenario: 'You receive an email from "NeoBank Support" asking you to verify your account...', correctAction: 'Do NOT click the link.', tip: 'Always check the sender\'s email address.' }] });
});

module.exports = router;
