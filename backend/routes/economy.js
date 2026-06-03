const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const EVENT_TEMPLATES = [
  { eventType: 'market_crash', title: '📉 Market Crash!', description: 'Stock markets dropped 15%. Your investments lost value.', financialImpact: -5000, stressImpact: 30 },
  { eventType: 'bonus', title: '🎉 Year-End Bonus!', description: 'Your company gave a surprise bonus!', financialImpact: 10000, stressImpact: -20 },
  { eventType: 'inflation', title: '📈 Inflation Surge', description: 'Prices of essentials increased by 8%. Monthly expenses went up.', financialImpact: -2000, stressImpact: 15 },
  { eventType: 'tax_refund', title: '💰 Tax Refund', description: 'You received your income tax refund!', financialImpact: 7500, stressImpact: -10 },
  { eventType: 'medical_emergency', title: '🏥 Medical Emergency', description: 'Unexpected medical expense hit your savings.', financialImpact: -15000, stressImpact: 40 },
  { eventType: 'promotion', title: '🚀 Job Promotion!', description: 'You got promoted! Monthly salary increased.', financialImpact: 12000, stressImpact: -25 },
  { eventType: 'car_repair', title: '🔧 Car Breakdown', description: 'Your car needs major repairs.', financialImpact: -8000, stressImpact: 20 },
  { eventType: 'freelance_gig', title: '💼 Freelance Income', description: 'A side project client paid you for your work!', financialImpact: 5000, stressImpact: -5 },
  { eventType: 'rent_increase', title: '🏠 Rent Hike', description: 'Your landlord increased rent by 15%.', financialImpact: -3000, stressImpact: 25 },
  { eventType: 'scholarship', title: '🎓 Scholarship Won!', description: 'You won a scholarship/competition prize!', financialImpact: 20000, stressImpact: -30 },
  { eventType: 'phone_stolen', title: '📱 Phone Stolen', description: 'Your phone was stolen. Need to buy a replacement.', financialImpact: -12000, stressImpact: 35 },
  { eventType: 'stock_dividend', title: '📊 Dividend Payout', description: 'Your stock investments paid quarterly dividends.', financialImpact: 3000, stressImpact: -5 },
];

// Get active events
router.get('/events', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const events = await db.all(
      'SELECT * FROM economy_events WHERE isActive=1 ORDER BY createdAt DESC LIMIT 10'
    );
    res.json({ events });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger random economy event (simulated world event)
router.post('/trigger', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const template = EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)];
    const impactType = template.financialImpact > 0 ? 'positive' : 'negative';
    
    await db.run(
      'INSERT INTO economy_events (eventType, title, description, impactType, impactValue, affectsAll) VALUES (?, ?, ?, ?, ?, ?)',
      [template.eventType, template.title, template.description, impactType, template.financialImpact, 1]
    );
    
    // Apply to user
    await db.run('UPDATE users SET balance=MAX(0, balance+?) WHERE id=?', [template.financialImpact, req.user.id]);
    
    // Record life event
    await db.run(
      'INSERT INTO life_events (userId, eventType, title, description, financialImpact, stressImpact) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, template.eventType, template.title, template.description, template.financialImpact, template.stressImpact]
    );
    
    // Post to social feed
    await db.run(
      'INSERT INTO social_feed (userId, activityType, title, description, icon, xpEarned) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, 'economy_event', template.title, template.description, template.financialImpact > 0 ? '📈' : '📉', 15]
    );
    
    await db.run('UPDATE users SET xp=xp+15 WHERE id=?', [req.user.id]);
    
    const io = req.app.get('io');
    if (io) io.emit('economy_event', { ...template, impactType });
    
    const updatedUser = await db.get('SELECT balance FROM users WHERE id=?', [req.user.id]);
    
    res.json({ 
      success: true, 
      event: template, 
      newBalance: updatedUser.balance,
      xpEarned: 15
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get economy dashboard
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const recentEvents = await db.all(
      'SELECT * FROM economy_events ORDER BY createdAt DESC LIMIT 20'
    );
    const userEvents = await db.all(
      'SELECT * FROM life_events WHERE userId=? ORDER BY createdAt DESC LIMIT 10',
      [req.user.id]
    );
    const positiveImpact = await db.get(
      'SELECT SUM(financialImpact) as total FROM life_events WHERE userId=? AND financialImpact > 0',
      [req.user.id]
    );
    const negativeImpact = await db.get(
      'SELECT SUM(financialImpact) as total FROM life_events WHERE userId=? AND financialImpact < 0',
      [req.user.id]
    );
    
    res.json({
      recentEvents,
      userEvents,
      totalGains: positiveImpact.total || 0,
      totalLosses: Math.abs(negativeImpact.total || 0),
      netImpact: (positiveImpact.total || 0) + (negativeImpact.total || 0)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clear all life events for the user
router.delete('/events/clear', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    await db.run('DELETE FROM life_events WHERE userId=?', [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Initialize SIP tables dynamically on startup
async function initSipTables() {
  try {
    const db = await getDb();
    await db.exec(`
      CREATE TABLE IF NOT EXISTS user_sips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER UNIQUE NOT NULL,
        amount REAL NOT NULL,
        frequency TEXT DEFAULT 'weekly',
        status TEXT DEFAULT 'active',
        totalInvested REAL DEFAULT 0,
        currentValue REAL DEFAULT 0,
        nextContributionDate TEXT,
        createdAt TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (userId) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS sip_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        sipId INTEGER NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL,
        gainLoss REAL DEFAULT 0,
        balanceAfter REAL,
        timestamp TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (userId) REFERENCES users(id),
        FOREIGN KEY (sipId) REFERENCES user_sips(id)
      );
    `);
  } catch (err) {
    console.error('Failed to create SIP tables:', err);
  }
}
initSipTables();

// Get SIP details and performance history
router.get('/sip', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    let sip = await db.get('SELECT * FROM user_sips WHERE userId = ?', [req.user.id]);
    if (!sip) {
      await db.run('INSERT INTO user_sips (userId, amount, status, totalInvested, currentValue) VALUES (?, ?, ?, ?, ?)', [req.user.id, 50, 'paused', 0, 0]);
      sip = await db.get('SELECT * FROM user_sips WHERE userId = ?', [req.user.id]);
    }
    
    const history = await db.all('SELECT * FROM sip_history WHERE userId = ? ORDER BY id DESC LIMIT 15', [req.user.id]);
    res.json({
      success: true,
      sip,
      history: history.reverse()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create/edit weekly SIP plan
router.post('/sip/setup', authenticate, async (req, res) => {
  const { amount } = req.body;
  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount < 10 || numAmount > 500) {
    return res.status(400).json({ error: 'SIP amount must be between ₹10 and ₹500.' });
  }
  
  try {
    const db = await getDb();
    let sip = await db.get('SELECT id FROM user_sips WHERE userId = ?', [req.user.id]);
    if (!sip) {
      await db.run('INSERT INTO user_sips (userId, amount, status, totalInvested, currentValue) VALUES (?, ?, ?, ?, ?)', [req.user.id, numAmount, 'active', 0, 0]);
    } else {
      await db.run('UPDATE user_sips SET amount = ?, status = "active" WHERE userId = ?', [numAmount, req.user.id]);
    }
    
    const updatedSip = await db.get('SELECT * FROM user_sips WHERE userId = ?', [req.user.id]);
    res.json({ success: true, sip: updatedSip });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle SIP active/paused
router.post('/sip/toggle', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    let sip = await db.get('SELECT * FROM user_sips WHERE userId = ?', [req.user.id]);
    if (!sip) {
      return res.status(404).json({ error: 'No SIP plan found.' });
    }
    const newStatus = sip.status === 'active' ? 'paused' : 'active';
    await db.run('UPDATE user_sips SET status = ? WHERE userId = ?', [newStatus, req.user.id]);
    res.json({ success: true, status: newStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fast-forward weekly SIP cycle
router.post('/sip/step', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    let sip = await db.get('SELECT * FROM user_sips WHERE userId = ?', [req.user.id]);
    if (!sip) {
      return res.status(404).json({ error: 'No SIP plan found. Please set up a plan first.' });
    }
    
    const user = await db.get('SELECT balance, cardFrozen FROM users WHERE id = ?', [req.user.id]);
    let newBalance = user.balance;
    let debitedAmount = 0;
    
    if (sip.status === 'active') {
      if (user.cardFrozen) {
        return res.status(400).json({ error: 'Your virtual card is frozen. Please unfreeze it in Settings or Card controls first.' });
      }
      if (user.balance < sip.amount) {
        return res.status(400).json({ error: 'Insufficient wallet balance for SIP weekly contribution.' });
      }
      debitedAmount = sip.amount;
      newBalance = user.balance - debitedAmount;
      
      await db.run('UPDATE users SET balance = ? WHERE id = ?', [newBalance, req.user.id]);
      
      const refId = 'SIP' + Date.now().toString(36).toUpperCase();
      await db.run(
        `INSERT INTO transactions (senderId, type, amount, status, category, description, referenceId, balanceAfter) 
         VALUES (?, 'transfer', ?, 'completed', 'investment', ?, ?, ?)`,
        [req.user.id, debitedAmount, `Weekly SIP Contribution - Stock Portfolio`, refId, newBalance]
      );
      
      await db.run(
        `INSERT INTO notifications (userId, title, message, type, icon) VALUES (?, '📈 SIP Contribution', ?, 'transaction', '📈')`,
        [req.user.id, `₹${debitedAmount} invested in your stock portfolio.`]
      );
    }
    
    // Simulate stock market cycles of +₹25 or -₹15 fluctuation
    const isProfit = Math.random() > 0.45;
    const change = isProfit ? 25 : -15;
    
    const newTotalInvested = sip.totalInvested + debitedAmount;
    let newCurrentValue = sip.currentValue + debitedAmount + change;
    if (newCurrentValue < 0) newCurrentValue = 0;
    
    await db.run(
      'UPDATE user_sips SET totalInvested = ?, currentValue = ? WHERE id = ?',
      [newTotalInvested, newCurrentValue, sip.id]
    );
    
    await db.run(
      `INSERT INTO sip_history (userId, sipId, amount, type, gainLoss, balanceAfter) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.id, sip.id, debitedAmount, 'market_fluctuation', change, newCurrentValue]
    );
    
    const updatedSip = await db.get('SELECT * FROM user_sips WHERE userId = ?', [req.user.id]);
    const history = await db.all('SELECT * FROM sip_history WHERE userId = ? ORDER BY id DESC LIMIT 15', [req.user.id]);
    
    res.json({
      success: true,
      debitedAmount,
      marketFluctuation: change,
      newWalletBalance: newBalance,
      sip: updatedSip,
      history: history.reverse()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sell all SIP holdings back to wallet
router.post('/sip/redeem', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const sip = await db.get('SELECT * FROM user_sips WHERE userId = ?', [req.user.id]);
    if (!sip || sip.currentValue <= 0) {
      return res.status(400).json({ error: 'No investments available to redeem.' });
    }
    
    const user = await db.get('SELECT balance FROM users WHERE id = ?', [req.user.id]);
    const redeemAmount = sip.currentValue;
    const newBalance = user.balance + redeemAmount;
    
    await db.run('UPDATE users SET balance = ? WHERE id = ?', [newBalance, req.user.id]);
    await db.run('UPDATE user_sips SET totalInvested = 0, currentValue = 0 WHERE id = ?', [sip.id]);
    
    const refId = 'RED' + Date.now().toString(36).toUpperCase();
    await db.run(
      `INSERT INTO transactions (receiverId, type, amount, status, category, description, referenceId, balanceAfter) 
       VALUES (?, 'deposit', ?, 'completed', 'investment', ?, ?, ?)`,
      [req.user.id, redeemAmount, `SIP Portfolio Redemption - Liquidate Stock Assets`, refId, newBalance]
    );
    
    await db.run('DELETE FROM sip_history WHERE userId = ?', [req.user.id]);
    
    await db.run(
      `INSERT INTO notifications (userId, title, message, type, icon) VALUES (?, '💰 Portfolio Liquidated', ?, 'transaction', '💰')`,
      [req.user.id, `₹${redeemAmount.toLocaleString()} credited back to your main wallet.`]
    );
    
    res.json({
      success: true,
      redeemedAmount: redeemAmount,
      newWalletBalance: newBalance
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
