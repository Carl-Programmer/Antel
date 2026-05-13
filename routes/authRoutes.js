const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const multer = require('multer');
const User = require('../models/User');
const mailer = require('../utils/mailer');
const path = require('path');
const fs = require('fs');
const session = require('express-session');


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// -------------------- ROUTES --------------------

// ROOT
router.get('/', (req, res) => {
  res.redirect('/login');
});

// LOGIN PAGE
router.get('/login', (req, res) => {
  res.render('login', { title: 'Login Page' });
});

// SIGNUP PAGE
router.get('/signup', (req, res) => {
  res.render('signup', { title: 'Sign Up Page' });
});

router.get('/forgot', (req, res) => {
  res.render('forgot', { title: 'Forgot Password' });
});

router.get('/resetpass', (req, res) => {
  const email = req.query.email;
  res.render('resetpass', { title: 'Reset Password', email });
});

// VERIFICATION PAGE
router.get('/verification', (req, res) => {
  res.render('verification', { title: 'Verification Page' });
});

router.get('/registered', (req, res) => {
  res.render('registered', { title: 'Registered' });
});

// ---------------- REGISTER ----------------
router.post('/register', upload.single('profilePic'), async (req, res) => {
  try {
    const {
      givenName,
      surname,
      gender,
      contact,
      citizenship,
      birthdate,
      village,
      blockLot,
      referenceNumber,
      ownershipType,
      email,
      password,
      confirmPassword
    } = req.body;

    if (password !== confirmPassword) {
      return res.send('❌ Passwords do not match');
    }

    // check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.send('❌ Email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      givenName,
      surname,
      gender,
      contact,
      citizenship,
      birthdate,
      village,
      blockLot,
      referenceNumber,
      ownershipType,
      email,
      password: hashedPassword,
      profilePic: req.file ? '/uploads/' + req.file.filename : '',
      status: 'pending'
    });

    await newUser.save();

req.session.user = {
  _id: newUser._id,
  email: newUser.email
};

    res.redirect('/verification');

  } catch (err) {
    console.log(err);
    res.send('❌ Registration error');
  }
});

// 🔥 VERIFICATION CHECK (REAL TIME)
router.get('/check-status', async (req, res) => {
  if (!req.session.user) {
    return res.json({ status: 'none' });
  }

const user = await User.findById(req.session.user._id);

if (!user) {
  return res.json({ status: 'none' });
}

res.json({ status: user.status });
});
// ---------------- LOGIN ----------------
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const foundUser = await User.findOne({ email });

    if (!foundUser) {
      return res.send('❌ Invalid credentials');
    }

    const bcrypt = require('bcrypt');
    const isMatch = await bcrypt.compare(password, foundUser.password);

    if (!isMatch) {
      return res.send('❌ Invalid credentials');
    }

    // 🚨 ADD THIS BLOCK
    if (foundUser.status === 'pending') {
      return res.send('⏳ Your account is still pending approval.');
    }

    if (foundUser.status === 'rejected') {
      return res.send('❌ Your account has been rejected.');
    }

    if (foundUser.status === 'deactivated') {
      return res.send('⚠️ Your account has been deactivated.');
    }

    // ✅ ONLY ALLOW ACTIVE USERS
    if (foundUser.status !== 'active') {
      return res.send('❌ Invalid account status.');
    }

    // ✅ SAVE SESSION
    req.session.user = {
      _id: foundUser._id,
      email: foundUser.email,
      role: foundUser.role
    };

    console.log("SESSION CREATED:", req.session.user);

    // 🔀 REDIRECT
    if (foundUser.role === 'admin') {
      return res.redirect('/admin/dashboard');
    } else {
      return res.redirect('/user/dashboard');
    }

  } catch (err) {
    console.error(err);
    res.send('Server Error');
  }
});

// 🚪 LOGOUT
router.post('/logout', (req, res) => {
  if (!req.session) {
    return res.sendStatus(200);
  }

  req.session.destroy(err => {
    if (err) {
      console.error(err);
      return res.status(500).send('Logout failed');
    }

    console.log('SESSION DESTROYED');
    res.redirect('/login');
  });
});

// ---------------- Forgot Password ----------------
// 🔵 SEND OTP
router.post("/send-otp", async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(404).send("User not found");

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  user.resetOTP = otp;
  user.otpExpire = Date.now() + 5 * 60 * 1000; // 5 mins

  await user.save();

  await mailer.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your OTP Code",
    text: `Your OTP is: ${otp}`
  });

  res.send("OTP sent successfully");
});

// 🔵 OTP VERIFICATION
router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(400).send("User not found");

  if (user.resetOTP !== otp) {
    return res.status(400).send("Invalid OTP");
  }

  if (user.otpExpire < Date.now()) {
    return res.status(400).send("OTP expired");
  }

  res.send({ success: true });
});

// 🔵 RESET PASSWORD
router.post("/reset-password", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(400).send("User not found");

  const bcrypt = require("bcrypt");
  const hashed = await bcrypt.hash(password, 10);

  user.password = hashed;

  // clear OTP
  user.resetOTP = undefined;
  user.otpExpire = undefined;

  await user.save();

  res.send({ success: true });
});

module.exports = router;