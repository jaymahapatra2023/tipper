import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { s3 } from '../config/s3';
import { env } from '../config/env';
import { BadRequestError } from '../utils/errors';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const EXPIRY = 300; // 5 minutes

const EXT_MAP: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

export class UploadService {
  async generatePresignedUploadUrl(hotelId: string, contentType: string) {
    if (!s3) throw new BadRequestError('S3 not configured');
    if (!ALLOWED_TYPES.includes(contentType)) {
      throw new BadRequestError(`Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}`);
    }

    const ext = EXT_MAP[contentType];
    const key = `hotels/${hotelId}/logo.${ext}`;

    const command = new PutObjectCommand({
      Bucket: env.AWS_S3_BUCKET,
      Key: key,
      ContentType: contentType,
      ContentLength: MAX_SIZE,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: EXPIRY });
    const publicUrl = this.getPublicUrl(key);

    return { uploadUrl, publicUrl, key };
  }

  getPublicUrl(key: string) {
    return `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
  }
}

export const uploadService = new UploadService();
