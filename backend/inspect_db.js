const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'neobank.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    return;
  }
  console.log('Opened database successfully.');

  db.all('SELECT id, name, email, balance, cardFrozen, upiPin FROM users', [], (err, rows) => {
    if (err) {
      console.error('Error querying users:', err);
      return;
    }
    console.log('\n--- USERS ---');
    console.log(rows);

    db.all('SELECT * FROM transactions ORDER BY id DESC LIMIT 5', [], (err, txs) => {
      if (err) {
        console.error('Error querying transactions:', err);
        return;
      }
      console.log('\n--- RECENT TRANSACTIONS ---');
      console.log(txs);
      db.close();
    });
  });
});
