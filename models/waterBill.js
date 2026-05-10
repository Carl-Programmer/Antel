// models/WaterBill.js
const mongoose = require('mongoose');

const waterBillSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  file: {
    type: String,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
    amount: {                // ✅ ADD THIS
    type: Number,
    required: true
  },
  status: {                // (optional but useful)
    type: String,
    default: 'unpaid'
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('WaterBill', waterBillSchema);