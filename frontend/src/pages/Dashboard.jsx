import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  ArrowUpRight, ArrowDownRight, CreditCard, ShieldAlert, Sparkles, 
  TrendingUp, Zap, Target, Award, Plus, Send, ShieldCheck, Lock, Unlock,
  HelpCircle, ChevronRight, ChevronLeft, Bell, BrainCircuit
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { formatTime } from '../utils/time';
import PinModal from '../components/PinModal';

const Dashboard = () => {
  const { user, setUser } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cardTilt, setCardTilt] = useState({ x: 0, y: 0 });
  const [activeTipIdx, setActiveTipIdx] = useState(0);
  const [togglingCard, setTogglingCard] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);

  // Sound Synth
  const playSound = (freq = 700, duration = 0.08) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  };

  const securityTips = [
    { title: "ATM Skimming Shield", desc: "Always check the card reader slot for bulky overlay overlays. If the slot feels loose, do NOT insert your card.", category: "ATM" },
    { title: "UPI QR Fraud Alert", desc: "Scanning a QR code is ONLY for sending money, never for receiving. If someone says 'scan this QR to receive a prize', it is a scam!", category: "UPI" },
    { title: "Phishing Domains", desc: "Always inspect URLs carefully. Real bank domains will never use suffixes like '.net-verify.in' or '.ref-bank.org'.", category: "WEB" },
    { title: "OTP Confidentiality", desc: "No genuine bank official will ever ask you to read out an OTP or a card CVV under any emergency freeze pretext.", category: "MOBILE" }
  ];

  const fetchDashboard = async () => {
    try {
      const [dashRes, insightRes, txRes] = await Promise.all([
        api.get('/analytics/dashboard'),
        api.get('/learning/ai-insights'),
        api.get('/transactions/history?limit=4')
      ]);
      setData({ 
        ...dashRes.data, 
        insights: insightRes.data.insights, 
        transactions: txRes.data.transactions 
      });
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleCardMouseMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    // Limit rotation to maximum 15 degrees
    const factor = 12;
    setCardTilt({
      x: (x / (rect.width / 2)) * factor,
      y: -(y / (rect.height / 2)) * factor
    });
  };

  const handleCardMouseLeave = () => {
    setCardTilt({ x: 0, y: 0 });
  };

  const completeCardToggle = async (pin = null) => {
    if (togglingCard) return;
    setTogglingCard(true);
    playSound(user?.cardFrozen ? 950 : 350, 0.15);
    try {
      const res = await api.post('/account/card/freeze', pin ? { pin } : {});
      setUser(prev => ({ ...prev, cardFrozen: res.data.frozen ? 1 : 0 }));
      setData(prev => ({ ...prev, cardFrozen: res.data.frozen ? 1 : 0 }));
      setPinModalOpen(false);
    } catch (err) {
      if (err.response?.status === 401) throw err;
      alert(err.response?.data?.error || 'Failed to update card status');
    } finally { setTogglingCard(false); }
  };

  const handleToggleCardFreeze = async () => {
    if (user?.cardFrozen || data?.cardFrozen) setPinModalOpen(true);
    else await completeCardToggle();
  };

  const nextTip = () => {
    playSound(600, 0.04);
    setActiveTipIdx(prev => (prev + 1) % securityTips.length);
  };

  const prevTip = () => {
    playSound(600, 0.04);
    setActiveTipIdx(prev => (prev - 1 + securityTips.length) % securityTips.length);
  };

  if (loading) return <div className="h-full flex items-center justify-center"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;

  const currentTip = securityTips[activeTipIdx];
  const levelProgress = Math.min(100, Math.round(((data.xp || 0) % 500) / 5));

  // Determine financial status label based on score
  const getScoreStatus = (score) => {
    if (score >= 800) return { label: "Elite", color: "text-success" };
    if (score >= 720) return { label: "Excellent", color: "text-secondary" };
    if (score >= 650) return { label: "Healthy", color: "text-warning" };
    return { label: "Vulnerable", color: "text-danger" };
  };

  const scoreStatus = getScoreStatus(data.financialScore);
  const accountNumber = user?.accountNumber || data.accountNumber || '-';
  const upiId = user?.upiId || data.upiId || '-';

  return (
    <div className="space-y-6 md:space-y-8 max-w-7xl mx-auto">
      
      {/* Header Panel */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <p className="text-text-muted mb-1 flex items-center gap-2">
            Welcome back, <span className="text-white font-medium">{user.name.split(' ')[0]}</span> <span className="animate-bounce inline-block">👋</span>
          </p>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Fintech Operating Desk</h1>
        </motion.div>
        
        {/* Savings Streak Tracker */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          onClick={() => playSound(1000, 0.1)}
          className="flex items-center gap-3 bg-surface border border-white/10 px-4 py-2.5 rounded-2xl shadow-lg cursor-pointer hover:border-white/20 transition-all"
        >
          <div className="w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center text-warning">
            <Award size={18} className="animate-pulse" />
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-widest text-text-muted font-black">Daily Streak</p>
            <p className="font-extrabold leading-tight text-sm">{data.savingsStreak} Days</p>
          </div>
        </motion.div>
      </header>

      {/* Main Grid - Cash & 3D Interactive Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Glassmorphic Balance widget */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="lg:col-span-7 premium-card flex flex-col justify-between h-64 md:h-72 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none -z-10"></div>
          
          <div className="flex justify-between items-start z-10 relative">
            <div>
              <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-1.5">Total Available Balance</p>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-2 drop-shadow-md flex items-end gap-2 text-white">
                ₹{data.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </h2>
              <p className="text-white/80 text-xs flex items-center gap-1.5"><ShieldCheck size={14} className="text-success-light" /> 100% Secure Sandbox Environment</p>
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
                <div className="rounded-2xl bg-black/15 border border-white/15 px-4 py-3 backdrop-blur-md">
                  <p className="text-[9px] uppercase tracking-widest text-white/55 font-black mb-1">Account Number</p>
                  <p className="font-mono text-sm md:text-base text-white font-extrabold tracking-wider break-all">{accountNumber}</p>
                  <p className="text-[10px] text-white/55 mt-1">Use this number to receive NeoSim bank transfers.</p>
                </div>
                <div className="rounded-2xl bg-black/15 border border-white/15 px-4 py-3 backdrop-blur-md">
                  <p className="text-[9px] uppercase tracking-widest text-white/55 font-black mb-1">UPI ID</p>
                  <p className="font-mono text-sm md:text-base text-white font-extrabold tracking-wider break-all">{upiId}</p>
                  <p className="text-[10px] text-white/55 mt-1">Use this ID for NeoSim online payments.</p>
                </div>
              </div>
            </div>
            <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-inner border border-white/20 shrink-0">
              <Zap className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" size={24} />
            </div>
          </div>
          
          <div className="z-10 relative mt-auto flex flex-wrap gap-3">
            <Link 
              to="/transfer" 
              onClick={() => playSound(800, 0.05)}
              className="flex-1 min-w-[130px] bg-white text-primary hover:bg-white/90 py-3.5 px-4 rounded-2xl font-black transition-all shadow-lg hover:-translate-y-1 flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
            >
              <Send size={15} /> Quick Transfer
            </Link>
            <Link 
              to="/bills" 
              onClick={() => playSound(800, 0.05)}
              className="flex-1 min-w-[130px] bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 text-white py-3.5 px-4 rounded-2xl font-black transition-all hover:-translate-y-1 flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
            >
              <Plus size={15} /> Pay Bills
            </Link>
          </div>
        </motion.div>

        {/* 3D Debit Card with Lock Mechanism */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.1 }} 
          className="lg:col-span-5 relative h-64 md:h-72 w-full select-none cursor-pointer"
        >
          <div 
            onMouseMove={handleCardMouseMove}
            onMouseLeave={handleCardMouseLeave}
            style={{
              transform: `perspective(1000px) rotateX(${cardTilt.y}deg) rotateY(${cardTilt.x}deg)`,
              transition: 'transform 0.1s ease-out'
            }}
            className="w-full h-full rounded-3xl overflow-hidden shadow-2xl relative border border-white/10 preserve-3d"
          >
            {/* Background elements */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#121621] via-[#24174D] to-[#121621] -z-10"></div>
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            
            <div className="relative h-full p-6 flex flex-col justify-between z-10">
              {/* Card Brand Info */}
              <div className="flex justify-between items-start">
                <span className="text-xl font-black tracking-widest text-white/90 italic">NeoSim</span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleToggleCardFreeze(); }}
                  className={`p-2 rounded-xl flex items-center justify-center border transition-all ${user?.cardFrozen ? 'bg-danger/20 border-danger/40 text-danger animate-pulse' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'}`}
                  title={user?.cardFrozen ? "Unfreeze Virtual Card" : "Freeze Virtual Card"}
                >
                  {user?.cardFrozen ? <Lock size={16} /> : <Unlock size={16} />}
                </button>
              </div>

              {/* Card Details */}
              <div>
                <div className="w-10 h-8 bg-gradient-to-r from-warning to-yellow-500 rounded mb-4 shadow-inner"></div>
                <p className="text-xl md:text-2xl tracking-[0.2em] font-mono text-white/90 drop-shadow-md mb-3">
                  {data.cardNumber.replace(/(.{4})/g, '$1 ')}
                </p>
                <div className="flex justify-between text-[10px] text-white/60 font-bold uppercase tracking-wider">
                  <span>Card Holder<br/><span className="text-white text-xs font-black">{user.name}</span></span>
                  <span>Valid Thru<br/><span className="text-white text-xs font-black">{data.cardExpiry}</span></span>
                </div>
              </div>
            </div>

            {/* Frozen Overlay */}
            <AnimatePresence>
              {user?.cardFrozen && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-background/80 backdrop-blur-md flex flex-col items-center justify-center z-20 space-y-2 border border-danger/20 rounded-3xl"
                >
                  <div className="w-12 h-12 rounded-full bg-danger/10 border border-danger/30 flex items-center justify-center text-danger shadow-[0_0_15px_rgba(239,71,111,0.3)]">
                    <Lock size={20} />
                  </div>
                  <p className="text-danger font-black text-xs uppercase tracking-widest animate-pulse">Virtual Card Frozen</p>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleToggleCardFreeze(); }}
                    className="text-[10px] text-white/80 border border-white/20 bg-white/5 px-3 py-1.5 rounded-lg font-bold hover:bg-white/10 transition-colors uppercase tracking-wider"
                  >
                    Tap to Unfreeze
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

      </div>

      {/* Middle Grid - Insights & Daily Tips */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Dynamic AI Insights */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.2 }} 
          className="glass-panel p-6 lg:col-span-2 relative overflow-hidden flex flex-col justify-between"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><BrainCircuit size={100} /></div>
          
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-bold flex items-center gap-2"><BrainCircuit className="text-primary" size={18} /> AI Advisor Core</h3>
            <span className="text-[10px] bg-primary/10 border border-primary/20 text-primary px-2.5 py-0.5 rounded-lg font-black uppercase">Live Scanning</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.insights.slice(0, 2).map((insight, i) => (
              <div 
                key={i} 
                className={`p-4 rounded-2xl border bg-gradient-to-br flex flex-col justify-between gap-3 ${insight.type === 'success' ? 'from-success/10 to-success/5 border-success/20' : insight.type === 'warning' ? 'from-warning/10 to-warning/5 border-warning/20' : 'from-primary/10 to-primary/5 border-primary/20'}`}
              >
                <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-lg shadow-inner border border-white/5 shrink-0">{insight.icon}</div>
                <p className="text-xs text-white/90 leading-relaxed font-semibold">{insight.message}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Dynamic Security Tip Carousel */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.3 }} 
          className="glass-panel p-6 flex flex-col justify-between"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-bold flex items-center gap-2"><ShieldAlert className="text-danger" size={18} /> Secure Tip Ticker</h3>
            <span className="text-[9px] uppercase font-black text-danger bg-danger/10 border border-danger/25 px-2 py-0.5 rounded-lg tracking-widest">{currentTip.category}</span>
          </div>

          <div className="my-auto py-2">
            <p className="text-sm font-extrabold text-white mb-1.5">{currentTip.title}</p>
            <p className="text-xs text-text-muted leading-relaxed font-semibold">{currentTip.desc}</p>
          </div>

          <div className="flex justify-between items-center border-t border-white/5 pt-3.5">
            <span className="text-[10px] text-text-muted/50 font-bold uppercase">{activeTipIdx + 1} of {securityTips.length}</span>
            <div className="flex gap-1.5">
              <button onClick={prevTip} className="w-7 h-7 bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center rounded-lg text-text-muted hover:text-white transition-colors">
                <ChevronLeft size={14} />
              </button>
              <button onClick={nextTip} className="w-7 h-7 bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center rounded-lg text-text-muted hover:text-white transition-colors">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </motion.div>

      </div>

      {/* Bottom Grid - History & Dynamic Health Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Transaction History Timeline */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.4 }} 
          className="glass-panel lg:col-span-2 p-0 overflow-hidden flex flex-col justify-between"
        >
          <div className="p-5 border-b border-white/5 flex justify-between items-center bg-surface/50">
            <h3 className="text-base font-bold">Recent Timeline Activity</h3>
            <Link to="/history" onClick={() => playSound(700, 0.05)} className="text-xs text-primary hover:text-primary-glow font-bold uppercase tracking-wider">View History</Link>
          </div>
          
          <div className="divide-y divide-white/5 p-2">
            {data.transactions.length === 0 ? (
              <div className="p-8 text-center text-xs text-text-muted">No recent ledger activity.</div>
            ) : (
              data.transactions.map((tx) => {
                const isWithdrawal = tx.type === 'withdrawal';
                const isDebit = tx.senderId === user.id && !isWithdrawal;
                const txName = isDebit ? tx.receiverName || tx.description : tx.senderName || tx.description;
                
                const sign = isDebit ? '-' : '+';
                const colorClass = isDebit ? 'text-danger' : 'text-success';
                const iconContainerClass = isDebit 
                  ? 'bg-danger/10 text-danger border border-danger/15' 
                  : 'bg-success/10 text-success border border-success/15';

                return (
                  <div key={tx.id} className="p-3.5 flex items-center justify-between hover:bg-white/5 rounded-xl transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${iconContainerClass}`}>
                        {isDebit ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-white/90">{txName}</p>
                        <p className="text-[10px] text-text-muted capitalize flex items-center gap-1">
                          {tx.type.replace('_', ' ')} • {formatTime(tx.timestamp)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-black text-sm ${colorClass}`}>{sign}₹{tx.amount.toLocaleString()}</p>
                      <p className="text-[9px] text-text-muted/60 font-bold uppercase tracking-wider">COMPLETED</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>

        {/* Dynamic Financial Health Score Gauge & XP Progress */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.5 }} 
          className="flex flex-col gap-6"
        >
          {/* Circular Speedometer Gauge */}
          <div className="glass-panel p-6 relative overflow-hidden bg-gradient-to-b from-primary/10 to-transparent flex flex-col justify-between border-primary/20">
            <h3 className="text-base font-bold mb-4 flex items-center gap-2"><Target className="text-primary" size={18} /> Financial Score Gauge</h3>
            
            <div className="flex items-center gap-5">
              <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  {/* Background loop */}
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3.5" />
                  {/* Glowing dynamic stroke */}
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--primary)" strokeWidth="3.5" strokeDasharray={`${(data.financialScore/900)*100}, 100`} strokeLinecap="round" className="drop-shadow-[0_0_8px_var(--primary-glow)]" />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-2xl font-black text-white">{data.financialScore}</span>
                  <span className="text-[8px] text-text-muted uppercase font-bold tracking-widest">Max 900</span>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-extrabold text-white flex items-center gap-1.5">
                  Rating: <span className={`font-black ${scoreStatus.color}`}>{scoreStatus.label}</span>
                </p>
                <p className="text-[11px] text-text-muted leading-relaxed font-semibold">
                  Calculated based on active envelope buffers, secure scam detections, and bills paid. Keep it high!
                </p>
              </div>
            </div>
          </div>

          {/* Level & XP progression panel */}
          <div className="glass-panel p-5 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[9px] uppercase font-black tracking-widest text-text-muted">Operator XP Progress</p>
                <p className="text-sm font-extrabold text-white">Level {data.level || 1}</p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-warning to-danger flex items-center justify-center text-white text-xs font-black shadow-lg">
                {data.level || 1}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="w-full bg-white/5 border border-white/5 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-warning to-danger transition-all duration-500 shadow-[0_0_10px_rgba(255,209,102,0.4)]" 
                  style={{ width: `${levelProgress}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[10px] text-text-muted/65 font-bold uppercase tracking-wider">
                <span>{levelProgress}% Unlocked</span>
                <span>{data.xp || 0} Total XP</span>
              </div>
            </div>
          </div>

        </motion.div>

      </div>
      <PinModal open={pinModalOpen} title="Confirm Card Unfreeze" message="Enter PIN to unfreeze card." onCancel={() => setPinModalOpen(false)} onConfirm={(pin) => completeCardToggle(pin)} />
    </div>
  );
};

export default Dashboard;
