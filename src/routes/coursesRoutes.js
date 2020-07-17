const express = require('express');

const router = express.Router();

import {
  handleCourseRegistration
} from '../controllers/courseController';

router.post('/courses/:courseId/register', handleCourseRegistration);

module.exports = router;