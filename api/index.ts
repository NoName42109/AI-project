import app from '../server';

export const config = {
  api: {
    bodyParser: false, // Disable Vercel's default body parser to let Express handle it
    responseLimit: false,
  },
  // Increase timeout for long-running AI tasks
  maxDuration: 300, 
};

export default app;
