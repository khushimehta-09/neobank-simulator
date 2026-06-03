import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export default function MoneyAnimator() {
  const [animations, setAnimations] = useState([]);

  useEffect(() => {
    const handleTrigger = (e) => {
      const { amount } = e.detail;
      const id = Date.now() + Math.random();

      // Create a batch of coins/particles
      const newAnim = {
        id,
        amount,
        coins: Array.from({ length: 12 }).map((_, i) => ({
          id: i,
          x: Math.random() * 80 - 40, // spread around center
          y: Math.random() * 80 - 40,
          delay: i * 0.05,
          scale: Math.random() * 0.5 + 0.7,
        }))
      };

      setAnimations((prev) => [...prev, newAnim]);

      // Remove after animation completes
      setTimeout(() => {
        setAnimations((prev) => prev.filter((a) => a.id !== id));
      }, 2500);
    };

    window.addEventListener('animate-money', handleTrigger);
    return () => window.removeEventListener('animate-money', handleTrigger);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[99999] overflow-hidden">
      <AnimatePresence>
        {animations.map((anim) => (
          <div key={anim.id} className="absolute inset-0 flex items-center justify-center">
            {/* Center Announcement Panel */}
            <motion.div
              initial={{ scale: 0.7, opacity: 0, y: 50 }}
              animate={{ 
                scale: [0.7, 1.1, 1], 
                opacity: [0, 1, 1, 0], 
                y: [50, 0, -100] 
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.2, times: [0, 0.15, 0.8, 1], ease: "easeInOut" }}
              className="bg-slate-900/90 border border-success/30 px-8 py-4 rounded-3xl backdrop-blur-xl shadow-[0_0_50px_rgba(46,204,113,0.3)] flex items-center gap-3 text-center"
            >
              <div className="w-10 h-10 bg-success/20 border border-success/30 rounded-2xl flex items-center justify-center text-success">
                <Sparkles size={20} className="animate-pulse" />
              </div>
              <div>
                <p className="text-xs text-text-muted font-bold tracking-widest uppercase">Virtual Credit</p>
                <h4 className="text-2xl font-black text-success tracking-wide">
                  +₹{anim.amount.toLocaleString()}
                </h4>
              </div>
            </motion.div>

            {/* Shower of Floating Gold Coins */}
            {anim.coins.map((coin) => (
              <motion.div
                key={coin.id}
                initial={{ opacity: 0, x: 0, y: 50, scale: 0 }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  x: [0, coin.x * 6, coin.x * 8],
                  y: [50, coin.y * 3 - 150, coin.y * 4 - 300],
                  rotate: [0, Math.random() * 360, Math.random() * 720],
                  scale: coin.scale,
                }}
                transition={{ duration: 1.8, delay: coin.delay, ease: "easeOut" }}
                className="absolute w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-500 via-amber-400 to-yellow-300 border border-amber-200/50 shadow-[0_0_15px_rgba(245,158,11,0.5)] flex items-center justify-center font-black text-amber-950 text-xs shrink-0 select-none"
              >
                ₹
              </motion.div>
            ))}
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
