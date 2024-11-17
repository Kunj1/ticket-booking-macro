import Joi from 'joi';

export const userSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
});

export const eventSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().required(),
  date: Joi.date().iso().required(),
  location: Joi.string().required(),
  artists: Joi.array().items(Joi.string()).required(),
});

export const ticketSchema = Joi.object({
  eventId: Joi.string().required(),
  type: Joi.string().required(),
  price: Joi.number().positive().required(),
  quantity: Joi.number().integer().positive().required(),
});

export const bookingSchema = Joi.object({
  ticketId: Joi.string().required(),
  quantity: Joi.number().integer().positive().required(),
});

export const validateRegistration = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'
    }),
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  phoneNumber: Joi.string().optional().allow(null).regex(/^[\d\s()+-]+$/).messages({
    'string.pattern.base': 'Phone number must contain only valid characters (digits, spaces, parentheses, plus, or hyphen).'
  }),
  country: Joi.string().required(),
  role: Joi.string().valid('user', 'admin').default('user').optional(),
  eventManager: Joi.boolean().default(false).optional(),
  performer: Joi.boolean().default(false).optional(),
  username: Joi.string().min(3).max(30).optional(),
  bio: Joi.string().max(500).optional().allow(null, ''),
  socialMediaLinks: Joi.array().items(Joi.string().uri()).optional(),
  profilePicture: Joi.string().uri().optional()
});

export const validateLogin = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const validateBooking = Joi.object({
  ticketId: Joi.string().required(),
  quantity: Joi.number().integer().positive().required(),
});

export const validateEvent = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().required(),
  date: Joi.date().iso().required(),
  location: Joi.string().required(),
  category: Joi.string().required(), 
  artists: Joi.array().items(Joi.string()).required(),
});

export const validateUser = Joi.object({
  firstName: Joi.string(),
  lastName: Joi.string(),
  email: Joi.string().email(),
});

export const validatePasswordChange = Joi.object({
  oldPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required(),
});

export const validateTicketCreation = Joi.object({
  eventId: Joi.string().required(),
  type: Joi.string().required(),
  price: Joi.number().positive().required(),
  quantity: Joi.number().integer().positive().required(),
});

export const validateTicket = Joi.object({
  eventId: Joi.string().uuid().required(),
  type: Joi.string().required(),
  price: Joi.number().positive().precision(2).required(),
  quantity: Joi.number().integer().positive().required(),
  saleStartDate: Joi.date().iso(),
  saleEndDate: Joi.date().iso().min(Joi.ref('saleStartDate')),
});

export const validateTicketUpdate = Joi.object({
  type: Joi.string(),
  price: Joi.number().positive().precision(2),
  quantity: Joi.number().integer().positive(),
  saleStartDate: Joi.date().iso(),
  saleEndDate: Joi.date().iso().min(Joi.ref('saleStartDate')),
}).min(1);