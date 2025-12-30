import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import {
  getRandomQuestion,
  askQuestion,
  answerQuestion,
  getPendingQuestions,
  getQuestionsHistory,
  getCategories,
} from '../controllers/question.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get question categories
router.get('/categories', getCategories);

// Get random question
router.get('/random', getRandomQuestion);

// Get pending questions (unanswered)
router.get('/pending', getPendingQuestions);

// Get answered questions history
router.get('/history', getQuestionsHistory);

// Ask a question (send to partner)
router.post('/ask', askQuestion);

// Answer a question
router.post('/:id/answer', answerQuestion);

export default router;

