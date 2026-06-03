require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const { initDatabase } = require('./config/database');
const { rateLimiter } = require('./middleware/rateLimiter');

const authRoutes = require('./routes/auth');
const accountRoutes = require('./routes/account');
const transactionRoutes = require('./routes/transactions');
const billRoutes = require('./routes/bills');
const analyticsRoutes = require('./routes/analytics');
const notificationRoutes = require('./routes/notifications');
const gamificationRoutes = require('./routes/gamification');
const learningRoutes = require('./routes/learning');
const goalsRoutes = require('./routes/goals');
const adminRoutes = require('./routes/admin');
const friendsRoutes = require('./routes/friends');
const chatRoutes = require('./routes/chat');
const socialRoutes = require('./routes/social');
const challengesRoutes = require('./routes/challenges');
const scamGameRoutes = require('./routes/scam-game');
const economyRoutes = require('./routes/economy');
const trustRoutes = require('./routes/trust');
const lifeEventsRoutes = require('./routes/life-events');
const mentorRoutes = require('./routes/mentor');
const salaryRoutes = require('./routes/salary');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:3000'],
    credentials: true
  }
});

app.set('io', io);

const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  socket.on('user_online', (userId) => {
    onlineUsers.set(userId, socket.id);
    io.emit('online_users', Array.from(onlineUsers.keys()));
  });

  socket.on('join_room', (roomId) => {
    socket.join(roomId);
  });

  socket.on('leave_room', (roomId) => {
    socket.leave(roomId);
  });

  socket.on('send_message', (data) => {
    io.to(data.roomId).emit('receive_message', data);
  });

  socket.on('typing', (data) => {
    socket.to(data.roomId).emit('user_typing', data);
  });

  socket.on('stop_typing', (data) => {
    socket.to(data.roomId).emit('user_stop_typing', data);
  });

  socket.on('payment_sent', (data) => {
    io.to(data.roomId).emit('payment_received', data);
  });

  socket.on('disconnect', () => {
    for (const [userId, sid] of onlineUsers.entries()) {
      if (sid === socket.id) { onlineUsers.delete(userId); break; }
    }
    io.emit('online_users', Array.from(onlineUsers.keys()));
    console.log('🔌 Client disconnected:', socket.id);
  });
});

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:3000'], credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(rateLimiter);

let databaseReady = false;

app.use(async (req, res, next) => {
  if (databaseReady) return next();
  if (req.path === '/api/health') return next();
  return res.status(503).json({ error: 'Server is starting. Please try again in a few seconds.' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'NeoBank Social Simulator API', version: '2.0.0', simulation: true, realtime: true });
});

app.use('/api/auth', authRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/learning', learningRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/challenges', challengesRoutes);
app.use('/api/scam-game', scamGameRoutes);
app.use('/api/economy', economyRoutes);
app.use('/api/trust', trustRoutes);
app.use('/api/life-events', lifeEventsRoutes);
app.use('/api/mentor', mentorRoutes);
app.use('/api/salary', salaryRoutes);

app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(500).json({ error: 'Internal server error.' });
});

const PORT = process.env.PORT || 5000;

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

initDatabase()
  .then(() => {
    databaseReady = true;
    server.listen(PORT, () => {
      console.log(`\n🏦 NeoBank Social Simulator API running on http://localhost:${PORT}`);
      console.log(`⚡ Socket.io real-time enabled`);
    });
  })
  .catch((err) => {
    console.error('Database initialization failed:', err);
    process.exit(1);
  });
