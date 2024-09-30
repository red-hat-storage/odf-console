import {
  S3Client,
  ListBucketsCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { ListBuckets, ListObjectsV2 } from './types';

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
  listBuckets: ListBuckets = (input) =>
    this.s3Client.send(new ListBucketsCommand(input));

  // Object command members
  listObjects: ListObjectsV2 = (input) =>
    this.s3Client.send(new ListObjectsV2Command(input));
}
