const Joi = require('joi')
Joi.objectId = require('joi-objectid')(Joi)

const validateRegistration = (user) => {
    const schema = Joi.object(
    {
        firstname: Joi.string().required(),
        lastname: Joi.string().required(),
        email: Joi.string().email().required(),
        password: Joi.string().required(),
        phoneNumber: Joi.string().required()

    }).unknown()
    return schema.validate(user);
}


const validateLogin = (user) => {
    const schema = Joi.object(
    {

        email: Joi.string().email().required(),
        password: Joi.string().required()

    }).unknown()
    return schema.validate(user);
}

const validateUpdate = (user) => {
    const schema = Joi.object(
    {
        firstname: Joi.string().required(),
        lastname: Joi.string().required(),
        phoneNumber: Joi.string().required(),
    }).unknown()
    return schema.validate(user);
}

module.exports =  {
    validateRegistration,
    validateLogin,
    validateUpdate
}