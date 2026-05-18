const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Membership = require('../models/Membership');
const session = require('express-session');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const WaterBill = require('../models/WaterBill');
const WaterPayment = require('../models/WaterPayment');

//===========================================
// Admin Dashboard Routes
//===========================================


// 👥 Manage Users (MERGED ROUTE: Fetches DB data AND renders page)
router.get('/users', async (req, res) => {
  const users = await User.find();
  
  // Note: Adjust the view name if needed. 
  // I kept 'admin/users' from your top route, and passed the 'users' array from your bottom route.
  res.render('admin/users', {
    title: 'Manage Users',
    page: 'users',
    users: users 
  });
});

// 💵 Monthly Bills
router.get('/bills', (req, res) => {
  res.render('admin/bills', {
    title: 'Manage Monthly Bills',
    page: 'bills'
  });
});

// 📅 Appointments
router.get('/appointments', (req, res) => {
  res.render('admin/appointments', {
    title: 'Manage Appointments',
    page: 'appointments'
  });
});

// 🏋️ Memberships
router.get('/memberships', (req, res) => {
  res.render('admin/memberships', {
    title: 'Manage Memberships',
    page: 'memberships'
  });
});

// ⚠️ Concerns
router.get('/concerns', (req, res) => {
  res.render('admin/concerns', {
    title: 'Other Concerns',
    page: 'concerns'
  });
});

// 💬 Feedbacks
router.get('/feedbacks', (req, res) => {
  res.render('admin/feedbacks', {
    title: 'Feedbacks',
    page: 'feedbacks'
  });
});


// MAINTENANCE
router.get('/bills/maintenance/uploadMaintenance', (req, res) => {
  res.render('admin/bills/maintenance/uploadMaintenance', {
    title: 'Upload Maintenance Bill'
  });
});

router.get('/bills/maintenance/manageMaintenance', (req, res) => {
  res.render('admin/bills/maintenance/manageMaintenance', {
    title: 'Manage Maintenance Bills'
  });
});

// =======================================================
// 📊 ADMIN DASHBOARD
// =======================================================


// =======================================================
// 📊 ADMIN DASHBOARD
// =======================================================
router.get('/dashboard', async (req, res) => {
  try {
    // Count all users
    const totalUsers = await User.countDocuments({});

    // Count unpaid and overdue water bills
    // Since your WaterBill model defaults to status: 'unpaid',
    // this will count all unpaid bills, including overdue ones
    const pendingDues = await WaterBill.countDocuments({
      status: { $in: ['unpaid', 'due'] }
    });

    // Count active gym memberships
    // If none are marked as 'active' yet, also count 'approved'
    const gymMembers = await Membership.countDocuments({
      status: { $in: ['active', 'approved'] }
    });

    // Render dashboard with actual values
    res.render('admin/dashboard', {
      title: 'Dashboard',
      totalUsers,
      pendingDues,
      appointments: 0,
      gymMembers,
      otherConcerns: 0,
      feedbacks: 0
    });

  } catch (err) {
    console.error('Dashboard Error:', err);

    // Fallback values so the page still loads
    res.render('admin/dashboard', {
      title: 'Dashboard',
      totalUsers: 0,
      pendingDues: 0,
      appointments: 0,
      gymMembers: 0,
      otherConcerns: 0,
      feedbacks: 0
    });
  }
});
//===========================================
// User Approval Actions
//===========================================

// 🔄 UPDATE USER STATUS (AJAX / Background Update)
router.post('/update-status/:id', async (req, res) => {
    try {
        // req.body.status works here because we set 'Content-Type': 'application/json' in the fetch request
        // AND you already have app.use(express.urlencoded({ extended: true })); and app.use(express.json()); in index.js 
        // (Make sure you add app.use(express.json()); to your index.js if you haven't yet!)
        
        await User.findByIdAndUpdate(req.params.id, {
            status: req.body.status
        });
        
        // Respond with JSON so the frontend knows it worked
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});





// 🔐 simple admin guard (adjust if you have middleware)
function isAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.redirect('/login');
  }
  next();
}

// ============================
// Edit User Routes (Admin)
// ============================

router.get('/users/edit/:id', async (req, res) => {
  try {
    // Only allow admins
    if (!req.session.user || req.session.user.role !== 'admin') {
      return res.redirect('/login');
    }

    // Find user by ID
    const user = await User.findById(req.params.id);

    if (!user) {
      req.session.message = '❌ User not found.';
      return res.redirect('/admin/users');
    }

    // Render edit-user.ejs
    res.render('admin/edit-user', {
      title: 'Edit Users',
      user
    });

  } catch (err) {
    console.error('Error loading edit user page:', err);
    req.session.message = '❌ Error loading user.';
    return res.redirect('/admin/users');
  }
});


// POST Save Edited User
// Final URL: /admin/users/edit/:id
// Redirects to the Users page (users.ejs) via /admin/users
router.post('/users/edit/:id', async (req, res) => {
  try {
    // Only allow admins
    if (!req.session.user || req.session.user.role !== 'admin') {
      return res.redirect('/login');
    }

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
      role
    } = req.body;

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      {
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
        role
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!updatedUser) {
      req.session.message = '❌ User not found.';
      return res.redirect('/admin/users');
    }

    req.session.message = '✅ User successfully updated!';
    return res.redirect('/admin/users'); // loads users.ejs
  } catch (err) {
    console.error('Error updating user:', err);
    req.session.message = '❌ Error updating user.';
    return res.redirect('/admin/users');
  }
});


// ======================================
// POST Archive User Account
// URL: /admin/users/archive/:id
// ======================================
router.post('/users/archive/:id', async (req, res) => {
  try {
    // Only allow admins
    if (!req.session.user || req.session.user.role !== 'admin') {
      return res.redirect('/login');
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status: 'archived' },
      { new: true }
    );

    if (!user) {
      req.session.message = '❌ User not found.';
      return res.redirect('/admin/users');
    }

    req.session.message = '📦 User account archived successfully.';
    return res.redirect('/admin/users');
  } catch (err) {
    console.error('Error archiving user:', err);
    req.session.message = '❌ Error archiving user.';
    return res.redirect('/admin/users');
  }
});


// ======================================
// POST Unarchive User Account
// URL: /admin/users/unarchive/:id
// ======================================
router.post('/users/unarchive/:id', async (req, res) => {
  try {
    // Only allow admins
    if (!req.session.user || req.session.user.role !== 'admin') {
      return res.redirect('/login');
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status: 'active' }, // Restore archived user to active status
      { new: true }
    );

    if (!user) {
      req.session.message = '❌ User not found.';
      return res.redirect('/admin/users');
    }

    req.session.message = '📂 User account unarchived successfully.';
    return res.redirect('/admin/users');
  } catch (err) {
    console.error('Error unarchiving user:', err);
    req.session.message = '❌ Error unarchiving user.';
    return res.redirect('/admin/users');
  }
});

// =======================================================
// 💧 MANAGE WATER BILLS
// =======================================================
router.get('/bills/water/uploadWater', async (req, res) => {
  const users = await User.find();

  res.render('admin/bills/water/uploadWater', {
    title: 'Upload Water Bill',
    users
  });
});

const uploadPath = 'uploads/waterBills';
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath); // ✅ updated path
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// OPEN PAGE
router.get('/bills/water/uploadForm/:userId', async (req, res) => {
  const user = await User.findById(req.params.userId);

  if (!user) {
    return res.send('User not found');
  }

  res.render('admin/bills/water/uploadWaterForm', {
    title: 'Upload Water Bill',
    user
  });
});
// HANDLE UPLOAD

router.post('/bills/water/upload', upload.single('bill'), async (req, res) => {
  try {
    const { userId, dueDate, amount } = req.body;

    if (!req.file) {
      return res.send('No file uploaded');
    }

    const newBill = new WaterBill({
      user: userId,
      file: req.file.filename,
      dueDate,
      amount
    });

    await newBill.save();

    res.redirect('/admin/bills/water/uploadWater');

  } catch (err) {
    console.error(err);
    res.status(500).send('Upload failed');
  }
});
// =======================================================
// 💧 MANAGE WATER BILLS (Dynamic Tabs)
// =======================================================
router.get('/bills/water/manageWater', async (req, res) => {
  try {
    const tab = req.query.tab || 'unpaid';
    const now = new Date();

    const firstDayOfMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );

    const lastDayOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23, 59, 59, 999
    );

    // Counts for all tabs
    const unpaidCount = await WaterBill.countDocuments({
      status: 'unpaid',
      dueDate: {
        $gte: now,
        $lte: lastDayOfMonth
      }
    });

    const approvalCount = await WaterPayment.countDocuments({
      status: 'pending'
    });

    const dueCount = await WaterBill.countDocuments({
      status: 'unpaid',
      dueDate: { $lt: now }
    });

    const completedCount = await WaterBill.countDocuments({
      status: 'paid'
    });

    // Determine which data to load
    let bills = [];
    let payments = [];

    if (tab === 'approval') {
      payments = await WaterPayment.find({ status: 'pending' })
        .populate('user')
        .populate('bill')
        .sort({ uploadedAt: -1 });
    }

    else if (tab === 'due') {
      bills = await WaterBill.find({
        status: 'unpaid',
        dueDate: { $lt: now }
      })
        .populate('user')
        .sort({ dueDate: 1 });
    }

    else if (tab === 'completed') {
      bills = await WaterBill.find({
        status: 'paid'
      })
        .populate('user')
        .sort({ paidAt: -1 });
    }

    else {
      // unpaid (default)
      bills = await WaterBill.find({
        status: 'unpaid',
        dueDate: {
          $gte: now,
          $lte: lastDayOfMonth
        }
      })
        .populate('user')
        .sort({ dueDate: 1 });
    }

    res.render('admin/bills/water/manageWater', {
      title: 'Manage Water Bills',
      tab,
      bills,
      payments,
      unpaidCount,
      approvalCount,
      dueCount,
      completedCount
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading water bills.');
  }
});

// =======================================================
// 📊 MANAGE MEMBERSHIPS (landing)
// =======================================================
router.get('/memberships', isAdmin, (req, res) => {
  res.render('admin/memberships', { title: 'Manage Memberships' });
});

// =======================================================
// 🏋️ FITNESS STATION LIST
// =======================================================
router.get('/memberships/gym', isAdmin, async (req, res) => {
  const memberships = await Membership.find()
    .sort({ createdAt: -1 })
    .populate('userId'); // so you can show user info

  res.render('admin/gym-list', {
    title: 'Fitness Station Members',
    memberships
  });
});

// =======================================================
// 👁 VIEW ONE MEMBERSHIP
// =======================================================
router.get('/memberships/gym/:id', isAdmin, async (req, res) => {
  const membership = await Membership.findById(req.params.id)
    .populate('userId');

  if (!membership) return res.redirect('/admin/memberships/gym');

  res.render('admin/gym-view', {
    title: 'Membership Details',
    membership
  });
});

// =======================================================
// ✅ APPROVE
// =======================================================
// =======================================================
// ✅ APPROVE
// =======================================================
router.post('/memberships/gym/:id/approve', isAdmin, async (req, res) => {
  try {
    const membership = await Membership.findById(req.params.id);

    if (!membership) {
      return res.redirect('/admin/memberships/gym');
    }

    // 🔥 PREVENT DOUBLE APPROVAL
    if (membership.status !== 'pending') {
      return res.redirect('/admin/memberships/gym');
    }

    // ✅ SET STATUS
    membership.status = 'approved';

    // ✅ SET START DATE
    const startDate = new Date();
    membership.startDate = startDate;

    // ✅ AUTO SET END DATE BASED ON PLAN
    let endDate = new Date(startDate);

    switch (membership.planType) {
      case 'Monthly':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case 'Quarterly':
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      case 'Semi-Annually':
        endDate.setMonth(endDate.getMonth() + 6);
        break;
      case 'Annually':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
      default:
        endDate.setMonth(endDate.getMonth() + 1);
    }

    membership.endDate = endDate;

    await membership.save();

    res.redirect('/admin/memberships/gym');

  } catch (err) {
    console.error(err);
    res.send("Error approving membership");
  }
});

// =======================================================
// ❌ REJECT
// =======================================================
// =======================================================
// ❌ REJECT
// =======================================================
router.post('/memberships/gym/:id/reject', isAdmin, async (req, res) => {
  try {
    const membership = await Membership.findById(req.params.id);

    if (!membership) {
      return res.redirect('/admin/memberships/gym');
    }

    // 🔥 PREVENT DOUBLE ACTION
    if (membership.status !== 'pending') {
      return res.redirect('/admin/memberships/gym');
    }

    membership.status = 'rejected';
    await membership.save();

    res.redirect('/admin/memberships/gym');

  } catch (err) {
    console.error(err);
    res.send("Error rejecting membership");
  }
});
module.exports = router;