const Joi = require("joi");

const regSchema = Joi.object({
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

const loginSchema = Joi.object({
  phone: Joi.string()
    .regex(/^\+(?:[0-9] ?){6,14}[0-9]$/)
    .required(),
  password: Joi.string().min(4).max(125).required(),
});

function regValidation(req, res, next) {
  const value = regSchema.validate(req.body);
  if (value.error) {
    next(value.error);
  }
  return next();
}

function loginValidation(req, res, next) {
  const value = loginSchema.validate(req.body);
  if (value.error) {
    next(value.error);
  }
  return next();
}

module.exports = { regValidation, loginValidation };
