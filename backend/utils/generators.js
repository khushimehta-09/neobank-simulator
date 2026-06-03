const { v4: uuidv4 } = require('uuid');

function generateAccountNumber() {
  return '4829' + Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join('');
}

function generateIFSC() {
  return 'NBSM0' + Array.from({ length: 4 }, () => Math.floor(Math.random() * 10)).join('');
}

function generateUPI(name) {
  const clean = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);
  const suffix = Math.floor(100 + Math.random() * 900);
  return `${clean}${suffix}@neosim`;
}

function generateCardNumber() {
  return '4' + Array.from({ length: 15 }, () => Math.floor(Math.random() * 10)).join('');
}

function generateCardExpiry() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String((now.getFullYear() + 3) % 100).padStart(2, '0');
  return `${month}/${year}`;
}

function generateCVV() {
  return String(Math.floor(100 + Math.random() * 900));
}

function generateReferenceId() {
  return 'TXN' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
}

function generateBillId() {
  return 'BILL' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
}

module.exports = {
  generateAccountNumber,
  generateIFSC,
  generateUPI,
  generateCardNumber,
  generateCardExpiry,
  generateCVV,
  generateReferenceId,
  generateBillId,
  formatCurrency,
};
