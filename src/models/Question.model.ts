import mongoose, { Document, Schema } from 'mongoose';

/**
 * Question category enum
 */
export enum QuestionCategory {
  ROMANTIC = 'romantic',
  FUN = 'fun',
  DEEP = 'deep',
  QUIRKY = 'quirky',
  EMOTIONAL = 'emotional',
  FUTURE = 'future',
  MEMORIES = 'memories',
}

/**
 * Question document interface
 */
export interface IQuestion extends Document {
  text: string;
  category: QuestionCategory;
  emoji?: string;
  isActive: boolean;
  createdAt: Date;
}

const QuestionSchema = new Schema<IQuestion>(
  {
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    category: {
      type: String,
      enum: Object.values(QuestionCategory),
      default: QuestionCategory.FUN,
    },
    emoji: {
      type: String,
      default: '💭',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for random selection
QuestionSchema.index({ isActive: 1, category: 1 });

export const Question = mongoose.model<IQuestion>('Question', QuestionSchema);

/**
 * Question Answer document interface - stores answers from couples
 */
export interface IQuestionAnswer extends Document {
  coupleId: mongoose.Types.ObjectId;
  questionId: mongoose.Types.ObjectId;
  questionText: string;
  answers: {
    uniqueId: string;
    name: string;
    answer: string;
    answeredAt: Date;
  }[];
  isComplete: boolean;
  createdAt: Date;
}

const QuestionAnswerSchema = new Schema<IQuestionAnswer>(
  {
    coupleId: {
      type: Schema.Types.ObjectId,
      ref: 'Couple',
      required: true,
    },
    questionId: {
      type: Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
    },
    questionText: {
      type: String,
      required: true,
    },
    answers: [{
      uniqueId: { type: String, required: true },
      name: { type: String, required: true },
      answer: { type: String, required: true },
      answeredAt: { type: Date, default: Date.now },
    }],
    isComplete: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

QuestionAnswerSchema.index({ coupleId: 1, createdAt: -1 });
QuestionAnswerSchema.index({ coupleId: 1, questionId: 1 });

export const QuestionAnswer = mongoose.model<IQuestionAnswer>('QuestionAnswer', QuestionAnswerSchema);

// Seed questions
export const seedQuestions = async () => {
  const count = await Question.countDocuments();
  if (count > 0) return;

  const questions = [
    // Romantic
    { text: "What made you fall in love with me?", category: QuestionCategory.ROMANTIC, emoji: "💕" },
    { text: "What's your favorite memory of us together?", category: QuestionCategory.ROMANTIC, emoji: "💑" },
    { text: "How many times do you think about me in a day?", category: QuestionCategory.ROMANTIC, emoji: "🥰" },
    { text: "What song reminds you of us?", category: QuestionCategory.ROMANTIC, emoji: "🎵" },
    { text: "What's the most romantic thing you want to do with me?", category: QuestionCategory.ROMANTIC, emoji: "💞" },
    { text: "What do you love most about our relationship?", category: QuestionCategory.ROMANTIC, emoji: "❤️" },
    { text: "When did you realize you loved me?", category: QuestionCategory.ROMANTIC, emoji: "💘" },
    { text: "What's your dream date with me?", category: QuestionCategory.ROMANTIC, emoji: "🌹" },
    
    // Fun & Quirky
    { text: "Have you ever stolen something?", category: QuestionCategory.QUIRKY, emoji: "🤫" },
    { text: "What's your most embarrassing moment?", category: QuestionCategory.QUIRKY, emoji: "😅" },
    { text: "If you could have any superpower, what would it be?", category: QuestionCategory.QUIRKY, emoji: "🦸" },
    { text: "What's the weirdest dream you've ever had?", category: QuestionCategory.QUIRKY, emoji: "🌙" },
    { text: "What's a secret talent you have?", category: QuestionCategory.QUIRKY, emoji: "✨" },
    { text: "What's the funniest thing that happened to you?", category: QuestionCategory.QUIRKY, emoji: "😂" },
    { text: "If you were an animal, what would you be?", category: QuestionCategory.QUIRKY, emoji: "🐾" },
    { text: "What's your guilty pleasure?", category: QuestionCategory.QUIRKY, emoji: "🍫" },
    
    // Deep & Emotional
    { text: "What's your biggest fear?", category: QuestionCategory.EMOTIONAL, emoji: "😰" },
    { text: "What makes you feel truly happy?", category: QuestionCategory.EMOTIONAL, emoji: "😊" },
    { text: "What's something you've never told anyone?", category: QuestionCategory.EMOTIONAL, emoji: "🤐" },
    { text: "What do you need most in a relationship?", category: QuestionCategory.EMOTIONAL, emoji: "💭" },
    { text: "What's your biggest regret?", category: QuestionCategory.EMOTIONAL, emoji: "😔" },
    { text: "What are you most grateful for?", category: QuestionCategory.EMOTIONAL, emoji: "🙏" },
    { text: "What makes you feel loved?", category: QuestionCategory.EMOTIONAL, emoji: "🥹" },
    { text: "What's a lesson life taught you?", category: QuestionCategory.EMOTIONAL, emoji: "📚" },
    
    // Future
    { text: "What is your wish to be in the future?", category: QuestionCategory.FUTURE, emoji: "⭐" },
    { text: "Where do you see us in 5 years?", category: QuestionCategory.FUTURE, emoji: "🔮" },
    { text: "What's your dream job?", category: QuestionCategory.FUTURE, emoji: "💼" },
    { text: "Where do you want to travel together?", category: QuestionCategory.FUTURE, emoji: "✈️" },
    { text: "What does your perfect day look like?", category: QuestionCategory.FUTURE, emoji: "☀️" },
    { text: "What's a goal you want to achieve this year?", category: QuestionCategory.FUTURE, emoji: "🎯" },
    { text: "Would you like to have kids someday?", category: QuestionCategory.FUTURE, emoji: "👶" },
    { text: "What kind of house do you want us to live in?", category: QuestionCategory.FUTURE, emoji: "🏡" },
    
    // Fun
    { text: "What's your favorite food to eat together?", category: QuestionCategory.FUN, emoji: "🍕" },
    { text: "What movie should we watch next?", category: QuestionCategory.FUN, emoji: "🎬" },
    { text: "What's the best gift you've ever received?", category: QuestionCategory.FUN, emoji: "🎁" },
    { text: "What's your favorite way to spend a weekend?", category: QuestionCategory.FUN, emoji: "🌴" },
    { text: "What's your comfort show?", category: QuestionCategory.FUN, emoji: "📺" },
    { text: "What game should we play together?", category: QuestionCategory.FUN, emoji: "🎮" },
    { text: "What's your favorite season and why?", category: QuestionCategory.FUN, emoji: "🍂" },
    { text: "Coffee or tea person?", category: QuestionCategory.FUN, emoji: "☕" },
    
    // Memories
    { text: "What's your childhood best memory?", category: QuestionCategory.MEMORIES, emoji: "👧" },
    { text: "What's the first thing you noticed about me?", category: QuestionCategory.MEMORIES, emoji: "👀" },
    { text: "What's your favorite photo of us?", category: QuestionCategory.MEMORIES, emoji: "📸" },
    { text: "What's a moment you'll never forget?", category: QuestionCategory.MEMORIES, emoji: "💫" },
    { text: "What was your first impression of me?", category: QuestionCategory.MEMORIES, emoji: "🤔" },
    { text: "What's the best date we've had?", category: QuestionCategory.MEMORIES, emoji: "💃" },
  ];

  await Question.insertMany(questions);
  console.log('✅ Seeded', questions.length, 'questions');
};

