import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Shield, Lock, Palette, Smartphone, Clock, CheckCircle, AlertCircle, Sparkles, Mail, ArrowRight, Loader2, Key, Database, X, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { formatDateTime, formatTime } from '../utils/time';

const THEMES = [
  { id: 'dark-fintech', name: 'Neo Dark Fintech', className: '', bg: 'bg-[#0B0E14] border-primary', text: 'Neon Blue & Black', color: '#4361EE' },
  { id: 'midnight-gold', name: 'Midnight Gold', className: 'theme-midnight-gold', bg: 'bg-[#0A0A0A] border-[#D4AF37]', text: 'High contrast black and gold', color: '#D4AF37' },
  { id: 'ocean-contrast', name: 'Ocean Contrast', className: 'theme-ocean-contrast', bg: 'bg-[#061826] border-[#38BDF8]', text: 'Deep blue with cyan highlights', color: '#38BDF8' },
  { id: 'sunset-graphite', name: 'Sunset Graphite', className: 'theme-sunset-graphite', bg: 'bg-[#141018] border-[#FB7185]', text: 'Graphite with warm coral contrast', color: '#FB7185' },
  { id: 'royal-slate', name: 'Royal Slate', className: 'theme-royal-slate', bg: 'bg-[#111827] border-[#A78BFA]', text: 'Slate with violet and amber accents', color: '#A78BFA' }
];

const Settings = () => {
  const { user, setUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile'); // profile, security, theme, sessions
  
  // Profile Form States
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [profileDob, setProfileDob] = useState(user?.dob || '');
  const [profileMsg, setProfileMsg] = useState(null);

  // Security Link Trigger States
  const [triggerMsg, setTriggerMsg] = useState(null);
  const [triggerErr, setTriggerErr] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [resetType, setResetType] = useState(''); // password or pin

  // Simulated Mailbox States
  const [emails, setEmails] = useState([]);
  const [selectedMail, setSelectedMail] = useState(null);

  // Secure Link Action Form States
  const [showResetModal, setShowResetModal] = useState(false);
  const [modalType, setModalType] = useState('password'); // password or pin
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPin, setNewPin] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalMsg, setModalMsg] = useState(null);

  // Active theme local storage hook
  const [selectedTheme, setSelectedTheme] = useState(localStorage.getItem('neosim-theme') || 'dark-fintech');

  useEffect(() => {
    if (activeTab === 'security') {
      fetchSimulatedMail();
    }
  }, [activeTab]);

  const fetchSimulatedMail = async () => {
    try {
      const res = await api.get(`/auth/simulated-emails?email=${user.email}`);
      setEmails(res.data.emails);
    } catch (err) {
      console.error('Failed to fetch simulated emails:', err);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileMsg(null);
    try {
      const res = await api.put('/auth/profile', { name: profileName, phone: profilePhone, dob: profileDob });
      setUser(prev => ({ ...prev, ...res.data.user }));
      setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.response?.data?.error || 'Failed to update profile.' });
    }
  };

  const triggerResetLink = async (type) => {
    setSendingEmail(true);
    setResetType(type);
    setTriggerMsg(null);
    setTriggerErr(null);
    try {
      const res = await api.post('/auth/forgot', { email: user.email, type });
      setTriggerMsg(res.data.message || `Reset link has been dispatched to your simulated inbox!`);
      // Refresh mailbox immediately
      setTimeout(() => fetchSimulatedMail(), 500);
    } catch (err) {
      setTriggerErr(err.response?.data?.error || 'Failed to trigger simulated security mail.');
    } finally {
      setSendingEmail(false);
      setResetType('');
    }
  };

  const handleApplyPasswordReset = async (e) => {
    e.preventDefault();
    setModalMsg(null);
    if (newPassword !== confirmPassword) {
      return setModalMsg({ type: 'error', text: 'Passwords do not match.' });
    }

    setModalLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email: user.email,
        token: 'sandbox-security-token',
        newPassword
      });
      setModalMsg({ type: 'success', text: 'Password successfully updated!' });
      
      setTimeout(() => {
        setShowResetModal(false);
        setNewPassword('');
        setConfirmPassword('');
        setModalMsg(null);
        setSelectedMail(null);
        fetchSimulatedMail();
      }, 1500);

    } catch (err) {
      setModalMsg({ type: 'error', text: err.response?.data?.error || 'Failed to update password.' });
    } finally {
      setModalLoading(false);
    }
  };

  const handleApplyPinReset = async (e) => {
    e.preventDefault();
    setModalMsg(null);
    if (newPin.length !== 4) {
      return setModalMsg({ type: 'error', text: 'PIN must be exactly 4 digits.' });
    }

    setModalLoading(true);
    try {
      await api.post('/auth/reset-pin', {
        email: user.email,
        token: 'sandbox-security-token',
        newPin
      });
      setModalMsg({ type: 'success', text: 'UPI / ATM card PIN successfully updated!' });
      
      setTimeout(() => {
        setShowResetModal(false);
        setNewPin('');
        setModalMsg(null);
        setSelectedMail(null);
        fetchSimulatedMail();
      }, 1500);

    } catch (err) {
      setModalMsg({ type: 'error', text: err.response?.data?.error || 'Failed to update PIN.' });
    } finally {
      setModalLoading(false);
    }
  };

  const selectTheme = (themeId) => {
    setSelectedTheme(themeId);
    localStorage.setItem('neosim-theme', themeId);

    const doc = document.documentElement;
    THEMES.forEach(t => {
      if (t.className) doc.classList.remove(t.className);
    });

    const t = THEMES.find(th => th.id === themeId);
    if (t && t.className) {
      doc.classList.add(t.className);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 mt-4 md:mt-8 px-2">
      <header className="text-left mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Settings & Security</h1>
          <p className="text-text-muted">Manage your profile, transaction security parameters, and UI aesthetics.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Navigation Sidebar */}
        <div className="md:col-span-3 space-y-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full text-left px-5 py-4 rounded-xl flex items-center gap-3 transition-colors ${activeTab === 'profile' ? 'bg-primary/10 text-primary font-bold border border-primary/20' : 'text-text-muted hover:bg-white/5 hover:text-white border border-transparent'}`}
          >
            <User size={18} /> Profile Details
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`w-full text-left px-5 py-4 rounded-xl flex items-center gap-3 transition-colors ${activeTab === 'security' ? 'bg-primary/10 text-primary font-bold border border-primary/20' : 'text-text-muted hover:bg-white/5 hover:text-white border border-transparent'}`}
          >
            <Lock size={18} /> Security & PIN Reset
          </button>
          <button
            onClick={() => setActiveTab('theme')}
            className={`w-full text-left px-5 py-4 rounded-xl flex items-center gap-3 transition-colors ${activeTab === 'theme' ? 'bg-primary/10 text-primary font-bold border border-primary/20' : 'text-text-muted hover:bg-white/5 hover:text-white border border-transparent'}`}
          >
            <Palette size={18} /> Premium Themes
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`w-full text-left px-5 py-4 rounded-xl flex items-center gap-3 transition-colors ${activeTab === 'sessions' ? 'bg-primary/10 text-primary font-bold border border-primary/20' : 'text-text-muted hover:bg-white/5 hover:text-white border border-transparent'}`}
          >
            <Smartphone size={18} /> Active Sessions
          </button>
        </div>

        {/* Tab Display Panel */}
        <div className="md:col-span-9">
          <motion.div layout className="glass-panel p-6 md:p-8">
            {activeTab === 'profile' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <h2 className="text-xl font-bold border-b border-white/5 pb-3 flex items-center gap-2">
                  <User size={20} className="text-primary" /> Profile Settings
                </h2>

                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-text-muted mb-2 uppercase tracking-wide">Full Name</label>
                      <input type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)} className="input-field" required />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-text-muted mb-2 uppercase tracking-wide">Email Address (Read-only)</label>
                      <input type="email" value={user?.email || ''} className="input-field opacity-50 cursor-not-allowed" readOnly disabled />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-text-muted mb-2 uppercase tracking-wide">Mobile Number</label>
                      <input type="tel" value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} className="input-field" placeholder="e.g. +91 9999999999" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-text-muted mb-2 uppercase tracking-wide">Date of Birth</label>
                      <input type="date" value={profileDob} onChange={(e) => setProfileDob(e.target.value)} className="input-field text-white/50" />
                    </div>
                  </div>

                  {profileMsg && (
                    <div className={`p-4 rounded-xl flex items-center gap-3 text-sm border ${profileMsg.type === 'success' ? 'bg-success/10 border-success/20 text-success' : 'bg-danger/10 border-danger/20 text-danger'}`}>
                      {profileMsg.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                      <span>{profileMsg.text}</span>
                    </div>
                  )}

                  <button type="submit" className="btn-primary font-bold">Save Profile Modifications</button>
                </form>
              </motion.div>
            )}

            {activeTab === 'security' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                <div>
                  <h2 className="text-xl font-bold border-b border-white/5 pb-3 flex items-center gap-2">
                    <Shield size={20} className="text-primary" /> Bank-Grade Security Management
                  </h2>
                  <p className="text-sm text-text-muted mt-2">
                    To comply with strict simulated regulatory policies, **account passwords and UPI/ATM card PINs cannot be changed directly via forms.** 
                    You must request a secure encrypted reset token link sent to your registered sandbox email.
                  </p>
                </div>

                {/* Secure trigger options */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between space-y-4">
                    <div>
                      <h3 className="font-bold text-white flex items-center gap-2"><Lock size={16} className="text-primary" /> Reset Account Password</h3>
                      <p className="text-xs text-text-muted mt-1 leading-relaxed">Dispatches a temporary encrypted password reset link to your sandbox email inbox.</p>
                    </div>
                    <button
                      onClick={() => triggerResetLink('password')}
                      disabled={sendingEmail}
                      className="w-full btn-primary text-xs py-3 flex items-center justify-center gap-2"
                    >
                      {sendingEmail && resetType === 'password' ? <Loader2 className="animate-spin" size={14} /> : <Mail size={14} />}
                      Request Password Reset Email
                    </button>
                  </div>

                  <div className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between space-y-4">
                    <div>
                      <h3 className="font-bold text-white flex items-center gap-2"><Key size={16} className="text-primary" /> Reset UPI / ATM PIN</h3>
                      <p className="text-xs text-text-muted mt-1 leading-relaxed">Dispatches a secure 4-digit transaction card security update token to your sandbox inbox.</p>
                    </div>
                    <button
                      onClick={() => triggerResetLink('pin')}
                      disabled={sendingEmail}
                      className="w-full btn-primary text-xs py-3 flex items-center justify-center gap-2"
                    >
                      {sendingEmail && resetType === 'pin' ? <Loader2 className="animate-spin" size={14} /> : <Mail size={14} />}
                      Request UPI PIN Reset Email
                    </button>
                  </div>
                </div>

                {triggerMsg && (
                  <div className="p-4 bg-success/10 border border-success/20 rounded-xl flex items-center gap-3 text-success text-sm">
                    <CheckCircle size={18} />
                    <span>{triggerMsg}</span>
                  </div>
                )}
                {triggerErr && (
                  <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl flex items-center gap-3 text-danger text-sm">
                    <AlertCircle size={18} />
                    <span>{triggerErr}</span>
                  </div>
                )}

                {/* 📬 Simulated Sandbox Mailbox Drawer */}
                <div className="border-t border-white/5 pt-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-white">
                    <Mail className="text-primary animate-bounce" size={20} /> 📬 My Sandbox Email Client ({user.email})
                  </h3>
                  
                  <div className="grid md:grid-cols-12 gap-4">
                    {/* Mailbox List */}
                    <div className="md:col-span-5 bg-surface/50 rounded-2xl border border-white/5 p-3 h-[250px] overflow-y-auto space-y-2">
                      <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider mb-2">Inbox Messages</p>
                      {emails.length === 0 ? (
                        <div className="h-[180px] flex items-center justify-center text-xs text-text-muted italic">Mailbox is empty. Request a reset above.</div>
                      ) : (
                        emails.map(mail => (
                          <button
                            key={mail.id}
                            onClick={() => setSelectedMail(mail)}
                            className={`w-full text-left p-3 rounded-xl border transition-all text-xs flex flex-col gap-1 ${selectedMail?.id === mail.id ? 'bg-primary/20 border-primary text-white font-bold' : 'bg-surface hover:bg-white/5 border-white/5 text-text-muted hover:text-white'}`}
                          >
                            <span className="font-bold flex justify-between w-full">
                              <span>{mail.subject}</span>
                              <span className="text-[9px] text-text-muted">{formatTime(mail.timestamp)}</span>
                            </span>
                            <span className="text-[10px] text-text-muted">From: security@neosim.com</span>
                          </button>
                        ))
                      )}
                    </div>

                    {/* Mailbox Reader Panel */}
                    <div className="md:col-span-7 bg-surface/80 rounded-2xl border border-white/5 p-5 h-[250px] flex flex-col justify-between text-left">
                      {selectedMail ? (
                        <div className="flex flex-col justify-between h-full">
                          <div className="space-y-2">
                            <h4 className="font-bold text-white text-sm border-b border-white/5 pb-2">{selectedMail.subject}</h4>
                            <p className="text-[10px] text-text-muted">Sender: security@neosim.com • Received: {formatDateTime(selectedMail.timestamp)}</p>
                            <p className="text-xs text-white/90 leading-relaxed pt-2">Hi {selectedMail.name || 'User'}, you generated a simulated request to reset your {selectedMail.type.toUpperCase()}.</p>
                          </div>
                          
                          <button
                            onClick={() => {
                              setModalType(selectedMail.type);
                              setShowResetModal(true);
                              setModalMsg(null);
                            }}
                            className="btn-primary text-xs py-2.5 px-4 font-bold flex items-center gap-1.5 w-fit"
                          >
                            <Eye size={14} /> Open Verification Reset Link <ArrowRight size={12} />
                          </button>
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center text-xs text-text-muted italic">Select an email to view encrypted reset token.</div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'theme' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <h2 className="text-xl font-bold border-b border-white/5 pb-3 flex items-center gap-2">
                  <Palette size={20} className="text-primary" /> App Skin Themes
                </h2>
                <p className="text-sm text-text-muted">
                  Choose an aesthetic theme. The design changes colors, gradients, and shadows dynamically instantly across all screens.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                  {THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => selectTheme(theme.id)}
                      className={`p-6 rounded-2xl border text-left flex flex-col justify-between h-[150px] relative transition-all ${theme.bg} ${selectedTheme === theme.id ? 'border-2 scale-100 shadow-[0_0_20px_var(--primary-glow)]' : 'opacity-75 hover:opacity-100 border-white/10 hover:border-white/20'}`}
                    >
                      <div>
                        <h3 className={`font-black text-lg ${'text-white'}`}>{theme.name}</h3>
                        <p className={`text-xs mt-1 ${'text-text-muted'}`}>{theme.text}</p>
                      </div>
                      
                      {selectedTheme === theme.id && (
                        <span className="absolute top-4 right-4 bg-primary text-white p-1 rounded-full text-xs">
                          <CheckCircle size={16} />
                        </span>
                      )}

                      <div className="flex gap-1.5 mt-4">
                        <span className="w-5 h-5 rounded-full inline-block" style={{ backgroundColor: theme.color }}></span>
                        <span className="w-5 h-5 rounded-full inline-block bg-success"></span>
                        <span className="w-5 h-5 rounded-full inline-block bg-danger"></span>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'sessions' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <h2 className="text-xl font-bold border-b border-white/5 pb-3 flex items-center gap-2">
                  <Smartphone size={20} className="text-primary" /> Session Trace Log
                </h2>
                <p className="text-sm text-text-muted">
                  Active connection points simulated for your NeoBank profile. Security best practice requires tracing unusual connections.
                </p>

                <div className="space-y-4 mt-6">
                  <div className="bg-surface-solid border border-white/10 p-4 rounded-xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center text-primary"><Smartphone size={20} /></div>
                      <div>
                        <h4 className="font-bold text-white text-sm">Chrome browser on Windows OS</h4>
                        <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1"><Clock size={12} /> Logged in: May 19, 2026 14:18</p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-success/20 text-success font-black px-2 py-0.5 rounded border border-success/15 uppercase tracking-wider">Current Node</span>
                  </div>

                  <div className="bg-surface-solid border border-white/10 p-4 rounded-xl flex items-center justify-between gap-4 opacity-60">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-surface/50 rounded-lg flex items-center justify-center text-text-muted"><Smartphone size={20} /></div>
                      <div>
                        <h4 className="font-bold text-white text-sm">Safari on Apple iPhone 15</h4>
                        <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1"><Clock size={12} /> Logged in: May 17, 2026 08:31</p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-white/5 text-text-muted font-bold px-2 py-0.5 rounded border border-white/10 uppercase tracking-wider">Expired</span>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Verification Reset Token Modal Form */}
      <AnimatePresence>
        {showResetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-panel p-6 md:p-8 max-w-md w-full relative space-y-6"
            >
              <button
                onClick={() => setShowResetModal(false)}
                className="absolute top-4 right-4 text-text-muted hover:text-white transition-colors"
              >
                <X size={20} />
              </button>

              <h2 className="text-xl font-bold flex items-center gap-2 text-primary border-b border-white/5 pb-3">
                <Shield size={22} /> {modalType === 'password' ? 'Reset Secure Password' : 'Reset Simulated UPI PIN'}
              </h2>

              <p className="text-xs text-text-muted">
                Encrypted token authenticated from link request. Enter your new security credentials below.
              </p>

              {modalType === 'password' ? (
                <form onSubmit={handleApplyPasswordReset} className="space-y-4 text-left">
                  <div>
                    <label className="block text-xs font-bold text-text-muted mb-2 uppercase">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="input-field text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-muted mb-2 uppercase">Verify Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="input-field text-sm"
                      required
                    />
                  </div>

                  {modalMsg && (
                    <div className={`p-4 rounded-xl flex items-center gap-3 text-sm border ${modalMsg.type === 'success' ? 'bg-success/10 border-success/20 text-success' : 'bg-danger/10 border-danger/20 text-danger'}`}>
                      {modalMsg.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                      <span>{modalMsg.text}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={modalLoading}
                    className="w-full btn-primary py-3.5 font-bold flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
                  >
                    {modalLoading ? <Loader2 className="animate-spin" /> : <Database size={16} />}
                    {modalLoading ? 'Applying Password Update...' : 'Save New Password'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleApplyPinReset} className="space-y-4 text-left">
                  <div>
                    <label className="block text-xs font-bold text-text-muted mb-2 uppercase">New 4-Digit UPI PIN</label>
                    <input
                      type="password"
                      maxLength={4}
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value)}
                      placeholder="e.g. 1234"
                      className="input-field text-center font-mono text-xl py-3"
                      required
                    />
                  </div>

                  {modalMsg && (
                    <div className={`p-4 rounded-xl flex items-center gap-3 text-sm border ${modalMsg.type === 'success' ? 'bg-success/10 border-success/20 text-success' : 'bg-danger/10 border-danger/20 text-danger'}`}>
                      {modalMsg.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                      <span>{modalMsg.text}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={modalLoading}
                    className="w-full btn-primary py-3.5 font-bold flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
                  >
                    {modalLoading ? <Loader2 className="animate-spin" /> : <Database size={16} />}
                    {modalLoading ? 'Applying PIN Update...' : 'Save New UPI PIN'}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Settings;
