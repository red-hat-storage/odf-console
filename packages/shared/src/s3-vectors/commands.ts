import {
  CreateIndexCommand,
  CreateVectorBucketCommand,
  DeleteIndexCommand,
  DeleteVectorBucketCommand,
  GetIndexCommand,
  ListIndexesCommand,
  ListVectorBucketsCommand,
  DeleteVectorBucketPolicyCommand,
  GetVectorBucketPolicyCommand,
  PutVectorBucketPolicyCommand,
  S3VectorsClient,
} from '@aws-sdk/client-s3vectors';
import {
  CreateIndex,
  CreateVectorBucket,
  DeleteIndex,
  DeleteVectorBucket,
  GetIndex,
  ListIndexes,
  ListVectorBuckets,
  DeleteVectorBucketPolicy,
  GetVectorBucketPolicy,
  SetVectorBucketPolicy,
} from './types';

export class S3VectorsCommands extends S3VectorsClient {
  providerType: string;

  constructor(
    endpoint: string,
    accessKeyId: string,
    secretAccessKey: string,
    region: string,
    providerType: string
  ) {
    super({
      region,
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
    this.providerType = providerType;
  }

  // Vector bucket command members
  createVectorBucket: CreateVectorBucket = (input) =>
    this.send(new CreateVectorBucketCommand(input));

  listVectorBuckets: ListVectorBuckets = (input) =>
    this.send(new ListVectorBucketsCommand(input));

  deleteVectorBucket: DeleteVectorBucket = (input) =>
    this.send(new DeleteVectorBucketCommand(input));

  getVectorBucketPolicy: GetVectorBucketPolicy = (input) =>
    this.send(new GetVectorBucketPolicyCommand(input));

  setVectorBucketPolicy: SetVectorBucketPolicy = (input) =>
    this.send(new PutVectorBucketPolicyCommand(input));

  deleteVectorBucketPolicy: DeleteVectorBucketPolicy = (input) =>
    this.send(new DeleteVectorBucketPolicyCommand(input));

  // Vector index command members
  createIndex: CreateIndex = (input) =>
    this.send(new CreateIndexCommand(input));

  listIndexes: ListIndexes = (input) =>
    this.send(new ListIndexesCommand(input));

  getVectorIndex: GetIndex = (input) => this.send(new GetIndexCommand(input));

  deleteIndex: DeleteIndex = (input) =>
    this.send(new DeleteIndexCommand(input));
}
