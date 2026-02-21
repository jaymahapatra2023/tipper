import { S3Client } from '@aws-sdk/client-s3';

import { env } from './env';

// In production (EC2 with IAM role), SDK uses instance metadata credentials automatically.
// In local dev, only create client if explicit keys are provided.
const isProduction = env.NODE_ENV === 'production';
const hasExplicitCreds = env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY;

export const s3 =
  isProduction || hasExplicitCreds
    ? new S3Client({
        region: env.AWS_REGION,
        ...(hasExplicitCreds && {
          credentials: {
            accessKeyId: env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
          },
        }),
      })
    : null;
