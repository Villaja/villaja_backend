const mongoose = require("mongoose");

const sellerSchema = mongoose.Schema(
  {
    firstname: {
      type: String,
    },
    lastname: {
      type: String,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
    },
    phoneNumber: {
      type: String,
    },
    companyName: {
      type: String,
    },
    companyDescription: {
      type: String,
    },
    companyAddress: {
      type: String,
    },
    productCategories: {
      type: [String],
    },
    products: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
        // Include other product-related information
      },
    ],
    ratings: [
      {
        customerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        rating: {
          type: Number,
          min: 1,
          max: 5,
        },
        // Include other rating-related information
      },
    ],
    // Include other attributes relevant to sellers
  },
  { timestamps: true }
);

const sellerModel = mongoose.model("Seller", sellerSchema);
module.exports = sellerModel;
