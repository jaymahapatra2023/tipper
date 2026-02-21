import { app } from './app';
import { env } from './config/env';
import { startPayoutScheduler } from './jobs/payoutScheduler';

// Validate MFA encryption key at startup
if (env.MFA_ENCRYPTION_KEY) {
  if (!/^[0-9a-f]{64}$/i.test(env.MFA_ENCRYPTION_KEY)) {
    console.error(
      'MFA_ENCRYPTION_KEY must be a 64-character hex string (256-bit key for AES-256-GCM)',
    );
    process.exit(1);
  }
} else if (env.NODE_ENV === 'production') {
  console.error('MFA_ENCRYPTION_KEY is required in production');
  process.exit(1);
} else {
  console.warn('Warning: MFA_ENCRYPTION_KEY not set — MFA features will fail at runtime');
}

const port = env.API_PORT;

app.listen(port, () => {
  console.log(`API server running on http://localhost:${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
  console.log(`Environment: ${env.NODE_ENV}`);
  startPayoutScheduler();
});
