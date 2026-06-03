const { getDb } = require('../config/database');

async function checkFraud(userId, amount, type) {
  const db = await getDb();
  const alerts = [];

  const recentCount = await db.get(`SELECT COUNT(*) as cnt FROM transactions WHERE senderId = ? AND timestamp > datetime('now', '-10 minutes') AND type = 'transfer'`, [userId]);
  if (recentCount && recentCount.cnt >= 5) {
    alerts.push({ alertType: 'rapid_transfers', description: 'Multiple rapid transfers detected within 10 minutes. This pattern may indicate unauthorized activity.', severity: 'high' });
  }

  const avgTx = await db.get(`SELECT AVG(amount) as avg FROM transactions WHERE senderId = ? AND type IN ('transfer', 'bill_payment')`, [userId]);
  if (avgTx && avgTx.avg && amount > avgTx.avg * 5 && amount > 10000) {
    alerts.push({ alertType: 'unusual_amount', description: `Transaction of ₹${amount.toLocaleString()} is significantly higher than your average of ₹${Math.round(avgTx.avg).toLocaleString()}. Verify this is intended.`, severity: 'medium' });
  }

  const dailySpend = await db.get(`SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE senderId = ? AND timestamp > datetime('now', '-1 day') AND type IN ('transfer', 'bill_payment', 'qr_payment')`, [userId]);
  if (dailySpend && dailySpend.total + amount > 100000) {
    alerts.push({ alertType: 'daily_limit_warning', description: `Daily spending approaching ₹1,00,000 limit. Current: ₹${Math.round(dailySpend.total).toLocaleString()}.`, severity: 'medium' });
  }

  if (alerts.length > 0) {
    for (const alert of alerts) {
      await db.run(`INSERT INTO fraud_alerts (userId, alertType, description, severity) VALUES (?, ?, ?, ?)`, [userId, alert.alertType, alert.description, alert.severity]);
      await db.run(`INSERT INTO notifications (userId, title, message, type, icon) VALUES (?, ?, ?, 'fraud', '🚨')`, [userId, '⚠️ Security Alert', alert.description]);
    }
  }

  return alerts;
}

function getEducationalTip(type) {
  const tips = {
    transfer: 'Always verify the recipient\'s details before transferring money. In real banking, once a transfer is completed, reversals can be difficult.',
    bill_payment: 'Always verify biller details and amounts before paying. Set up autopay only for trusted billers.',
    qr_payment: 'Always verify the merchant name displayed after scanning a QR code. Never scan QR codes from unknown sources.',
    deposit: 'In real banking, deposits may take time to reflect depending on the method (NEFT, RTGS, IMPS).',
    large_transaction: 'Large transactions may require additional verification (OTP, biometric) in real banking systems.',
    withdrawal: 'Protect your debit card PIN at ATMs. Be aware of skimming devices—physical overlays on the card slot that steal card and PIN data.',
    fraud_general: 'Never share your OTP, PIN, or CVV with anyone. Banks will never ask for these details over phone or email.',
  };
  return tips[type] || tips.fraud_general;
}

module.exports = { checkFraud, getEducationalTip };
