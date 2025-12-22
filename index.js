/**
* Script to create an admin user
* Run: node scripts/createAdmin.js
*/
 
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('./models/admin.model');
// const Admin = require('../../rides/');
 
const createAdmin = async () => {
  try {
    // Connect to MongoDB
    const mongoURI = `mongodb+srv://nagpalprakankshabvpy_db_user:qwertyuiop@cluster0.n7rle9y.mongodb.net/?appName=Cluster0`
    // const mongoURI = `mongodb+srv://nagpalprakankshabvpy_db_user:qwertyuiop@cluster0.n7rle9y.mongodb.net/rides?retryWrites=true&w=majority`;
    
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');
 
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: 'admin@example.com' });
    if (existingAdmin) {
      console.log('⚠️ Admin with this email already exists');
      process.exit(0);
    }
 
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Waplia@123', salt);
 
    // Create admin
    const admin = await Admin.create({
      firstName: 'Super',
      lastName: 'Admin',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'admin',
      status: 'active',
      isPasswordSet: true
    });
 
    console.log(admin,'✅ Admin created successfully!');
    console.log('📧 Email: admin@example.com');
    console.log('🔑 Password: Waplia@123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};
 
createAdmin();
 