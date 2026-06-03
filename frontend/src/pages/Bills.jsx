import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, AlertCircle, Zap, Droplet, Wifi, Smartphone, Plus, X, 
  Calendar, DollarSign, Database, Loader2, Home, AlertTriangle, Users, 
  Send, HelpCircle, ArrowUpRight, ArrowDownLeft, ShieldCheck
} from 'lucide-react';
import api from '../services/api';
import { formatDate, formatDateTime } from '../utils/time';
import { useAuth } from '../context/AuthContext';
import PinModal from '../components/PinModal';

const ICONS = { 
  electricity: Zap, 
  water: Droplet, 
  internet: Wifi, 
  mobile: Smartphone, 
  gas: Zap, 
  credit_card: AlertCircle, 
  emi: DollarSign,
  rent: Home,
  general: AlertCircle 
};

export default function Bills() {
  const [activeView, setActiveView] = useState('utility'); // 'utility', 'split'
  const [bills, setBills] = useState([]);
  const [billPaymentHistory, setBillPaymentHistory] = useState([]);
  const [splits, setSplits] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [pinRequest, setPinRequest] = useState(null);
  
  // Standard Bill Modal & Form States
  const [showAddModal, setShowAddModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [why, setWhy] = useState('');
  const [billType, setBillType] = useState('internet');
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
  const [isCompulsory, setIsCompulsory] = useState(false);
  const [formMsg, setFormMsg] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  // Split Bill Modal & Form States
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitFriendId, setSplitFriendId] = useState('');
  const [splitTotal, setSplitTotal] = useState('');
  const [splitShare, setSplitShare] = useState('');
  const [splitMode, setSplitMode] = useState('equal'); // 'equal', 'custom'
  const [splitNote, setSplitNote] = useState('');
  const [splitFormMsg, setSplitFormMsg] = useState(null);
  const [splitFormLoading, setSplitFormLoading] = useState(false);

  const { user, updateBalance } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [billsRes, billTxRes, splitsRes, friendsRes] = await Promise.all([
        api.get('/bills'),
        api.get('/transactions/history?type=bill_payment&limit=50').catch(() => ({ data: { transactions: [] } })),
        api.get('/bills/split/list').catch(() => ({ data: { splits: [] } })),
        api.get('/friends/list').catch(() => ({ data: { friends: [] } }))
      ]);
      setBills(billsRes.data.bills || []);
      setBillPaymentHistory(billTxRes.data.transactions || []);
      setSplits(splitsRes.data.splits || []);
      setFriends(friendsRes.data.friends || []);
    } catch (err) {
      console.error('Failed to load bill parameters', err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-calculate split share when inputs or modes update
  useEffect(() => {
    if (splitMode === 'equal' && splitTotal) {
      const halved = (Number(splitTotal) / 2).toFixed(2);
      setSplitShare(halved);
    }
  }, [splitTotal, splitMode]);

  const handlePay = (billId) => {
    setProcessingId(billId);
    setPinRequest({ type: 'bill', billId });
  };

  const handlePaySplit = (splitId, shareAmount) => {
    setProcessingId(splitId);
    setPinRequest({ type: 'split', splitId, shareAmount });
  };

  const closePinRequest = () => {
    setPinRequest(null);
    setProcessingId(null);
  };

  const confirmPaymentPin = async (pin) => {
    if (!pinRequest) return;
    try {
      if (pinRequest.type === 'bill') {
        const billId = pinRequest.billId;
        const res = await api.post(`/bills/${billId}/pay`, { upiPin: pin });
        updateBalance(res.data.balance);
        setBills(prev => prev.map(b => b.id === billId ? { ...b, status: 'paid', paidAt: res.data.paidAt || new Date().toISOString(), referenceId: res.data.referenceId } : b));
        await fetchData();
        setPinRequest(null);
        setProcessingId(null);
        alert('Virtual utility bill paid successfully!');
        return;
      }

      if (pinRequest.type === 'split') {
        const { splitId, shareAmount } = pinRequest;
        const res = await api.post(`/bills/split/${splitId}/pay`, { upiPin: pin });
        updateBalance(res.data.balance);
        window.dispatchEvent(new CustomEvent('animate-money', { detail: { amount: shareAmount } }));
        await fetchData();
        setPinRequest(null);
        setProcessingId(null);
        alert(`Split bill share paid successfully! Sent ₹${Number(shareAmount).toLocaleString('en-IN')} virtual cash to your friend.`);
      }
    } catch (err) {
      setProcessingId(null);
      throw err;
    }
  };

  const handleAddBill = async (e) => {
    e.preventDefault();
    setFormMsg(null);
    setFormLoading(true);

    try {
      const res = await api.post('/bills/add', { 
        amount, 
        why, 
        billType, 
        dueDate,
        isCompulsory
      });
      
      setBills(prev => [...prev, res.data.bill]);
      setFormMsg({ type: 'success', text: 'Simulated utility bill registered!' });
      
      setTimeout(() => {
        setShowAddModal(false);
        setAmount('');
        setWhy('');
        setBillType('internet');
        setIsCompulsory(false);
        setFormMsg(null);
      }, 1000);

    } catch (err) {
      setFormMsg({ type: 'error', text: err.response?.data?.error || 'Failed to add bill.' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleAddSplit = async (e) => {
    e.preventDefault();
    setSplitFormMsg(null);
    setSplitFormLoading(true);

    if (!splitFriendId) {
      setSplitFormMsg({ type: 'error', text: 'Please select a virtual friend first.' });
      setSplitFormLoading(false);
      return;
    }

    try {
      const res = await api.post('/bills/split', {
        friendId: splitFriendId,
        totalAmount: splitTotal,
        shareAmount: splitShare,
        note: splitNote
      });

      setSplits(prev => [res.data.split, ...prev]);
      setSplitFormMsg({ type: 'success', text: 'Split bill request dispatched to friend!' });

      setTimeout(() => {
        setShowSplitModal(false);
        setSplitFriendId('');
        setSplitTotal('');
        setSplitShare('');
        setSplitNote('');
        setSplitFormMsg(null);
        fetchData(); // reload names correctly
      }, 1000);
    } catch (err) {
      setSplitFormMsg({ type: 'error', text: err.response?.data?.error || 'Failed to create split request.' });
    } finally {
      setSplitFormLoading(false);
    }
  };

  const pendingBills = bills.filter(b => b.status === 'pending');
  const paidBills = bills.filter(b => b.status === 'paid');

  const paymentHistoryItems = [
    ...paidBills.map((bill) => ({
      key: `bill-${bill.id}`,
      provider: bill.provider || 'Bill Payment',
      detail: `${String(bill.billType || 'general').replace('_', ' ')} bill`,
      amount: Number(bill.amount || 0),
      time: bill.paidAt || bill.updatedAt || bill.createdAt,
      isCompulsory: bill.isCompulsory === 1,
      referenceId: bill.referenceId || bill.accountId || `BILL-${bill.id}`
    })),
    ...billPaymentHistory.map((tx) => ({
      key: `tx-${tx.id || tx.referenceId}`,
      provider: tx.description || 'Bill Payment',
      detail: tx.category ? `${String(tx.category).replace('_', ' ')} payment` : 'Bill payment',
      amount: Number(tx.amount || 0),
      time: tx.timestamp || tx.createdAt,
      isCompulsory: false,
      referenceId: tx.referenceId
    }))
  ]
    .filter((item, index, arr) => {
      const ref = item.referenceId ? String(item.referenceId) : '';
      if (!ref) return true;
      return arr.findIndex(other => String(other.referenceId || '') === ref) === index;
    })
    .sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));

  return (
    <div className="max-w-4xl mx-auto space-y-8 px-2 mt-4 md:mt-8">
      {/* Title Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-2 tracking-tight">Bills & Payments Center</h1>
          <p className="text-text-muted">Pay virtual utilities to build credit score, or split custom payments with friends.</p>
        </div>

        {/* Tab switchers */}
        <div className="flex gap-2 bg-surface p-1.5 rounded-2xl border border-white/5 relative z-10 shrink-0 self-start md:self-auto">
          <button 
            onClick={() => setActiveView('utility')} 
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${activeView === 'utility' ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:text-white'}`}
          >
            Utility Bills
          </button>
          <button 
            onClick={() => setActiveView('split')} 
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${activeView === 'split' ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:text-white'}`}
          >
            Split Bills with Friends
          </button>
        </div>
      </header>

      {user?.cardFrozen === 1 && (
        <div className="bg-danger/10 border border-danger/20 p-5 rounded-2xl flex items-start gap-4 shadow-[0_0_15px_rgba(239,71,111,0.05)] relative overflow-hidden">
          <div className="absolute top-0 right-0 h-full w-1 bg-danger"></div>
          <AlertCircle size={24} className="text-danger shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-extrabold text-white text-sm">Your Virtual NeoSim Card is Frozen</h4>
            <p className="text-xs text-text-muted leading-relaxed">
              Outgoing payments, auto-debits, split settles, and utility payments are temporarily locked. Unfreeze your card in the Dashboard to restore active payment services.
            </p>
          </div>
        </div>
      )}

      {/* Main Dashboard view */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {activeView === 'utility' ? (
            <motion.div 
              key="utility" 
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              {/* Action Buttons */}
              <div className="flex justify-between items-center bg-surface p-4 rounded-2xl border border-white/5">
                <span className="text-xs text-text-muted font-bold">Standard Utility Expenses Simulator</span>
                <button
                  onClick={() => { setShowAddModal(true); setFormMsg(null); }}
                  className="btn-primary flex items-center gap-2 text-xs py-3 px-5 shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
                >
                  <Plus size={16} /> Add simulated Bill
                </button>
              </div>

              {/* Utility Bills List */}
              <section>
                <h2 className="text-xl font-black mb-4 flex items-center gap-2">
                  Pending Obligations <span className="bg-danger/20 text-danger text-xs px-2.5 py-0.5 rounded-full font-bold">{pendingBills.length}</span>
                </h2>
                {pendingBills.length === 0 ? (
                  <div className="glass-panel p-12 text-center text-text-muted border-dashed border-2 border-white/10">
                    No active obligations. Click "+ Add simulated Bill" above to add home utilities or EMIs.
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-6">
                    {pendingBills.map((bill) => {
                      const Icon = ICONS[bill.billType] || AlertCircle;
                      const isDueSoon = new Date(bill.dueDate) < new Date(Date.now() + 7 * 86400000);
                      const compulsory = bill.isCompulsory === 1;
                      
                      return (
                        <div
                          key={bill.id}
                          className={`glass-panel p-6 relative overflow-hidden transition-all flex flex-col justify-between min-h-[220px] ${
                            compulsory 
                              ? 'border-danger/40 shadow-[0_0_20px_rgba(239,71,111,0.08)] bg-gradient-to-tr from-danger/5 to-transparent'
                              : isDueSoon 
                                ? 'border-warning/30 shadow-[0_0_15px_rgba(255,209,102,0.05)] bg-gradient-to-tr from-warning/5 to-transparent' 
                                : 'border-white/10'
                          }`}
                        >
                          {compulsory ? (
                            <div className="absolute top-0 right-0 bg-danger text-white text-[9px] font-black px-3 py-1 rounded-bl-lg uppercase tracking-wider flex items-center gap-1 animate-pulse">
                              <AlertTriangle size={10} /> EMI obligation
                            </div>
                          ) : isDueSoon ? (
                            <div className="absolute top-0 right-0 bg-warning text-black text-[9px] font-black px-3 py-1 rounded-bl-lg uppercase tracking-wider">DUE SOON</div>
                          ) : null}
                          
                          <div className="flex items-center gap-4 mb-4 mt-2">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                              compulsory 
                                ? 'bg-danger/20 text-danger' 
                                : isDueSoon 
                                  ? 'bg-warning/10 text-warning' 
                                  : 'bg-primary/10 text-primary'
                            }`}>
                              <Icon size={24} />
                            </div>
                            <div>
                              <p className="font-black text-lg text-white/95 leading-snug">{bill.provider}</p>
                              <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold">{bill.billType.replace('_', ' ')}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-end justify-between mb-6">
                            <div>
                              <p className="text-[10px] text-text-muted mb-1 uppercase font-bold">Amount Due</p>
                              <p className="font-black text-2xl text-white">₹{bill.amount.toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-text-muted mb-1 uppercase font-bold">Due Date</p>
                              <p className={`font-semibold text-sm ${compulsory ? 'text-danger animate-pulse' : isDueSoon ? 'text-warning' : 'text-white/80'}`}>{formatDate(bill.dueDate)}</p>
                            </div>
                          </div>

                          <button 
                            onClick={() => handlePay(bill.id)} 
                            disabled={processingId === bill.id || user?.cardFrozen === 1}
                            className={`w-full py-3.5 rounded-xl font-bold transition-all text-xs tracking-wider uppercase flex items-center justify-center gap-2 ${
                              user?.cardFrozen === 1
                                ? 'bg-white/5 border border-white/5 text-text-muted cursor-not-allowed opacity-50'
                                : compulsory 
                                  ? 'bg-gradient-to-r from-danger to-accent hover:opacity-90 text-white shadow-lg shadow-danger/20'
                                  : 'btn-primary'
                            }`}
                          >
                            {processingId === bill.id ? <Loader2 className="animate-spin" size={16} /> : user?.cardFrozen === 1 ? 'Card Frozen' : 'Settle Bill Payment'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Utility Bills History */}
              <section>
                <h2 className="text-xl font-black mb-4 text-text-muted">Payment History</h2>
                {paymentHistoryItems.length === 0 ? (
                  <p className="text-text-muted text-xs italic">No utility bills paid yet.</p>
                ) : (
                  <div className="glass-panel overflow-hidden border-white/10">
                    {paymentHistoryItems.slice(0, 10).map((item, i) => (
                      <div key={item.key} className={`flex items-center justify-between p-4 ${i !== 0 ? 'border-t border-white/5' : ''}`}>
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-success/10 text-success flex items-center justify-center"><CheckCircle size={18} /></div>
                          <div>
                            <p className="font-extrabold text-sm text-white/90">{item.provider}</p>
                            <p className="text-[10px] text-text-muted font-bold mt-0.5">{item.detail} • Paid on {formatDateTime(item.time)}</p>
                            {item.referenceId && <p className="text-[10px] text-text-muted/80 font-bold mt-0.5">Ref: {item.referenceId}</p>}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-success text-base">₹{Number(item.amount || 0).toLocaleString('en-IN')}</p>
                          {item.isCompulsory && <span className="text-[9px] uppercase tracking-wider font-extrabold text-danger/80">EMI obligations settled</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </motion.div>
          ) : (
            <motion.div 
              key="split" 
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              {/* Action Buttons */}
              <div className="flex justify-between items-center bg-surface p-4 rounded-2xl border border-white/5">
                <span className="text-xs text-text-muted font-bold">Split utility bills or restaurant balances with friends</span>
                <button
                  onClick={() => { setShowSplitModal(true); setSplitFormMsg(null); }}
                  disabled={friends.length === 0 || user?.cardFrozen === 1}
                  className={`flex items-center gap-2 text-xs py-3 px-5 shadow-lg rounded-xl font-bold transition-transform ${
                    friends.length === 0 || user?.cardFrozen === 1
                      ? 'bg-white/5 border border-white/5 text-text-muted cursor-not-allowed opacity-50' 
                      : 'bg-primary hover:bg-primary/95 text-white shadow-primary/20 hover:scale-105'
                  }`}
                >
                  <Users size={16} /> Initiate Split Request
                </button>
              </div>

              {friends.length === 0 && (
                <div className="bg-warning/10 border border-warning/20 p-5 rounded-2xl flex items-center gap-3">
                  <AlertTriangle size={20} className="text-warning shrink-0" />
                  <p className="text-xs text-text-muted font-bold leading-relaxed">
                    You have no active virtual friends! Add friends under the <span className="text-white">Friends</span> or <span className="text-white">Social Feed</span> tab to split bills with them.
                  </p>
                </div>
              )}

              {/* Active Split Requests list */}
              <section className="space-y-4">
                <h2 className="text-xl font-black mb-4 flex items-center gap-2">
                  Active Split Bills <span className="bg-primary/20 text-primary text-xs px-2.5 py-0.5 rounded-full font-bold">{splits.length}</span>
                </h2>

                {splits.length === 0 ? (
                  <div className="glass-panel p-12 text-center text-text-muted border-dashed border-2 border-white/10">
                    No active splits recorded. Dispatched splits will show up here.
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-6">
                    {splits.map(split => {
                      const isCreator = split.creatorId === user?.id;
                      const displayFriendName = isCreator ? split.friendName : split.creatorName;
                      const displayUpi = isCreator ? split.friendUpi : split.creatorUpi;
                      const isPaid = split.status === 'paid';

                      return (
                        <div 
                          key={split.id} 
                          className={`glass-panel p-6 border transition-all flex flex-col justify-between min-h-[220px] ${
                            isPaid 
                              ? 'border-success/20 bg-success/5 text-success' 
                              : isCreator 
                                ? 'border-primary/20 bg-primary/5' 
                                : 'border-warning/30 bg-warning/5'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isPaid ? 'bg-success/20 text-success' : isCreator ? 'bg-primary/20 text-primary' : 'bg-warning/20 text-warning'}`}>
                                {isPaid ? <CheckCircle size={20} /> : isCreator ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
                              </div>
                              <div>
                                <h4 className="font-black text-sm text-white/95">{split.note}</h4>
                                <p className="text-[10px] text-text-muted font-bold mt-0.5">
                                  {isCreator ? `Request Sent to: ${displayFriendName}` : `Request Received from: ${displayFriendName}`}
                                </p>
                              </div>
                            </div>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg ${isPaid ? 'bg-success text-black' : isCreator ? 'bg-primary/20 text-primary border border-primary/30 animate-pulse' : 'bg-warning/20 text-warning border border-warning/30 animate-pulse'}`}>
                              {isPaid ? 'Sattled' : isCreator ? 'Outstand' : 'Received'}
                            </span>
                          </div>

                          <div className="flex justify-between items-center border-t border-b border-white/5 py-4 my-4">
                            <div>
                              <p className="text-[9px] text-text-muted font-black uppercase">Total Bill</p>
                              <p className="text-sm font-bold text-white/80">₹{split.totalAmount.toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[9px] text-text-muted font-black uppercase">{isCreator ? 'Your Collectible Share' : 'Your Share Amount'}</p>
                              <p className="text-lg font-black text-white">₹{split.shareAmount.toLocaleString()}</p>
                            </div>
                          </div>

                          {/* CTAs */}
                          {!isPaid ? (
                            isCreator ? (
                              <div className="w-full py-2.5 rounded-xl bg-white/5 text-center text-[10px] font-black text-primary border border-white/5 uppercase tracking-wider">
                                Waiting for friend payment
                              </div>
                            ) : (
                              <button
                                onClick={() => handlePaySplit(split.id, split.shareAmount)}
                                disabled={processingId === split.id || user?.cardFrozen === 1}
                                className={`w-full py-3 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 ${
                                  user?.cardFrozen === 1
                                    ? 'bg-white/5 border border-white/5 text-text-muted cursor-not-allowed opacity-50'
                                    : 'btn-primary'
                                }`}
                              >
                                {processingId === split.id ? <Loader2 className="animate-spin" size={16} /> : user?.cardFrozen === 1 ? 'Card Frozen' : 'Accept & Settle Share'}
                              </button>
                            )
                          ) : (
                            <div className="w-full py-2.5 rounded-xl bg-success/10 text-center text-[10px] font-black text-success border border-success/20 uppercase tracking-wider">
                              Successfully Settle virtual UPI
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Add Custom Bill Modal Popup */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-panel p-6 md:p-8 max-w-md w-full relative space-y-6 bg-gradient-to-b from-slate-900 to-background"
            >
              <button 
                onClick={() => setShowAddModal(false)}
                className="absolute top-4 right-4 text-text-muted hover:text-white transition-colors"
              >
                <X size={20} />
              </button>

              <h2 className="text-xl font-black flex items-center gap-2 text-primary border-b border-white/5 pb-3">
                <Plus size={22} /> Add Custom Simulated Bill
              </h2>

              <form onSubmit={handleAddBill} className="space-y-4 text-left">
                <div>
                  <label className="block text-[10px] font-black text-text-muted mb-2 uppercase tracking-widest">Biller Name / Description (Why)</label>
                  <input
                    type="text"
                    value={why}
                    onChange={(e) => setWhy(e.target.value)}
                    placeholder="e.g. State Power board, Broadband, Gas Connection"
                    className="input-field text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-text-muted mb-2 uppercase tracking-widest">Category</label>
                    <select
                      value={billType}
                      onChange={(e) => setBillType(e.target.value)}
                      className="input-field text-xs text-white"
                    >
                      <option value="electricity">Electricity</option>
                      <option value="water">Water Utility</option>
                      <option value="internet">Broadband / Wifi</option>
                      <option value="mobile">Mobile / Recharge</option>
                      <option value="gas">LPG / Gas</option>
                      <option value="credit_card">Credit Card bill</option>
                      <option value="rent">House Rent / Lease</option>
                      <option value="emi">EMI / Loan Payment</option>
                      <option value="general">General / Others</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-text-muted mb-2 uppercase flex items-center gap-1 tracking-widest">
                      <Calendar size={12} /> Due Date
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="input-field text-white/50 text-xs"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-text-muted mb-2 uppercase tracking-widest">Amount (₹)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="input-field font-black text-lg"
                    min="1"
                    required
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-danger/5 border border-danger/20 transition-all hover:bg-danger/10">
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-white flex items-center gap-1.5">
                      <AlertTriangle size={14} className="text-danger animate-pulse" /> Mark as Compulsory obligation
                    </span>
                    <span className="text-[9px] text-text-muted mt-0.5 font-semibold">Critical EMIs or obligation logs that must be settled.</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={isCompulsory}
                      onChange={(e) => setIsCompulsory(e.target.checked)}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-white/10 rounded-full peer peer-focus:ring-0 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-text-muted after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-danger peer-checked:after:bg-white"></div>
                  </label>
                </div>

                {formMsg && (
                  <div className={`p-4 rounded-xl flex items-center gap-3 text-xs border ${formMsg.type === 'success' ? 'bg-success/10 border-success/20 text-success' : 'bg-danger/10 border-danger/20 text-danger'}`}>
                    {formMsg.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                    <span>{formMsg.text}</span>
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={formLoading}
                  className="w-full btn-primary py-3.5 font-black flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
                >
                  {formLoading ? <Loader2 className="animate-spin" /> : <Database size={14} />}
                  {formLoading ? 'Saving simulated bill...' : 'Create simulated Bill'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Custom Split Bill Modal */}
      <AnimatePresence>
        {showSplitModal && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-panel p-6 md:p-8 max-w-md w-full relative space-y-6 bg-gradient-to-b from-slate-900 to-background"
            >
              <button 
                onClick={() => setShowSplitModal(false)}
                className="absolute top-4 right-4 text-text-muted hover:text-white transition-colors"
              >
                <X size={20} />
              </button>

              <h2 className="text-xl font-black flex items-center gap-2 text-primary border-b border-white/5 pb-3">
                <Users size={22} /> Initiate Split Request
              </h2>

              <form onSubmit={handleAddSplit} className="space-y-4 text-left">
                <div>
                  <label className="block text-[10px] font-black text-text-muted mb-2 uppercase tracking-widest">Select Friend</label>
                  <select
                    value={splitFriendId}
                    onChange={(e) => setSplitFriendId(e.target.value)}
                    className="input-field text-xs text-white"
                    required
                  >
                    <option value="">-- Choose Virtual Friend --</option>
                    {friends.map(f => (
                      <option key={f.id} value={f.id}>{f.name} ({f.upiId})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-text-muted mb-2 uppercase tracking-widest">Split Mode</label>
                    <select
                      value={splitMode}
                      onChange={(e) => setSplitMode(e.target.value)}
                      className="input-field text-xs text-white"
                    >
                      <option value="equal">Equal Split (1/2)</option>
                      <option value="custom">Custom Split</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-text-muted mb-2 uppercase tracking-widest">Total Amount (₹)</label>
                    <input
                      type="number"
                      value={splitTotal}
                      onChange={(e) => setSplitTotal(e.target.value)}
                      placeholder="0.00"
                      className="input-field font-black text-xs text-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-text-muted mb-2 uppercase tracking-widest">Friend's Share (₹)</label>
                  <input
                    type="number"
                    value={splitShare}
                    onChange={(e) => setSplitShare(e.target.value)}
                    placeholder="0.00"
                    className="input-field font-black text-xs text-white"
                    disabled={splitMode === 'equal'}
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-text-muted mb-2 uppercase tracking-widest">Description / Note</label>
                  <input
                    type="text"
                    value={splitNote}
                    onChange={(e) => setSplitNote(e.target.value)}
                    placeholder="e.g. Dinner yesterday, utilities, groceries"
                    className="input-field text-xs"
                    required
                  />
                </div>

                {splitFormMsg && (
                  <div className={`p-4 rounded-xl flex items-center gap-3 text-xs border ${splitFormMsg.type === 'success' ? 'bg-success/10 border-success/20 text-success' : 'bg-danger/10 border-danger/20 text-danger'}`}>
                    {splitFormMsg.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                    <span>{splitFormMsg.text}</span>
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={splitFormLoading}
                  className="w-full btn-primary py-3.5 font-black flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
                >
                  {splitFormLoading ? <Loader2 className="animate-spin" /> : <Send size={14} />}
                  {splitFormLoading ? 'Sending split...' : 'Dispatch UPI Split'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <PinModal
        open={!!pinRequest}
        title={pinRequest?.type === 'split' ? 'Confirm Split Bill Payment' : 'Confirm Bill Payment'}
        message={pinRequest?.type === 'split' ? 'Enter your 4-digit PIN to settle this split bill.' : 'Enter your 4-digit PIN to settle this utility bill.'}
        onCancel={closePinRequest}
        onConfirm={confirmPaymentPin}
      />

    </div>
  );
}
