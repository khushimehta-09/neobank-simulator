import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Mail, Lock, CheckCircle, AlertCircle, Loader2, Database, Eye, X, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const LoginPage = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Forgot states
  const [forgotModal, setForgotModal] = useState({ show: false, type: 'password' }); // type: 'password' or 'pin'
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMsg, setForgotMsg] = useState(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  // In-modal Simulated Mailbox States
  const [emails, setEmails] = useState([]);
  const [selectedMail, setSelectedMail] = useState(null);

  // Secure reset states inside login modal
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPin, setNewPin] = useState('');
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyMsg, setApplyMsg] = useState(null);

  const fetchSimulatedMail = async (emailAddr) => {
    if (!emailAddr) return;
    try {
      const res = await api.get(`/auth/simulated-emails?email=${emailAddr}`);
      setEmails(res.data.emails);
    } catch (err) {
      console.error('Failed to fetch simulated emails:', err);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotMsg(null);
    try {
      const res = await api.post('/auth/forgot', { email: forgotEmail, type: forgotModal.type });
      setForgotMsg({ type: 'success', text: res.data.message });
      // Poll simulated mailbox
      fetchSimulatedMail(forgotEmail);
    } catch (err) {
      setForgotMsg({ type: 'error', text: err.response?.data?.error || 'Failed to send request' });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleApplyPasswordReset = async (e) => {
    e.preventDefault();
    setApplyMsg(null);
    if (newPassword !== confirmPassword) {
      return setApplyMsg({ type: 'error', text: 'Passwords do not match.' });
    }

    setApplyLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email: forgotEmail,
        token: 'sandbox-security-token',
        newPassword
      });
      setApplyMsg({ type: 'success', text: 'Password successfully updated! You can now log in.' });
      
      setTimeout(() => {
        setForgotModal({ show: false, type: 'password' });
        setForgotEmail('');
        setForgotMsg(null);
        setSelectedMail(null);
        setShowApplyForm(false);
        setNewPassword('');
        setConfirmPassword('');
        setApplyMsg(null);
      }, 2000);

    } catch (err) {
      setApplyMsg({ type: 'error', text: err.response?.data?.error || 'Failed to update password.' });
    } finally {
      setApplyLoading(false);
    }
  };

  const handleApplyPinReset = async (e) => {
    e.preventDefault();
    setApplyMsg(null);
    if (newPin.length !== 4) {
      return setApplyMsg({ type: 'error', text: 'PIN must be exactly 4 digits.' });
    }

    setApplyLoading(true);
    try {
      await api.post('/auth/reset-pin', {
        email: forgotEmail,
        token: 'sandbox-security-token',
        newPin
      });
      setApplyMsg({ type: 'success', text: 'UPI PIN successfully updated!' });
      
      setTimeout(() => {
        setForgotModal({ show: false, type: 'password' });
        setForgotEmail('');
        setForgotMsg(null);
        setSelectedMail(null);
        setShowApplyForm(false);
        setNewPin('');
        setApplyMsg(null);
      }, 2000);

    } catch (err) {
      setApplyMsg({ type: 'error', text: err.response?.data?.error || 'Failed to update PIN.' });
    } finally {
      setApplyLoading(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      setError('');
      setLoading(true);
      await login(data.email, data.password);
      navigate('/dashboard');
    } catch (err) {
      const apiError = err.response?.data?.error;
      const genericError = err.message === 'Network Error'
        ? 'Network Connection Error. Make sure the backend server is running.'
        : 'Failed to login';
      setError(apiError || genericError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="glow-orb bg-primary w-[400px] h-[400px] top-0 left-0"></div>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md glass-panel p-8 relative z-10"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <span className="font-bold text-white text-sm">N</span>
            </div>
            <span className="text-xl font-bold">Neo<span className="text-primary">Sim</span></span>
          </Link>
          <h2 className="text-2xl font-bold mb-2">Welcome Back</h2>
          <p className="text-muted text-sm">Login to your virtual account</p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="label-text">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
              <input 
                {...register('email', { required: 'Email is required' })}
                type="email" 
                className="input-field pl-10" 
                placeholder="demo@neosim.com"
              />
            </div>
            {errors.email && <p className="text-danger text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="label-text mb-0">Password</label>
              <button 
                type="button" 
                onClick={() => {
                  setForgotModal({ show: true, type: 'password' }); 
                  setForgotMsg(null);
                  setEmails([]);
                  setSelectedMail(null);
                  setShowApplyForm(false);
                }} 
                className="text-xs text-primary hover:underline"
              >
                Forgot?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
              <input 
                {...register('password', { required: 'Password is required' })}
                type="password" 
                className="input-field pl-10" 
                placeholder="••••••••"
              />
            </div>
            {errors.password && <p className="text-danger text-xs mt-1">{errors.password.message}</p>}
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary w-full flex justify-center py-3"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : 'Login'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-muted">
          <p>Demo Admin: admin@neosim.com / Admin@123</p>
          <p className="mt-1">Demo User: demo@neosim.com / Demo@123</p>
          <button 
            type="button" 
            onClick={() => {
              setForgotModal({ show: true, type: 'pin' }); 
              setForgotMsg(null);
              setEmails([]);
              setSelectedMail(null);
              setShowApplyForm(false);
            }} 
            className="mt-4 text-xs text-secondary hover:underline"
          >
            Forgot your UPI PIN?
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-muted">Don't have an account? <Link to="/signup" className="text-primary hover:underline">Sign up</Link></p>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted/50">
          <ShieldCheck size={14} />
          <span>Educational Simulation</span>
        </div>
      </motion.div>

      {/* Forgot Password / PIN Modal with In-App Mailbox */}
      <AnimatePresence>
        {forgotModal.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/90 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-panel p-6 md:p-8 w-full max-w-lg relative space-y-6"
            >
              <button 
                onClick={() => { 
                  setForgotModal({ show: false, type: 'password' }); 
                  setForgotMsg(null); 
                  setSelectedMail(null);
                  setEmails([]);
                  setShowApplyForm(false);
                }} 
                className="absolute top-4 right-4 text-text-muted hover:text-white transition-colors"
              >
                ✕
              </button>

              {!showApplyForm ? (
                <>
                  <h2 className="text-2xl font-bold flex items-center gap-2 text-primary border-b border-white/5 pb-2">
                    <Mail size={22} /> Reset simulated {forgotModal.type === 'pin' ? 'UPI PIN' : 'Password'}
                  </h2>
                  <p className="text-xs text-text-muted">
                    Enter your email address to simulate receiving an encrypted link sent to your registered inbox.
                  </p>

                  <form onSubmit={handleForgot} className="space-y-4 text-left">
                    <div>
                      <label className="block text-xs font-bold text-text-muted mb-2 uppercase">Email Address</label>
                      <input 
                        type="email" 
                        required 
                        value={forgotEmail} 
                        onChange={e => setForgotEmail(e.target.value)} 
                        className="input-field" 
                        placeholder="e.g. demo@neosim.com" 
                      />
                    </div>
                    <button type="submit" disabled={forgotLoading} className="w-full btn-primary py-3 flex items-center justify-center gap-2">
                      {forgotLoading ? <Loader2 className="animate-spin" size={16} /> : <Mail size={16} />}
                      {forgotLoading ? 'Dispatched secure token...' : 'Send Secure Reset Link'}
                    </button>
                  </form>

                  {forgotMsg && (
                    <div className={`p-4 rounded-xl flex items-center gap-3 text-sm border ${forgotMsg.type === 'success' ? 'bg-success/10 border-success/20 text-success' : 'bg-danger/10 border-danger/20 text-danger'}`}>
                      {forgotMsg.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                      <span>{forgotMsg.text}</span>
                    </div>
                  )}

                  {/* 📬 Simulated In-Modal Mailbox drawer */}
                  {emails.length > 0 && (
                    <div className="border-t border-white/5 pt-4 text-left">
                      <p className="text-[10px] text-text-muted uppercase font-black tracking-widest mb-3">📬 Sandbox Incoming Mailbox</p>
                      
                      <div className="bg-surface/50 border border-white/5 p-4 rounded-2xl space-y-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-bold text-sm text-white">{emails[0].subject}</h4>
                            <p className="text-[10px] text-text-muted">From: security@neosim.com • Received just now</p>
                          </div>
                          <span className="text-[9px] bg-primary/20 text-primary font-black px-2 py-0.5 rounded border border-primary/20">NEW</span>
                        </div>

                        <p className="text-xs text-white/80 leading-relaxed">Hi {emails[0].name}, you requested a temporary secure link to modify your account {emails[0].type}.</p>
                        
                        <button
                          onClick={() => {
                            setNewPassword('');
                            setConfirmPassword('');
                            setNewPin('');
                            setApplyMsg(null);
                            setShowApplyForm(true);
                          }}
                          className="btn-primary text-xs py-2.5 px-4 font-bold flex items-center gap-1.5 w-fit"
                        >
                          <Eye size={14} /> Click secure link in email <ArrowRight size={12} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold flex items-center gap-2 text-primary border-b border-white/5 pb-2">
                    <ShieldCheck size={22} /> Enter New Security Credentials
                  </h2>
                  <p className="text-xs text-text-muted">
                    Token authenticated. Complete your password or PIN reset to finalize changes.
                  </p>

                  {forgotModal.type === 'password' ? (
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
                        <label className="block text-xs font-bold text-text-muted mb-2 uppercase">Confirm Password</label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter password"
                          className="input-field text-sm"
                          required
                        />
                      </div>

                      {applyMsg && (
                        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm border ${applyMsg.type === 'success' ? 'bg-success/10 border-success/20 text-success' : 'bg-danger/10 border-danger/20 text-danger'}`}>
                          {applyMsg.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                          <span>{applyMsg.text}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={applyLoading}
                        className="w-full btn-primary py-3.5 font-bold flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
                      >
                        {applyLoading ? <Loader2 className="animate-spin" /> : <Database size={16} />}
                        {applyLoading ? 'Updating credentials...' : 'Save New Password'}
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

                      {applyMsg && (
                        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm border ${applyMsg.type === 'success' ? 'bg-success/10 border-success/20 text-success' : 'bg-danger/10 border-danger/20 text-danger'}`}>
                          {applyMsg.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                          <span>{applyMsg.text}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={applyLoading}
                        className="w-full btn-primary py-3.5 font-bold flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
                      >
                        {applyLoading ? <Loader2 className="animate-spin" /> : <Database size={16} />}
                        {applyLoading ? 'Updating credentials...' : 'Save New UPI PIN'}
                      </button>
                    </form>
                  )}
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LoginPage;
