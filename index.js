require('dotenv').config(); // 👈 ADDED: Loads variables from the .env file
const express = require('express');
const mongoose = require('mongoose');
const app = express();
const User = require('./models/User'); // 👈 ADDED: Import User model for global access

// 👈 UPDATED: Uses port from .env, or defaults to 3000 if not found
const PORT = process.env.PORT || 3000; 

// ==========================================
// 🌐 MONGODB ATLAS CONNECTION
// ==========================================
const dbURI = process.env.MONGODB_URI; // 👈 UPDATED: Securely grabs the URI

mongoose.connect(dbURI)
  .then(() => console.log('✅ Successfully connected to MongoDB Atlas!'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));
// ==========================================

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/uploads', express.static('public/uploads'));
app.use('/uploads', express.static('uploads'));

const session = require('express-session');

app.use(session({
  secret: process.env.SESSION_SECRET, // 👈 UPDATED: Securely grabs the secret string
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false
  }
}));

// ==========================================
// 🌍 GLOBAL USER MIDDLEWARE
// ==========================================
app.use(async (req, res, next) => {
  // If a user is logged in via session...
  if (req.session && req.session.user) {
    try {
      // Fetch their latest data (including new profile pics) from MongoDB
      const currentUser = await User.findOne({ email: req.session.user.email });
      
      // Make this user data globally available to ALL EJS files!
      res.locals.user = currentUser; 
    } catch (err) {
      console.error('Error fetching global user:', err);
      res.locals.user = null;
    }
  } else {
    res.locals.user = null;
  }
  next();
});
// ==========================================

// 🔒 Prevent back after logout
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// ✅ LOGOUT ROUTE
app.post('/logout', (req, res) => {
   console.log('SESSION BEFORE DESTROY:', req.session);
  if (!req.session) {
    return res.sendStatus(200);
  }

  req.session.destroy(err => {
    if (err) {
      console.error(err);
      return res.status(500).send('Logout failed');
    }
    console.log('SESSION DESTROYED');
    res.sendStatus(200);
  });
});

// 🔌 IMPORT ROUTES
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');

// 🛣 USE ROUTES
app.use('/', authRoutes);
app.use('/user', userRoutes);
app.use('/admin', adminRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});