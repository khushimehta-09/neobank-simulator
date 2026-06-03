const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const MENTOR_TIPS_DB = {
  spending: [
    'Try the 50/30/20 rule: 50% needs, 30% wants, 20% savings.',
    'Track every expense for a week — you\'ll be surprised where money goes.',
    'Before buying, wait 24 hours. If you still want it, it\'s not impulse buying.',
    'Use the "cost per use" method: divide price by expected uses to evaluate purchases.',
    'Set up automatic transfers to savings on payday — pay yourself first!'
  ],
  saving: [
    'Start an emergency fund — aim for 3-6 months of expenses.',
    'Use the "round-up" strategy: round purchases up and save the difference.',
    'Challenge yourself: No-Spend weekends can save ₹2000-5000/month.',
    'Keep savings in a separate account to reduce temptation.',
    'Set micro-goals: saving ₹100/day is ₹36,500/year!'
  ],
  investing: [
    'Start with index funds — low fees, diversified, proven long-term returns.',
    'Don\'t try to time the market. Time IN the market beats timing the market.',
    'Diversify: Never put all eggs in one basket. Mix equity, debt, and gold.',
    'SIP (Systematic Investment Plan) removes emotion from investing.',
    'Understand the difference between assets and liabilities.'
  ],
  security: [
    'Enable 2FA on all financial accounts. SMS OTP alone isn\'t enough.',
    'Never share OTP, PIN, or CVV — even with "bank officials".',
    'Check your bank statements weekly for unauthorized transactions.',
    'Use unique, strong passwords for each financial service.',
    'Be suspicious of "too good to be true" offers — they usually are.'
  ],
  credit: [
    'Keep credit utilization below 30% of your limit.',
    'Pay credit card bills IN FULL before due date — minimum payment is a trap.',
    'Check your credit score quarterly — errors can hurt you.',
    'Multiple hard inquiries in a short period lower your score.',
    'Length of credit history matters — don\'t close your oldest card.'
  ]
};

// Get personalized tips
router.get('/tips', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const category = req.query.category || 'all';
    
    let tips = [];
    if (category === 'all') {
      for (const [cat, catTips] of Object.entries(MENTOR_TIPS_DB)) {
        const randomTip = catTips[Math.floor(Math.random() * catTips.length)];
        tips.push({ category: cat, tip: randomTip });
      }
    } else if (MENTOR_TIPS_DB[category]) {
      tips = MENTOR_TIPS_DB[category].map(tip => ({ category, tip }));
    }
    
    // Also get user-specific saved tips
    const savedTips = await db.all(
      'SELECT * FROM mentor_tips WHERE userId=? AND dismissed=0 ORDER BY createdAt DESC LIMIT 5',
      [req.user.id]
    );
    
    res.json({ tips, savedTips, categories: Object.keys(MENTOR_TIPS_DB) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get AI-like analysis based on user behavior
router.get('/analysis', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const user = await db.get('SELECT * FROM users WHERE id=?', [req.user.id]);
    
    const recentTx = await db.all(
      'SELECT category, SUM(amount) as total, COUNT(*) as count FROM transactions WHERE senderId=? AND type="debit" GROUP BY category ORDER BY total DESC LIMIT 5',
      [req.user.id]
    );
    
    const savingsGoals = await db.all(
      'SELECT * FROM savings_goals WHERE userId=? AND status="active"',
      [req.user.id]
    );
    
    const trustScore = await db.get('SELECT * FROM trust_scores WHERE userId=?', [req.user.id]);
    const scamStats = await db.get(
      'SELECT COUNT(*) as total, SUM(isCorrect) as correct FROM scam_game_results WHERE userId=?',
      [req.user.id]
    );
    
    // Generate insights
    const insights = [];
    
    if (user.balance < 10000) {
      insights.push({ type: 'warning', icon: '⚠️', message: 'Your balance is low. Consider reducing discretionary spending.', category: 'spending' });
    }
    if (user.balance > 40000) {
      insights.push({ type: 'tip', icon: '💡', message: 'You have a healthy balance! Consider investing the surplus.', category: 'investing' });
    }
    if (recentTx.length > 0 && recentTx[0].total > user.balance * 0.3) {
      insights.push({ type: 'alert', icon: '📊', message: `Your top spending category "${recentTx[0].category}" takes ${Math.round((recentTx[0].total / user.balance) * 100)}% of your balance.`, category: 'spending' });
    }
    if (savingsGoals.length === 0) {
      insights.push({ type: 'suggestion', icon: '🎯', message: 'Set a savings goal! People with goals save 2x more.', category: 'saving' });
    }
    if (scamStats && scamStats.total > 0) {
      const accuracy = Math.round((scamStats.correct / scamStats.total) * 100);
      if (accuracy < 60) {
        insights.push({ type: 'warning', icon: '🛡️', message: `Your scam detection accuracy is ${accuracy}%. Play more Scam Detective to improve!`, category: 'security' });
      } else {
        insights.push({ type: 'success', icon: '✅', message: `Great scam detection skills! ${accuracy}% accuracy.`, category: 'security' });
      }
    }
    
    // Always add a motivational tip
    const allTips = Object.values(MENTOR_TIPS_DB).flat();
    const dailyTip = allTips[Math.floor(Math.random() * allTips.length)];
    insights.push({ type: 'tip', icon: '💡', message: dailyTip, category: 'daily' });
    
    res.json({
      insights,
      spendingBreakdown: recentTx,
      financialScore: user.financialScore,
      trustScore: trustScore?.score || 70,
      level: user.level,
      xp: user.xp
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dismiss a tip
router.put('/tips/:id/dismiss', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    await db.run('UPDATE mentor_tips SET dismissed=1 WHERE id=? AND userId=?', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
