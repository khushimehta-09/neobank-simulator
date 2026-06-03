import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Eye, Trophy, Zap, Users, TrendingUp, Lock, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const TrustScore = () => {
  const { user } = useAuth();
  const [trust, setTrust] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('score');
  const token = localStorage.getItem('token') || localStorage.getItem('neosim-token');

  const fetchTrust = async () => {
    try {
      const res = await fetch(`${API}/trust`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setTrust(data);
    } catch (err) { console.error(err); }
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(`${API}/trust/leaderboard`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setLeaderboard(data.leaderboard || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    Promise.all([fetchTrust(), fetchLeaderboard()]).finally(() => setLoading(false));
  }, []);

  const getGradeColor = (grade) => {
    switch (grade) {
      case 'A+': return 'from-emerald-400 to-green-500';
      case 'A': return 'from-blue-400 to-cyan-500';
      case 'B': return 'from-amber-400 to-yellow-500';
      case 'C': return 'from-orange-400 to-red-500';
      default: return 'from-red-500 to-rose-600';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-emerald-400';
    if (score >= 70) return 'text-blue-400';
    if (score >= 50) return 'text-amber-400';
    return 'text-red-400';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
          <Shield className="text-primary" /> Trust Score
        </h1>
        <p className="text-text-muted text-sm mt-1">Your financial trustworthiness rating based on your simulator behavior</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white/5 p-1.5 rounded-xl border border-white/5">
        {['score', 'leaderboard'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all capitalize ${activeTab === tab ? 'bg-primary text-white shadow-lg' : 'text-text-muted hover:text-white'}`}>
            {tab === 'score' ? '🛡️ My Score' : '🏆 Leaderboard'}
          </button>
        ))}
      </div>

      {activeTab === 'score' && trust && (
        <>
          {/* Score Circle */}
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="glass-panel p-8 rounded-2xl border border-white/5 flex flex-col items-center">
            <div className="relative w-40 h-40 mb-6">
              <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                <circle cx="60" cy="60" r="50" fill="none" stroke="url(#trustGradient)" strokeWidth="10"
                  strokeDasharray={`${(trust.score / 100) * 314} 314`} strokeLinecap="round" />
                <defs>
                  <linearGradient id="trustGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#4361ee" />
                    <stop offset="100%" stopColor="#3a86ff" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black">{trust.score}</span>
                <span className={`text-lg font-black bg-gradient-to-r ${getGradeColor(trust.grade)} bg-clip-text text-transparent`}>
                  Grade {trust.grade}
                </span>
              </div>
            </div>
            <p className="text-sm text-text-muted text-center max-w-sm">
              Your trust score is calculated from your scam awareness, payment behavior, challenge completions, and overall safe behavior.
            </p>
          </motion.div>

          {/* Score Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trust.breakdown && Object.entries(trust.breakdown).map(([key, metric], i) => (
              <motion.div key={key} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className="glass-panel p-5 rounded-2xl border border-white/5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {key === 'scamAwareness' && <Eye size={18} className="text-purple-400" />}
                    {key === 'safeBehavior' && <Lock size={18} className="text-blue-400" />}
                    {key === 'paymentReliability' && <CheckCircle size={18} className="text-emerald-400" />}
                    {key === 'challengeCompletion' && <Trophy size={18} className="text-amber-400" />}
                    <span className="font-bold text-sm">{metric.label}</span>
                  </div>
                  <span className="text-[10px] text-text-muted bg-white/5 px-2 py-0.5 rounded-full">{metric.weight}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-white/5 rounded-full h-3 overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${metric.value}%` }} transition={{ duration: 1, delay: i * 0.2 }}
                      className="bg-gradient-to-r from-primary to-secondary h-full rounded-full" />
                  </div>
                  <span className={`text-lg font-black ${getScoreColor(metric.value)}`}>{metric.value}</span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* How to Improve */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5">
            <h3 className="font-bold mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-primary" /> How to Improve</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { tip: 'Play Scam Detective to boost Scam Awareness', icon: '🕵️', boost: '+2 per correct answer' },
                { tip: 'Complete challenges to improve Challenge Completion', icon: '🏋️', boost: '+5 per challenge' },
                { tip: 'Make timely bill payments for Payment Reliability', icon: '💳', boost: '+1 per on-time payment' },
                { tip: 'Resolve life events quickly for Safe Behavior', icon: '🛡️', boost: '+1 per resolution' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-xl">{item.icon}</span>
                  <div>
                    <p className="text-sm font-semibold">{item.tip}</p>
                    <p className="text-[11px] text-primary font-bold mt-0.5">{item.boost}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === 'leaderboard' && (
        <div className="space-y-3">
          {leaderboard.length === 0 ? (
            <div className="text-center py-16 glass-panel rounded-2xl border border-white/5">
              <p className="text-4xl mb-4">🏆</p>
              <p className="text-lg font-bold">No scores yet</p>
              <p className="text-text-muted text-sm mt-1">Be the first to build your trust score!</p>
            </div>
          ) : (
            leaderboard.map((entry, i) => (
              <motion.div key={entry.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className={`glass-panel p-4 rounded-2xl border flex items-center gap-4 ${entry.id === user?.id ? 'border-primary/30 bg-primary/5' : 'border-white/5'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${i === 0 ? 'bg-gradient-to-br from-amber-400 to-yellow-600 text-white' : i === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white' : i === 2 ? 'bg-gradient-to-br from-amber-600 to-orange-800 text-white' : 'bg-white/10 text-text-muted'}`}>
                  {i + 1}
                </div>
                <div className="flex-1">
                  <p className="font-bold">{entry.name} {entry.id === user?.id && <span className="text-primary text-xs">(You)</span>}</p>
                  <p className="text-xs text-text-muted">Level {entry.level}</p>
                </div>
                <div className="text-right">
                  <p className={`text-xl font-black ${getScoreColor(entry.score)}`}>{entry.score}</p>
                  <p className="text-[10px] text-text-muted uppercase font-bold">Trust Score</p>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default TrustScore;
