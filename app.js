const express = require("express");
const ErrorHandler = require("./middleware/error");
const app = express();
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const cors = require("cors");

app.use(cors({
  origin: ['http://localhost:3000'],
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());
app.use("/test", (req, res) => {
  res.send("Welcome to villaja's backend server");
});

app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

// config
if (process.env.NODE_ENV !== "PRODUCTION") {
  require("dotenv").config({
    path: "config/.env",
  });
}

// import routes
const user = require("./controller/user");
const shop = require("./controller/shop");
const product = require("./controller/product");




app.use("/api/user", user);
app.use("/api/shop", shop);
app.use("/api/product", product);


// it's for ErrorHandling
app.use(ErrorHandler);

module.exports = app;
