import {
  DeleteVectorBucketCommand,
  ListIndexesCommand,
  ListVectorBucketsCommand,
  S3VectorsClient,
} from '@aws-sdk/client-s3vectors';
import { DeleteVectorBucket, ListIndexes, ListVectorBuckets } from './types';

export class S3VectorsCommands extends S3VectorsClient {
  providerType: string;

  constructor(
    endpoint: string,
    accessKeyId: string,
    secretAccessKey: string,
    region: string,
    _path: string | null,
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

  listVectorBuckets: ListVectorBuckets = (input) =>
    this.send(new ListVectorBucketsCommand(input));

  listIndexes: ListIndexes = (input) =>
    this.send(new ListIndexesCommand(input));

  deleteVectorBucket: DeleteVectorBucket = (input) =>
    this.send(new DeleteVectorBucketCommand(input));
}
