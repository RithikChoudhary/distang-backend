import { createApp } from './app';
import { connectDB, closeDB } from './config/db';
import { config, validateEnv } from './config/env';
import { seedQuestions } from './models/Question.model';

/**
 * Start the server
 */
const startServer = async (): Promise<void> => {
  try {
    // Validate environment variables
    validateEnv();
    
    // Connect to MongoDB
    await connectDB();
    
    // Seed initial data
    await seedQuestions();
    
    // Create Express app
    const app = createApp();
    
    // Start listening
    const server = app.listen(config.port, () => {
      console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║      💕 Codex Couples API Server                      ║
║                                                        ║
║      Environment: ${config.nodeEnv.padEnd(35)}║
║      Port: ${String(config.port).padEnd(42)}║
║      MongoDB: Connected                                ║
║                                                        ║
║      Privacy-first. Consent-driven. Love-focused.     ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
      `);
    });
    
    // Graceful shutdown
    const gracefulShutdown = async (signal: string): Promise<void> => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      
      server.close(async () => {
        console.log('HTTP server closed');
        await closeDB();
        process.exit(0);
      });
      
      // Force close after 10 seconds
      setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };
    
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

