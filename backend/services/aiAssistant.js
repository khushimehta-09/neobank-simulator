const { getDb } = require('../config/database');

async function generateInsights(userId) {
  const db = await getDb();
  const insights = [];

  const thisMonth = await db.get(`SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE senderId = ? AND timestamp > datetime('now', 'start of month') AND type IN ('transfer', 'bill_payment', 'qr_payment')`, [userId]);
  const lastMonth = await db.get(`SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE senderId = ? AND timestamp BETWEEN datetime('now', 'start of month', '-1 month') AND datetime('now', 'start of month') AND type IN ('transfer', 'bill_payment', 'qr_payment')`, [userId]);

  if (lastMonth && lastMonth.total > 0) {
    const pctChange = ((thisMonth.total - lastMonth.total) / lastMonth.total * 100).toFixed(1);
    if (pctChange > 10) {
      insights.push({ type: 'warning', icon: '📈', message: `Your spending increased by ${pctChange}% compared to last month. Consider reviewing your expenses.`, category: 'spending' });
    } else if (pctChange < -10) {
      insights.push({ type: 'success', icon: '🎉', message: `Great job! Your spending decreased by ${Math.abs(pctChange)}% compared to last month.`, category: 'spending' });
    }
  }

  const categories = await db.all(`SELECT category, SUM(amount) as total FROM transactions WHERE senderId = ? AND timestamp > datetime('now', 'start of month') AND type IN ('transfer', 'bill_payment', 'qr_payment') GROUP BY category ORDER BY total DESC LIMIT 3`, [userId]);
  if (categories && categories.length > 0) {
    const topCat = categories[0];
    insights.push({ type: 'info', icon: '📊', message: `Your highest spending category this month is "${topCat.category}" at ₹${Math.round(topCat.total).toLocaleString()}.`, category: 'analysis' });
  }

  const goals = await db.all(`SELECT title, targetAmount, currentAmount FROM savings_goals WHERE userId = ? AND status = 'active' ORDER BY createdAt DESC LIMIT 3`, [userId]);
  if (goals) {
    for (const goal of goals) {
      const pct = (goal.currentAmount / goal.targetAmount * 100).toFixed(0);
      if (pct >= 80) insights.push({ type: 'success', icon: '🎯', message: `You're ${pct}% towards your "${goal.title}" goal! Almost there!`, category: 'savings' });
      else if (pct < 30) insights.push({ type: 'tip', icon: '💡', message: `Your "${goal.title}" goal is at ${pct}%. Try setting aside small amounts daily to build momentum.`, category: 'savings' });
    }
  }

  const pendingBills = await db.get(`SELECT COUNT(*) as cnt, COALESCE(SUM(amount), 0) as total FROM bills WHERE userId = ? AND status = 'pending' AND dueDate <= datetime('now', '+7 days')`, [userId]);
  if (pendingBills && pendingBills.cnt > 0) {
    insights.push({ type: 'warning', icon: '📋', message: `You have ${pendingBills.cnt} bill(s) due soon totaling ₹${Math.round(pendingBills.total).toLocaleString()}. Pay on time to maintain a good financial score.`, category: 'bills' });
  }

  const user = await db.get('SELECT balance FROM users WHERE id = ?', [userId]);
  if (user && user.balance < 5000) {
    insights.push({ type: 'warning', icon: '⚠️', message: 'Your balance is running low. Consider limiting non-essential spending.', category: 'balance' });
  } else if (user && user.balance > 100000) {
    insights.push({ type: 'tip', icon: '💰', message: 'You have a healthy balance. Consider creating a savings goal or exploring investment simulations.', category: 'balance' });
  }

  if (thisMonth && thisMonth.total > 0) {
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const daysPassed = new Date().getDate();
    const dailyAvg = thisMonth.total / daysPassed;
    const projected = dailyAvg * daysInMonth;
    insights.push({ type: 'info', icon: '📅', message: `At your current rate, you'll spend approximately ₹${Math.round(projected).toLocaleString()} this month.`, category: 'budget' });
  }

  if (insights.length === 0) {
    insights.push(
      { type: 'tip', icon: '🏦', message: 'Start making transactions to receive personalized financial insights!', category: 'general' },
      { type: 'info', icon: '📚', message: 'Visit the Learning Center to improve your financial literacy score.', category: 'education' }
    );
  }

  return insights;
}

async function getBudgetRecommendations(userId) {
  const db = await getDb();
  const recs = [];
  const categories = await db.all(`SELECT category, SUM(amount) as total FROM transactions WHERE senderId = ? AND timestamp > datetime('now', '-30 days') AND type IN ('transfer', 'bill_payment', 'qr_payment') GROUP BY category ORDER BY total DESC`, [userId]);

  if (!categories) return [];
  const totalSpending = categories.reduce((sum, c) => sum + c.total, 0);

  for (const cat of categories) {
    const pct = (cat.total / totalSpending * 100).toFixed(0);
    const suggestedPct = getSuggestedBudget(cat.category);
    if (pct > suggestedPct + 10) {
      recs.push({ category: cat.category, current: Number(pct), suggested: suggestedPct, status: 'over', amount: Math.round(cat.total) });
    } else {
      recs.push({ category: cat.category, current: Number(pct), suggested: suggestedPct, status: 'ok', amount: Math.round(cat.total) });
    }
  }
  return recs;
}

function getSuggestedBudget(category) {
  const budgets = { food: 25, shopping: 15, travel: 10, entertainment: 10, bills: 20, healthcare: 10, education: 10, other: 10 };
  return budgets[category] || 10;
}

module.exports = { generateInsights, getBudgetRecommendations };
