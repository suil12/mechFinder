"use strict";

const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbotController');

// Endpoint per processare i messaggi del chatbot
router.post('/message', chatbotController.processMessage);

module.exports = router;