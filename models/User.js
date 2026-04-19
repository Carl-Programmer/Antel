const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  givenName: String,
  surname: String,
  gender: String,
  contact: String,
  citizenship: String,
  birthdate: Date,

  village: String,
  blockLot: String,
  referenceNumber: String,

  ownershipType: String,

  email: {
    type: String,
    unique: true
  },

  password: String,

   // 🔐 Forgot password fields
  resetOTP: String,
  otpExpire: Date,

  profilePic: String,

  role: {
    type: String,
    default: 'user'
  },

  status: {
    type: String,
    default: 'pending'
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);