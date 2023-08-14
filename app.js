
const cors = require('cors')
const express = require('express')
const app = express()

app.use(cors())
app.use(express.urlencoded({extended:true}))

const testroutes = require('./routes/testroute')


app.use('/api/v1',testroutes)

app.get('/', (req,res) => {
    res.send('welcome to villaja backend')
})

const PORT  = process.env.PORT || 4090

app.listen(PORT, () => {
    console.log(`server is listening on port ${PORT}`);
})