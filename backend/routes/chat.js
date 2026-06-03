const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { nowIso } = require('../utils/time');

function makeReceiptNumber(prefix = 'RCPT') {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random()*9000)}`;
}

async function ensureChatReceiptColumns(db) {
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

async function createChatReceipt(db, { userId, referenceId, amount, counterpartyName, direction, note }) {
  await ensureChatReceiptColumns(db);
  await db.run(
    `INSERT INTO receipts (userId, type, receiptNumber, referenceId, amount, senderBank, receiverBank, receiverName, note, createdAt, direction, counterpartyName, channel)
     VALUES (?, 'chat_payment', ?, ?, ?, 'NeoSim', 'NeoSim', ?, ?, ?, ?, ?, 'Chat Pay')`,
    [userId, makeReceiptNumber('CHAT'), referenceId, amount, counterpartyName || null, note || null, nowIso(), direction, counterpartyName || null]
  );
}

router.get('/messages/:roomId', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    await db.run('UPDATE chat_messages SET readStatus=1 WHERE roomId=? AND senderId!=?', [req.params.roomId, req.user.id]);
    const messages = await db.all(
      `SELECT cm.*, u.name as senderName FROM chat_messages cm
       JOIN users u ON cm.senderId=u.id
       WHERE cm.roomId=? ORDER BY cm.createdAt ASC LIMIT 150`,
      [req.params.roomId]
    );
    res.json({ messages });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/send', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const { roomId, receiverId, message, messageType = 'text', paymentAmount = 0, paymentNote = '', upiPin } = req.body;
    const rid = Number(receiverId);
    const friendship = await db.get(`SELECT id FROM friends WHERE status='accepted' AND ((requesterId=? AND receiverId=?) OR (requesterId=? AND receiverId=?))`, [req.user.id, rid, rid, req.user.id]);
    if (!friendship) return res.status(403).json({ error: 'You can chat or pay only after the friend request is accepted.' });

    const amount = Number(paymentAmount || 0);
    let finalMessage = message;
    let refId = null;
    let updatedBalance = null;
    let eventTime = nowIso();
    if (messageType === 'payment' && amount > 0) {
      const sender = await db.get('SELECT id, balance, name, cardFrozen, upiPin FROM users WHERE id=?', [req.user.id]);
      const receiver = await db.get('SELECT id, name, balance FROM users WHERE id=?', [rid]);
      if (!upiPin) return res.status(400).json({ error: 'PIN is required.' });
      if (sender.upiPin && sender.upiPin !== upiPin) return res.status(400).json({ error: 'Incorrect 4-digit PIN.' });
      if (sender.cardFrozen) return res.status(400).json({ error: 'Your virtual card is frozen. Please unfreeze it first.' });
      if (!receiver) return res.status(404).json({ error: 'Receiver not found.' });
      if (sender.balance < amount) return res.status(400).json({ error: 'Insufficient virtual balance' });
      refId = `CHAT-${Date.now().toString(36).toUpperCase()}`;
      eventTime = nowIso();
      const senderBal = sender.balance - amount;
      const receiverBal = receiver.balance + amount;
      await db.run('BEGIN TRANSACTION');
      try {
        await db.run('UPDATE users SET balance=? WHERE id=?', [senderBal, req.user.id]);
        await db.run('UPDATE users SET balance=? WHERE id=?', [receiverBal, rid]);
        await db.run(`INSERT INTO transactions (senderId, receiverId, type, amount, category, description, referenceId, status, balanceAfter, timestamp)
                      VALUES (?, ?, 'transfer', ?, 'social_payment', ?, ?, 'completed', ?, ?)`,
          [req.user.id, rid, amount, `Chat payment to ${receiver.name}: ${paymentNote || 'Virtual transfer'}`, refId, senderBal, eventTime]);
        await db.run('INSERT INTO notifications (userId, title, message, type, icon) VALUES (?, ?, ?, ?, ?)',
          [rid, '💸 Payment Received', `${sender.name} sent you ₹${amount}`, 'payment', 'send']);
        await db.run('INSERT INTO social_feed (userId, activityType, title, description, icon, xpEarned) VALUES (?, ?, ?, ?, ?, ?)',
          [req.user.id, 'payment', 'Sent a virtual payment', `₹${amount} to ${receiver.name}`, '💸', 10]);
        await createChatReceipt(db, { userId: sender.id, referenceId: refId, amount, counterpartyName: receiver.name, direction: 'sent', note: paymentNote || 'Chat payment' });
        await createChatReceipt(db, { userId: receiver.id, referenceId: refId, amount, counterpartyName: sender.name, direction: 'received', note: paymentNote || 'Chat payment' });
        await db.run('UPDATE users SET xp=xp+10 WHERE id=?', [req.user.id]);
        await db.run('COMMIT');
        updatedBalance = senderBal;
        finalMessage = `₹${amount} sent • Debited from sender and credited to receiver`;
      } catch (err) { await db.run('ROLLBACK'); throw err; }
    }

    const chatTime = typeof eventTime !== 'undefined' ? eventTime : nowIso();
    const result = await db.run(
      `INSERT INTO chat_messages (roomId, senderId, receiverId, message, messageType, paymentAmount, paymentNote, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [roomId, req.user.id, rid, finalMessage, messageType, amount, paymentNote, chatTime]
    );
    const newMsg = await db.get(`SELECT cm.*, u.name as senderName FROM chat_messages cm JOIN users u ON cm.senderId=u.id WHERE cm.id=?`, [result.lastID]);
    const io = req.app.get('io');
    if (io) io.to(roomId).emit('receive_message', newMsg);
    res.json({ success: true, message: newMsg, referenceId: refId, balance: updatedBalance });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/conversations', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const friends = await db.all(
      `SELECT u.id, u.name, u.email, u.level, u.upiId,
        (SELECT message FROM chat_messages WHERE roomId=(CASE WHEN ? < u.id THEN ?||'-'||u.id ELSE u.id||'-'||? END) ORDER BY createdAt DESC LIMIT 1) as lastMessage,
        (SELECT createdAt FROM chat_messages WHERE roomId=(CASE WHEN ? < u.id THEN ?||'-'||u.id ELSE u.id||'-'||? END) ORDER BY createdAt DESC LIMIT 1) as lastMessageTime,
        (SELECT COUNT(*) FROM chat_messages WHERE roomId=(CASE WHEN ? < u.id THEN ?||'-'||u.id ELSE u.id||'-'||? END) AND senderId != ? AND readStatus=0) as unreadCount
       FROM friends f
       JOIN users u ON (CASE WHEN f.requesterId=? THEN f.receiverId ELSE f.requesterId END) = u.id
       WHERE (f.requesterId=? OR f.receiverId=?) AND f.status='accepted'
       ORDER BY lastMessageTime DESC`,
      [req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id]
    );
    res.json({ conversations: friends });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/react/:messageId', authenticate, async (req, res) => {
  try { const db = await getDb(); await db.run('UPDATE chat_messages SET reaction=? WHERE id=?', [req.body.reaction, req.params.messageId]); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
