const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Membership = require('../models/Membership');
const session = require('express-session');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

//===========================================
// Admin Dashboard Routes
//===========================================

// 📊 Dashboard
router.get('/dashboard', (req, res) => {
  res.render('admin/dashboard', {
    title: 'Admin Dashboard',
    page: 'dashboard'
  });
});

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

// ✏️ EDIT USER ROUTE (Placeholder)
router.get('/edit-user/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.send('User not found');
        }

        // For now, just send text. 
        // Later, change this to: res.render('admin/editUser', { user });
        res.send(`This will be the edit page for ${user.givenName} ${user.surname}.`);
    } catch (err) {
        console.error(err);
        res.send('Error loading edit page');
    }
});


// 🔐 simple admin guard (adjust if you have middleware)
function isAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.redirect('/login');
  }
  next();
}

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