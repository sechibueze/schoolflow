const express = require('express');

const router = express.Router();

import {
  handleStudentRegistration
} from '../controllers/studentControllers';

router.post('/students', handleStudentRegistration);

module.exports = router;