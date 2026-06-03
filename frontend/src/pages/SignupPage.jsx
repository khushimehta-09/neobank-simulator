import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { ShieldCheck, User, Mail, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const SignupPage = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    try {
      setError('');
      setLoading(true);
      await signup(data);
      navigate('/dashboard');
    } catch (err) {
      const apiError = err.response?.data?.error;
      const genericError = err.message === 'Network Error'
        ? 'Network Connection Error. Make sure the backend server is running.'
        : 'Failed to create account';
      setError(apiError || genericError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="glow-orb bg-secondary w-[400px] h-[400px] top-0 right-0"></div>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md glass-panel p-8 relative z-10 my-8"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <span className="font-bold text-white text-sm">N</span>
            </div>
            <span className="text-xl font-bold">Neo<span className="text-primary">Sim</span></span>
          </Link>
          <h2 className="text-2xl font-bold mb-2">Create Virtual Account</h2>
          <p className="text-muted text-sm">Start your safe banking simulation</p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label-text">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
              <input 
                {...register('name', { required: 'Name is required' })}
                type="text" 
                className="input-field pl-10" 
                placeholder="John Doe"
              />
            </div>
            {errors.name && <p className="text-danger text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="label-text">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
              <input 
                {...register('email', { 
                  required: 'Email is required',
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' }
                })}
                type="email" 
                className="input-field pl-10" 
                placeholder="john@example.com"
              />
            </div>
            {errors.email && <p className="text-danger text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="label-text">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
              <input 
                {...register('password', { 
                  required: 'Password is required',
                  minLength: { value: 6, message: 'Min 6 characters' }
                })}
                type="password" 
                className="input-field pl-10" 
                placeholder="Create a strong password"
              />
            </div>
            {errors.password && <p className="text-danger text-xs mt-1">{errors.password.message}</p>}
          </div>

          <div>
            <label className="label-text">4-Digit UPI PIN</label>
            <div className="relative">
              <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
              <input 
                {...register('upiPin', { 
                  required: 'UPI PIN is required',
                  pattern: { value: /^[0-9]{4}$/, message: 'Must be exactly 4 digits' }
                })}
                type="password" 
                maxLength="4"
                className="input-field pl-10 tracking-[0.5em] font-mono text-center" 
                placeholder="••••"
              />
            </div>
            <p className="text-xs text-text-muted mt-1 text-center">Required for secure simulated transfers</p>
            {errors.upiPin && <p className="text-danger text-xs mt-1 text-center">{errors.upiPin.message}</p>}
          </div>

          <div className="pt-2">
            <button 
              type="submit" 
              disabled={loading}
              className="btn-primary w-full flex justify-center py-3"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : 'Open Account (Free)'}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-muted">Already have an account? <Link to="/login" className="text-primary hover:underline">Login</Link></p>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted/50 text-center">
          <ShieldCheck size={14} className="shrink-0" />
          <span>No real money or KYC required. Education only.</span>
        </div>
      </motion.div>
    </div>
  );
};

export default SignupPage;
