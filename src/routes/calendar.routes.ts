import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import {
  addImportantDate,
  getImportantDates,
  deleteImportantDate,
} from '../controllers/calendar.controller';

const router = Router();

/**
 * @route   POST /calendar/add
 * @desc    Add important date
 * @access  Private
 */
router.post('/add', authenticate, addImportantDate);

/**
 * @route   GET /calendar/dates
 * @desc    Get all important dates
 * @access  Private
 */
router.get('/dates', authenticate, getImportantDates);

/**
 * @route   DELETE /calendar/:dateId
 * @desc    Delete important date
 * @access  Private
 */
router.delete('/:dateId', authenticate, deleteImportantDate);

export default router;

