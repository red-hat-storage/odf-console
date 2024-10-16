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

export class S3Commands extends S3Client {
  constructor(endpoint: string, accessKeyId: string, secretAccessKey: string) {
    super({
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

  // Bucket command members (alphabetical order)
  createBucket: CreateBucket = (input) =>
    this.send(new CreateBucketCommand(input));

  listBuckets: ListBuckets = (input) =>
    this.send(new ListBucketsCommand(input));

  putBucketTags: PutBucketTags = (input) =>
    this.send(new PutBucketTaggingCommand(input));

  // Object command members
  listObjects: ListObjectsV2 = (input) =>
    this.send(new ListObjectsV2Command(input));

  getSignedUrl: GetSignedUrl = (input, expiresIn) =>
    getSignedUrl(this, new GetObjectCommand(input), { expiresIn });

  getObject: GetObject = (input) => this.send(new GetObjectCommand(input));

  deleteObjects: DeleteObjects = (input) =>
    this.send(new DeleteObjectsCommand(input));
}
