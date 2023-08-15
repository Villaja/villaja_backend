const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  updateUser,
  getUserDetails,
} = require('../controller/userController');

const { protect } = require('../middlewares/userAuthMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.put('/update', protect, updateUser);
router.get('/details', protect, getUserDetails);

module.exports = router;
