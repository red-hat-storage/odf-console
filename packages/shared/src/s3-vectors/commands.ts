import {
  CreateIndexCommand,
  CreateVectorBucketCommand,
  DeleteIndexCommand,
  DeleteVectorBucketCommand,
  DeleteVectorBucketPolicyCommand,
  GetVectorBucketPolicyCommand,
  ListIndexesCommand,
  ListVectorBucketsCommand,
  ListVectorsCommand,
  PutVectorBucketPolicyCommand,
  S3VectorsClient,
} from '@aws-sdk/client-s3vectors';
import {
  CreateIndex,
  CreateVectorBucket,
  DeleteIndex,
  DeleteVectorBucket,
  DeleteVectorBucketPolicy,
  GetVectorBucketPolicy,
  ListIndexes,
  ListVectorBuckets,
  ListVectors,
  SetVectorBucketPolicy,
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

  // Vector index command members
  createIndex: CreateIndex = (input) =>
    this.send(new CreateIndexCommand(input));

  listIndexes: ListIndexes = (input) =>
    this.send(new ListIndexesCommand(input));

  deleteIndex: DeleteIndex = (input) =>
    this.send(new DeleteIndexCommand(input));

  listVectors: ListVectors = (input) =>
    this.send(new ListVectorsCommand(input));

  getVectorBucketPolicy: GetVectorBucketPolicy = (input) =>
    this.send(new GetVectorBucketPolicyCommand(input));

  setVectorBucketPolicy: SetVectorBucketPolicy = (input) =>
    this.send(new PutVectorBucketPolicyCommand(input));

  deleteVectorBucketPolicy: DeleteVectorBucketPolicy = (input) =>
    this.send(new DeleteVectorBucketPolicyCommand(input));
}
