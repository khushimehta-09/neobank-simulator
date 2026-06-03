const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const bcrypt = require('bcryptjs');
const { generateAccountNumber, generateIFSC, generateCardNumber, generateCardExpiry, generateCVV } = require('../utils/generators');

let dbPromise;

async function getDb() {
  if (!dbPromise) {
    dbPromise = open({
      filename: path.join(__dirname, '..', 'neobank.db'),
      driver: sqlite3.Database
    }).then(async (db) => {
      await db.exec('PRAGMA journal_mode = WAL;');
      await db.exec('PRAGMA foreign_keys = ON;');
      return db;
    });
  }
  return dbPromise;
}

async function initDatabase() {
  const db = await getDb();

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      phone TEXT,
      dob TEXT,
      accountNumber TEXT UNIQUE,
      ifscCode TEXT,
      upiId TEXT UNIQUE,
      balance REAL DEFAULT 50000.00,
      financialScore INTEGER DEFAULT 650,
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      role TEXT DEFAULT 'user',
      cardNumber TEXT,
      cardExpiry TEXT,
      cardCvv TEXT,
      upiPin TEXT,
      cardFrozen INTEGER DEFAULT 0,
      onlinePayments INTEGER DEFAULT 1,
      darkMode INTEGER DEFAULT 1,
      learningMode INTEGER DEFAULT 1,
      onboarded INTEGER DEFAULT 0,
      dailyRewardDate TEXT,
      savingsStreak INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      senderId INTEGER,
      receiverId INTEGER,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT DEFAULT 'completed',
      category TEXT DEFAULT 'other',
      description TEXT,
      referenceId TEXT UNIQUE,
      balanceAfter REAL,
      timestamp TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (senderId) REFERENCES users(id),
      FOREIGN KEY (receiverId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      billType TEXT NOT NULL,
      provider TEXT NOT NULL,
      accountId TEXT,
      amount REAL NOT NULL,
      dueDate TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      isCompulsory INTEGER DEFAULT 0,
      paidAt TEXT,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'system',
      icon TEXT DEFAULT 'bell',
      readStatus INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      badge TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      xpReward INTEGER DEFAULT 50,
      unlockedAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS savings_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      title TEXT NOT NULL,
      targetAmount REAL NOT NULL,
      currentAmount REAL DEFAULT 0,
      icon TEXT DEFAULT '🎯',
      deadline TEXT,
      status TEXT DEFAULT 'active',
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS fraud_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      alertType TEXT NOT NULL,
      description TEXT NOT NULL,
      severity TEXT DEFAULT 'medium',
      resolved INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS learning_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      moduleId TEXT NOT NULL,
      moduleName TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      completed INTEGER DEFAULT 0,
      score INTEGER DEFAULT 0,
      completedAt TEXT,
      FOREIGN KEY (userId) REFERENCES users(id),
      UNIQUE(userId, moduleId)
    );

    CREATE TABLE IF NOT EXISTS daily_rewards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      rewardType TEXT NOT NULL,
      amount REAL DEFAULT 0,
      xpAmount INTEGER DEFAULT 0,
      claimedAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS receipts (
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
      FOREIGN KEY (userId) REFERENCES users(id)
    );

  `);



  const receiptCols = await db.all(`PRAGMA table_info(receipts)`);
  if (!receiptCols.some(c => c.name === 'senderAccountLast4')) {
    await db.exec(`ALTER TABLE receipts ADD COLUMN senderAccountLast4 TEXT`);
  }
  // === NEW SOCIAL TABLES ===
  await db.exec(`
    CREATE TABLE IF NOT EXISTS friends (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requesterId INTEGER NOT NULL,
      receiverId INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (requesterId) REFERENCES users(id),
      FOREIGN KEY (receiverId) REFERENCES users(id),
      UNIQUE(requesterId, receiverId)
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      roomId TEXT NOT NULL,
      senderId INTEGER NOT NULL,
      receiverId INTEGER,
      message TEXT,
      messageType TEXT DEFAULT 'text',
      paymentAmount REAL DEFAULT 0,
      paymentNote TEXT,
      reaction TEXT,
      readStatus INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (senderId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS social_feed (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      activityType TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      icon TEXT DEFAULT '🏆',
      xpEarned INTEGER DEFAULT 0,
      reactions TEXT DEFAULT '{}',
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS group_challenges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      creatorId INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      challengeType TEXT NOT NULL,
      targetAmount REAL DEFAULT 0,
      targetDays INTEGER DEFAULT 7,
      xpReward INTEGER DEFAULT 100,
      status TEXT DEFAULT 'active',
      endsAt TEXT,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (creatorId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS challenge_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      challengeId INTEGER NOT NULL,
      userId INTEGER NOT NULL,
      progress REAL DEFAULT 0,
      completed INTEGER DEFAULT 0,
      joinedAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (challengeId) REFERENCES group_challenges(id),
      FOREIGN KEY (userId) REFERENCES users(id),
      UNIQUE(challengeId, userId)
    );

    CREATE TABLE IF NOT EXISTS trust_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER UNIQUE NOT NULL,
      score INTEGER DEFAULT 70,
      scamAwareness INTEGER DEFAULT 70,
      challengeCompletion INTEGER DEFAULT 70,
      safeBehavior INTEGER DEFAULT 70,
      paymentReliability INTEGER DEFAULT 70,
      lastUpdated TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS life_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      eventType TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      financialImpact REAL DEFAULT 0,
      stressImpact INTEGER DEFAULT 0,
      resolved INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS skill_tree_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      skillId TEXT NOT NULL,
      skillName TEXT NOT NULL,
      branch TEXT NOT NULL,
      level INTEGER DEFAULT 0,
      maxLevel INTEGER DEFAULT 5,
      xpInvested INTEGER DEFAULT 0,
      unlockedAt TEXT,
      FOREIGN KEY (userId) REFERENCES users(id),
      UNIQUE(userId, skillId)
    );

    CREATE TABLE IF NOT EXISTS scam_game_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      scenario TEXT NOT NULL,
      userAnswer TEXT NOT NULL,
      correctAnswer TEXT NOT NULL,
      isCorrect INTEGER DEFAULT 0,
      xpEarned INTEGER DEFAULT 0,
      difficulty TEXT DEFAULT 'medium',
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS economy_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      eventType TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      impactType TEXT DEFAULT 'neutral',
      impactValue REAL DEFAULT 0,
      affectsAll INTEGER DEFAULT 1,
      isActive INTEGER DEFAULT 1,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS mentor_tips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      category TEXT NOT NULL,
      tip TEXT NOT NULL,
      actionable INTEGER DEFAULT 1,
      dismissed INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS split_bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      creatorId INTEGER NOT NULL,
      friendId INTEGER NOT NULL,
      totalAmount REAL NOT NULL,
      shareAmount REAL NOT NULL,
      note TEXT,
      status TEXT DEFAULT 'pending',
      createdAt TEXT DEFAULT (datetime('now')),
      paidAt TEXT,
      FOREIGN KEY (creatorId) REFERENCES users(id),
      FOREIGN KEY (friendId) REFERENCES users(id)
    );
  `);

  try {
    await db.run('ALTER TABLE bills ADD COLUMN isCompulsory INTEGER DEFAULT 0');
  } catch (err) {
    // Column already exists or table freshly created
  }

  // Clear existing bills to start completely fresh
  await db.run('DELETE FROM bills');

  const admin = await db.get('SELECT id FROM users WHERE email = ?', ['admin@neosim.com']);
  if (!admin) {
    const hash = bcrypt.hashSync('Admin@123', 12);
    await db.run(`
      INSERT INTO users (name, email, password, phone, accountNumber, ifscCode, upiId, balance, role, cardNumber, cardExpiry, cardCvv, upiPin, financialScore, onboarded)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, ['System Admin', 'admin@neosim.com', hash, '9999999999', generateAccountNumber(), generateIFSC(), 'admin@neosim', 1000000, 'admin', generateCardNumber(), generateCardExpiry(), generateCVV(), '1234', 800, 1]);
  }

  const demo = await db.get('SELECT id FROM users WHERE email = ?', ['demo@neosim.com']);
  if (!demo) {
    const hash = bcrypt.hashSync('Demo@123', 12);
    await db.run(`
      INSERT INTO users (name, email, password, phone, accountNumber, ifscCode, upiId, balance, role, cardNumber, cardExpiry, cardCvv, upiPin, financialScore, onboarded)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, ['Demo User', 'demo@neosim.com', hash, '9876543210', generateAccountNumber(), generateIFSC(), 'demo@neosim', 75000, 'user', generateCardNumber(), generateCardExpiry(), generateCVV(), '1234', 720, 1]);
  }

  console.log('✅ Database initialized successfully');
}

module.exports = { getDb, initDatabase };
