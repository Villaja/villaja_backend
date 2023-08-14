const routes = require('express')()
const {testcontroller} = require('../controllers/testcontroller')


routes.get('/test',testcontroller)

module.exports = routes




