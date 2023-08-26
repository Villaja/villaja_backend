const express = require("express");
const router = express.Router();
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const axios = require("axios");
const ErrorHandler = require("../utils/ErrorHandler");
const {validateProcessPayment} = require('../validation/paymentValidation')


const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;

// Route to create a payment request
router.post(
  "/process",
  catchAsyncErrors(async (req, res, next) => {
    try {
      
      let validation = validateProcessPayment(req.body)
      if(validation.error) return next(new ErrorHandler(validation.error.details[0].message, 400));
    

      //payment request to Paystack
      const response = await axios.post(
        "https://api.paystack.co/transaction/initialize",
        {
          amount: req.body.amount * 100, 
          email: req.body.email, 
          metadata: {
            company: "bolu's Bussiness",
          },
        },
        {
          headers: {
            Authorization: `Bearer ${paystackSecretKey}`,
          },
        }
      );

      //Paystack response to the client
      res.status(200).json({
        success: true,
        payment_link: response.data.data.authorization_url,
      });
    } catch (error) {
      // Handle errors here
      next(error);
    }
  })
);

// Route to get the Paystack API key
router.get(
  "/paystackapikey",
  catchAsyncErrors(async (req, res, next) => {
    res.status(200).json({ paystackApiKey: paystackSecretKey });
  })
);

module.exports = router;
