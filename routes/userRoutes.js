const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');
const fs = require('fs');
const User = require('../models/User');
const Membership = require('../models/Membership');
const WaterBill = require('../models/WaterBill');
const WaterPayment = require('../models/WaterPayment');

// =======================================================
// 🔐 AUTH MIDDLEWARE
// =======================================================
function isLoggedIn(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}



//sidebar routes user

router.get('/bills', (req, res) => {
  res.render('users/bills', { title: 'Bills' });
});

router.get('/appointments', (req, res) => {
  res.render('users/appointments', { title: 'Appointments' });
});

router.get('/memberships', (req, res) => {
  res.render('users/memberships', { title: 'Memberships' });
});

router.get('/concerns', (req, res) => {
  res.render('users/concerns', { title: 'Concerns' });
});

router.get('/help', (req, res) => {
  res.render('users/help', { title: 'Help' });
});

router.get('/settings', (req, res) => {
  res.render('users/settings', { title: 'Settings' });
});

//================================================================
//sub route for user dashboard
//================================================================

//gym


//===============================================
// Water Bill View
//===============================================

router.get('/water-bill', async (req, res) => {
  try {

    // logged in user
    const userId = req.session.user._id;

    // get bills for this user
    const bills = await WaterBill.find({
      user: userId
    }).sort({ uploadedAt: -1 });

    // compute total balance
    let balance = 0;

    bills.forEach(bill => {
      balance += Number(bill.amount || 0);
    });

    console.log("USER ID:", userId);
    console.log("BILLS:", bills);
    console.log("BALANCE:", balance);

    res.render('users/water-bill', {
      title: 'Water Bills',
      bills,
      balance
    });

  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

//========================================
// Water Bill Payment Page
//========================================
// =======================================================
// 💧 USER WATER BILL PAYMENT PAGE
// =======================================================

router.get('/water-bill-pay', async (req, res) => {
  try {
    // Make sure user is logged in
    if (!req.session.user) {
      return res.redirect('/login');
    }

    const userId = req.session.user._id;

    // Get the nearest unpaid water bill
    const bill = await WaterBill.findOne({
      user: userId,
      status: 'unpaid'
    }).sort({ dueDate: 1 });

    // If there is no unpaid bill
    if (!bill) {
      return res.send('No unpaid water bills.');
    }

    // Get user information (for reference number)
    const user = await User.findById(userId);

    // Render payment page
    res.render('users/water-bill-pay', {
      title: 'Water Bill Payment',
      bill,
      user
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading water bill payment page.');
  }
});


// Create folder if it doesn't exist
const waterReceiptPath = 'uploads/waterReceipts';
if (!fs.existsSync(waterReceiptPath)) {
  fs.mkdirSync(waterReceiptPath, { recursive: true });
}

//========================================================
//upload water bill payment receipt
//========================================================
// Multer storage for water receipts
const waterReceiptStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, waterReceiptPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

// Multer instance
const waterReceiptUpload = multer({
  storage: waterReceiptStorage
});

// Upload receipt route
router.post(
  '/water-bill-pay/upload',
  waterReceiptUpload.single('receipt'),
  async (req, res) => {
    try {
      const userId = req.session.user._id;
      const { billId } = req.body;

      if (!req.file) {
        return res.send('No receipt uploaded.');
      }

      const payment = new WaterPayment({
        bill: billId,
        user: userId,
        receipt: req.file.filename,
        status: 'pending'
      });

      await payment.save();

      res.redirect('/user/water-bill');

    } catch (err) {
      console.error(err);
      res.status(500).send('Receipt upload failed.');
    }
  }
);

//========================================
// Multer setup for profile picture upload
//========================================

// 📁 MULTER CONFIG (For updating profile picture)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// ---------------------------------------------------------
// 👤 GET PROFILE PAGE
// ---------------------------------------------------------
router.get('/profile', async (req, res) => {
    try {
        // Ensure user is logged in
        if (!req.session.user) {
            return res.redirect('/login');
        }

        // Fetch user from DB using session email
        const user = await User.findOne({ email: req.session.user.email });

        if (!user) {
            return res.send('User not found.');
        }

        res.render('users/profile', { 
            title: 'My Profile',
            user: user // Pass the database user object to EJS
        });

    } catch (err) {
        console.error(err);
        res.send('Server Error');
    }
});

// ---------------------------------------------------------
// 💾 SAVE PROFILE EDITS
// ---------------------------------------------------------
router.post('/profile', upload.single('profilePic'), async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login');
        }

        // 1. Grab editable fields from the form
        const { givenName, surname, gender, contact, citizenship, birthdate } = req.body;

        // 2. Prepare the update object
        let updateData = {
            givenName,
            surname,
            gender,
            contact,
            citizenship,
            birthdate
        };

        // 3. If a new profile picture was uploaded, add it to the update object
        if (req.file) {
            updateData.profilePic = '/uploads/' + req.file.filename;
        }

        // 4. Update the database (Note: Village, Block, RefNumber are omitted here so users cannot hack the form to change them)
        await User.findOneAndUpdate(
            { email: req.session.user.email }, 
            updateData
        );

        // 5. Refresh the page to show new data
        res.redirect('/user/profile');

    } catch (err) {
        console.error(err);
        res.send('Error saving profile');
    }
});

// ============================
// Change Password Routes
// ============================

// GET Change Password Page
router.get('/change-password', (req, res) => {
  // User must be logged in
  if (!req.session.user) {
    return res.redirect('/login');
  }

  // Get one-time message from session
  const message = req.session.message || null;
  delete req.session.message;

  // IMPORTANT: Pass "message" to EJS
  res.render('users/changePassword', {
    title: 'Change Password',
    user: req.session.user,
    message: message
  });
});


// POST Change Password
router.post('/users/change-password', async (req, res) => {
  try {
    // User must be logged in
    if (!req.session.user) {
      return res.redirect('/login');
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.session.user._id;

    // Find user
    const user = await User.findById(userId);

    if (!user) {
      req.session.message = '❌ User not found.';
      return res.redirect('/login');
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      req.session.message = '❌ Incorrect current password.';
      return res.redirect('/users/change-password');
    }

    // Check if new passwords match
    if (newPassword !== confirmPassword) {
      req.session.message = '❌ Passwords do not match.';
      return res.redirect('/users/change-password');
    }

    // Strong password validation:
    // - At least 12 characters
    // - At least 1 uppercase
    // - At least 1 lowercase
    // - At least 1 number
    // - At least 1 special character
    const strongPasswordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=\[{\]};:'",<.>\/?\\|`~]).{12,}$/;

    if (!strongPasswordRegex.test(newPassword)) {
      req.session.message =
        '❌ Password must be at least 12 characters and include uppercase, lowercase, number, and special character.';
      return res.redirect('/users/change-password');
    }

    // Prevent reusing the current password
    const sameAsCurrent = await bcrypt.compare(newPassword, user.password);

    if (sameAsCurrent) {
      req.session.message =
        '❌ New password must be different from your current password.';
      return res.redirect('/users/change-password');
    }

    // Save new password
    // Do NOT hash here if your User model already hashes in a pre-save hook
    user.password = newPassword;
    await user.save();

    // Success message
    req.session.message = '✅ Password successfully updated!';
    return res.redirect('/users/change-password');

  } catch (err) {
    console.error('Error changing password:', err);
    req.session.message = '❌ Server error changing password.';
    return res.redirect('/users/change-password');
  }
});

//================================================================
//Gym membership form route
//================================================================


// =======================================================
// 📁 MULTER SETUP
// =======================================================

// PROFILE + DOCUMENTS
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/profiles');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const profileUpload = multer({ storage: profileStorage });


// RECEIPTS
const receiptStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/receipts');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const receiptUpload = multer({ storage: receiptStorage });


// =======================================================
// 📊 BASIC USER PAGES
// =======================================================
router.get('/dashboard', isLoggedIn, (req, res) => {
  res.render('users/dashboard', { title: 'User Dashboard' });
});

router.get('/memberships', isLoggedIn, async (req, res) => {
  const user = req.session.user;

  const membership = await Membership.findOne({
    userId: user._id
  }).sort({ createdAt: -1 });

  res.render('users/memberships', {
    title: 'Memberships',
    membership
  });
});


// =======================================================
// 🏋️ GYM ENTRY PAGE
// =======================================================
router.get('/gym', isLoggedIn, async (req, res) => {
  const user = req.session.user;

  const membership = await Membership.findOne({
    userId: user._id
  });

  if (membership) {
    return res.redirect('/user/ongoing-gym');
  }

  res.render('users/gym', { title: 'Gym Membership' });
});

router.get('/gym', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect('/login');
    }

    // 🔥 GET USER
    const user = await User.findOne({ email: req.session.user.email });

    // 🔥 CHECK IF USER HAS ANY MEMBERSHIP (pending or approved)
    const membership = await Membership.findOne({ 
      userId: user._id,
      status: { $in: ['pending', 'approved'] }
    });

    if (membership) {
      // ✅ REDIRECT TO ONGOING PAGE
      return res.redirect('/user/ongoing-membership');
    }

    // ❌ NO MEMBERSHIP → CAN AVAIL
    res.render('users/gym', { title: 'Gym Membership' });

  } catch (err) {
    console.error(err);
    res.send('Server Error');
  }
});


// =======================================================
// 📄 FORM 1 (GET)
// =======================================================
router.get('/gym-form1', isLoggedIn, async (req, res) => {
  const user = await User.findOne({ email: req.session.user.email });

  res.render('users/gym-form1', {
    title: 'Gym Membership Form',
    user,
    plan: req.query.plan
  });
});


// =======================================================
// 📄 FORM 1 (POST) → CREATE MEMBERSHIP
// =======================================================
router.post('/gym-form1', profileUpload.single('profilePic'), async (req, res) => {
  try {
    const currentUserId = req.session.user._id;

    // 🔥 BLOCK DUPLICATES
    const existingMembership = await Membership.findOne({
      userId: currentUserId,
      status: { $in: ['pending', 'approved'] }
    });

    if (existingMembership) {
      return res.redirect('/user/ongoing-gym');
    }

    // ✅ CREATE NEW MEMBERSHIP
    const newMembershipData = {
      userId: currentUserId,
      planType: req.body.planType,

      givenName: req.body.givenName,
      surname: req.body.surname,
      middleName: req.body.middleName,
      citizenship: req.body.citizenship,
      birthdate: req.body.birthdate,
      contact: req.body.contact,

      ownershipType: req.body.ownershipType,
      village: req.body.village,
      blockLot: req.body.blockLot,
      referenceNumber: req.body.referenceNumber,

      leaseStart: req.body.leaseStart || null,
      leaseEnd: req.body.leaseEnd || null,

      emergencyName: req.body.emergencyName,
      emergencyContact: req.body.emergencyContact,

      status: 'pending'
    };

    if (req.file) {
      newMembershipData.profilePic = '/uploads/profiles/' + req.file.filename;
    }

    const membership = new Membership(newMembershipData);
    await membership.save();

    res.redirect(`/user/gym-form2?id=${membership._id}`);

  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});

// =======================================================
// 📄 FORM 2 (GET)
// =======================================================
router.get('/gym-form2', isLoggedIn, async (req, res) => {
  const membership = await Membership.findById(req.query.id);

  if (!membership) return res.send("Membership not found");

  res.render('users/gym-form2', {
    title: "Gym Membership Form 2",
    membership
  });
});


// =======================================================
// 📄 FORM 2 (POST) → UPLOAD DOCUMENTS
// =======================================================
const multiUpload = profileUpload.fields([
  { name: 'membershipCard', maxCount: 1 },
  { name: 'proofOfOwnership', maxCount: 1 },
  { name: 'endorsementLetter', maxCount: 1 },
  { name: 'validId', maxCount: 1 },
  { name: 'contractOfLease', maxCount: 1 }
]);

router.post('/gym-form2', isLoggedIn, multiUpload, async (req, res) => {
  try {
    const user = req.session.user;
    const id = req.body.membershipId;

    const update = {};

    if (req.files.membershipCard)
      update.membershipCardDoc = '/uploads/profiles/' + req.files.membershipCard[0].filename;

    if (req.files.proofOfOwnership)
      update.proofOfOwnershipDoc = '/uploads/profiles/' + req.files.proofOfOwnership[0].filename;

    if (req.files.endorsementLetter)
      update.endorsementLetterDoc = '/uploads/profiles/' + req.files.endorsementLetter[0].filename;

    if (req.files.validId)
      update.validIdDoc = '/uploads/profiles/' + req.files.validId[0].filename;

    if (req.files.contractOfLease)
      update.contractOfLeaseDoc = '/uploads/profiles/' + req.files.contractOfLease[0].filename;

    await Membership.findOneAndUpdate(
      { _id: id, userId: user._id },
      update
    );

    res.redirect(`/user/gym-payment?id=${id}`);

  } catch (err) {
    console.error(err);
    res.send("Error saving documents");
  }
});


// =======================================================
// 💳 PAYMENT (GET)
// =======================================================
router.get('/gym-payment', isLoggedIn, async (req, res) => {
  const membership = await Membership.findById(req.query.id);

  if (!membership) return res.send("Not found");

  res.render('users/gym-payment', {
    title: 'Gym Payment',
    membership
  });
});


// =======================================================
// 💳 PAYMENT (POST) → FINAL STEP
// =======================================================
router.post('/gym-payment', isLoggedIn, receiptUpload.single('receipt'), async (req, res) => {
  try {
    const user = req.session.user;
    const id = req.body.membershipId;

    await Membership.findOneAndUpdate(
      { _id: id, userId: user._id },
      {
        receipt: '/uploads/receipts/' + req.file.filename,
        status: "pending"
      }
    );

    res.redirect('/user/ongoing-gym');

  } catch (err) {
    console.error(err);
    res.send("Payment error");
  }
});


// =======================================================
// 📊 ONGOING MEMBERSHIP PAGE
// =======================================================
// =======================================================
// 📊 ONGOING MEMBERSHIP PAGE
// =======================================================
router.get('/ongoing-gym', isLoggedIn, async (req, res) => {
  const user = req.session.user;

  const membership = await Membership.findOne({
    userId: user._id
  }).sort({ createdAt: -1 });

  // 🔥 CALCULATE DAYS REMAINING
  if (membership && membership.endDate && membership.status === 'approved') {
    const today = new Date();
    const end = new Date(membership.endDate);

    const diffTime = end - today;
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    membership.daysRemaining = daysRemaining > 0 ? daysRemaining : 0;
  }

  res.render('users/ongoing-gym', {
    title: 'Ongoing Gym Membership',
    membership
  });
});

module.exports = router;