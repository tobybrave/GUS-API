const Joi = require("joi");

const schema = Joi.object({
  name: Joi.string()
    .regex(/^[a-z ,.'_-]+$/i)
    .min(2)
    .max(40)
    .required(),
  phone: Joi.string()
    .regex(/^\+(?:[0-9] ?){6,14}[0-9]$/)
    .required(),
  password: Joi.string().min(4).max(125).required(),
});

function requestValidation(req, res, next) {
  const value = schema.validate(req.body);
  if (value.error) {
    next(value.error);
  }
  return next();
}

module.exports = requestValidation;
