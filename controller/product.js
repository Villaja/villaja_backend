const express = require("express");
const { isSeller, isAuthenticated, isAdmin } = require("../middleware/auth");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const router = express.Router();
const Product = require("../model/product");
const Order = require("../model/order");
const Shop = require("../model/shop");
const sendMail = require("../utils/sendMail");
const cloudinary = require("cloudinary");
const ErrorHandler = require("../utils/ErrorHandler");
const {validateCreateProduct} = require('../validation/productValidation')
const mongoose = require("mongoose");

// create product
router.post(
  "/create-product",
  catchAsyncErrors(async (req, res, next) => {
    try {
      let validation = validateCreateProduct(req.body);
      if (validation.error) return next(new ErrorHandler(validation.error.details[0].message, 400));

      const shopId = req.body.shopId;
      const shop = await Shop.findById(shopId);

      if (!shop) {
        return next(new ErrorHandler("Shop Id is invalid!", 400));
      } else {
        let imagesLinks = [];

        if (req.body.images && req.body.images.length > 0) {
          for (let i = 0; i < req.body.images.length; i++) {
            const result = await cloudinary.v2.uploader.upload(req.body.images[i], {
              folder: "products",
            });

            imagesLinks.push({
              public_id: result.public_id,
              url: result.secure_url,
            });
          }
        } else {
          // If images are not provided, use a placeholder image
          imagesLinks.push({
            public_id: "avatars/r918vmwdsmdrdvdgz1na",
            url: "https://res.cloudinary.com/derf8sbin/image/upload/v1692133632/avatars/r918vmwdsmdrdvdgz1na.jpg",
          });
        }

        const productData = req.body;
        productData.images = imagesLinks;

        // Assign the entire shop object to productData.shop
        productData.shop = shop;

        const product = await Product.create(productData);

        // sendMail({
        //   email: shop.email,
        //   subject: `Product Created Successfully for ${shop.email}`,
        //   message: `We're verifying a recent Product Creation for ${shop.email}`,
        //   html: `<h3>Hello ${shop.name},</h3> <p>We're verifying a recent product creation for ${shop.email}</p> <p>Timestamp: ${new Date().toLocaleString()} </br>Shop Name: ${shop.name} </br>Product Name: ${product.name}</p> <p>If you believe that this action is suspicious, please reset your password immediately.</p> <p>Thanks, </br></br> Villaja Team</p>`
        // });

        res.status(201).json({
          success: true,
          product,
        });
      }
    } catch (error) {
     
      return next(new ErrorHandler(error, 400));
    }
  })
);



// get all products of a shop
router.get(
  "/get-all-products-shop/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const products = await Product.find({ shopId: req.params.id });

      res.status(201).json({
        success: true,
        products,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// update product
// Update product
router.put(
  "/update-product/:id",
  isSeller, // Add middleware for seller authentication if needed
  catchAsyncErrors(async (req, res, next) => {
    try {
      const productId = req.params.id;
      const productData = req.body;

      // Ensure that the seller is allowed to update this product, for example, by checking if they own the shop associated with the product
      const product = await Product.findById(productId);
      if (!product) {
        return next(new ErrorHandler("Product not found", 404));
      }

      // Check if the seller owns the shop associated with the product
      if (product.shop.toString() !== req.seller.id) {
        return next(new ErrorHandler("You don't have permission to update this product", 403));
      }

      // Dynamically update product attributes based on req.body
      for (const key in productData) {
        if (Object.prototype.hasOwnProperty.call(productData, key)) {
          product[key] = productData[key];
        }
      }

      // Save the updated product
      const updatedProduct = await product.save();

      res.status(200).json({
        success: true,
        product: updatedProduct,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);


// delete product of a shop
router.delete(
  "/delete-shop-product/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const product = await Product.findById(req.params.id);

      if (!product) {
        return next(new ErrorHandler("Product is not found with this id", 404));
      }

      for (let i = 0; i < product.images.length; i++) {
        const result = await cloudinary.v2.uploader.destroy(
          product.images[i].public_id
        );
      }

      await Product.deleteOne({ _id: req.params.id });

      sendMail({
       email:product.shop.email,
       subject:`Product Deleted Successfully for ${product.shop.email}`,
       message:`We're verifying a recent Product Deletion for ${product.shop.email}`,
       html:`<h3>Hello ${product.shop.name},</h3> <p>We're verifying a recent product deletion for ${product.shop.email}</p> <p>Timestamp: ${new Date().toLocaleString()} </br>Shop Name: ${product.shop.name} </br>Product Name: ${product.name}</p> <p>If you believe that this action is suspicious, please reset your password immediately.</p> <p>Thanks, </br></br> Villaja Team</p>`
    })

      res.status(201).json({
        success: true,
        message: "Product Deleted successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);


// get all products
router.get(
  "/get-all-products",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const products = await Product.find().sort({ createdAt: -1 });

      res.status(201).json({
        success: true,
        products,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// review for a product
router.put(
  "/create-new-review",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { user, rating, comment, productId, orderId } = req.body;

      const product = await Product.findById(productId);

      const review = {
        user,
        rating,
        comment,
        productId,
      };

      const isReviewed = product.reviews.find(
        (rev) => rev.user._id === req.user._id
      );

      if (isReviewed) {
        product.reviews.forEach((rev) => {
          if (rev.user._id === req.user._id) {
            (rev.rating = rating), (rev.comment = comment), (rev.user = user);
          }
        });
      } else {
        product.reviews.push(review);
      }

      let avg = 0;

      product.reviews.forEach((rev) => {
        avg += rev.rating;
      });

      product.ratings = avg / product.reviews.length;

      await product.save({ validateBeforeSave: false });

      await Order.findByIdAndUpdate(
        orderId,
        { $set: { "cart.$[elem].isReviewed": true } },
        { arrayFilters: [{ "elem._id": productId }], new: true }
      );

      res.status(200).json({
        success: true,
        message: "Reviwed succesfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// all products --- for admin
router.get(
  "/admin-all-products",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const products = await Product.find().sort({
        createdAt: -1,
      });
      res.status(201).json({
        success: true,
        products,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);


module.exports = router;
