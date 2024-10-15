import {
  S3Client,
  ListBucketsCommand,
  ListObjectsV2Command,
  CreateBucketCommand,
  PutBucketTaggingCommand,
  GetObjectCommand,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  CreateBucket,
  ListBuckets,
  ListObjectsV2,
  PutBucketTags,
  GetSignedUrl,
  GetObject,
  DeleteObjects,
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

  getSignedUrl: GetSignedUrl = (input, expiresIn) =>
    getSignedUrl(this.s3Client, new GetObjectCommand(input), { expiresIn });

  getObject: GetObject = (input) =>
    this.s3Client.send(new GetObjectCommand(input));

  deleteObjects: DeleteObjects = (input) =>
    this.s3Client.send(new DeleteObjectsCommand(input));
}
