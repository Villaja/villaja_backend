const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const asyncHandler = require('express-async-handler');
const User = require('../models/userModel');

const {validateRegistration,validateLogin, validateUpdate} = require('../validation/userValidation')

// Register user
const registerUser = asyncHandler(async (req, res) => {
  const { email, firstname, lastname, phoneNumber, password } = req.body;
  if (!email || !password) {
    res.status(400);
    throw new Error('Please add all fields');
  }

  //validate user Registration data
  let validation = validateRegistration(req.body);
  if (validation.error) {
    res.status(400)
    throw new Error(validation.error.details[0].message)
  
  }

  // Check if user exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create user
  const user = await User.create({
    email,
    firstname,
    lastname,
    phoneNumber,
    password: hashedPassword,
  });

  // Send response
  res.status(201).json({
    _id: user.id,
    firstname: user.firstname,
    lastname: user.lastname,
    phoneNumber: user.phoneNumber,
    email: user.email,
    token: generateToken(user._id),
  });
});

// Authenticate user
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  //validate user Login data
  let validation = validateLogin(req.body);
  if (validation.error) {
    res.status(400)
    throw new Error(validation.error.details[0].message)
  
  }

  // Check for user email
  const user = await User.findOne({ email });

  if (user && (await bcrypt.compare(password, user.password))) {
    res.json({
      _id: user.id,
      firstname: user.firstname,
      lastname: user.lastname,
      phoneNumber: user.phoneNumber,
      email: user.email,
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error('Invalid credentials');
  }
});



// Update user information
const updateUser = asyncHandler(async (req, res) => {
  const { firstname, lastname, phoneNumber} = req.body;
  const userId = req.user._id;

  //validate user update data
  let validation = validateUpdate(req.body);
  if (validation.error) {
    res.status(400)
    throw new Error(validation.error.details[0].message)
  
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    
    user.firstname = firstname;
    user.lastname = lastname;
    user.phoneNumber = phoneNumber;

    await user.save();

    res.status(200).json({ message: 'User information updated successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user information.' });
  }
});



// user details

const getUserDetails = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user details.' });
  }
});

// Generate JWT
const generateToken = (userid) => {
  try {
    return jwt.sign({ userid }, process.env.JWT_SEC, {
      expiresIn: '5d',
    });
  } catch (error) {
    throw new Error('Failed to generate token');
  }
};


module.exports = {
  registerUser,
  loginUser,
  updateUser,
  getUserDetails,
};
