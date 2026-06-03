const express = require('express');
const { getDb } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { transferLimiter } = require('../middleware/rateLimiter');
const { generateReferenceId } = require('../utils/generators');
const { checkFraud, getEducationalTip } = require('../services/fraudDetection');
const { nowIso, daysAgoSqlUtc, sqliteTimestampExpr } = require('../utils/time');

const router = express.Router();

async function updateFinancialScore(userId) {
  const db = await getDb();
  const txCount = await db.get("SELECT COUNT(*) as cnt FROM transactions WHERE senderId = ? AND status = 'completed'", [userId]);
  const paidBills = await db.get("SELECT COUNT(*) as cnt FROM bills WHERE userId = ? AND status = 'paid'", [userId]);
  const score = Math.min(900, 600 + (txCount?.cnt || 0) * 2 + (paidBills?.cnt || 0) * 10);
  await db.run('UPDATE users SET financialScore = ? WHERE id = ?', [score, userId]);
}

function makeReceiptNumber(prefix = 'RCPT') { return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random()*9000)}`; }

async function ensureReceiptSenderColumn(db) {
  await db.exec(`CREATE TABLE IF NOT EXISTS receipts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    type TEXT NOT NULL,
    receiptNumber TEXT UNIQUE NOT NULL,
    referenceId TEXT NOT NULL,
    amount REAL NOT NULL,
    senderBank TEXT,
    receiverBank TEXT,
    receiverAccount TEXT,
    receiverName TEXT,
    note TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    senderAccountLast4 TEXT,
    direction TEXT,
    counterpartyName TEXT,
    counterpartyAccountLast4 TEXT,
    channel TEXT,
    FOREIGN KEY (userId) REFERENCES users(id)
  )`);
  const cols = await db.all(`PRAGMA table_info(receipts)`);
  const has = name => cols.some(c => c.name === name);
  if (!has('senderAccountLast4')) await db.exec(`ALTER TABLE receipts ADD COLUMN senderAccountLast4 TEXT`);
  if (!has('direction')) await db.exec(`ALTER TABLE receipts ADD COLUMN direction TEXT`);
  if (!has('counterpartyName')) await db.exec(`ALTER TABLE receipts ADD COLUMN counterpartyName TEXT`);
  if (!has('counterpartyAccountLast4')) await db.exec(`ALTER TABLE receipts ADD COLUMN counterpartyAccountLast4 TEXT`);
  if (!has('channel')) await db.exec(`ALTER TABLE receipts ADD COLUMN channel TEXT`);
}

async function createReceipt(db, { userId, type, referenceId, amount, senderBank, receiverBank, receiverAccount, receiverName, note, senderAccountLast4, direction, counterpartyName, counterpartyAccountLast4, channel }) {
  await ensureReceiptSenderColumn(db);
  const result = await db.run(
    `INSERT INTO receipts (userId, type, receiptNumber, referenceId, amount, senderBank, receiverBank, receiverAccount, receiverName, note, createdAt, senderAccountLast4, direction, counterpartyName, counterpartyAccountLast4, channel)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, type, makeReceiptNumber(type==='bill_payment'?'BILL':'RCPT'), referenceId, amount, senderBank||null, receiverBank||null, receiverAccount||null, receiverName||null, note||null, nowIso(), senderAccountLast4 || null, direction || null, counterpartyName || null, counterpartyAccountLast4 || null, channel || null]
  );
  return db.get('SELECT * FROM receipts WHERE id=?', [result.lastID]);
}

router.get('/users/search', authenticate, async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json({ users: [] });
  const db = await getDb();
  const users = await db.all(`SELECT id, name, upiId, accountNumber FROM users WHERE id != ? AND (name LIKE ? OR upiId LIKE ? OR accountNumber LIKE ? OR email LIKE ?) LIMIT 10`, [req.user.id, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`]);
  res.json({ users });
});

router.post('/transfer', authenticate, transferLimiter, async (req, res) => {
  const { receiverIdentifier, amount, category, description, upiPin } = req.body;
  const numAmount = Number(amount);
  if (!receiverIdentifier || numAmount <= 0) return res.status(400).json({ error: 'Invalid transfer details.' });
  if (!upiPin) return res.status(400).json({ error: 'UPI PIN is required.' });

  const db = await getDb();
  const sender = await db.get('SELECT id, balance, name, upiPin, cardFrozen, accountNumber FROM users WHERE id = ?', [req.user.id]);
  const receiver = await db.get('SELECT id, name, balance, accountNumber, upiId FROM users WHERE upiId = ? OR accountNumber = ? OR email = ?', [receiverIdentifier, receiverIdentifier, receiverIdentifier]);

  if (sender.cardFrozen) return res.status(400).json({ error: 'Your virtual card is frozen. Please unfreeze it in Settings or Card controls first.' });
  if (sender.upiPin && sender.upiPin !== upiPin) return res.status(400).json({ error: 'Incorrect 4-digit UPI PIN.' });

  if (!receiver) return res.status(404).json({ error: 'Receiver not found.' });
  if (receiver.id === sender.id) return res.status(400).json({ error: 'Cannot transfer to yourself.' });
  if (sender.balance < numAmount) return res.status(400).json({ error: 'Insufficient balance.', currentBalance: sender.balance });

  const fraudAlerts = await checkFraud(sender.id, numAmount, 'transfer');
  const refId = generateReferenceId();
  const eventTime = nowIso();
  const senderBal = sender.balance - numAmount;
  const receiverBal = receiver.balance + numAmount;

  try {
    await db.run('BEGIN TRANSACTION');
    await db.run('UPDATE users SET balance = ? WHERE id = ?', [senderBal, sender.id]);
    await db.run('UPDATE users SET balance = ? WHERE id = ?', [receiverBal, receiver.id]);
    await db.run(`INSERT INTO transactions (senderId, receiverId, type, amount, status, category, description, referenceId, balanceAfter, timestamp) VALUES (?, ?, 'transfer', ?, 'completed', ?, ?, ?, ?, ?)`, [sender.id, receiver.id, numAmount, category || 'other', description || `Transfer to ${receiver.name}`, refId, senderBal, eventTime]);
    await db.run(`INSERT INTO notifications (userId, title, message, type, icon) VALUES (?, '💸 Transfer Sent', ?, 'transaction', '💸')`, [sender.id, `₹${numAmount.toLocaleString()} sent to ${receiver.name}.`]);
    await db.run(`INSERT INTO notifications (userId, title, message, type, icon) VALUES (?, '💰 Money Received', ?, 'transaction', '💰')`, [receiver.id, `₹${numAmount.toLocaleString()} received from ${sender.name}.`]);
    await db.run('UPDATE users SET xp = xp + 10 WHERE id = ?', [sender.id]);
    await createReceipt(db, { userId: sender.id, type: 'transfer', referenceId: refId, amount: numAmount, senderBank: 'NeoBank', receiverBank: 'NeoBank', receiverAccount: receiver.accountNumber || receiver.upiId, receiverName: receiver.name, note: description || 'Transfer', senderAccountLast4: String(sender.accountNumber || '').slice(-4), direction: 'sent', counterpartyName: receiver.name, channel: 'Neo Transfer' });
    
    const txCount = await db.get("SELECT COUNT(*) as cnt FROM transactions WHERE senderId = ? AND type = 'transfer'", [sender.id]);
    if (txCount && txCount.cnt === 1) {
      await db.run(`INSERT INTO achievements (userId, badge, title, description, xpReward) VALUES (?, '💸', 'First Transfer', 'Completed your first virtual transfer', 50)`, [sender.id]);
      await db.run('UPDATE users SET xp = xp + 50 WHERE id = ?', [sender.id]);
    }
    await db.run('COMMIT');
  } catch (err) {
    await db.run('ROLLBACK');
    throw err;
  }
  
  await updateFinancialScore(sender.id);
  res.json({ message: 'Transfer successful!', transaction: { referenceId: refId, amount: numAmount, receiver: receiver.name, senderBalance: senderBal }, fraudAlerts: fraudAlerts.length > 0 ? fraudAlerts : undefined, simulation: true, educationalNote: getEducationalTip('transfer') });
});

router.get('/history', authenticate, async (req, res) => {
  const { type, period, search, page = 1, limit = 20 } = req.query;
  const db = await getDb();
  const offset = (page - 1) * limit;
  let where = '(t.senderId = ? OR t.receiverId = ?) AND t.type != ?';
  const params = [req.user.id, req.user.id, 'withdrawal'];

  const gameWhere = `(t.type IN ('game_profit','game_loss') OR t.category = 'game' OR (t.category = 'bonus' AND (t.description LIKE 'Daily Reward%' OR t.description LIKE 'Module Completed:%')) OR t.description LIKE 'Story Mode:%' OR t.description LIKE 'Month % College Allowance%' OR t.description LIKE '%College Allowance%' OR t.description LIKE '%Reward%' OR t.description LIKE '%Module Completed:%' OR t.description LIKE '%Scam Detected:%')`;
  const realIncomingWhere = `(t.receiverId = ? AND t.senderId IS NOT NULL AND t.type IN ('transfer','bank_transfer'))`;

  if (type && type !== 'all') {
    if (type === 'game') {
      where += ` AND ${gameWhere}`;
    } else if (type === 'transfer') {
      where += ` AND t.senderId = ? AND t.type IN ('transfer','bank_transfer') AND NOT ${gameWhere}`;
      params.push(req.user.id);
    } else if (type === 'deposit') {
      where += ` AND ${realIncomingWhere} AND NOT ${gameWhere}`;
      params.push(req.user.id);
    } else if (type === 'bill_payment') {
      where += " AND t.type = 'bill_payment'";
    } else {
      where += ' AND t.type = ?';
      params.push(type);
    }
  }
  if (period === 'today') { where += ` AND ${sqliteTimestampExpr('t.timestamp')} > datetime(?)`; params.push(daysAgoSqlUtc(1)); }
  else if (period === 'week') { where += ` AND ${sqliteTimestampExpr('t.timestamp')} > datetime(?)`; params.push(daysAgoSqlUtc(7)); }
  else if (period === 'month') { where += ` AND ${sqliteTimestampExpr('t.timestamp')} > datetime(?)`; params.push(daysAgoSqlUtc(30)); }
  if (search) { where += ' AND (t.description LIKE ? OR t.referenceId LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

  const totalRes = await db.get(`SELECT COUNT(*) as cnt FROM transactions t WHERE ${where}`, params);
  params.push(Number(limit), Number(offset));
  const transactions = await db.all(`SELECT t.*, s.name as senderName, r.name as receiverName FROM transactions t LEFT JOIN users s ON t.senderId = s.id LEFT JOIN users r ON t.receiverId = r.id WHERE ${where} ORDER BY t.timestamp DESC LIMIT ? OFFSET ?`, params);
  
  const tagged = transactions.map(tx => {
    const isGame = ['game_profit','game_loss'].includes(tx.type) || tx.category === 'game' || (tx.category === 'bonus' && (/^Daily Reward/.test(tx.description || '') || /^Module Completed:/.test(tx.description || ''))) || /^Story Mode:/.test(tx.description || '') || /College Allowance/i.test(tx.description || '') || /Reward/i.test(tx.description || '') || /Module Completed:/i.test(tx.description || '') || /Scam Detected:/i.test(tx.description || '');
    const incoming = tx.receiverId === req.user.id && tx.senderId !== req.user.id;
    let typeOut = tx.type;
    if (isGame) typeOut = tx.senderId === req.user.id ? 'game_loss' : 'game_profit';
    else if (incoming && ['transfer','bank_transfer'].includes(tx.type)) typeOut = 'deposit';
    return { ...tx, originalType: tx.type, type: typeOut, direction: tx.senderId === req.user.id ? 'debit' : 'credit' };
  });
  res.json({ transactions: tagged, total: totalRes.cnt, page: Number(page), totalPages: Math.ceil(totalRes.cnt / limit) });
});



router.post('/bank-transfer', authenticate, transferLimiter, async (req, res) => {
  const { senderBank, amount, receiverBank, receiverAccountNumber, receiverAccountHolderName, upiPin, note } = req.body;
  const numAmount = Number(amount);
  if (!senderBank || !receiverBank || !receiverAccountNumber || !receiverAccountHolderName || !numAmount || numAmount <= 0) {
    return res.status(400).json({ error: 'Please fill all bank transfer details.' });
  }
  if (!upiPin) return res.status(400).json({ error: 'PIN is required.' });

  const db = await getDb();
  const sender = await db.get('SELECT id, balance, name, upiPin, cardFrozen, accountNumber FROM users WHERE id=?', [req.user.id]);
  if (sender.cardFrozen) return res.status(400).json({ error: 'Your virtual card is frozen. Please unfreeze it first.' });
  if (sender.upiPin && sender.upiPin !== upiPin) return res.status(400).json({ error: 'Incorrect 4-digit PIN.' });
  if (sender.balance < numAmount) return res.status(400).json({ error: 'Insufficient balance.' });

  const account = String(receiverAccountNumber).replace(/\s+/g, '').trim();
  const holder = String(receiverAccountHolderName).trim().toLowerCase().replace(/\s+/g, ' ');
  const receiver = await db.get("SELECT id, name, balance, accountNumber, upiId FROM users WHERE REPLACE(accountNumber, ' ', '') = ?", [account]);
  if (!receiver) return res.status(404).json({ error: 'No registered receiver found with this account number.' });
  if (receiver.id === sender.id) return res.status(400).json({ error: 'You cannot transfer to your own account.' });
  if (receiver.name.trim().toLowerCase().replace(/\s+/g, ' ') !== holder) {
    return res.status(400).json({ error: 'Account holder name does not match the receiver account number.' });
  }

  const refId = generateReferenceId();
  const eventTime = nowIso();
  const senderBal = sender.balance - numAmount;
  const receiverBal = receiver.balance + numAmount;
  try {
    await db.run('BEGIN TRANSACTION');
    await db.run('UPDATE users SET balance=? WHERE id=?', [senderBal, sender.id]);
    await db.run('UPDATE users SET balance=? WHERE id=?', [receiverBal, receiver.id]);
    await db.run(`INSERT INTO transactions (senderId, receiverId, type, amount, status, category, description, referenceId, balanceAfter, timestamp)
                  VALUES (?, ?, 'bank_transfer', ?, 'completed', 'bank_transfer', ?, ?, ?, ?)`,
      [sender.id, receiver.id, numAmount, `Bank transfer to ${receiver.name} (${receiverBank})`, refId, senderBal, eventTime]);
    const receipt = await createReceipt(db,{userId:sender.id,type:'bank_transfer',referenceId:refId,amount:numAmount,senderBank,receiverBank,receiverAccount:receiver.accountNumber,receiverName:receiver.name,note,senderAccountLast4:String(sender.accountNumber||'').slice(-4),direction:'sent',counterpartyName:receiver.name,counterpartyAccountLast4:String(receiver.accountNumber||'').slice(-4),channel:'Bank Transfer'});
    await createReceipt(db,{userId:receiver.id,type:'bank_transfer',referenceId:refId,amount:numAmount,senderBank,receiverBank,receiverAccount:receiver.accountNumber,receiverName:sender.name,note,senderAccountLast4:String(sender.accountNumber||'').slice(-4),direction:'received',counterpartyName:sender.name,counterpartyAccountLast4:String(sender.accountNumber||'').slice(-4),channel:'Bank Transfer'});
    await db.run(`INSERT INTO notifications (userId,title,message,type,icon) VALUES (?, '✅ Bank Transfer', ?, 'transaction', '🏦')`, [sender.id, `₹${numAmount.toLocaleString()} transferred to ${receiver.name}.`]);
    await db.run(`INSERT INTO notifications (userId,title,message,type,icon) VALUES (?, '💰 Bank Transfer Received', ?, 'transaction', '💰')`, [receiver.id, `₹${numAmount.toLocaleString()} received from ${sender.name}.`]);
    await db.run('UPDATE users SET xp=xp+15 WHERE id=?',[sender.id]);
    await db.run('COMMIT');
    res.json({ message:'Bank transfer successful!', balance:senderBal, receipt, referenceId:refId, receiver: { id: receiver.id, name: receiver.name, accountNumber: receiver.accountNumber } });
  } catch(err) {
    await db.run('ROLLBACK');
    console.error(err);
    res.status(500).json({ error:'Bank transfer failed.' });
  }
});

router.get('/receipts', authenticate, async (req, res) => { const db = await getDb(); await ensureReceiptSenderColumn(db); const receipts = await db.all('SELECT * FROM receipts WHERE userId=? ORDER BY createdAt DESC, id DESC',[req.user.id]); res.json({ receipts }); });

router.post('/withdraw', authenticate, async (req, res) => {
  return res.status(410).json({ error: 'Withdraw has been removed from this project.' });
});

router.post('/manual-add', authenticate, async (req, res) => {
  const { amount, type, category, description, timestamp } = req.body;
  const numAmount = Number(amount);

  if (numAmount <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than zero.' });
  }

  try {
    const db = await getDb();
    const user = await db.get('SELECT balance, cardFrozen FROM users WHERE id = ?', [req.user.id]);

    if (type === 'debit' && user.cardFrozen) {
      return res.status(400).json({ error: 'Your virtual card is frozen. Please unfreeze it in Settings or Card controls first.' });
    }

    let newBal = user.balance;
    if (type === 'debit') {
      if (user.balance < numAmount) {
        return res.status(400).json({ error: 'Insufficient balance to add this simulated debit transaction.' });
      }
      newBal = user.balance - numAmount;
    } else {
      newBal = user.balance + numAmount;
    }

    const refId = 'MAN' + Date.now().toString(36).toUpperCase();
    const dateStr = timestamp ? new Date(timestamp).toISOString() : nowIso();

    await db.run('BEGIN TRANSACTION');
    await db.run('UPDATE users SET balance = ? WHERE id = ?', [newBal, req.user.id]);
    
    const descText = String(description || '');
    const isGameManual = /^Story Mode:/i.test(descText) || /College Allowance/i.test(descText) || /Game/i.test(descText) || /Challenge/i.test(descText) || /Scam Detected/i.test(descText) || /Module Completed/i.test(descText) || /Reward/i.test(descText);

    // Insert custom transaction
    await db.run(
      `INSERT INTO transactions (senderId, receiverId, type, amount, status, category, description, referenceId, balanceAfter, timestamp) 
       VALUES (?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?)`,
      [
        type === 'debit' ? req.user.id : null,
        type === 'credit' ? req.user.id : null,
        isGameManual ? (type === 'debit' ? 'game_loss' : 'game_profit') : (type === 'debit' ? 'transfer' : 'deposit'),
        numAmount,
        isGameManual ? 'game' : (category || 'general'),
        description || 'Manual entry transaction',
        refId,
        newBal,
        dateStr
      ]
    );

    // Create a transaction notification
    await db.run(
      `INSERT INTO notifications (userId, title, message, type, icon) VALUES (?, ?, ?, 'transaction', ?)`,
      [
        req.user.id,
        type === 'debit' ? '💸 Account Debit' : '💰 Account Credit',
        `₹${numAmount.toLocaleString()} manually added for ${category || 'general'}.`,
        type === 'debit' ? '💸' : '💰'
      ]
    );

    await db.run('UPDATE users SET xp = xp + 10 WHERE id = ?', [req.user.id]);
    await db.run('COMMIT');

    await updateFinancialScore(req.user.id);

    res.json({
      message: 'Transaction added to your virtual ledger successfully!',
      balance: newBal,
      transaction: {
        referenceId: refId,
        amount: numAmount,
        type,
        category,
        description,
        timestamp: dateStr
      }
    });
  } catch (err) {
    console.error('Manual transaction error:', err);
    res.status(500).json({ error: 'Failed to add manual transaction.' });
  }
});

module.exports = router;
