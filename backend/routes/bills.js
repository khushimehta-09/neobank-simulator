const express = require("express");
const { getDb } = require("../config/database");
const { authenticate } = require("../middleware/auth");
const { nowIso } = require("../utils/time");
const { generateReferenceId } = require("../utils/generators");

const router = express.Router();

function makeReceiptNumber(prefix = "BILL") {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

async function ensureReceiptTable(db) {
  await db.exec(`
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
    )
  `);
  const cols = await db.all(`PRAGMA table_info(receipts)`);
  if (!cols.some((c) => c.name === "senderAccountLast4")) {
    await db.exec(`ALTER TABLE receipts ADD COLUMN senderAccountLast4 TEXT`);
  }
  if (!cols.some((c) => c.name === "totalAmount")) {
    await db.exec(`ALTER TABLE receipts ADD COLUMN totalAmount REAL`);
  }

  if (!cols.some((c) => c.name === "myShare")) {
    await db.exec(`ALTER TABLE receipts ADD COLUMN myShare REAL`);
  }

  if (!cols.some((c) => c.name === "billName")) {
    await db.exec(`ALTER TABLE receipts ADD COLUMN billName TEXT`);
  }
}

async function createReceipt(
  db,
  {
    userId,
    type,
    referenceId,
    amount,
    receiverName,
    note,
    senderAccountLast4,
    totalAmount,
    myShare,
    billName,
  },
) {
  await ensureReceiptTable(db);
  const result = await db.run(
    `INSERT INTO receipts (userId,type,receiptNumber,referenceId,amount,senderBank,receiverBank,receiverAccount,receiverName,note,createdAt,senderAccountLast4, totalAmount,myShare,billName)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      userId,
      type,
      makeReceiptNumber(type === "split_bill" ? "SPLIT" : "BILL"),
      referenceId,
      amount,
      "NeoBank",
      "NeoBank",
      null,
      receiverName || null,
      note || null,
      nowIso(),
      senderAccountLast4 || null,
      totalAmount || null,
      myShare || null,
      billName || null,
    ],
  );
  return db.get("SELECT * FROM receipts WHERE id=?", [result.lastID]);
}

router.get("/", authenticate, async (req, res) => {
  const db = await getDb();
  const bills = await db.all(
    "SELECT * FROM bills WHERE userId = ? ORDER BY dueDate ASC",
    [req.user.id],
  );
  res.json({ bills, simulation: true });
});

router.post("/:id/pay", authenticate, async (req, res) => {
  const { upiPin } = req.body || {};
  let transactionStarted = false;

  try {
    const db = await getDb();
    const bill = await db.get(
      "SELECT * FROM bills WHERE id = ? AND userId = ?",
      [req.params.id, req.user.id],
    );

    if (!bill) return res.status(404).json({ error: "Bill not found." });
    if (bill.status === "paid")
      return res.status(400).json({ error: "Bill already paid." });

    const user = await db.get(
      "SELECT balance, cardFrozen, upiPin, accountNumber FROM users WHERE id = ?",
      [req.user.id],
    );
    if (!user) return res.status(404).json({ error: "User not found." });
    if (!upiPin || !/^\d{4}$/.test(String(upiPin))) {
      return res
        .status(400)
        .json({ error: "Please enter a valid 4-digit PIN." });
    }
    if (user.upiPin && String(user.upiPin) !== String(upiPin)) {
      return res.status(400).json({ error: "Incorrect 4-digit PIN." });
    }
    if (user.cardFrozen) {
      return res.status(400).json({
        error:
          "Your virtual card is frozen. Please unfreeze it in Settings or Card controls first.",
      });
    }
    if (Number(user.balance) < Number(bill.amount)) {
      return res.status(400).json({ error: "Insufficient balance." });
    }

    const newBal = Number(user.balance) - Number(bill.amount);
    const refId = generateReferenceId();
    const eventTime = nowIso();

    await db.run("BEGIN TRANSACTION");
    transactionStarted = true;

    await db.run("UPDATE users SET balance = ? WHERE id = ?", [
      newBal,
      req.user.id,
    ]);
    await db.run("UPDATE bills SET status = 'paid', paidAt = ? WHERE id = ?", [
      eventTime,
      bill.id,
    ]);
    await db.run(
      `INSERT INTO transactions (senderId, type, amount, status, category, description, referenceId, balanceAfter, timestamp)
       VALUES (?, 'bill_payment', ?, 'completed', 'bills', ?, ?, ?, ?)`,
      [
        req.user.id,
        Number(bill.amount),
        `${bill.billType} bill — ${bill.provider}`,
        refId,
        newBal,
        eventTime,
      ],
    );

    const receipt = await createReceipt(db, {
      userId: req.user.id,
      type: "bill_payment",
      referenceId: refId,
      amount: Number(bill.amount),
      receiverName: bill.provider,
      note: `${bill.billType} bill`,
      senderAccountLast4: String(user.accountNumber || "").slice(-4),
    });

    await db.run(
      `INSERT INTO notifications (userId, title, message, type, icon)
       VALUES (?, '✅ Bill Paid', ?, 'transaction', '📋')`,
      [
        req.user.id,
        `${bill.provider} bill of ₹${Number(bill.amount).toLocaleString()} paid successfully.`,
      ],
    );
    await db.run("UPDATE users SET xp = COALESCE(xp, 0) + 15 WHERE id = ?", [
      req.user.id,
    ]);

    const paidCount = await db.get(
      "SELECT COUNT(*) as cnt FROM bills WHERE userId = ? AND status = 'paid'",
      [req.user.id],
    );
    if (paidCount && paidCount.cnt === 1) {
      await db.run(
        `INSERT INTO achievements (userId, badge, title, description, xpReward)
         VALUES (?, '📋', 'Bill Payer', 'Paid your first bill on time', 50)`,
        [req.user.id],
      );
    }

    await db.run("COMMIT");
    transactionStarted = false;

    return res.json({
      message: "Bill paid!",
      balance: newBal,
      referenceId: refId,
      receipt,
      simulation: true,
    });
  } catch (err) {
    console.error("Pay bill error:", err);
    try {
      if (transactionStarted) {
        const db = await getDb();
        await db.run("ROLLBACK");
      }
    } catch (rollbackErr) {
      console.error("Pay bill rollback error:", rollbackErr);
    }
    return res.status(500).json({ error: "Payment failed. Please try again." });
  }
});

router.post("/add", authenticate, async (req, res) => {
  const { amount, why, billType, dueDate, isCompulsory } = req.body;
  const numAmount = Number(amount);
  const compulsoryVal = isCompulsory ? 1 : 0;

  if (numAmount <= 0) {
    return res.status(400).json({ error: "Please enter a valid bill amount." });
  }

  if (!why) {
    return res
      .status(400)
      .json({ error: "Please provide a bill description/purpose (why)." });
  }

  try {
    const db = await getDb();
    const accId = "ACC" + Math.floor(100000 + Math.random() * 899999);
    const type = billType || "general";
    const due =
      dueDate ||
      new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);

    const result = await db.run(
      `INSERT INTO bills (userId, billType, provider, accountId, amount, dueDate, status, isCompulsory) 
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [req.user.id, type, why, accId, numAmount, due, compulsoryVal],
    );

    res.json({
      message: "Custom simulation bill added successfully!",
      bill: {
        id: result.lastID,
        userId: req.user.id,
        billType: type,
        provider: why,
        accountId: accId,
        amount: numAmount,
        dueDate: due,
        status: "pending",
        isCompulsory: compulsoryVal,
      },
    });
  } catch (err) {
    console.error("Add bill error:", err);
    res.status(500).json({ error: "Failed to add manual simulation bill." });
  }
});

// GET all split bills for current user
router.get("/split/list", authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const splits = await db.all(
      `SELECT sb.*, 
              u1.name as creatorName, u1.upiId as creatorUpi,
              u2.name as friendName, u2.upiId as friendUpi
       FROM split_bills sb
       JOIN users u1 ON sb.creatorId = u1.id
       JOIN users u2 ON sb.friendId = u2.id
       WHERE sb.creatorId = ? OR sb.friendId = ?
       ORDER BY sb.createdAt DESC`,
      [req.user.id, req.user.id],
    );
    res.json({ splits });
  } catch (err) {
    console.error("List split bills error:", err);
    res.status(500).json({ error: "Failed to list split bills." });
  }
});

// POST to create a split bill
router.post("/split", authenticate, async (req, res) => {
  const { friendId, totalAmount, shareAmount, note } = req.body;
  const numTotal = Number(totalAmount);
  const numShare = Number(shareAmount);

  if (!friendId || isNaN(numTotal) || isNaN(numShare) || numShare <= 0) {
    return res.status(400).json({ error: "Invalid split parameters." });
  }

  try {
    const db = await getDb();
    const friend = await db.get("SELECT id, name FROM users WHERE id = ?", [
      friendId,
    ]);
    if (!friend) {
      return res.status(404).json({ error: "Selected friend not found." });
    }

    const result = await db.run(
      `INSERT INTO split_bills (creatorId, friendId, totalAmount, shareAmount, note, status) 
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [req.user.id, friendId, numTotal, numShare, note || "Split Bill"],
    );

    // Notify friend
    await db.run(
      `INSERT INTO notifications (userId, title, message, type, icon) 
       VALUES (?, '💸 Split Bill Request', ?, 'social', 'users')`,
      [
        friendId,
        `${req.user.name} requested ₹${numShare.toLocaleString()} for: ${note || "Split Bill"}.`,
      ],
    );

    res.json({
      message: "Split bill request created successfully!",
      split: {
        id: result.lastID,
        creatorId: req.user.id,
        friendId,
        totalAmount: numTotal,
        shareAmount: numShare,
        note,
        status: "pending",
      },
    });
  } catch (err) {
    console.error("Create split bill error:", err);
    res.status(500).json({ error: "Failed to create split bill." });
  }
});

// POST to pay a split bill
router.post("/split/:id/pay", authenticate, async (req, res) => {
  try {
    const { upiPin } = req.body || {};
    const db = await getDb();
    const split = await db.get("SELECT * FROM split_bills WHERE id = ?", [
      req.params.id,
    ]);

    if (!split) {
      return res.status(404).json({ error: "Split bill request not found." });
    }
    if (split.status === "paid") {
      return res.status(400).json({ error: "Split bill already paid." });
    }
    if (split.friendId !== req.user.id) {
      return res
        .status(403)
        .json({ error: "You are not authorized to pay this split bill." });
    }

    const payer = await db.get(
      "SELECT balance, name, cardFrozen, upiPin, accountNumber FROM users WHERE id = ?",
      [req.user.id],
    );
    if (!upiPin) return res.status(400).json({ error: "PIN is required." });
    if (payer.upiPin && payer.upiPin !== upiPin)
      return res.status(400).json({ error: "Incorrect 4-digit PIN." });
    if (payer.cardFrozen) {
      return res.status(400).json({
        error:
          "Your virtual card is frozen. Please unfreeze it in Settings or Card controls first.",
      });
    }
    if (payer.balance < split.shareAmount) {
      return res
        .status(400)
        .json({ error: "Insufficient balance to pay split share." });
    }

    const creator = await db.get(
      "SELECT balance, name FROM users WHERE id = ?",
      [split.creatorId],
    );

    const payerNewBalance = payer.balance - split.shareAmount;
    const creatorNewBalance = creator.balance + split.shareAmount;

    const refId = "SPL" + Date.now().toString(36).toUpperCase();
    const eventTime = nowIso();

    await db.run("BEGIN TRANSACTION");
    try {
      await db.run("UPDATE users SET balance = ? WHERE id = ?", [
        payerNewBalance,
        req.user.id,
      ]);
      await db.run("UPDATE users SET balance = ? WHERE id = ?", [
        creatorNewBalance,
        split.creatorId,
      ]);
      await db.run(
        "UPDATE split_bills SET status = 'paid', paidAt = ? WHERE id = ?",
        [eventTime, split.id],
      );

      // Transaction logs
      await db.run(
        `INSERT INTO transactions (senderId, receiverId, type, amount, status, category, description, referenceId, balanceAfter, timestamp) 
         VALUES (?, ?, 'transfer', ?, 'completed', 'bills', ?, ?, ?, ?)`,
        [
          req.user.id,
          split.creatorId,
          split.shareAmount,
          `Paid split share to ${creator.name} (${split.note})`,
          refId,
          payerNewBalance,
          eventTime,
        ],
      );

      await createReceipt(db, {
        userId: req.user.id,
        type: "split_bill",
        referenceId: refId,

        amount: split.shareAmount,

        totalAmount: split.totalAmount,
        myShare: split.shareAmount,
        billName: split.note,

        receiverName: creator.name,
        note: split.note,

        senderAccountLast4: String(payer.accountNumber || "").slice(-4),
      });

      // Notifications
      await db.run(
        `INSERT INTO notifications (userId, title, message, type, icon) 
         VALUES (?, '💸 Split Bill Paid', ?, 'social', 'heart')`,
        [
          split.creatorId,
          `${payer.name} paid their share of ₹${split.shareAmount.toLocaleString()} for: ${split.note}.`,
        ],
      );

      await db.run(
        `INSERT INTO notifications (userId, title, message, type, icon) 
         VALUES (?, '✅ Split Bill Paid', ?, 'transaction', '📋')`,
        [
          req.user.id,
          `Successfully paid ₹${split.shareAmount.toLocaleString()} split share to ${creator.name}.`,
        ],
      );

      await db.run("COMMIT");
    } catch (err) {
      await db.run("ROLLBACK");
      throw err;
    }

    res.json({
      message: "Split bill paid successfully!",
      balance: payerNewBalance,
    });
  } catch (err) {
    console.error("Pay split bill error:", err);
    res.status(500).json({ error: "Failed to pay split bill." });
  }
});

module.exports = router;
