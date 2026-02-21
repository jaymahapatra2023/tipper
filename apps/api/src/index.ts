import { app } from './app';
import { env } from './config/env';
import { startPayoutScheduler } from './jobs/payoutScheduler';

const port = env.API_PORT;

app.listen(port, () => {
  console.log(`API server running on http://localhost:${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
  console.log(`Environment: ${env.NODE_ENV}`);
  startPayoutScheduler();
});
