import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, CheckCircle2, ShieldCheck, Loader2, BrainCircuit, BarChart3, Database, Calendar, PlusCircle, CreditCard, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const MOCK_PARSED_TXS = [
  { amount: 850, type: 'debit', category: 'food', description: 'Gigi Indian Bistro Dinner', timestamp: '2026-05-18T20:30:00Z' },
  { amount: 1500, type: 'debit', category: 'travel', description: 'Uber Rideshare Airport', timestamp: '2026-05-17T14:15:00Z' },
  { amount: 399, type: 'debit', category: 'bills', description: 'Netflix Premium Monthly subscription', timestamp: '2026-05-16T08:00:00Z' },
  { amount: 4500, type: 'debit', category: 'shopping', description: 'Premium Brand Footwear Mall', timestamp: '2026-05-15T18:45:00Z' },
  { amount: 10000, type: 'credit', category: 'general', description: 'Simulated Reward Deposit', timestamp: '2026-05-14T11:00:00Z' }
];

const CATEGORIES = [
  { id: 'food', name: 'Food & Dining' },
  { id: 'shopping', name: 'Shopping & Apparel' },
  { id: 'bills', name: 'Bills & Subscriptions' },
  { id: 'travel', name: 'Travel & Commute' },
  { id: 'groceries', name: 'Groceries' },
  { id: 'entertainment', name: 'Entertainment & Leisure' },
  { id: 'investments', name: 'Investments' },
  { id: 'general', name: 'General' }
];

const Analyzer = () => {
  const { user, updateBalance } = useAuth();
  const [activeTab, setActiveTab] = useState('ocr'); // ocr, manual
  const [file, setFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncComplete, setSyncComplete] = useState(false);

  // Manual Form States
  const [manualAmt, setManualAmt] = useState('');
  const [manualType, setManualType] = useState('debit');
  const [manualCat, setManualCat] = useState('food');
  const [manualDesc, setManualDesc] = useState('');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualMsg, setManualMsg] = useState(null);
  const [manualLoading, setManualLoading] = useState(false);

  const handleUpload = (e) => {
    e.preventDefault();
    if (!file) return;
    setAnalyzing(true);
    setResult(null);
    setSyncComplete(false);
    
    // Simulate OCR and Statement Parsing
    setTimeout(() => {
      setAnalyzing(false);
      setResult({
        totalAnalyzed: MOCK_PARSED_TXS.length,
        totalVolume: MOCK_PARSED_TXS.reduce((acc, curr) => acc + curr.amount, 0),
        topCategory: 'Shopping',
        fraudFlags: 0,
        transactions: MOCK_PARSED_TXS,
        aiSummary: "Your spend profile on this statement highlights healthy cash flow. Subscriptions constitute 5% of overall spend. We detected no signs of suspicious card skimming or duplicate debits."
      });
    }, 2500);
  };

  const handleBulkSync = async () => {
    if (!result) return;
    setSyncing(true);
    try {
      let finalBal = user.balance;
      for (const tx of result.transactions) {
        const res = await api.post('/transactions/manual-add', {
          amount: tx.amount,
          type: tx.type,
          category: tx.category,
          description: tx.description,
          timestamp: tx.timestamp
        });
        finalBal = res.data.balance;
      }
      updateBalance(finalBal);
      setSyncComplete(true);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to sync parsed transactions.');
    } finally {
      setSyncing(false);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setManualMsg(null);
    setManualLoading(true);

    try {
      const res = await api.post('/transactions/manual-add', {
        amount: manualAmt,
        type: manualType,
        category: manualCat,
        description: manualDesc,
        timestamp: new Date(manualDate).toISOString()
      });
      
      updateBalance(res.data.balance);
      setManualMsg({ type: 'success', text: res.data.message });
      setManualAmt('');
      setManualDesc('');
    } catch (err) {
      setManualMsg({ type: 'error', text: err.response?.data?.error || 'Failed to add manual entry.' });
    } finally {
      setManualLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 mt-4 md:mt-8 px-2">
      <header className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center justify-center p-3 bg-secondary/10 rounded-full mb-4 ring-4 ring-secondary/5">
          <BrainCircuit className="text-secondary" size={32} />
        </div>
        <h1 className="text-3xl font-bold mb-2 tracking-tight">Statement Analyzer & Ledger Portal</h1>
        <p className="text-text-muted">Import virtual bank statements automatically or manually log custom transactions for instant ledger analysis.</p>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-white/5 pb-2 gap-4 justify-center">
        <button
          onClick={() => setActiveTab('ocr')}
          className={`px-5 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'ocr' ? 'bg-primary text-white' : 'text-text-muted hover:text-white'}`}
        >
          OCR Statement Parser
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          className={`px-5 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'manual' ? 'bg-primary text-white' : 'text-text-muted hover:text-white'}`}
        >
          Manual Ledger Entry
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'ocr' ? (
          <motion.div key="ocr-tab" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-6">
            {!result ? (
              <div className="glass-panel p-8 md:p-12 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary"></div>
                
                <form onSubmit={handleUpload} className="space-y-6">
                  <div className={`border-2 border-dashed rounded-3xl p-12 transition-all ${file ? 'border-success bg-success/5' : 'border-white/20 hover:border-primary/50 hover:bg-white/5'}`}>
                    <input type="file" id="file" className="hidden" accept=".pdf,.csv,.png,.jpg" onChange={(e) => setFile(e.target.files[0])} />
                    <label htmlFor="file" className="cursor-pointer flex flex-col items-center">
                      {file ? (
                        <>
                          <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center text-success mb-4 shadow-[0_0_15px_rgba(6,214,160,0.3)]">
                            <FileText size={32} />
                          </div>
                          <p className="text-lg font-bold text-success mb-1">{file.name}</p>
                          <p className="text-sm text-text-muted">Ready to analyze</p>
                        </>
                      ) : (
                        <>
                          <div className="w-16 h-16 bg-surface border border-white/10 rounded-full flex items-center justify-center text-text-muted mb-4 group-hover:text-primary transition-colors">
                            <Upload size={32} />
                          </div>
                          <p className="text-lg font-bold mb-1">Click to Upload Statement</p>
                          <p className="text-sm text-text-muted">Supports simulated PDF, CSV, or Screenshots for OCR extraction</p>
                        </>
                      )}
                    </label>
                  </div>
                  
                  <button type="submit" disabled={!file || analyzing} className="btn-primary w-full md:w-auto px-12 py-4 text-lg h-14 flex items-center justify-center mx-auto relative overflow-hidden">
                    {analyzing ? (
                      <><Loader2 className="animate-spin mr-2" /> AI Parser OCR Scanning...</>
                    ) : (
                      'Analyze Statement File'
                    )}
                    {analyzing && <motion.div className="absolute inset-0 bg-white/20" initial={{ x: '-100%' }} animate={{ x: '100%' }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }} />}
                  </button>
                  <p className="text-xs text-text-muted flex items-center justify-center gap-1 mt-4"><ShieldCheck size={14} /> Educational sandbox. No real bank files are uploaded to any external server.</p>
                </form>
              </div>
            ) : (
              <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                <div className="bg-success/10 border border-success/30 p-6 rounded-3xl flex items-center justify-center gap-4 text-success shadow-[0_0_30px_rgba(6,214,160,0.15)]">
                  <CheckCircle2 size={32} />
                  <h2 className="text-2xl font-bold">OCR Parsing Successful</h2>
                </div>
                
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="glass-panel p-6">
                    <p className="text-xs text-text-muted uppercase tracking-wider mb-2 font-bold">Simulated Records</p>
                    <p className="text-4xl font-bold">{result.totalAnalyzed}</p>
                  </div>
                  <div className="glass-panel p-6">
                    <p className="text-xs text-text-muted uppercase tracking-wider mb-2 font-bold">Total Statement Volume</p>
                    <p className="text-4xl font-bold text-primary">₹{result.totalVolume.toLocaleString()}</p>
                  </div>
                  <div className="glass-panel p-6">
                    <p className="text-xs text-text-muted uppercase tracking-wider mb-2 font-bold">Simulated Skimmer Risks</p>
                    <p className="text-4xl font-bold text-success">{result.fraudFlags} (None)</p>
                  </div>
                </div>

                {/* Parsed Transactions List */}
                <div className="glass-panel p-6 space-y-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2"><Database size={20} className="text-primary" /> Parsed Statement Entries</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-white/5 text-text-muted">
                          <th className="pb-3 font-semibold">Description</th>
                          <th className="pb-3 font-semibold">Category</th>
                          <th className="pb-3 font-semibold text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.transactions.map((tx, idx) => {
                          const isDebit = tx.type === 'debit';
                          return (
                            <tr key={idx} className="border-b border-white/5 last:border-0">
                              <td className="py-3 flex items-center gap-2">
                                {isDebit ? (
                                  <ArrowDownRight size={16} className="text-danger shrink-0" />
                                ) : (
                                  <ArrowUpRight size={16} className="text-success shrink-0" />
                                ) }
                                <span className="text-white font-medium">{tx.description}</span>
                              </td>
                              <td className="py-3 uppercase text-[10px] font-black text-text-muted">{tx.category}</td>
                              <td className={`py-3 text-right font-bold ${isDebit ? 'text-danger' : 'text-success'}`}>
                                {isDebit ? '-' : '+'}₹{tx.amount.toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="pt-4 border-t border-white/5 flex gap-4">
                    {syncComplete ? (
                      <div className="w-full bg-success/20 border border-success/30 p-3 rounded-xl flex items-center justify-center gap-2 text-success font-bold text-sm">
                        <CheckCircle2 size={16} /> Ledger Synced to Server Database Successfully!
                      </div>
                    ) : (
                      <button
                        onClick={handleBulkSync}
                        disabled={syncing}
                        className="w-full btn-primary py-3 flex items-center justify-center gap-2 font-bold"
                      >
                        {syncing ? <Loader2 className="animate-spin" /> : <Database size={16} />}
                        {syncing ? 'Seeding entries to active account...' : 'Bulk Sync Synced Entries to Active Ledger'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="glass-panel p-8 relative overflow-hidden bg-gradient-to-tr from-accent/5 to-secondary/5">
                  <div className="absolute top-0 right-0 p-6 opacity-5"><BarChart3 size={100} /></div>
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><BrainCircuit className="text-secondary" /> AI Companion Financial Review</h3>
                  <p className="text-base text-white/95 leading-relaxed font-medium bg-surface/50 p-6 rounded-2xl border border-white/5">{result.aiSummary}</p>
                  <div className="mt-6">
                    <button onClick={() => {setResult(null); setFile(null);}} className="btn-secondary">Upload Another statement</button>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div key="manual-tab" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="glass-panel p-6 md:p-8 max-w-xl mx-auto space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2 text-primary border-b border-white/5 pb-3">
              <PlusCircle size={22} /> Add Custom Ledger Record
            </h2>
            <p className="text-sm text-text-muted">
              Manually post simulated expenses or deposit streams to populate transaction lists, trigger safety alarms, or modify charts.
            </p>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-muted mb-2 uppercase">Direction</label>
                  <select
                    value={manualType}
                    onChange={(e) => setManualType(e.target.value)}
                    className="input-field py-3 text-sm text-white"
                  >
                    <option value="debit">Debit (Expense)</option>
                    <option value="credit">Credit (Deposit)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-muted mb-2 uppercase">Category</label>
                  <select
                    value={manualCat}
                    onChange={(e) => setManualCat(e.target.value)}
                    className="input-field py-3 text-sm text-white"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted mb-2 uppercase">Amount (₹)</label>
                <input
                  type="number"
                  value={manualAmt}
                  onChange={(e) => setManualAmt(e.target.value)}
                  placeholder="0.00"
                  className="input-field font-bold text-lg"
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted mb-2 uppercase">Transaction Label (Description)</label>
                <input
                  type="text"
                  value={manualDesc}
                  onChange={(e) => setManualDesc(e.target.value)}
                  placeholder="e.g. Shopping at Prime, Local Cafe dinner"
                  className="input-field text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted mb-2 uppercase flex items-center gap-1">
                  <Calendar size={12} /> Transaction Calendar Date
                </label>
                <input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="input-field text-white/50 text-sm"
                  required
                />
              </div>

              {manualMsg && (
                <div className={`p-4 rounded-xl flex items-center gap-3 text-sm border ${manualMsg.type === 'success' ? 'bg-success/10 border-success/20 text-success' : 'bg-danger/10 border-danger/20 text-danger'}`}>
                  {manualMsg.type === 'success' ? <CheckCircle2 size={18} /> : <ShieldCheck size={18} />}
                  <span>{manualMsg.text}</span>
                </div>
              )}

              <button type="submit" disabled={manualLoading} className="w-full btn-primary py-3.5 font-bold flex items-center justify-center gap-2">
                {manualLoading ? <Loader2 className="animate-spin" /> : <Database size={16} />}
                {manualLoading ? 'Posting transaction...' : 'Insert Simulated Ledger Entry'}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Analyzer;
