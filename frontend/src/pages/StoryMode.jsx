import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gamepad2,
  ShieldAlert,
  Award,
  Smile,
  Sparkles,
  Heart,
  RefreshCw,
  TrendingDown,
  CheckCircle2,
  ChevronRight,
  UserCheck,
  AlertTriangle,
  Coins,
  ShieldCheck,
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const StoryMode = () => {
  const { user, updateBalance } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(1);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [savings, setSavings] = useState(0);
  const [stress, setStress] = useState(30);
  const [lifestyle, setLifestyle] = useState(50);
  const [log, setLog] = useState([]);
  const [gameOver, setGameOver] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [selectedScenarios, setSelectedScenarios] = useState({});

  const playSound = (type) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "click") {
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      } else if (type === "allowance") {
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === "damage") {
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else if (type === "win") {
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2);
        osc.frequency.setValueAtTime(1046.5, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      }
    } catch (e) {
      console.warn("Audio Context blocked", e);
    }
  };

  // ============================================================
  // EXPANDED SCENARIO POOL — 6 events per month (3 picked at random)
  // ============================================================
  const scenarioPool = {
    1: [
      {
        title: "Broken Laptop Charger",
        icon: "🔌",
        description:
          "Your laptop charger sparkled and died. Midterms are next week. What do you do?",
        choices: [
          {
            text: "Buy original brand charger (₹2,500)",
            consequence: "Safe, original gear. Peace of mind.",
            effect: { savings: -2500, stress: -10, lifestyle: +5 },
            ledger: {
              amount: 2500,
              category: "education",
              description: "Story Mode: Original Laptop Charger",
            },
          },
          {
            text: "Buy cheap duplicate from local market (₹800)",
            consequence:
              "Saved cash, but it runs extremely hot and might damage your battery.",
            effect: { savings: -800, stress: +20, lifestyle: -5 },
            ledger: {
              amount: 800,
              category: "shopping",
              description: "Story Mode: Duplicate Charger",
            },
          },
        ],
      },
      {
        title: "CG Road Cafe Invite",
        icon: "☕",
        description:
          "Your friends are going to a trendy new cafe on CG Road. A standard bill is around ₹1,200.",
        choices: [
          {
            text: "Go and enjoy the fancy brunch (₹1,200)",
            consequence:
              "Had great food and updated your Instagram, but your wallet hurts.",
            effect: { savings: -1200, stress: -20, lifestyle: +25 },
            ledger: {
              amount: 1200,
              category: "food",
              description: "Story Mode: Cafe Brunch CG Road",
            },
          },
          {
            text: "Stay in and make hostel Maggi (₹100)",
            consequence:
              "Your savings are intact, but you felt severe FOMO watching their posts.",
            effect: { savings: -100, stress: +15, lifestyle: -10 },
            ledger: {
              amount: 100,
              category: "food",
              description: "Story Mode: Hostel Maggi dinner",
            },
          },
        ],
      },
      {
        title: "Phishing Refund SMS",
        icon: "📱",
        description:
          "You receive an SMS: 'Your Ahmedabad University hostel refund of ₹3,000 is ready. Click neosimbank-refund.in to claim now.'",
        choices: [
          {
            text: "Click link and enter credentials",
            consequence:
              "Scam! They drained ₹1,500 from your active budget and exposed your details.",
            effect: { savings: -1500, stress: +35, lifestyle: -15 },
            ledger: {
              amount: 1500,
              category: "other",
              description: "Story Mode: Phishing Refund Scam Loss",
            },
          },
          {
            text: "Ignore the link and report it",
            consequence:
              "Smart! You recognized the suspicious domain. (+50 XP bonus for security)",
            effect: { savings: 0, stress: -5, lifestyle: +10 },
            xpReward: 50,
            ledger: null,
          },
        ],
      },
      {
        title: "Hostel Mess vs Dhaba",
        icon: "🍱",
        description:
          "The hostel mess food is boring. A nearby dhaba serves tasty thali for ₹80/meal. You eat 2 meals a day.",
        choices: [
          {
            text: "Eat at dhaba every day (₹4,800/month extra)",
            consequence:
              "Great food variety but you burned through a big chunk of allowance.",
            effect: { savings: -2800, stress: -10, lifestyle: +20 },
            ledger: {
              amount: 2800,
              category: "food",
              description: "Story Mode: Daily Dhaba Meals",
            },
          },
          {
            text: "Stick to hostel mess (₹500 monthly plan)",
            consequence:
              "Saved money, but daily rajma-chawal starts feeling very monotonous.",
            effect: { savings: -500, stress: +10, lifestyle: -10 },
            ledger: {
              amount: 500,
              category: "food",
              description: "Story Mode: Hostel Mess Monthly",
            },
          },
        ],
      },
      {
        title: "SIM Card or College WiFi",
        icon: "📶",
        description:
          "Your mobile plan is exhausted. You need internet for studies. College provides free WiFi but you hate going to the lab.",
        choices: [
          {
            text: "Buy 3GB/day 4G data plan (₹699/month)",
            consequence:
              "Convenience at your fingertips! But a noticeable dip in savings.",
            effect: { savings: -699, stress: -5, lifestyle: +10 },
            ledger: {
              amount: 699,
              category: "bills",
              description: "Story Mode: 4G Mobile Data Plan",
            },
          },
          {
            text: "Use free college WiFi only (₹0)",
            consequence:
              "You save money, but trekking to the lab in the evening heat is annoying.",
            effect: { savings: 0, stress: +15, lifestyle: -5 },
            ledger: null,
          },
        ],
      },
      {
        title: "Night Canteen Splurge",
        icon: "🌙",
        description:
          "It's 11PM. Your friends want to go to the all-night canteen and order maggi, sandwiches, and cold coffee (₹350 each).",
        choices: [
          {
            text: "Order everything and enjoy the night (₹350)",
            consequence:
              "Laughter and late night food. Core college memory made!",
            effect: { savings: -350, stress: -15, lifestyle: +15 },
            ledger: {
              amount: 350,
              category: "food",
              description: "Story Mode: Night Canteen Splurge",
            },
          },
          {
            text: "Order just a plain maggi (₹60)",
            consequence:
              "Kept it minimal. Saved money but felt slightly left out of the fun.",
            effect: { savings: -60, stress: +5, lifestyle: -5 },
            ledger: {
              amount: 60,
              category: "food",
              description: "Story Mode: Night Canteen Maggi Only",
            },
          },
        ],
      },
    ],
    2: [
      {
        title: "Engineering Mathematics Textbooks",
        icon: "📚",
        description:
          "A new math syllabus requires 3 heavy textbooks. Do you buy them new or find an alternative?",
        choices: [
          {
            text: "Buy shiny new textbooks (₹1,800)",
            consequence:
              "Fully prepared for exams, but a major chunk of your allowance is gone.",
            effect: { savings: -1800, stress: -15, lifestyle: +5 },
            ledger: {
              amount: 1800,
              category: "education",
              description: "Story Mode: Mathematics Textbooks",
            },
          },
          {
            text: "Borrow from library & senior notes",
            consequence:
              "Spent nothing, though you have to study from messy hand-written sheets.",
            effect: { savings: 0, stress: +10, lifestyle: -5 },
            ledger: null,
          },
        ],
      },
      {
        title: "Gym Membership vs Park Runs",
        icon: "💪",
        description:
          "You want to get fit. There is a neon-lit gym offering a student discount, or the Sabarmati Riverfront park.",
        choices: [
          {
            text: "Join Premium Gym (₹3,000/quarter)",
            consequence:
              "Great steam rooms and visual appeal, but very expensive for a student.",
            effect: { savings: -3000, stress: -20, lifestyle: +20 },
            ledger: {
              amount: 3000,
              category: "healthcare",
              description: "Story Mode: Gym Membership",
            },
          },
          {
            text: "Run at Riverfront park (Free)",
            consequence:
              "Fresh morning air, zero cost, and a highly satisfying nature-vibe.",
            effect: { savings: 0, stress: -10, lifestyle: +5 },
            ledger: null,
          },
        ],
      },
      {
        title: "Quick-Credit Loan App Alert",
        icon: "🚨",
        description:
          "An ad on your feed promises: 'Instant ₹2,000 loan! No salary proof required. Re-pay ₹2,500 in 7 days.' You want to buy a new headset.",
        choices: [
          {
            text: "Take the instant loan",
            consequence:
              "Dangerous choice! Hidden processing fees and harassing calls drive your stress through the roof.",
            effect: { savings: -2500, stress: +40, lifestyle: +10 },
            ledger: {
              amount: 2500,
              category: "shopping",
              description: "Story Mode: Payday Loan Repayment",
            },
          },
          {
            text: "Decline and wait to save up",
            consequence:
              "Excellent financial safety. You avoided a predatory debt trap! (+50 XP)",
            effect: { savings: 0, stress: -5, lifestyle: +10 },
            xpReward: 50,
            ledger: null,
          },
        ],
      },
      {
        title: "Group Project Pizza Night",
        icon: "🍕",
        description:
          "Your group project submission is in 2 days. Everyone wants to order pizza while you code through the night.",
        choices: [
          {
            text: "Order pizza together (₹450 split)",
            consequence:
              "Cheesy joy and team bonding made the all-nighter enjoyable.",
            effect: { savings: -450, stress: -15, lifestyle: +15 },
            ledger: {
              amount: 450,
              category: "food",
              description: "Story Mode: Group Project Pizza",
            },
          },
          {
            text: "Eat biscuits from your room (₹50)",
            consequence:
              "Saved money, but the team gave you the 'cheapskate' look.",
            effect: { savings: -50, stress: +10, lifestyle: -10 },
            ledger: {
              amount: 50,
              category: "food",
              description: "Story Mode: Room Biscuits",
            },
          },
        ],
      },
      {
        title: "Udemy Flash Sale",
        icon: "🎓",
        description:
          "Udemy is running a 95% off sale. A Python Bootcamp + ML course bundle is available for ₹499 (original ₹9,000).",
        choices: [
          {
            text: "Buy both courses (₹499)",
            consequence:
              "Great investment in skills! You learn at your own pace on weekends.",
            effect: { savings: -499, stress: -5, lifestyle: +10 },
            ledger: {
              amount: 499,
              category: "education",
              description: "Story Mode: Udemy Python & ML Course",
            },
          },
          {
            text: "Watch free YouTube tutorials (₹0)",
            consequence:
              "Free and decent quality, but scattered content made consistency hard.",
            effect: { savings: 0, stress: +5, lifestyle: 0 },
            ledger: null,
          },
        ],
      },
      {
        title: "Friend Needs a Loan",
        icon: "🤝",
        description:
          "Your close friend is short ₹1,000 before his parents send money next week. He promises to return it.",
        choices: [
          {
            text: "Lend him ₹1,000 (might not return fully)",
            consequence:
              "Helped a friend in need. He returned ₹800 but you're still ₹200 short.",
            effect: { savings: -200, stress: +10, lifestyle: +5 },
            ledger: {
              amount: 200,
              category: "other",
              description: "Story Mode: Friend Loan Loss",
            },
          },
          {
            text: "Politely decline (protect your budget)",
            consequence: "Smart financial boundary. Savings stayed intact.",
            effect: { savings: 0, stress: +5, lifestyle: -5 },
            ledger: null,
          },
        ],
      },
    ],
    3: [
      {
        title: "Daily Commute Choices",
        icon: "🛵",
        description:
          "The heat is rising in Ahmedabad. How do you plan to commute to campus this month?",
        choices: [
          {
            text: "Rent a smart electric scooter (₹2,200)",
            consequence:
              "Arrived cool, sweat-free and in style. Very comfortable lifestyle.",
            effect: { savings: -2200, stress: -15, lifestyle: +15 },
            ledger: {
              amount: 2200,
              category: "travel",
              description: "Story Mode: Electric Scooter Rental",
            },
          },
          {
            text: "Ride the Ahmedabad BRTS bus (₹400)",
            consequence:
              "Super cheap, but wait times under the hot sun increase your stress.",
            effect: { savings: -400, stress: +15, lifestyle: -10 },
            ledger: {
              amount: 400,
              category: "travel",
              description: "Story Mode: BRTS Bus Passes",
            },
          },
        ],
      },
      {
        title: "Part-time Online Tutoring Gig",
        icon: "💻",
        description:
          "You got offered a part-time job tutoring school kids in programming. It pays ₹3,000 but takes 8 hours/week.",
        choices: [
          {
            text: "Accept job (+₹3,000 income)",
            consequence:
              "Extra spending cash! However, grading assignments at night increases fatigue.",
            effect: { savings: +3000, stress: +20, lifestyle: -5 },
            ledger: {
              amount: 3000,
              type: "credit",
              category: "general",
              description: "Story Mode: Tutoring Income",
            },
          },
          {
            text: "Decline & focus on studies",
            consequence:
              "Had plenty of time to sleep and chill, though you have no extra cash.",
            effect: { savings: 0, stress: -15, lifestyle: +10 },
            ledger: null,
          },
        ],
      },
      {
        title: "Cracked Mobile Screen",
        icon: "🔨",
        description:
          "Your phone slipped and the screen is completely shattered. Reading notes is painful.",
        choices: [
          {
            text: "Repair screen originally (₹3,500)",
            consequence:
              "Perfect repair, but almost half your monthly allowance is gone.",
            effect: { savings: -3500, stress: -20, lifestyle: +10 },
            ledger: {
              amount: 3500,
              category: "shopping",
              description: "Story Mode: Original Screen Repair",
            },
          },
          {
            text: "Live with the cracks (₹0)",
            consequence:
              "Screen glass pricks your thumb occasionally. Highly stressful.",
            effect: { savings: 0, stress: +25, lifestyle: -20 },
            ledger: null,
          },
        ],
      },
      {
        title: "Navratri Ethnic Wear",
        icon: "🎪",
        description:
          "It's Navratri! Garba venues require new clothes. Everyone is buying ethnic wear. A nice chaniya-choli costs ₹1,200.",
        choices: [
          {
            text: "Buy new ethnic outfit (₹1,200)",
            consequence:
              "You looked stunning! Danced all 9 nights and made amazing memories.",
            effect: { savings: -1200, stress: -20, lifestyle: +25 },
            ledger: {
              amount: 1200,
              category: "shopping",
              description: "Story Mode: Navratri Ethnic Wear",
            },
          },
          {
            text: "Borrow from hostel mate (₹0)",
            consequence:
              "Wore your roommate's outfit. Felt good but slightly self-conscious.",
            effect: { savings: 0, stress: +5, lifestyle: +5 },
            ledger: null,
          },
        ],
      },
      {
        title: "Bicycle Commute Investment",
        icon: "🚲",
        description:
          "A second-hand bicycle is available for ₹1,500. It can save you ₹400/month in rickshaw fares. Should you buy it?",
        choices: [
          {
            text: "Buy the used bicycle (₹1,500 one-time)",
            consequence:
              "Great long-term decision! Break-even in 4 months and get fit too.",
            effect: { savings: -1500, stress: -5, lifestyle: +15 },
            ledger: {
              amount: 1500,
              category: "travel",
              description: "Story Mode: Second-hand Bicycle",
            },
          },
          {
            text: "Keep using rickshaws (₹500 this month)",
            consequence:
              "Comfortable but you spent ₹500 this month on autos with no long-term saving.",
            effect: { savings: -500, stress: +5, lifestyle: 0 },
            ledger: {
              amount: 500,
              category: "travel",
              description: "Story Mode: Auto-rickshaw Commutes",
            },
          },
        ],
      },
      {
        title: "Midnight Chai-Wala Ritual",
        icon: "🍵",
        description:
          "A mobile chai-wala comes to your floor every night selling chai and chips. You've been buying daily (₹40/day = ₹1,200/month).",
        choices: [
          {
            text: "Continue the daily chai ritual (₹1,200/month)",
            consequence:
              "Warm chai fuels your late-night study sessions. Well worth it for focus.",
            effect: { savings: -1200, stress: -10, lifestyle: +10 },
            ledger: {
              amount: 1200,
              category: "food",
              description: "Story Mode: Nightly Chai Wala",
            },
          },
          {
            text: "Make your own chai in common kitchen (₹200)",
            consequence:
              "Saved ₹1,000 and discovered a love for brewing your own chai.",
            effect: { savings: -200, stress: 0, lifestyle: +5 },
            ledger: {
              amount: 200,
              category: "food",
              description: "Story Mode: DIY Kitchen Chai",
            },
          },
        ],
      },
    ],
    4: [
      {
        title: "Whatsapp 'Spin & Win' Link",
        icon: "🎰",
        description:
          "Your class group shares a link: 'Flipkart 30th Anniversary! Spin the wheel to win iPhone 15. Pay ₹300 delivery fee immediately.'",
        choices: [
          {
            text: "Pay the small delivery fee (₹300)",
            consequence:
              "SCAM! You lost your ₹300, got no phone, and your card details got exposed to scammers.",
            effect: { savings: -300, stress: +15, lifestyle: -5 },
            ledger: {
              amount: 300,
              category: "other",
              description: "Story Mode: WhatsApp Spin Scam loss",
            },
          },
          {
            text: "Delete and warn the group",
            consequence:
              "Great! You saved your friends and yourself from fraud. (+40 XP)",
            effect: { savings: 0, stress: -5, lifestyle: +10 },
            xpReward: 40,
            ledger: null,
          },
        ],
      },
      {
        title: "Birthday Buffet Party",
        icon: "🍕",
        description:
          "Your roommate's birthday is here. The group wants to book a table at a premium unlimited buffet (₹1,500/head).",
        choices: [
          {
            text: "Join the buffet party (₹1,500)",
            consequence:
              "Ate delicious food, laughed, and built core college memories.",
            effect: { savings: -1500, stress: -20, lifestyle: +20 },
            ledger: {
              amount: 1500,
              category: "food",
              description: "Story Mode: Birthday Buffet Party",
            },
          },
          {
            text: "Skip & buy them a chocolate (₹150)",
            consequence:
              "Saved money, gave a sweet gesture, but sat alone in the quiet dorm room.",
            effect: { savings: -150, stress: +10, lifestyle: -10 },
            ledger: {
              amount: 150,
              category: "food",
              description: "Story Mode: Birthday Chocolate",
            },
          },
        ],
      },
      {
        title: "Stipend Bonus Drop!",
        icon: "🎁",
        description:
          "Congratulations! Your college project got selected, and the Dean sends a surprise cash reward of ₹2,500.",
        choices: [
          {
            text: "Treat your squad (₹2,000)",
            consequence:
              "Everyone loves you now! Lifestyle rating maxed out, but cash is gone.",
            effect: { savings: -2000, stress: -10, lifestyle: +30 },
            ledger: {
              amount: 2000,
              category: "entertainment",
              description: "Story Mode: Stipend Treat",
            },
          },
          {
            text: "Put it all in Savings (+₹2,500)",
            consequence:
              "Very responsible! Your financial cushion feels thick and safe.",
            effect: { savings: +2500, stress: -15, lifestyle: +5 },
            ledger: {
              amount: 2500,
              type: "credit",
              category: "general",
              description: "Story Mode: Dean Stipend Bonus",
            },
          },
        ],
      },
      {
        title: "Gaming Setup Upgrade",
        icon: "🎮",
        description:
          "A classmate is selling his used gaming setup (monitor + keyboard) for ₹4,000. It's a great deal but a big spend.",
        choices: [
          {
            text: "Buy the gaming setup (₹4,000)",
            consequence:
              "Epic gaming nights! Great stress relief, but a major savings hit.",
            effect: { savings: -4000, stress: -25, lifestyle: +20 },
            ledger: {
              amount: 4000,
              category: "shopping",
              description: "Story Mode: Used Gaming Setup",
            },
          },
          {
            text: "Pass on the deal (₹0)",
            consequence:
              "Protected your financial cushion. No gaming FOMO since studies kept you busy.",
            effect: { savings: 0, stress: +5, lifestyle: 0 },
            ledger: null,
          },
        ],
      },
      {
        title: "Piracy vs Licensed Software",
        icon: "💿",
        description:
          "Your design project needs Photoshop. Adobe CC costs ₹1,675/month. A classmate offers a cracked version for free.",
        choices: [
          {
            text: "Use the pirated version (₹0)",
            consequence:
              "The cracked installer contained malware that crashed your laptop for 2 days.",
            effect: { savings: 0, stress: +25, lifestyle: -10 },
            ledger: null,
          },
          {
            text: "Buy Adobe CC student plan (₹1,675)",
            consequence:
              "Clean, legal software with full features and zero security risks.",
            effect: { savings: -1675, stress: -10, lifestyle: +10 },
            ledger: {
              amount: 1675,
              category: "education",
              description: "Story Mode: Adobe CC Student License",
            },
          },
        ],
      },
      {
        title: "Laundry Service Subscription",
        icon: "👕",
        description:
          "Managing laundry is taking 2 hours every Sunday. A laundry pickup service costs ₹800/month and washes everything.",
        choices: [
          {
            text: "Subscribe to laundry service (₹800)",
            consequence:
              "Luxury! Sundays are now completely free for studies and rest.",
            effect: { savings: -800, stress: -10, lifestyle: +10 },
            ledger: {
              amount: 800,
              category: "bills",
              description: "Story Mode: Laundry Subscription",
            },
          },
          {
            text: "Continue doing it yourself (₹50 detergent)",
            consequence:
              "Saved money! Washing built life skills, even if it takes precious time.",
            effect: { savings: -50, stress: +5, lifestyle: -5 },
            ledger: {
              amount: 50,
              category: "shopping",
              description: "Story Mode: Detergent Powder",
            },
          },
        ],
      },
    ],
    5: [
      {
        title: "Sudden Dental Pain",
        icon: "🦷",
        description:
          "A wisdom tooth is swelling rapidly. Studying is impossible.",
        choices: [
          {
            text: "Visit private dental clinic (₹2,000)",
            consequence:
              "Tooth removed professionally. Instant pain relief and healthy recovery.",
            effect: { savings: -2000, stress: -25, lifestyle: +5 },
            ledger: {
              amount: 2000,
              category: "healthcare",
              description: "Story Mode: Dental Surgeon",
            },
          },
          {
            text: "Take local pharmacy painkiller (₹100)",
            consequence:
              "Slight pain relief, but the tooth keeps throbbing, keeping you awake.",
            effect: { savings: -100, stress: +25, lifestyle: -10 },
            ledger: {
              amount: 100,
              category: "healthcare",
              description: "Story Mode: Painkillers",
            },
          },
        ],
      },
      {
        title: "Meme Coin Investment Hype",
        icon: "🐕",
        description:
          "Your hostelmate says: 'Put ₹2,000 in ElonDogeCoin. My portfolio tripled in 2 days! Buy now via this Telegram link.'",
        choices: [
          {
            text: "Invest ₹2,000 in the coin",
            consequence:
              "Rugpull! Scammers closed the coin contract and stole your money.",
            effect: { savings: -2000, stress: +30, lifestyle: -10 },
            ledger: {
              amount: 2000,
              category: "other",
              description: "Story Mode: Crypto Rugpull Loss",
            },
          },
          {
            text: "Decline and save in Sandbox FD",
            consequence:
              "Smart. You locked ₹1,000 in a safe 7% virtual fixed deposit. Safe gains! (+40 XP)",
            effect: { savings: -1000, stress: -10, lifestyle: +5 },
            xpReward: 40,
            ledger: {
              amount: 1000,
              category: "general",
              description: "Story Mode: Locked RD Deposit",
            },
          },
        ],
      },
      {
        title: "Major Semester Code Project",
        icon: "⌨️",
        description:
          "You have a complex programming project due. A freelancer online offers to write it for ₹3,000.",
        choices: [
          {
            text: "Pay the freelancer (₹3,000)",
            consequence:
              "Got a perfect project without lifting a finger, but spent massive savings.",
            effect: { savings: -3000, stress: -30, lifestyle: +10 },
            ledger: {
              amount: 3000,
              category: "education",
              description: "Story Mode: Freelance Project",
            },
          },
          {
            text: "Learn & code it yourself (₹0)",
            consequence:
              "Pulled three sleepless nights but gained massive coding confidence. (+60 XP)",
            effect: { savings: 0, stress: +35, lifestyle: -5 },
            xpReward: 60,
            ledger: null,
          },
        ],
      },
      {
        title: "Emergency Trip Back Home",
        icon: "🚂",
        description:
          "There's a small family emergency. Train tickets are ₹2,500 for AC but ₹800 for Sleeper class. You must travel.",
        choices: [
          {
            text: "Book AC coach for comfort (₹2,500)",
            consequence:
              "Arrived rested and recharged. Family was happy to see you well.",
            effect: { savings: -2500, stress: -15, lifestyle: +5 },
            ledger: {
              amount: 2500,
              category: "travel",
              description: "Story Mode: AC Train Ticket",
            },
          },
          {
            text: "Book Sleeper class (₹800)",
            consequence:
              "Reached home safely and saved ₹1,700. Rough journey but manageable.",
            effect: { savings: -800, stress: +10, lifestyle: -5 },
            ledger: {
              amount: 800,
              category: "travel",
              description: "Story Mode: Sleeper Train Ticket",
            },
          },
        ],
      },
      {
        title: "National Hackathon Entry",
        icon: "💡",
        description:
          "A national hackathon is happening in Surat. Entry fee is ₹500 per person. The prize pool is ₹50,000 but odds are low.",
        choices: [
          {
            text: "Pay and participate (₹500)",
            consequence:
              "Didn't win but networked brilliantly. Got a startup internship lead!",
            effect: { savings: -500, stress: +15, lifestyle: +20 },
            ledger: {
              amount: 500,
              category: "education",
              description: "Story Mode: Hackathon Entry Fee",
            },
          },
          {
            text: "Skip due to low winning odds (₹0)",
            consequence:
              "Saved ₹500 but missed a rare opportunity for networking.",
            effect: { savings: 0, stress: 0, lifestyle: -5 },
            ledger: null,
          },
        ],
      },
      {
        title: "Cafeteria Monthly Meal Pass",
        icon: "🍛",
        description:
          "The cafeteria offers a discounted monthly meal pass for ₹1,800, saving ₹900 vs paying daily (₹90 × 30 days).",
        choices: [
          {
            text: "Buy the monthly meal pass (₹1,800)",
            consequence:
              "Smart! You saved ₹900 by paying upfront. Lunch sorted for the month.",
            effect: { savings: -1800, stress: -5, lifestyle: +5 },
            ledger: {
              amount: 1800,
              category: "food",
              description: "Story Mode: Cafeteria Monthly Pass",
            },
          },
          {
            text: "Pay daily (₹90/day — ₹2,700/month)",
            consequence:
              "Flexibility to eat elsewhere some days, but cost ₹900 more this month.",
            effect: { savings: -2700, stress: +5, lifestyle: 0 },
            ledger: {
              amount: 2700,
              category: "food",
              description: "Story Mode: Daily Cafeteria Meals",
            },
          },
        ],
      },
    ],
    6: [
      {
        title: "Placement Suit Dilemma",
        icon: "👔",
        description:
          "Campus recruitment drives begin next week. Do you purchase a premium suit or borrow one?",
        choices: [
          {
            text: "Buy custom fitted suit (₹4,500)",
            consequence:
              "Looked incredibly sharp and confident. Got multiple compliments.",
            effect: { savings: -4500, stress: -20, lifestyle: +25 },
            ledger: {
              amount: 4500,
              category: "shopping",
              description: "Story Mode: Placement Interview Suit",
            },
          },
          {
            text: "Borrow an ill-fitting suit (₹0)",
            consequence:
              "The sleeves are too long and pants loose. You felt self-conscious during interviews.",
            effect: { savings: 0, stress: +15, lifestyle: -10 },
            ledger: null,
          },
        ],
      },
      {
        title: "Ransomware Attack on Laptop",
        icon: "🏴‍☠️",
        description:
          "A pop-up claims your system files are encrypted. 'Pay ₹2,500 in virtual credits to unlock.'",
        choices: [
          {
            text: "Pay the ransom fee (₹2,500)",
            consequence:
              "SCAM! Scammers took the money and did NOT unlock your files. Double damage.",
            effect: { savings: -2500, stress: +35, lifestyle: -15 },
            ledger: {
              amount: 2500,
              category: "other",
              description: "Story Mode: Ransomware scam payment",
            },
          },
          {
            text: "Wipe drive & restore free backup",
            consequence:
              "Excellent practice! Regularly backing up your code saved you ₹2,500. (+80 XP)",
            effect: { savings: 0, stress: -10, lifestyle: +10 },
            xpReward: 80,
            ledger: null,
          },
        ],
      },
      {
        title: "Graduation Party Night!",
        icon: "🎉",
        description:
          "The final semester is over! Your friends are booking a luxury resort event for ₹3,000.",
        choices: [
          {
            text: "Go to luxury resort (₹3,000)",
            consequence:
              "Unforgettable night, swimming pool and photos, but wallet is flat.",
            effect: { savings: -3000, stress: -35, lifestyle: +35 },
            ledger: {
              amount: 3000,
              category: "entertainment",
              description: "Story Mode: Graduation Resort Party",
            },
          },
          {
            text: "Attend cheap bonfire party (₹500)",
            consequence:
              "Cozy fireside songs and roasted marshmallows. Simple yet deeply satisfying.",
            effect: { savings: -500, stress: -20, lifestyle: +10 },
            ledger: {
              amount: 500,
              category: "entertainment",
              description: "Story Mode: Graduation Bonfire",
            },
          },
        ],
      },
      {
        title: "Resume Writing Service",
        icon: "📝",
        description:
          "A professional resume writer charges ₹1,500 for a 'placement-ready ATS resume.' Your current resume is decent but basic.",
        choices: [
          {
            text: "Hire the resume writer (₹1,500)",
            consequence:
              "Polished, professional resume. Got 3 extra interview calls because of it.",
            effect: { savings: -1500, stress: -10, lifestyle: +10 },
            ledger: {
              amount: 1500,
              category: "education",
              description: "Story Mode: Resume Writing Service",
            },
          },
          {
            text: "Use a free online template (₹0)",
            consequence:
              "Clean enough resume. Some recruiters noticed the generic format.",
            effect: { savings: 0, stress: +5, lifestyle: 0 },
            ledger: null,
          },
        ],
      },
      {
        title: "LinkedIn Premium Trial",
        icon: "💼",
        description:
          "LinkedIn offers a free 1-month trial of Premium Career (₹0 now, ₹2,200 auto-charge in 30 days).",
        choices: [
          {
            text: "Activate trial — cancel in 29 days",
            consequence:
              "Used InMail to message 10 recruiters! Got 2 positive responses. Cancelled on time.",
            effect: { savings: 0, stress: -5, lifestyle: +15 },
            xpReward: 30,
            ledger: null,
          },
          {
            text: "Ignore it (afraid of forgetting to cancel)",
            consequence:
              "Smart caution. You avoided a ₹2,200 auto-charge trap seen by your classmate.",
            effect: { savings: 0, stress: 0, lifestyle: +5 },
            ledger: null,
          },
        ],
      },
      {
        title: "City Relocation Fund",
        icon: "🏙️",
        description:
          "You got a job offer in Bangalore! The company gives a ₹10,000 relocation allowance, but setup costs ₹8,000.",
        choices: [
          {
            text: "Accept and relocate smart (+₹2,000 net)",
            consequence:
              "You negotiated advance salary and covered costs. A bright new chapter begins!",
            effect: { savings: +2000, stress: -20, lifestyle: +30 },
            ledger: {
              amount: 10000,
              type: "credit",
              category: "general",
              description: "Story Mode: Relocation Allowance",
            },
          },
          {
            text: "Ask parents to bridge the gap (₹0)",
            consequence:
              "Parents helped with deposit. You started the new job with zero savings pressure.",
            effect: { savings: 0, stress: -15, lifestyle: +20 },
            ledger: null,
          },
        ],
      },
    ],
  };

  // Fisher-Yates shuffle
  const shuffleArray = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const startNewSimulation = () => {
    playSound("click");
    // Pick 3 random scenarios per month — different every game!
    const newSelected = {};
    for (let month = 1; month <= 6; month++) {
      newSelected[month] = shuffleArray(scenarioPool[month]).slice(0, 3);
    }
    setSelectedScenarios(newSelected);
    setSavings(0);
    setStress(30);
    setLifestyle(50);
    setCurrentMonth(1);
    setCurrentCardIndex(0);
    setGameOver(null);
    setLog([]);
    setIsPlaying(true);
    playSound("allowance");
  };

  const handleChoice = async (choice) => {
    playSound("click");
    setSyncing(true);

    const logEntry = {
      month: currentMonth,
      card: selectedScenarios[currentMonth]?.[currentCardIndex]?.title || "",
      choice: choice.text,
      effects: choice.effect,
    };

    const newStress = Math.max(0, Math.min(100, stress + choice.effect.stress));
    const stressTensCrossed =
      Math.floor(newStress / 10) - Math.floor(stress / 10);
    const stressPenalty =
      stressTensCrossed > 0 && savings > 0
        ? Math.round(savings * 0.05 * stressTensCrossed)
        : 0;

    const newSavings = savings + choice.effect.savings - stressPenalty;
    const newLifestyle = Math.max(
      0,
      Math.min(100, lifestyle + choice.effect.lifestyle),
    );

    setSavings(newSavings);
    setStress(newStress);
    setLifestyle(newLifestyle);
    setLog([...log, logEntry]);

    if (choice.effect.stress > 15 || choice.effect.savings < -1500) {
      playSound("damage");
    } else {
      playSound("click");
    }

    // Ledger Sync
    if (choice.ledger) {
      try {
        const res = await api.post("/transactions/manual-add", {
          amount: Math.abs(choice.ledger.amount),
          type: choice.ledger.type || "debit",
          category: choice.ledger.category,
          description: choice.ledger.description,
        });
        updateBalance(res.data.balance);
      } catch (err) {
        console.error("Ledger sync failure", err);
      }
    }

    if (choice.xpReward) {
      try {
        await api.post("/learning/modules/banking-basics/complete");
      } catch (err) {
        console.error(err);
      }
    }

    if (newStress >= 100) {
      setGameOver("burnout");
      playSound("damage");
      setSyncing(false);
      return;
    }
    if (newSavings <= -5000) {
      setGameOver("debt");
      playSound("damage");
      setSyncing(false);
      return;
    }

    setTimeout(() => {
      setSyncing(false);
      if (currentCardIndex < 2) {
        setCurrentCardIndex(currentCardIndex + 1);
      } else {
        if (currentMonth < 6) {
          playSound("allowance");
          setCurrentMonth(currentMonth + 1);
          setCurrentCardIndex(0);
          setSavings((prev) => prev + 8000);
          api
            .post("/transactions/manual-add", {
              amount: 8000,
              type: "credit",
              category: "general",
              description: `Month ${currentMonth + 1} College Allowance`,
            })
            .then((res) => {
              updateBalance(res.data.balance);
            })
            .catch((e) => console.error(e));
        } else {
          setGameOver("graduated");
          playSound("win");
          api
            .post("/learning/modules/banking-basics/complete")
            .then(() => {})
            .catch(() => {});
        }
      }
    }, 400);
  };

  const currentCard = selectedScenarios[currentMonth]?.[currentCardIndex];

  return (
    <div className="space-y-8 max-w-4xl mx-auto mt-4 px-2">
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight flex items-center justify-center gap-3">
          <Gamepad2 className="text-primary animate-pulse" size={32} />
          Story Mode: Ahmedabad Student Survival
        </h1>
        <p className="text-text-muted mt-2 max-w-xl mx-auto">
          Play as an engineering student at Ahmedabad University. Survive 6
          months on a tight <strong>₹8,000/month</strong> allowance, make
          crucial budgeting decisions, avoid real cyber scams, and maintain your
          health!
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!isPlaying ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-panel p-8 text-center space-y-6 max-w-2xl mx-auto relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -z-10"></div>
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-secondary/10 rounded-full blur-2xl -z-10"></div>

            <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shadow-lg text-3xl font-extrabold">
              🎓
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Start Semester 1</h2>
              <p className="text-text-muted text-sm leading-relaxed">
                Welcome to college life! You'll receive a monthly allowance of
                ₹8,000. Balance your student lifestyle, keep your stress levels
                low, and save money for emergencies. Each game gives you a{" "}
                <span className="text-primary font-bold">
                  different set of events
                </span>{" "}
                — no two playthroughs are the same!
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 py-4 border-t border-b border-white/5">
              <div className="text-center">
                <p className="text-xs text-text-muted font-bold uppercase tracking-wider mb-1">
                  Allowance
                </p>
                <p className="text-lg font-bold text-success">₹8,000/mo</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-text-muted font-bold uppercase tracking-wider mb-1">
                  Target Span
                </p>
                <p className="text-lg font-bold text-primary">6 Months</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-text-muted font-bold uppercase tracking-wider mb-1">
                  Rules
                </p>
                <p className="text-lg font-bold text-danger">Avoid Debt</p>
              </div>
            </div>

            <div className="bg-warning/5 border border-warning/20 rounded-xl p-3 text-xs text-text-muted text-left">
              ⚠️ <strong className="text-warning">New mechanic:</strong> High
              stress (≥10%) will drain your savings by 5% per 10 stress points.
              Manage your mental health to protect your wallet!
            </div>

            <button
              onClick={startNewSimulation}
              className="w-full btn-primary py-4 text-base font-extrabold tracking-wide uppercase flex items-center justify-center gap-2"
            >
              Enter Sandbox Simulator <ChevronRight size={18} />
            </button>
          </motion.div>
        ) : gameOver ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-panel p-8 text-center space-y-6 max-w-2xl mx-auto"
          >
            {gameOver === "graduated" ? (
              <div className="space-y-4">
                <div className="w-24 h-24 mx-auto rounded-full bg-success/20 flex items-center justify-center text-success text-5xl animate-bounce">
                  🏆
                </div>
                <h2 className="text-3xl font-black text-success">
                  Congratulations! You Graduated!
                </h2>
                <p className="text-text-muted text-sm max-w-md mx-auto">
                  You successfully survived 6 months of college in Ahmedabad
                  while maintaining financial discipline, avoiding scams, and
                  managing stress levels. You are officially financially
                  literate!
                </p>
                <div className="inline-flex items-center gap-2 bg-success/15 border border-success/30 px-4 py-2 rounded-xl text-success font-bold text-sm">
                  <Award size={16} /> Earned +150 Semester XP!
                </div>
              </div>
            ) : gameOver === "burnout" ? (
              <div className="space-y-4">
                <div className="w-24 h-24 mx-auto rounded-full bg-danger/20 flex items-center justify-center text-danger text-5xl">
                  💥
                </div>
                <h2 className="text-3xl font-black text-danger">
                  Severe Mental Burnout!
                </h2>
                <p className="text-text-muted text-sm max-w-md mx-auto">
                  Your Stress Levels crossed 100%! Balancing high debt, cheap
                  gear fears, scam traps, and semester projects without proper
                  safety measures caused you to crash. Remember: high stress
                  also drained your savings!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-24 h-24 mx-auto rounded-full bg-danger/20 flex items-center justify-center text-danger text-5xl">
                  💸
                </div>
                <h2 className="text-3xl font-black text-danger">
                  Bank Account Suspended!
                </h2>
                <p className="text-text-muted text-sm max-w-md mx-auto">
                  Your student savings went below -₹5,000. You got locked into a
                  heavy debt trap with quick-credit apps and local duplicate
                  items, causing bank freezes.
                </p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 bg-white/5 p-4 rounded-2xl border border-white/5 mt-6">
              <div>
                <p className="text-xs text-text-muted font-semibold">
                  Final Savings
                </p>
                <p
                  className={`text-xl font-bold ${savings >= 0 ? "text-success" : "text-danger"}`}
                >
                  ₹{savings.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted font-semibold">
                  Stress Meter
                </p>
                <p className="text-xl font-bold text-warning">{stress}%</p>
              </div>
              <div>
                <p className="text-xs text-text-muted font-semibold">
                  Lifestyle Score
                </p>
                <p className="text-xl font-bold text-secondary">{lifestyle}%</p>
              </div>
            </div>

            <div className="text-left space-y-3 mt-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted">
                Semester Decisions Log
              </h3>
              <div className="max-h-48 overflow-y-auto divide-y divide-white/5 pr-2">
                {log.map((entry, idx) => (
                  <div
                    key={idx}
                    className="py-2.5 text-xs flex justify-between gap-4"
                  >
                    <span className="text-text-muted font-semibold shrink-0">
                      Month {entry.month} ({entry.card}):
                    </span>
                    <span className="text-white text-right font-medium">
                      {entry.choice}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={startNewSimulation}
              className="w-full btn-primary py-4 text-base font-extrabold uppercase flex items-center justify-center gap-2 mt-6"
            >
              <RefreshCw size={18} /> New Random Semester
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-4 space-y-6">
              <div className="glass-panel p-6 space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-xl -z-10"></div>
                <h3 className="text-base font-bold uppercase tracking-wider text-text-muted border-b border-white/5 pb-2">
                  Status Meters
                </h3>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-text-muted flex items-center gap-1.5">
                      <Coins size={16} className="text-success" /> Savings
                      cushion
                    </span>
                    <span
                      className={`font-black ${savings >= 0 ? "text-success" : "text-danger"}`}
                    >
                      ₹{savings.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-3.5 border border-white/5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${savings >= 0 ? "bg-gradient-to-r from-success to-success-light" : "bg-danger"}`}
                      style={{
                        width: `${Math.min(100, Math.max(10, ((savings + 5000) / 25000) * 100))}%`,
                      }}
                    ></div>
                  </div>
                  <p className="text-[10px] text-text-muted/60 font-medium">
                    Suspended if under -₹5,000
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-text-muted flex items-center gap-1.5">
                      <Heart size={16} className="text-danger" /> Stress levels
                    </span>
                    <span className="font-black text-danger">{stress}%</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-3.5 border border-white/5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-warning to-danger h-full rounded-full transition-all duration-500"
                      style={{ width: `${stress}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] text-text-muted/60 font-medium">
                    Burnout at 100% • High stress drains savings!
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-text-muted flex items-center gap-1.5">
                      <Smile size={16} className="text-secondary" /> Lifestyle
                      score
                    </span>
                    <span className="font-black text-secondary">
                      {lifestyle}%
                    </span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-3.5 border border-white/5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-accent to-secondary h-full rounded-full transition-all duration-500"
                      style={{ width: `${lifestyle}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] text-text-muted/60 font-medium">
                    Influences mood & placement scores
                  </p>
                </div>
              </div>

              <div className="glass-panel p-5 bg-gradient-to-tr from-primary/10 to-transparent border-primary/20">
                <h4 className="text-sm font-bold flex items-center gap-2 mb-2">
                  <ShieldCheck className="text-primary" size={16} /> Ledger
                  Linked
                </h4>
                <p className="text-xs text-text-muted leading-relaxed">
                  Decisions requiring cash debits will instantly trigger ledger
                  transactions in your primary account. Allowances automatically
                  credit.
                </p>
              </div>
            </div>

            <div className="lg:col-span-8 space-y-6">
              <div className="flex items-center justify-between bg-white/5 border border-white/5 p-4 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="px-3.5 py-1.5 rounded-xl bg-primary/20 border border-primary/30 text-primary text-xs font-black">
                    Month {currentMonth} of 6
                  </div>
                  <span className="text-sm font-bold text-white/90">
                    Ahmedabad College Survival
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <div
                    className={`w-3.5 h-3.5 rounded-full border transition-colors ${currentCardIndex >= 0 ? "bg-primary border-primary" : "border-white/20"}`}
                  ></div>
                  <div
                    className={`w-3.5 h-3.5 rounded-full border transition-colors ${currentCardIndex >= 1 ? "bg-primary border-primary" : "border-white/20"}`}
                  ></div>
                  <div
                    className={`w-3.5 h-3.5 rounded-full border transition-colors ${currentCardIndex >= 2 ? "bg-primary border-primary" : "border-white/20"}`}
                  ></div>
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={`${currentMonth}-${currentCardIndex}`}
                  initial={{ opacity: 0, y: 30, rotateX: 10 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  exit={{ opacity: 0, y: -30, rotateX: -10 }}
                  transition={{ duration: 0.35 }}
                  className="glass-panel p-8 relative overflow-hidden border-white/10 shadow-2xl space-y-8 flex flex-col justify-between min-h-[380px]"
                >
                  <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none -z-10"></div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl shadow-inner animate-float shrink-0">
                        {currentCard?.icon}
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-widest text-primary font-black">
                          Month {currentMonth} Event
                        </p>
                        <h2 className="text-2xl font-black text-white/90">
                          {currentCard?.title}
                        </h2>
                      </div>
                    </div>

                    <p className="text-base text-text-muted leading-relaxed font-medium pt-2">
                      {currentCard?.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-auto">
                    {currentCard?.choices.map((choice, idx) => (
                      <button
                        key={idx}
                        disabled={syncing}
                        onClick={() => handleChoice(choice)}
                        className="group p-5 rounded-2xl bg-surface hover:bg-surface-hover border border-white/5 hover:border-white/10 text-left transition-all duration-300 flex flex-col justify-between gap-3 shadow-lg disabled:opacity-50 relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-2 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <p className="font-extrabold text-sm text-white group-hover:text-primary transition-colors pr-2">
                          {choice.text}
                        </p>
                        <div className="border-t border-white/5 pt-2.5 w-full">
                          <p className="text-[11px] text-text-muted/80 leading-relaxed font-semibold mb-2 italic">
                            {choice.consequence}
                          </p>
                          <div className="flex flex-wrap gap-2 text-[10px] font-extrabold uppercase">
                            {choice.effect.savings !== 0 && (
                              <span
                                className={`px-2 py-0.5 rounded ${choice.effect.savings > 0 ? "bg-success/15 text-success" : "bg-danger/15 text-danger"}`}
                              >
                                {choice.effect.savings > 0 ? "+" : ""}₹
                                {choice.effect.savings}
                              </span>
                            )}
                            {choice.effect.stress !== 0 && (
                              <span
                                className={`px-2 py-0.5 rounded ${choice.effect.stress < 0 ? "bg-success/15 text-success" : "bg-danger/15 text-danger"}`}
                              >
                                {choice.effect.stress < 0
                                  ? "Stress -"
                                  : "Stress +"}
                                {Math.abs(choice.effect.stress)}%
                              </span>
                            )}
                            {Math.floor(
                              Math.min(100, stress + choice.effect.stress) / 10,
                            ) -
                              Math.floor(stress / 10) >
                              0 &&
                              savings > 0 && (
                                <p className="mt-1 text-[10px] text-danger font-black bg-danger/10 p-1.5 rounded border border-danger/20 flex items-center gap-1">
                                  💸 Stress Drain ~
                                  {Math.round(
                                    savings *
                                      0.05 *
                                      (Math.floor(
                                        Math.min(
                                          100,
                                          stress + choice.effect.stress,
                                        ) / 10,
                                      ) -
                                        Math.floor(stress / 10)),
                                  ).toLocaleString()}
                                </p>
                              )}
                            {choice.effect.lifestyle !== 0 && (
                              <span
                                className={`px-2 py-0.5 rounded ${choice.effect.lifestyle > 0 ? "bg-secondary/15 text-secondary" : "bg-danger/15 text-danger"}`}
                              >
                                {choice.effect.lifestyle > 0
                                  ? "Lifestyle +"
                                  : "Lifestyle -"}
                                {Math.abs(choice.effect.lifestyle)}%
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StoryMode;
