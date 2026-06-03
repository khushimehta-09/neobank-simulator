import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, AlertTriangle, CheckCircle, XCircle, Zap, Trophy, RotateCcw, ChevronRight, Target, Brain } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const API = 'http://localhost:5000/api';

const ScamGame = () => {
  const { user } = useAuth();
  const [scenario, setScenario] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [result, setResult] = useState(null);
  const [stats, setStats] = useState(null);
  const [difficulty, setDifficulty] = useState('random');
  const [loading, setLoading] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [streak, setStreak] = useState(0);
  const [gameState, setGameState] = useState('menu'); // menu, playing, result

  const fetchScenario = async () => {
    setLoading(true);
    setSelectedAnswer(null);
    setResult(null);
    try {
      const res = await api.get(`/scam-game/scenario?difficulty=${difficulty}`);
      if (!res.data.scenario) {
        console.error('Scenario fetch failed');
        alert('Could not load scenario. Please try again.');
        setLoading(false);
        return;
      }
      setScenario(res.data.scenario);
      setGameState('playing');
    } catch (err) {
      console.error('Network error loading scenario:', err);
      alert('Network error. Make sure the backend is running.');
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const res = await api.get(`/scam-game/stats`);
      setStats(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchStats(); }, []);

  const submitAnswer = async (answerIndex) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(answerIndex);
    try {
      const res = await api.post(`/scam-game/answer`, {
        scenarioId: scenario.id, answerIndex
      });
      setResult(res.data);
      setGameState('result');
      if (res.data.correct) setStreak(prev => prev + 1);
      else setStreak(0);
      fetchStats();
    } catch (err) { console.error(err); }
  };

  const getDifficultyColor = (diff) => {
    switch (diff) {
      case 'easy': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'medium': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      case 'hard': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-primary bg-primary/10 border-primary/20';
    }
  };

  // Menu State
  if (gameState === 'menu') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <Shield className="text-primary" /> Scam Detective
          </h1>
          <p className="text-text-muted text-sm mt-1">Test your fraud detection skills against real-world scam scenarios</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Games Played', value: stats.totalGames, icon: Target, color: 'text-primary' },
              { label: 'Accuracy', value: `${stats.accuracy ?? 0}%`, icon: Brain, color: (stats.accuracy ?? 0) >= 70 ? 'text-emerald-400' : 'text-amber-400' },
              { label: 'Correct', value: stats.correctAnswers, icon: CheckCircle, color: 'text-emerald-400' },
              { label: 'Total XP', value: stats.totalXpEarned, icon: Zap, color: 'text-amber-400' },
            ].map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className="glass-panel p-4 rounded-2xl border border-white/5">
                <stat.icon size={20} className={`${stat.color} mb-2`} />
                <p className="text-2xl font-black">{stat.value}</p>
                <p className="text-[11px] text-text-muted font-semibold uppercase tracking-wider">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        )}

        {/* Difficulty Selection */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5">
          <h3 className="font-bold mb-4">Select Difficulty</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { id: 'random', label: '🎲 Random', desc: 'Mix of all' },
              { id: 'easy', label: '🟢 Easy', desc: '+25 XP each' },
              { id: 'medium', label: '🟡 Medium', desc: '+50 XP each' },
              { id: 'hard', label: '🔴 Hard', desc: '+100 XP each' },
            ].map(d => (
              <button key={d.id} onClick={() => setDifficulty(d.id)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${difficulty === d.id ? 'border-primary bg-primary/10' : 'border-white/5 bg-white/5 hover:border-white/10'}`}>
                <p className="text-lg mb-1">{d.label}</p>
                <p className="text-[11px] text-text-muted">{d.desc}</p>
              </button>
            ))}
          </div>
          
          <button onClick={fetchScenario} disabled={loading}
            className="w-full mt-6 py-4 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-black text-lg transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(67,97,238,0.3)] flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed">
            {loading ? <><span className="animate-spin">⟳</span> Loading...</> : <><Shield size={24} /> Start Game</>}
          </button>
        </div>

        {/* Difficulty Breakdown */}
        {stats?.byDifficulty?.length > 0 && (
          <div className="glass-panel p-6 rounded-2xl border border-white/5">
            <h3 className="font-bold mb-4">Performance by Difficulty</h3>
            <div className="space-y-3">
              {stats.byDifficulty.map((d, i) => (
                <div key={i} className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold border capitalize ${getDifficultyColor(d.difficulty)}`}>{d.difficulty}</span>
                  <div className="flex-1 bg-white/5 rounded-full h-3 overflow-hidden">
                    <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${d.total > 0 ? (d.correct / d.total) * 100 : 0}%` }}></div>
                  </div>
                  <span className="text-sm font-bold">{d.correct}/{d.total}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Results */}
        {stats?.recentResults?.length > 0 && (
          <div className="glass-panel p-6 rounded-2xl border border-white/5">
            <h3 className="font-bold mb-4">Recent Games</h3>
            <div className="space-y-2">
              {stats.recentResults.slice(0, 5).map((r, i) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${r.isCorrect ? 'bg-emerald-500/5 border border-emerald-500/10' : 'bg-red-500/5 border border-red-500/10'}`}>
                  {r.isCorrect ? <CheckCircle size={16} className="text-emerald-400" /> : <XCircle size={16} className="text-red-400" />}
                  <span className="text-sm flex-1 truncate">{r.scenario}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border capitalize ${getDifficultyColor(r.difficulty)}`}>{r.difficulty}</span>
                  <span className="text-xs font-bold text-amber-400">+{r.xpEarned} XP</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Playing / Result State
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => setGameState('menu')} className="flex items-center gap-2 text-text-muted hover:text-white transition-colors text-sm font-bold">
          ← Back to Menu
        </button>
        {streak > 0 && (
          <span className="px-3 py-1 bg-amber-400/10 text-amber-400 rounded-full text-sm font-black flex items-center gap-1">
            🔥 {streak} Streak
          </span>
        )}
      </div>

      {scenario && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="glass-panel p-6 md:p-8 rounded-2xl border border-white/5">
          {/* Scenario Header */}
          <div className="flex items-center gap-3 mb-6">
            <span className={`px-3 py-1 rounded-lg text-xs font-bold border capitalize ${getDifficultyColor(scenario.difficulty)}`}>
              {scenario.difficulty}
            </span>
            <h2 className="text-xl font-black">{scenario.title}</h2>
          </div>

          {/* Scenario Text */}
          <div className="bg-white/5 p-5 rounded-xl border border-white/10 mb-6">
            <p className="text-sm leading-relaxed text-white/90">📧 {scenario.scenario}</p>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <p className="text-sm font-bold text-text-muted uppercase tracking-wider">What would you do?</p>
            {scenario.options?.map((option, idx) => {
              let optionClass = 'bg-white/5 border-white/10 hover:border-primary/30 hover:bg-white/10 cursor-pointer';
              if (result) {
                if (idx === selectedAnswer && result.correct) {
                  optionClass = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
                } else if (idx === selectedAnswer && !result.correct) {
                  optionClass = 'bg-red-500/10 border-red-500/30 text-red-400';
                } else if (option === result.correctAnswer) {
                  optionClass = 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400';
                } else {
                  optionClass = 'bg-white/5 border-white/5 opacity-50';
                }
              }
              
              return (
                <motion.button key={idx}
                  whileHover={!result ? { scale: 1.01 } : {}}
                  onClick={() => submitAnswer(idx)}
                  disabled={result !== null}
                  className={`w-full p-4 rounded-xl border text-left transition-all flex items-center gap-3 ${optionClass}`}>
                  <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm font-bold shrink-0">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="text-sm font-medium">{option}</span>
                  {result && idx === selectedAnswer && (
                    result.correct ? <CheckCircle size={20} className="ml-auto text-emerald-400" /> : <XCircle size={20} className="ml-auto text-red-400" />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Result */}
          <AnimatePresence>
            {result && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className={`mt-6 p-5 rounded-xl border ${result.correct ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                <div className="flex items-center gap-3 mb-3">
                  {result.correct ? (
                    <><CheckCircle size={24} className="text-emerald-400" /><span className="font-black text-emerald-400 text-lg">Correct! 🎉</span></>
                  ) : (
                    <><XCircle size={24} className="text-red-400" /><span className="font-black text-red-400 text-lg">Wrong! 😟</span></>
                  )}
                  <span className="ml-auto text-amber-400 font-bold flex items-center gap-1"><Zap size={16} /> +{result.xpEarned} XP</span>
                </div>
                <p className="text-sm text-text-muted leading-relaxed">{result.explanation}</p>
                
                <button onClick={fetchScenario}
                  className="mt-4 w-full py-3 bg-primary hover:bg-primary/80 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2">
                  <RotateCcw size={18} /> Next Scenario
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
};

export default ScamGame;
