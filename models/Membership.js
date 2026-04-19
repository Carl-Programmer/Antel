const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema({
  // Links this application to the logged-in user
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  },

  planType: String, // "Monthly", "Quarterly", etc.

  // Membership duration
  startDate: Date,
  endDate: Date,

  // I. Personal Information
  givenName: String,
  surname: String,
  middleName: String,
  citizenship: String,
  birthdate: Date,
  contact: String,

  // II. Ownership Type & Address
  ownershipType: String,
  village: String,
  blockLot: String,
  referenceNumber: String,

  // For Tenants Only
  leaseStart: Date,
  leaseEnd: Date,

  // Emergency Contact
  emergencyName: String,
  emergencyContact: String,

  // Image path
  profilePic: String,

  // --- form 2 ---
  membershipCardDoc: String,
  proofOfOwnershipDoc: String,
  endorsementLetterDoc: String,
  validIdDoc: String,
  contractOfLeaseDoc: String,

  receipt: String, // for payment proof

  // Application status
  status: {
    type: String,
    default: 'pending' // pending, approved, rejected, active, expired
  }

}, { timestamps: true });

module.exports = mongoose.model('Membership', membershipSchema);