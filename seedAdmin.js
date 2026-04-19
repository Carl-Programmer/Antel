require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/user'); // Ensure this path matches your folder structure

async function createAdmin() {
  try {
    // 1. Connect to the database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    // 2. Check if admin already exists so we don't make duplicates
    const adminExists = await User.findOne({ email: 'admin@antel.com' });
    if (adminExists) {
      console.log('⚠️ Admin account already exists. You are good to go!');
      process.exit();
    }

    // 3. Hash the password
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // 4. Create the Admin User overriding the defaults
    const adminUser = new User({
      givenName: 'System',
      surname: 'Administrator',
      gender: 'N/A',
      contact: '000-000-0000',
      citizenship: 'N/A',
      birthdate: new Date('2000-01-01'),
      village: 'System Village',
      blockLot: 'Block 0',
      referenceNumber: 'SYS-ADMIN-001',
      ownershipType: 'System',
      email: 'admin@antel.com',
      password: hashedPassword,
      role: 'admin',      // 👈 Forcing the admin role
      status: 'active'    // 👈 Forcing the active status
    });

    await adminUser.save();
    
    console.log('🎉 First Admin successfully created!');
    console.log('-----------------------------------');
    console.log('📧 Email: admin@antel.com');
    console.log('🔑 Password: admin123');
    console.log('-----------------------------------');

  } catch (error) {
    console.error('❌ Error creating admin:', error);
  } finally {
    // Disconnect so the script finishes and exits the terminal gracefully
    mongoose.connection.close();
  }
}

createAdmin();