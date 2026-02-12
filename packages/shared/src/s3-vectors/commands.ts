import {
  CreateIndexCommand,
  CreateVectorBucketCommand,
  DeleteIndexCommand,
  DeleteVectorBucketCommand,
  ListIndexesCommand,
  ListVectorBucketsCommand,
  S3VectorsClient,
} from '@aws-sdk/client-s3vectors';
import {
  CreateIndex,
  CreateVectorBucket,
  DeleteIndex,
  DeleteVectorBucket,
  ListIndexes,
  ListVectorBuckets,
} from './types';

export class S3VectorsCommands extends S3VectorsClient {
  constructor(
    endpoint: string,
    accessKeyId: string,
    secretAccessKey: string,
    region: string
  ) {
    super({
      region,
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  // Vector buckets command members
  createVectorBucket: CreateVectorBucket = (input) =>
    this.send(new CreateVectorBucketCommand(input));

  listVectorBuckets: ListVectorBuckets = (input) =>
    this.send(new ListVectorBucketsCommand(input));

  deleteVectorBucket: DeleteVectorBucket = (input) =>
    this.send(new DeleteVectorBucketCommand(input));
  createIndex: CreateIndex = (input) =>
    this.send(new CreateIndexCommand(input));

  listIndexes: ListIndexes = (input) =>
    this.send(new ListIndexesCommand(input));

  deleteIndex: DeleteIndex = (input) =>
    this.send(new DeleteIndexCommand(input));
}
