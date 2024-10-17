import {
  S3Client,
  ListBucketsCommand,
  ListObjectsV2Command,
  CreateBucketCommand,
  PutBucketTaggingCommand,
  GetObjectCommand,
  DeleteObjectsCommand,
  GetBucketEncryptionCommand,
  GetBucketVersioningCommand,
  GetBucketTaggingCommand,
  GetBucketAclCommand,
  GetBucketPolicyCommand,
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
  GetBucketEncryption,
  GetBucketVersioning,
  GetBucketTagging,
  GetBucketAcl,
  GetBucketPolicy,
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

  // Bucket command members (alphabetical order)
  createBucket: CreateBucket = (input) =>
    this.s3Client.send(new CreateBucketCommand(input));

  getBucketAcl: GetBucketAcl = (input) =>
    this.s3Client.send(new GetBucketAclCommand(input));

  getBucketEncryption: GetBucketEncryption = (input) =>
    this.s3Client.send(new GetBucketEncryptionCommand(input));

  getBucketPolicy: GetBucketPolicy = (input) =>
    this.s3Client.send(new GetBucketPolicyCommand(input));

  getBucketTagging: GetBucketTagging = (input) =>
    this.s3Client.send(new GetBucketTaggingCommand(input));

  getBucketVersioning: GetBucketVersioning = (input) =>
    this.s3Client.send(new GetBucketVersioningCommand(input));

  listBuckets: ListBuckets = (input) =>
    this.s3Client.send(new ListBucketsCommand(input));

  putBucketTags: PutBucketTags = (input) =>
    this.s3Client.send(new PutBucketTaggingCommand(input));

  // Object command members (alphabetical order)
  deleteObjects: DeleteObjects = (input) =>
    this.s3Client.send(new DeleteObjectsCommand(input));

  getObject: GetObject = (input) =>
    this.s3Client.send(new GetObjectCommand(input));

  getSignedUrl: GetSignedUrl = (input, expiresIn) =>
    getSignedUrl(this.s3Client, new GetObjectCommand(input), { expiresIn });

  listObjects: ListObjectsV2 = (input) =>
    this.s3Client.send(new ListObjectsV2Command(input));
}
