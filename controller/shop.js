const express = require("express");
const path = require("path");
const router = express.Router();
const jwt = require("jsonwebtoken");
const sendMail = require("../utils/sendMail");
const Shop = require("../model/shop");
const { isSeller, } = require("../middleware/auth");
const cloudinary = require("cloudinary");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const ErrorHandler = require("../utils/ErrorHandler");
const sendShopToken = require("../utils/shopToken");

// create shop
router.post("/create-shop", catchAsyncErrors(async (req, res, next) => {
  try {
    const { email } = req.body;
    const sellerEmail = await Shop.findOne({ email });

    if (sellerEmail) {
      return next(new ErrorHandler("shop already exists", 400));
    }

    let avatar = {}; // Initialize an empty avatar object

    if (req.body.avatar) {
      const myCloud = await cloudinary.v2.uploader.upload(req.body.avatar, {
        folder: "avatars",
      });

      avatar = {
        public_id: myCloud.public_id,
        url: myCloud.secure_url,
      };
    } else {
      // default image URL when no logo is provided
      avatar = {
        public_id: "avatars/r918vmwdsmdrdvdgz1na",
        url: "https://res.cloudinary.com/derf8sbin/image/upload/v1692133632/avatars/r918vmwdsmdrdvdgz1na.jpg"
      };
    }

    const seller = {
      name: req.body.name,
      email,
      password: req.body.password,
      avatar,
      address: req.body.address,
      phoneNumber: req.body.phoneNumber,
      zipCode: req.body.zipCode,
    };

    const newSeller = await Shop.create({
      name: seller.name,
      email: seller.email,
      avatar: seller.avatar,
      password: seller.password,
      zipCode: seller.zipCode,
      address: seller.address,
      phoneNumber: seller.phoneNumber,
    });


    sendShopToken(newSeller, 201, res);
    sendMail({
       email,
       subject:"Villaja Shop Successfully Created",
       message:"Villaja Shop has been created successfully",
       html:`<h2>Hello ${seller.name},</h2> <p>Thank you for joining villaja your Shop has been created successfully.</p> <p>Thanks, </br></br> Villaja Team</p>`
    }) 
  } catch (error) {
    console.error("Error during shop creation:", error); 
    return res.status(500).json({ error: error.message }); 
  }
}));


// login shop
router.post(
  "/login-shop",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return next(new ErrorHandler("Please provide the all fields!", 400));
      }

      const user = await Shop.findOne({ email }).select("+password");

      if (!user) {
        return next(new ErrorHandler("shop doesn't exists!", 400));
      }

      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        return next(
          new ErrorHandler("invalid creddentials", 400)
        );
      }

      sendShopToken(user, 201, res);
      sendMail({
       email,
       subject:`Successful sign-in for ${email}`,
       message:`We're verifying a recent sign-in for ${email}`,
       html:`<h3>Hello ${user.name},</h3> <p>We're verifying a recent sign-in for ${email}</p> <p>Timestamp: ${new Date().toLocaleString()}</p> <p>If you believe that this sign-in is suspicious, please reset your password immediately.</p> <p>Thanks, </br></br> Villaja Team</p>`
    })
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// load shop
router.get(
  "/getSeller",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const seller = await Shop.findById(req.seller._id);

      if (!seller) {
        return next(new ErrorHandler("shop not found", 400));
      }

      res.status(200).json({
        success: true,
        seller,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// log out from shop
router.get(
  "/logout",
  catchAsyncErrors(async (req, res, next) => {
    try {
      res.cookie("seller_token", null, {
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

// get shop info
router.get(
  "/get-shop-info/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const shop = await Shop.findById(req.params.id);
      res.status(201).json({
        success: true,
        shop,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update shop profile picture
router.put(
  "/update-shop-avatar",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      let existsSeller = await Shop.findById(req.seller._id);

        const imageId = existsSeller.avatar.public_id;

        await cloudinary.v2.uploader.destroy(imageId);

        const myCloud = await cloudinary.v2.uploader.upload(req.body.avatar, {
          folder: "avatars",
          width: 150,
        });

        existsSeller.avatar = {
          public_id: myCloud.public_id,
          url: myCloud.secure_url,
        };

  
      await existsSeller.save();

      res.status(200).json({
        success: true,
        seller:existsSeller,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update seller info
router.put(
  "/update-seller-info",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { name, description, address, phoneNumber, zipCode } = req.body;

      const shop = await Shop.findOne(req.seller._id);

      if (!shop) {
        return next(new ErrorHandler("User not found", 400));
      }

      shop.name = name;
      shop.description = description;
      shop.address = address;
      shop.phoneNumber = phoneNumber;
      shop.zipCode = zipCode;

      await shop.save();

      sendMail({
       email:shop.email,
       subject:`Seller Information Updated for ${shop.email}`,
       message:`We're verifying a recent seller information update for ${shop.email}`,
       html:`<h3>Hello ${shop.firstname},</h3> <p>We're verifying a recent seller information update for ${shop.email}</p> <p>Timestamp: ${new Date().toLocaleString()}</p> <p>If you believe that this action is suspicious, please reset your password immediately.</p> <p>Thanks, </br></br> Villaja Team</p>`
    })
      res.status(201).json({
        success: true,
        shop,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);


module.exports = router;
