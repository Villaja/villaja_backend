const express = require("express");
const User = require("../model/user");
const router = express.Router();
const cloudinary = require("cloudinary");
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const jwt = require("jsonwebtoken");
const {validateRegistration,validateLogin,validateUpdate,ValidateUserAddresses,ValidateUpdateUserPassword} = require('../validation/userValidation')
const sendMail = require("../utils/sendMail");
const sendToken = require("../utils/jwtToken");
const { isAuthenticated, isAdmin } = require("../middleware/auth");



router.post("/register", async (req, res, next) => {
  try {
    const { firstname, lastname, email, phoneNumber, role, password} = req.body;

    let validation = validateRegistration(req.body)
    if(validation.error) return next(new ErrorHandler(validation.error.details[0].message, 400));

    const userEmail = await User.findOne({ email });

    if (userEmail) {
      return next(new ErrorHandler("User already exists", 400));
    }

    

    const user = {
      firstname: firstname,
      lastname: lastname,
      phoneNumber: phoneNumber,
      email: email,
      role: "Admin",
      password: password,
    };

    const newUser = await User.create({
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      role: "Admin",
      phoneNumber: user.phoneNumber,
      password: user.password,
    });
    sendToken(newUser, 201, res);
    // sendMail({
    //    email,
    //    subject:"Villaja Account Successfully Created",
    //    message:"Thank you for joining villaja your account has been created successfully",
    //    html:`<h2>Hello ${firstname},</h2> <p>Thank you for joining villaja your account has been created successfully.</p> <p>Thanks, </br></br> Villaja Team</p>`
    // }) 
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});


// login user
router.post(
  "/login",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { email, password } = req.body;

      let validation = validateLogin(req.body)
      if(validation.error) return next(new ErrorHandler(validation.error.details[0].message, 400));

      if (!email || !password) {
        return next(new ErrorHandler("Please provide the all fields!", 400));
      }

      const user = await User.findOne({ email }).select("+password");

      if (!user) {
        return next(new ErrorHandler("User doesn't exists!", 400));
      }

      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        return next(
          new ErrorHandler("Invalid credentials", 400)
        );
      }

      sendMail({
       email,
       subject:`Successful sign-in for ${email}`,
       message:`We're verifying a recent sign-in for ${email}`,
       html:`<h3>Hello ${user.firstname},</h3> <p>We're verifying a recent sign-in for ${email}</p> <p>Timestamp: ${new Date().toLocaleString()}</p> <p>If you believe that this sign-in is suspicious, please reset your password immediately.</p> <p>Thanks, </br></br> Villaja Team</p>`
    }) 
      sendToken(user, 201, res);
      
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);


// load user
router.get(
  "/getuser",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id);

      if (!user) {
        return next(new ErrorHandler("User doesn't exists", 400));
      }

      res.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// log out user
router.get(
  "/logout",
  catchAsyncErrors(async (req, res, next) => {
    try {
      res.cookie("token", null, {
        expires: new Date(Date.now()),
        httpOnly: true,
        sameSite: "none",
        secure: true,
      });
      res.status(201).json({
        success: true,
        message: "Log out successful!",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update user info
router.put(
  "/update-user-info",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { email, password, phoneNumber, firstname, lastname } = req.body;

      let validation = validateUpdate(req.body)
      if(validation.error) return next(new ErrorHandler(validation.error.details[0].message, 400));

      const user = await User.findOne({ email }).select("+password");

      if (!user) {
        return next(new ErrorHandler("User not found", 400));
      }

      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        return next(
          new ErrorHandler("Please provide the correct information", 400)
        );
      }

      user.firstname = firstname;
      user.lastname = lastname;
      user.email = email;
      user.phoneNumber = phoneNumber;

      await user.save();

    //   sendMail({
    //    email,
    //    subject:`User Information Updated for ${email}`,
    //    message:`We're verifying a recent user information update for ${email}`,
    //    html:`<h3>Hello ${user.firstname},</h3> <p>We're verifying a recent user information update for ${email}</p> <p>Timestamp: ${new Date().toLocaleString()}</p> <p>If you believe that this action is suspicious, please reset your password immediately.</p> <p>Thanks, </br></br> Villaja Team</p>`
    // })
      res.status(201).json({
        success: true,
        user,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);


// update user addresses // or add user adress
router.put(
  "/update-user-addresses",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      let validation = ValidateUserAddresses(req.body)
      if(validation.error) return next(new ErrorHandler(validation.error.details[0].message, 400));

      const user = await User.findById(req.user.id);

      const sameTypeAddress = user.addresses.find(
        (address) => address.addressType === req.body.addressType
      );
      if (sameTypeAddress) {
        return next(
          new ErrorHandler(`${req.body.addressType} address already exists`)
        );
      }

      const existsAddress = user.addresses.find(
        (address) => address._id === req.body._id
      );

      if (existsAddress) {
        Object.assign(existsAddress, req.body);
      } else {
        // add the new address to the array
        user.addresses.push(req.body);
      }

      await user.save();

      res.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// delete user address
router.delete(
  "/delete-user-address/:id",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const userId = req.user._id;
      const addressId = req.params.id;

      await User.updateOne(
        {
          _id: userId,
        },
        { $pull: { addresses: { _id: addressId } } }
      );

      const user = await User.findById(userId);

      res.status(200).json({ success: true, user });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update user password
router.put(
  "/update-user-password",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      let validation = ValidateUpdateUserPassword(req.body)
      if(validation.error) return next(new ErrorHandler(validation.error.details[0].message, 400));

      const user = await User.findById(req.user.id).select("+password");

      const isPasswordMatched = await user.comparePassword(
        req.body.oldPassword
      );

      if (!isPasswordMatched) {
        return next(new ErrorHandler("Old password is incorrect!", 400));
      }

      if (req.body.newPassword !== req.body.confirmPassword) {
        return next(
          new ErrorHandler("Password doesn't matched with each other!", 400)
        );
      }
      user.password = req.body.newPassword;

      await user.save();

    //   sendMail({
    //    email:user.email,
    //    subject:`Password Changed Successfully ${user.email}`,
    //    message:`We're verifying a recent Password Change for ${user.email}`,
    //    html:`<h3>Hello ${user.firstname},</h3> <p>We're verifying a recent Password Change for ${user.email}</p> <p>Timestamp: ${new Date().toLocaleString()}</p>  <p>Thanks, </br></br> Villaja Team</p>`
    // })
      res.status(200).json({
        success: true,
        message: "Password updated successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// find user infoormation with the userId
router.get(
  "/user-info/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const user = await User.findById(req.params.id);

      res.status(201).json({
        success: true,
        user,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// all users --- for admin
router.get(
  "/admin-all-users",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const users = await User.find().sort({
        createdAt: -1,
      });
      res.status(201).json({
        success: true,
        users,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// delete users --- admin
router.delete(
  "/delete-user/:id",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const user = await User.findById(req.params.id);

      if (!user) {
        return next(
          new ErrorHandler("User is not available with this id", 400)
        );
      }

      // const imageId = user.avatar.public_id;

      // await cloudinary.v2.uploader.destroy(imageId);

      await User.findByIdAndDelete(req.params.id);

      res.status(201).json({
        success: true,
        message: "User deleted successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router;
