const path = require('path')
const dotenv = require('dotenv').config()
const express = require('express')
const connectDB = require('./config/database');
const {errorHandler} = require('./middlewares/errorMiddleware')
const helmet = require("helmet");
const cors = require('cors')

connectDB()

const port = process.env.PORT || 4090
const app = express()

const whiteList = ["http://localhost:3000", "http://localhost:3000","http://localhost:3001", "https://testt-orpin.vercel.app"];
const corsOption = {
  origin: whiteList,
  credentials: true,
};
app.use(helmet());
app.use(cors(corsOption));
app.use(express.json())
app.use(express.urlencoded({extended: false}))


// routes
app.use('/api/users', require('./routes/userRoute'))


const dirname = path.resolve()
app.use('/uploads', express.static(path.join(__dirname, '/uploads')))

app.use('/uploads', express.static(path.join(dirname, '/uploads')))


app.get('/', (req, res) => {
    res.send('Villaja API V1 is running....')
})


app.use(errorHandler)


app.listen(port, () => console.log(`Server Started on port ${port}`))