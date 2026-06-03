function nowIso() {
  return new Date().toISOString();
}

function nowSqlUtc() {
  return nowIso().slice(0, 19).replace('T', ' ');
}

function daysAgoSqlUtc(days) {
  return new Date(Date.now() - Number(days) * 86400000).toISOString().slice(0, 19).replace('T', ' ');
}

function startOfMonthSqlUtc(monthOffset = 0) {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCMonth(d.getUTCMonth() + Number(monthOffset));
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function sqliteTimestampExpr(column = 'timestamp') {
  return `datetime(replace(replace(${column}, 'T', ' '), 'Z', ''))`;
}

module.exports = { nowIso, nowSqlUtc, daysAgoSqlUtc, startOfMonthSqlUtc, sqliteTimestampExpr };
