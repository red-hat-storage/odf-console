import {
  S3Client,
  ListBucketsCommand,
  ListObjectsV2Command,
  CreateBucketCommand,
  PutBucketTaggingCommand,
} from '@aws-sdk/client-s3';
import {
  CreateBucket,
  ListBuckets,
  ListObjectsV2,
  PutBucketTags,
} from './types';

export class S3Commands {
  private s3Client: S3Client;

  constructor(endpoint: string, accessKeyId: string, secretAccessKey: string) {
    this.s3Client = new S3Client({
      // "region" is a required parameter for the SDK, using "none" as a workaround
      region: 'none',
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true,
    });
  }

  // Bucket command members
  createBucket: CreateBucket = (input) =>
    this.s3Client.send(new CreateBucketCommand(input));

  listBuckets: ListBuckets = (input) =>
    this.s3Client.send(new ListBucketsCommand(input));

  putBucketTags: PutBucketTags = (input) =>
    this.s3Client.send(new PutBucketTaggingCommand(input));

  // Object command members
  listObjects: ListObjectsV2 = (input) =>
    this.s3Client.send(new ListObjectsV2Command(input));
}
