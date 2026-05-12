const mongoose = require('mongoose');

const waterPaymentSchema = new mongoose.Schema({
  bill: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WaterBill',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receipt: {
    type: String,
    required: true
  },
  status: {
    type: String,
    default: 'pending' // pending, approved, rejected
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('WaterPayment', waterPaymentSchema);