const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { authenticate } = require('../middleware/auth');

// Scam scenarios database
const SCAM_SCENARIOS = [
  {
    id: 1, difficulty: 'easy',
    title: 'Too Good To Be True',
    scenario: 'You receive an SMS: "Congratulations! You won ₹50,000 in the NeoBank Lucky Draw! Click this link to claim: http://neo-bank-prize.xyz/claim"',
    options: ['Click the link immediately', 'Ignore and delete the message', 'Forward to friends', 'Reply with bank details'],
    correctAnswer: 1,
    explanation: 'This is a classic phishing scam. Legitimate banks never send prize links via SMS. The suspicious domain (.xyz) is a red flag.'
  },
  {
    id: 2, difficulty: 'easy',
    title: 'The Urgent Call',
    scenario: 'Someone calls claiming to be from your bank\'s fraud department. They say your account is compromised and need your OTP to "secure" it.',
    options: ['Share the OTP to secure account', 'Ask for their employee ID and call back on official number', 'Hang up immediately and call official bank number', 'Give partial OTP'],
    correctAnswer: 2,
    explanation: 'Banks NEVER ask for OTPs over phone. Always hang up and call the official number on your card or app to verify.'
  },
  {
    id: 3, difficulty: 'medium',
    title: 'The QR Code Trap',
    scenario: 'A buyer on an online marketplace says they\'ll pay you ₹5,000 for your item. They send a QR code saying "scan to receive payment".',
    options: ['Scan the QR code to receive money', 'Refuse - QR codes are for SENDING money, not receiving', 'Scan but enter a small amount first', 'Ask them to send via UPI ID instead'],
    correctAnswer: 1,
    explanation: 'QR codes in UPI are ALWAYS for sending money, never receiving. Scanning a stranger\'s QR will debit YOUR account!'
  },
  {
    id: 4, difficulty: 'medium',
    title: 'Investment Scheme',
    scenario: 'A friend shares a "guaranteed" crypto investment plan promising 30% monthly returns. They show screenshots of their own profits.',
    options: ['Invest immediately before opportunity closes', 'Ask for more screenshots as proof', 'Research the scheme and check SEBI registration', 'Invest a small amount to test'],
    correctAnswer: 2,
    explanation: 'No legitimate investment guarantees 30% monthly returns. Screenshots can be faked. Always verify with SEBI/RBI registrations.'
  },
  {
    id: 5, difficulty: 'medium',
    title: 'The Refund Scam',
    scenario: 'You get an email from "Amazon" saying your recent order of ₹15,999 will be refunded. Click to verify your bank details for the refund.',
    options: ['Click and enter bank details for refund', 'Check your actual Amazon orders first', 'Reply asking for order details', 'Forward to Amazon\'s official fraud team'],
    correctAnswer: 1,
    explanation: 'Phishing emails impersonate trusted brands. Always check orders directly in the official app. Refunds go to original payment method automatically.'
  },
  {
    id: 6, difficulty: 'hard',
    title: 'SIM Swap Attack',
    scenario: 'Your phone suddenly loses network signal. A few minutes later, you get email alerts about password change requests for your bank account.',
    options: ['Wait for signal to return', 'Use WiFi to change all passwords immediately', 'Call your telecom operator from another phone ASAP', 'Restart your phone'],
    correctAnswer: 2,
    explanation: 'This could be a SIM swap attack! Call your telecom operator immediately from another phone to block the duplicate SIM before attackers drain your accounts.'
  },
  {
    id: 7, difficulty: 'hard',
    title: 'Deepfake Video Call',
    scenario: 'Your "boss" video calls asking you to urgently transfer ₹2,00,000 to a vendor. The face and voice look exactly like your boss.',
    options: ['Transfer immediately as boss requested', 'Ask a verification question only real boss would know', 'Call boss on their known number to verify', 'Transfer half the amount as precaution'],
    correctAnswer: 2,
    explanation: 'Deepfake technology can replicate faces and voices. Always verify urgent financial requests through a separate, known communication channel.'
  },
  {
    id: 8, difficulty: 'hard',
    title: 'Malicious WiFi',
    scenario: 'At a coffee shop, you see a free WiFi network named "CoffeeShop_Free_WiFi". You need to make an urgent bank transfer.',
    options: ['Connect and make the transfer quickly', 'Use your mobile data instead for banking', 'Connect to WiFi but use incognito mode', 'Ask staff for official WiFi name, use VPN if needed'],
    correctAnswer: 3,
    explanation: 'Public WiFi can be spoofed by attackers (Evil Twin attack). For banking, use mobile data or verify the official network name and use a VPN.'
  },
  {
    id: 9, difficulty: 'easy',
    title: 'The Loan Offer',
    scenario: 'You receive a WhatsApp message: "Pre-approved loan of ₹5,00,000 at 0% interest! Just pay ₹2,000 processing fee to this UPI ID."',
    options: ['Pay the processing fee to get the loan', 'Block and report the number', 'Ask for the company RBI license number', 'Negotiate a lower processing fee'],
    correctAnswer: 1,
    explanation: 'Legitimate banks never offer loans via WhatsApp or ask for upfront fees to random UPI IDs. This is advance fee fraud.'
  },
  {
    id: 10, difficulty: 'medium',
    title: 'Fake Customer Support',
    scenario: 'You tweeted about a banking issue. Someone with "NeoBank Support" in their name DMs you asking for your account number to "resolve the issue".',
    options: ['Share account details via DM', 'Check if the account is verified/official', 'Only share via official channels on the bank\'s website/app', 'Share only partial account number'],
    correctAnswer: 2,
    explanation: 'Scammers monitor social media for complaints. Only contact support through official channels (verified accounts, official website, or app).'
  },
  {
    id: 11, difficulty: 'medium',
    title: 'Customs Delivery Fee',
    scenario: 'You get a text from "India Post" saying a package is stuck in customs and needs a ₹150 clearance fee to be delivered. Click here to pay.',
    options: ['Pay the ₹150 to get the package', 'Track the package on the official India Post website using your tracking number', 'Reply asking what the package is', 'Forward the text to a friend'],
    correctAnswer: 1,
    explanation: 'Delivery services never send random links for customs fees. Always verify tracking numbers on the official website.'
  },
  {
    id: 12, difficulty: 'hard',
    title: 'Fake Job Offer',
    scenario: 'You receive a job offer letter from a top MNC with a huge salary. They ask you to pay a ₹2,500 "registration and laptop fee" to start.',
    options: ['Pay the fee, it\'s a great job offer', 'Negotiate the fee to be deducted from first salary', 'Ignore it, legitimate companies don\'t ask for money to hire you', 'Ask them to send the laptop first'],
    correctAnswer: 2,
    explanation: 'Legitimate employers never ask candidates to pay for registration, training, or equipment upfront.'
  },
  {
    id: 13, difficulty: 'easy',
    title: 'Cryptocurrency Giveaway',
    scenario: 'A famous tech billionaire tweets: "I am giving back to the community! Send 0.1 BTC to this address and I will send back 0.2 BTC!"',
    options: ['Send the 0.1 BTC immediately', 'Wait to see if others get paid first', 'Report the account as hacked/scam', 'Send a smaller amount like 0.01 BTC'],
    correctAnswer: 2,
    explanation: 'This is a classic crypto doubling scam, usually posted from compromised verified accounts.'
  },
  {
    id: 14, difficulty: 'medium',
    title: 'Credit Card Block Alert',
    scenario: 'An automated voice call says your credit card will be blocked in 2 hours due to suspicious activity. Press 1 to speak to an executive.',
    options: ['Press 1 and verify your card details', 'Hang up and check your banking app/call official bank number', 'Wait 2 hours to see if it actually blocks', 'Yell at the scammer'],
    correctAnswer: 1,
    explanation: 'Automated urgent calls are a tactic to induce panic. Hang up and verify through official channels.'
  },
  {
    id: 15, difficulty: 'hard',
    title: 'The Romance Scam',
    scenario: 'Someone you met on a dating app has been chatting with you for weeks. Suddenly, they say they have a medical emergency and urgently need a loan of ₹50,000.',
    options: ['Transfer the money to help them', 'Ask for medical bills and hospital details', 'Refuse to send money to someone you\'ve never met in person', 'Offer to fly and visit them instead'],
    correctAnswer: 2,
    explanation: 'Romance scammers build trust over weeks or months before creating an artificial emergency to extort money.'
  },
  {
    id: 16, difficulty: 'medium',
    title: 'Fake Tech Support',
    scenario: 'A pop-up on your computer says "VIRUS DETECTED! Your data is at risk. Call Microsoft Support immediately at 1800-XXX-XXXX."',
    options: ['Call the number to fix the virus', 'Download the software they suggest', 'Close the browser window and run your own antivirus scan', 'Pay the fee they ask to remove the virus'],
    correctAnswer: 2,
    explanation: 'Legitimate OS warnings never ask you to call a support number. Close the malicious pop-up and scan with your installed antivirus.'
  },
  {
    id: 17, difficulty: 'easy',
    title: 'Urgent Charity Donation',
    scenario: 'After a natural disaster is in the news, you get an email asking for donations via wire transfer to a foreign account to help victims.',
    options: ['Send the wire transfer to help', 'Forward the email to friends', 'Research and donate to known, established charities instead', 'Reply asking for more details'],
    correctAnswer: 2,
    explanation: 'Scammers exploit tragedies. Always donate through recognized charities and verified platforms, never via direct wire transfer.'
  },
  {
    id: 18, difficulty: 'medium',
    title: 'Lottery Tax Fee',
    scenario: 'You are informed you won a ₹1 Crore international lottery you never entered, but you must pay a 1% "TDS/Tax" upfront to release the funds.',
    options: ['Pay the 1% tax to get the ₹1 Crore', 'Ask them to deduct the tax from the winnings', 'Report the communication as advance fee fraud', 'Share your bank details so they can deposit it directly'],
    correctAnswer: 2,
    explanation: 'You cannot win a lottery you didn\'t enter, and legitimate lotteries deduct taxes from winnings, they don\'t ask for it upfront.'
  },
  {
    id: 19, difficulty: 'hard',
    title: 'Compromised Password Alert',
    scenario: 'You get an email from "Google Security" with a link saying your password was leaked and you must log in immediately to change it.',
    options: ['Click the link and change password', 'Ignore it, it\'s probably fine', 'Go to Google.com directly (without clicking the link) and check security settings', 'Reply with your current password to verify'],
    correctAnswer: 2,
    explanation: 'Phishing emails mimic security alerts to steal passwords. Always navigate to the service manually rather than clicking email links.'
  },
  {
    id: 20, difficulty: 'hard',
    title: 'Government Fine Notice',
    scenario: 'You receive a WhatsApp message from "Traffic Police" with a link saying you have an unpaid speeding challan of ₹2,000, and your license will be suspended if unpaid today.',
    options: ['Click the link and pay immediately', 'Go to the official Parivahan/Traffic Police website directly to check for challans', 'Ignore it completely', 'Argue with them on WhatsApp'],
    correctAnswer: 1,
    explanation: 'Official government fines are usually notified via SMS or physical mail, not WhatsApp. Always use official government portals to verify and pay challans.'
  }
];


function buildDynamicScenario(difficulty = 'random') {
  const levels = difficulty === 'random' ? ['easy', 'medium', 'hard'] : [difficulty];
  const level = levels[Math.floor(Math.random() * levels.length)] || 'medium';
  const names = ['Rohan', 'Priya', 'Amit', 'Neha', 'Karan', 'Aisha', 'Vikram', 'Meera', 'Dev', 'Ananya'];
  const channels = ['WhatsApp', 'SMS', 'Instagram DM', 'phone call', 'email', 'Telegram'];
  const scams = [
    { title: 'Fake Refund Alert', ask: 'click a refund link and enter banking details', safe: 'open the official app directly and verify orders', trap: 'click the link fast' },
    { title: 'OTP Verification Call', ask: 'share an OTP to stop account blocking', safe: 'hang up and call the official bank number', trap: 'share the OTP' },
    { title: 'QR Receive Payment Trap', ask: 'scan a QR code to receive money', safe: 'refuse because QR/PIN is for sending money', trap: 'scan and enter PIN' },
    { title: 'Fake Job Fee', ask: 'pay a joining or laptop fee before job confirmation', safe: 'reject because real employers do not charge hiring fees', trap: 'pay the fee' },
    { title: 'Emergency Friend Request', ask: 'transfer money to a new account urgently', safe: 'verify by calling the friend on their known number', trap: 'send immediately' },
    { title: 'Prize Delivery Scam', ask: 'pay a small delivery fee for a big prize', safe: 'report it and avoid payment links', trap: 'pay delivery fee' },
    { title: 'KYC Update Link', ask: 'update KYC through a short link and enter PIN', safe: 'use only the official bank app or branch', trap: 'fill the short link form' },
    { title: 'Investment Double Money', ask: 'invest today for guaranteed double return', safe: 'avoid guaranteed return claims and verify registration', trap: 'invest quickly' }
  ];
  const s = scams[Math.floor(Math.random() * scams.length)];
  const name = names[Math.floor(Math.random() * names.length)];
  const channel = channels[Math.floor(Math.random() * channels.length)];
  const amount = (Math.floor(Math.random() * 95) + 5) * 100;
  const stamp = Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
  const options = [
    `Do it quickly and ${s.trap}`,
    `Ask for more screenshots as proof`,
    `Stop and ${s.safe}`,
    `Forward it to another friend first`
  ];
  return {
    id: `DYN-${stamp}`,
    difficulty: level,
    title: `${s.title} #${stamp}`,
    scenario: `${name} receives a ${channel} message asking them to ${s.ask}. The amount mentioned is ₹${amount}. What is the safest action?`,
    options,
    correctAnswer: 2,
    explanation: `Safest action: ${s.safe}. Never trust urgency, links, QR requests, or OTP/PIN demands without official verification.`
  };
}

// Get random scenario
router.get('/scenario', authenticate, async (req, res) => {
  try {
    const difficulty = req.query.difficulty || 'random';
    const selected = buildDynamicScenario(difficulty);
    const { correctAnswer, explanation, ...safe } = selected;
    // Store the full dynamic scenario server-side for answer checking.
    const db = await getDb();
    await db.run(`CREATE TABLE IF NOT EXISTS active_scam_scenarios (userId INTEGER NOT NULL, scenarioId TEXT NOT NULL, payload TEXT NOT NULL, createdAt TEXT DEFAULT (datetime('now')), PRIMARY KEY(userId, scenarioId))`);
    await db.run('INSERT OR REPLACE INTO active_scam_scenarios (userId, scenarioId, payload) VALUES (?, ?, ?)', [req.user.id, String(selected.id), JSON.stringify(selected)]);
    res.json({ scenario: safe });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit answer
router.post('/answer', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const { scenarioId, answerIndex } = req.body;
    let scenario = SCAM_SCENARIOS.find(s => String(s.id) === String(scenarioId));
    if (!scenario) {
      await db.run(`CREATE TABLE IF NOT EXISTS active_scam_scenarios (userId INTEGER NOT NULL, scenarioId TEXT NOT NULL, payload TEXT NOT NULL, createdAt TEXT DEFAULT (datetime('now')), PRIMARY KEY(userId, scenarioId))`);
      const row = await db.get('SELECT payload FROM active_scam_scenarios WHERE userId=? AND scenarioId=?', [req.user.id, String(scenarioId)]);
      if (row) scenario = JSON.parse(row.payload);
    }
    if (!scenario) return res.status(404).json({ error: 'Scenario not found' });
    
    const isCorrect = answerIndex === scenario.correctAnswer;
    const xpEarned = isCorrect ? ({ easy: 25, medium: 50, hard: 100 }[scenario.difficulty] || 25) : 5;
    
    await db.run(
      'INSERT INTO scam_game_results (userId, scenario, userAnswer, correctAnswer, isCorrect, xpEarned, difficulty) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, scenario.title, scenario.options[answerIndex], scenario.options[scenario.correctAnswer], isCorrect ? 1 : 0, xpEarned, scenario.difficulty]
    );
    
    if (isCorrect) {
      const bonusMoney = { easy: 15, medium: 25, hard: 50 }[scenario.difficulty] || 15;
      const user = await db.get('SELECT balance FROM users WHERE id = ?', [req.user.id]);
      const newBalance = user.balance + bonusMoney;

      await db.run('BEGIN TRANSACTION');
      try {
        await db.run('UPDATE users SET xp=xp+?, balance=? WHERE id=?', [xpEarned, newBalance, req.user.id]);
        
        // Log transaction history
        const refId = 'SCM' + Date.now().toString(36).toUpperCase();
        await db.run(`INSERT INTO transactions (receiverId, type, amount, status, category, description, referenceId, balanceAfter) VALUES (?, 'game_profit', ?, 'completed', 'game', ?, ?, ?)`, [req.user.id, bonusMoney, `Scam Detected: ${scenario.title}`, refId, newBalance]);

        // Trust score updates
        await db.run(
          `INSERT INTO trust_scores (userId, scamAwareness) VALUES (?, ?)
           ON CONFLICT(userId) DO UPDATE SET scamAwareness=MIN(100, scamAwareness+2), lastUpdated=datetime('now')`,
          [req.user.id, 72]
        );

        await db.run(`INSERT INTO notifications (userId, title, message, type, icon) VALUES (?, '🛡️ Scam Avoided', ?, 'transaction', '🛡️')`, [req.user.id, `Correctly identified "${scenario.title}" scam! Earned ₹${bonusMoney} and ${xpEarned} XP.`]);

        await db.run('COMMIT');
      } catch (e) {
        await db.run('ROLLBACK');
      }
    }

    
    // Post to feed on streaks
    const streak = await db.get(
      'SELECT COUNT(*) as count FROM scam_game_results WHERE userId=? AND isCorrect=1 ORDER BY createdAt DESC',
      [req.user.id]
    );
    if (streak.count % 5 === 0 && isCorrect) {
      await db.run(
        'INSERT INTO social_feed (userId, activityType, title, description, icon, xpEarned) VALUES (?, ?, ?, ?, ?, ?)',
        [req.user.id, 'scam_streak', `🔥 ${streak.count} Scams Detected!`, 'On a fraud detection streak!', '🛡️', xpEarned]
      );
    }
    
    const updatedUser = await db.get('SELECT balance FROM users WHERE id = ?', [req.user.id]);
    res.json({
      correct: isCorrect,
      xpEarned,
      explanation: scenario.explanation,
      correctAnswer: scenario.options[scenario.correctAnswer],
      bonusMoney: isCorrect ? ({ easy: 15, medium: 25, hard: 50 }[scenario.difficulty] || 15) : 0,
      balance: updatedUser.balance
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Get stats
router.get('/stats', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const total = await db.get('SELECT COUNT(*) as count FROM scam_game_results WHERE userId=?', [req.user.id]);
    const correct = await db.get('SELECT COUNT(*) as count FROM scam_game_results WHERE userId=? AND isCorrect=1', [req.user.id]);
    const totalXp = await db.get('SELECT SUM(xpEarned) as total FROM scam_game_results WHERE userId=?', [req.user.id]);
    const byDifficulty = await db.all(
      `SELECT difficulty, COUNT(*) as total, SUM(isCorrect) as correct 
       FROM scam_game_results WHERE userId=? GROUP BY difficulty`,
      [req.user.id]
    );
    const recentResults = await db.all(
      'SELECT * FROM scam_game_results WHERE userId=? ORDER BY createdAt DESC LIMIT 10',
      [req.user.id]
    );
    res.json({
      totalGames: total.count,
      correctAnswers: correct.count,
      accuracy: total.count > 0 ? Math.round((correct.count / total.count) * 100) : 0,
      totalXpEarned: totalXp.total || 0,
      byDifficulty,
      recentResults
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
