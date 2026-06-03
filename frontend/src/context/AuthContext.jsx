import React, { createContext, useContext, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertTriangle, ShieldCheck, Sparkles, X } from 'lucide-react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alertConfig, setAlertConfig] = useState(null); // { message, title, type }

  const refreshUser = async () => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const res = await api.get('/auth/me');
    setUser(res.data.user);
    return res.data.user;
  };

  useEffect(() => {
    const onBalance = (event) => {
      const balance = Number(event.detail?.balance);
      if (!Number.isNaN(balance)) {
        setUser(prev => prev ? ({ ...prev, balance }) : prev);
      }
    };
    window.addEventListener('neosim-balance-update', onBalance);
    return () => window.removeEventListener('neosim-balance-update', onBalance);
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          await refreshUser();
        } catch (error) {
          console.error("Failed to fetch user", error);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    fetchUser();
  }, []);

  // Intercept window.alert
  useEffect(() => {
    const handleCustomAlert = (message) => {
      // Determine type based on keywords
      const msg = String(message).toLowerCase();
      let type = 'info';
      if (msg.includes('success') || msg.includes('claimed') || msg.includes('earned') || msg.includes('added') || msg.includes('paid')) {
        type = 'success';
      } else if (msg.includes('decline') || msg.includes('failed') || msg.includes('error') || msg.includes('incorrect') || msg.includes('insufficient') || msg.includes('already')) {
        type = 'warning';
      }

      setAlertConfig({
        title: 'NeoBank says',
        message: String(message),
        type
      });
    };

    window.alert = handleCustomAlert;
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const signup = async (data) => {
    const res = await api.post('/auth/signup', data);
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    window.location.href = '/login';
  };

  const updateBalance = (newBalance) => {
    setUser(prev => ({ ...prev, balance: newBalance }));
  };

  // Helper sound effect
  const playBeep = (freq = 600, duration = 0.08) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, setUser, updateBalance, refreshUser }}>
      {children}

      {/* Global Custom Alert Dialog */}
      <AnimatePresence>
        {alertConfig && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="glass-panel max-w-sm w-full p-6 border-white/10 relative overflow-hidden bg-gradient-to-b from-slate-900/90 to-background shadow-2xl text-center rounded-3xl"
            >
              {/* Top border highlight based on alert type */}
              <div className={`absolute top-0 inset-x-0 h-1.5 ${
                alertConfig.type === 'success' ? 'bg-success' : alertConfig.type === 'warning' ? 'bg-warning' : 'bg-primary'
              }`} />

              {/* Decorative radial lighting */}
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-primary/10 rounded-full blur-[60px] pointer-events-none"></div>

              {/* Header Icon */}
              <div className="relative mx-auto w-16 h-16 mb-4 flex items-center justify-center rounded-2xl shadow-inner">
                {alertConfig.type === 'success' ? (
                  <div className="absolute inset-0 bg-success/10 border border-success/20 rounded-2xl flex items-center justify-center text-success">
                    <CheckCircle size={28} className="animate-[pulse_1.5s_infinite]" />
                  </div>
                ) : alertConfig.type === 'warning' ? (
                  <div className="absolute inset-0 bg-warning/10 border border-warning/20 rounded-2xl flex items-center justify-center text-warning">
                    <AlertTriangle size={28} className="animate-[bounce_1.5s_infinite]" />
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center text-primary">
                    <ShieldCheck size={28} />
                  </div>
                )}
              </div>

              {/* Title & Body */}
              <h3 className="font-extrabold text-xl text-white tracking-wide mb-2">
                {alertConfig.title}
              </h3>
              <p className="text-sm text-text-muted leading-relaxed font-semibold mb-6 px-2">
                {alertConfig.message}
              </p>

              {/* Acknowledge Button */}
              <button
                onClick={() => {
                  playBeep(450, 0.05);
                  setAlertConfig(null);
                }}
                className={`w-full py-3.5 px-6 font-extrabold text-sm rounded-2xl tracking-wider transition-all uppercase shadow-lg ${
                  alertConfig.type === 'success'
                    ? 'bg-success text-black hover:opacity-90 shadow-success/10'
                    : alertConfig.type === 'warning'
                    ? 'bg-warning text-black hover:opacity-90 shadow-warning/10'
                    : 'btn-primary shadow-primary/20'
                }`}
              >
                OK
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
