import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: process.env.AWS_ACCESS_KEY_ID
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined,
});

export async function putS3Object({
  Bucket,
  Key,
  Body,
  ContentType,
  ACL = 'private',
}) {
  await s3.send(new PutObjectCommand({ Bucket, Key, Body, ContentType, ACL }));
  const base =
    process.env.CDN_BASE ||
    `https://${Bucket}.s3.${
      process.env.AWS_REGION || 'us-east-1'
    }.amazonaws.com`;
  return `${base}/${Key}`;
}
