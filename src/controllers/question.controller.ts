import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { Question, QuestionAnswer, QuestionCategory } from '../models/Question.model';
import { User } from '../models/User.model';

/**
 * Get a random question
 * GET /questions/random
 */
export const getRandomQuestion = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { category } = req.query;
    
    const filter: any = { isActive: true };
    if (category && Object.values(QuestionCategory).includes(category as QuestionCategory)) {
      filter.category = category;
    }
    
    // Get random question using aggregation
    const questions = await Question.aggregate([
      { $match: filter },
      { $sample: { size: 1 } }
    ]);
    
    if (questions.length === 0) {
      res.status(404).json({
        success: false,
        message: 'No questions available',
      });
      return;
    }
    
    const question = questions[0];
    
    res.json({
      success: true,
      data: {
        question: {
          id: question._id,
          text: question.text,
          category: question.category,
          emoji: question.emoji,
        },
      },
    });
  } catch (error) {
    console.error('Get random question error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get question',
    });
  }
};

/**
 * Ask a question (send to partner)
 * POST /questions/ask
 */
export const askQuestion = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found',
      });
      return;
    }
    
    if (!user.coupleId) {
      res.status(400).json({
        success: false,
        message: 'You must be connected with a partner first',
      });
      return;
    }
    
    const { questionId, questionText } = req.body;
    
    if (!questionId || !questionText) {
      res.status(400).json({
        success: false,
        message: 'Question ID and text are required',
      });
      return;
    }
    
    // Check if this question was already asked recently (within 24 hours)
    const recentAnswer = await QuestionAnswer.findOne({
      coupleId: user.coupleId,
      questionId,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });
    
    if (recentAnswer) {
      res.status(400).json({
        success: false,
        message: 'This question was asked recently. Try another one!',
      });
      return;
    }
    
    // Create question answer entry
    const questionAnswer = new QuestionAnswer({
      coupleId: user.coupleId,
      questionId,
      questionText,
      answers: [],
      isComplete: false,
    });
    
    await questionAnswer.save();
    
    res.status(201).json({
      success: true,
      message: 'Question sent to your partner!',
      data: {
        questionAnswer: {
          id: questionAnswer._id,
          questionText: questionAnswer.questionText,
          answers: questionAnswer.answers,
          isComplete: questionAnswer.isComplete,
          createdAt: questionAnswer.createdAt,
        },
      },
    });
  } catch (error) {
    console.error('Ask question error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send question',
    });
  }
};

/**
 * Answer a question
 * POST /questions/:id/answer
 */
export const answerQuestion = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    
    if (!user || !user.coupleId) {
      res.status(400).json({
        success: false,
        message: 'You must be connected with a partner',
      });
      return;
    }
    
    const { id } = req.params;
    const { answer } = req.body;
    
    if (!answer || !answer.trim()) {
      res.status(400).json({
        success: false,
        message: 'Answer is required',
      });
      return;
    }
    
    const questionAnswer = await QuestionAnswer.findOne({
      _id: id,
      coupleId: user.coupleId,
    });
    
    if (!questionAnswer) {
      res.status(404).json({
        success: false,
        message: 'Question not found',
      });
      return;
    }
    
    // Check if user already answered
    const existingAnswer = questionAnswer.answers.find(a => a.uniqueId === user.uniqueId);
    if (existingAnswer) {
      res.status(400).json({
        success: false,
        message: 'You have already answered this question',
      });
      return;
    }
    
    // Add answer
    questionAnswer.answers.push({
      uniqueId: user.uniqueId,
      name: user.name,
      answer: answer.trim(),
      answeredAt: new Date(),
    });
    
    // Mark as complete if both partners answered
    if (questionAnswer.answers.length >= 2) {
      questionAnswer.isComplete = true;
    }
    
    await questionAnswer.save();
    
    res.json({
      success: true,
      message: 'Answer saved!',
      data: {
        questionAnswer: {
          id: questionAnswer._id,
          questionText: questionAnswer.questionText,
          answers: questionAnswer.answers,
          isComplete: questionAnswer.isComplete,
        },
      },
    });
  } catch (error) {
    console.error('Answer question error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save answer',
    });
  }
};

/**
 * Get pending questions (unanswered by current user)
 * GET /questions/pending
 */
export const getPendingQuestions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    
    if (!user || !user.coupleId) {
      res.json({
        success: true,
        data: { questions: [], count: 0 },
      });
      return;
    }
    
    // Find questions where user hasn't answered yet
    const pendingQuestions = await QuestionAnswer.find({
      coupleId: user.coupleId,
      'answers.uniqueId': { $ne: user.uniqueId },
    }).sort({ createdAt: -1 }).limit(10);
    
    res.json({
      success: true,
      data: {
        questions: pendingQuestions.map(q => ({
          id: q._id,
          questionText: q.questionText,
          answers: q.answers,
          isComplete: q.isComplete,
          createdAt: q.createdAt,
        })),
        count: pendingQuestions.length,
      },
    });
  } catch (error) {
    console.error('Get pending questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get questions',
    });
  }
};

/**
 * Get answered questions history
 * GET /questions/history
 */
export const getQuestionsHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    
    if (!user || !user.coupleId) {
      res.json({
        success: true,
        data: { questions: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } },
      });
      return;
    }
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    
    const questions = await QuestionAnswer.find({
      coupleId: user.coupleId,
      isComplete: true,
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
    
    const total = await QuestionAnswer.countDocuments({
      coupleId: user.coupleId,
      isComplete: true,
    });
    
    res.json({
      success: true,
      data: {
        questions: questions.map(q => ({
          id: q._id,
          questionText: q.questionText,
          answers: q.answers,
          isComplete: q.isComplete,
          createdAt: q.createdAt,
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get questions history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get history',
    });
  }
};

/**
 * Get all question categories
 * GET /questions/categories
 */
export const getCategories = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const categories = Object.values(QuestionCategory).map(cat => ({
      value: cat,
      label: cat.charAt(0).toUpperCase() + cat.slice(1),
      emoji: {
        romantic: '💕',
        fun: '🎉',
        deep: '💭',
        quirky: '🤪',
        emotional: '🥹',
        future: '🔮',
        memories: '📸',
      }[cat] || '💬',
    }));
    
    res.json({
      success: true,
      data: { categories },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get categories',
    });
  }
};

