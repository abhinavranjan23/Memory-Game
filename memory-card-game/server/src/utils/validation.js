const Joi = require('joi');
const xss = require('xss');

// Input sanitization
const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return xss(input.trim());
  }
  if (typeof input === 'object' && input !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  return input;
};

// Validation schemas
const userSchema = Joi.object({
  username: Joi.string()
    .min(3)
    .max(20)
    .pattern(/^[a-zA-Z0-9_]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Username can only contain letters, numbers, and underscores',
      'string.min': 'Username must be at least 3 characters long',
      'string.max': 'Username cannot exceed 20 characters',
    }),
  email: Joi.string()
    .email()
    .max(100)
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
    }),
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'string.min': 'Password must be at least 8 characters long',
    }),
});

const gameSettingsSchema = Joi.object({
  boardSize: Joi.string()
    .valid('4x4', '6x6', '8x8')
    .required(),
  theme: Joi.string()
    .valid('emojis', 'animals', 'fruits', 'shapes')
    .required(),
  gameMode: Joi.string()
    .valid('classic', 'blitz', 'sudden-death', 'powerup-frenzy')
    .required(),
  timeLimit: Joi.number()
    .integer()
    .min(60)
    .max(1800)
    .required(),
  maxPlayers: Joi.number()
    .integer()
    .min(2)
    .max(4)
    .required(),
  powerUpsEnabled: Joi.boolean().required(),
  chatEnabled: Joi.boolean().required(),
  isRanked: Joi.boolean().required(),
});

const chatMessageSchema = Joi.object({
  message: Joi.string()
    .min(1)
    .max(500)
    .required()
    .messages({
      'string.max': 'Message cannot exceed 500 characters',
    }),
});

const cardActionSchema = Joi.object({
  cardId: Joi.number()
    .integer()
    .min(0)
    .required(),
});

const powerUpSchema = Joi.object({
  powerUpType: Joi.string()
    .valid('extraTurn', 'peek', 'swap', 'revealOne', 'freeze', 'shuffle')
    .required(),
  target: Joi.object({
    cardId: Joi.number().integer().min(0),
    card1Id: Joi.number().integer().min(0),
    card2Id: Joi.number().integer().min(0),
  }).optional(),
});

// Validation functions
const validateUser = (data) => {
  const { error, value } = userSchema.validate(data);
  if (error) {
    throw new Error(error.details[0].message);
  }
  return sanitizeInput(value);
};

const validateGameSettings = (data) => {
  const { error, value } = gameSettingsSchema.validate(data);
  if (error) {
    throw new Error(error.details[0].message);
  }
  return sanitizeInput(value);
};

const validateChatMessage = (data) => {
  const { error, value } = chatMessageSchema.validate(data);
  if (error) {
    throw new Error(error.details[0].message);
  }
  return sanitizeInput(value);
};

const validateCardAction = (data) => {
  const { error, value } = cardActionSchema.validate(data);
  if (error) {
    throw new Error(error.details[0].message);
  }
  return sanitizeInput(value);
};

const validatePowerUp = (data) => {
  const { error, value } = powerUpSchema.validate(data);
  if (error) {
    throw new Error(error.details[0].message);
  }
  return sanitizeInput(value);
};

// Rate limiting validation
const validateRateLimit = (userId, action, limits) => {
  const now = Date.now();
  const userLimits = limits.get(userId) || {};
  const actionLimits = userLimits[action] || { count: 0, resetTime: now + 60000 };

  if (now > actionLimits.resetTime) {
    actionLimits.count = 0;
    actionLimits.resetTime = now + 60000;
  }

  actionLimits.count++;
  userLimits[action] = actionLimits;
  limits.set(userId, userLimits);

  return actionLimits.count <= 10; // Max 10 actions per minute per user
};

// Anti-cheat validation
const validateGameAction = (userId, action, gameState, lastActionTime) => {
  const now = Date.now();
  const minInterval = 100; // Minimum 100ms between actions

  if (lastActionTime && now - lastActionTime < minInterval) {
    throw new Error('Action too frequent');
  }

  // Validate game state consistency
  if (gameState.status === 'finished') {
    throw new Error('Game has ended');
  }

  return true;
};

module.exports = {
  sanitizeInput,
  validateUser,
  validateGameSettings,
  validateChatMessage,
  validateCardAction,
  validatePowerUp,
  validateRateLimit,
  validateGameAction,
  userSchema,
  gameSettingsSchema,
  chatMessageSchema,
  cardActionSchema,
  powerUpSchema,
};
