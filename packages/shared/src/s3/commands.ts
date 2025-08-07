import {
  S3Client,
  ListBucketsCommand,
  ListObjectsV2Command,
  CreateBucketCommand,
  PutBucketTaggingCommand,
  GetObjectCommand,
  GetObjectTaggingCommand,
  DeleteObjectsCommand,
  GetBucketEncryptionCommand,
  GetBucketVersioningCommand,
  PutBucketVersioningCommand,
  GetBucketTaggingCommand,
  GetBucketAclCommand,
  GetBucketPolicyCommand,
  ListObjectVersionsCommand,
  DeleteBucketCommand,
  DeleteBucketPolicyCommand,
  PutBucketPolicyCommand,
  GetBucketLifecycleConfigurationCommand,
  PutBucketLifecycleConfigurationCommand,
  DeleteBucketLifecycleCommand,
  GetBucketCorsCommand,
  PutBucketCorsCommand,
  DeleteBucketCorsCommand,
  GetBucketPolicyStatusCommand,
  GetPublicAccessBlockCommand,
  PutPublicAccessBlockCommand,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getProxyPath } from '@odf/shared/s3/utils';
import {
  CreateBucket,
  ListBuckets,
  ListObjectsV2,
  ListObjectVersions,
  PutBucketTags,
  GetSignedUrl,
  GetObject,
  GetObjectTagging,
  DeleteObjects,
  DeleteBucket,
  GetBucketEncryption,
  GetBucketVersioning,
  PutBucketVersioning,
  GetBucketTagging,
  GetBucketAcl,
  GetBucketPolicy,
  DeleteBucketPolicy,
  SetBucketPolicy,
  GetBucketLifecycleConfiguration,
  PutBucketLifecycleConfiguration,
  DeleteBucketLifecycleConfiguration,
  GetBucketCors,
  PutBucketCors,
  DeleteBucketCors,
  GetBucketPolicyStatus,
  GetPublicAccessBlock,
  PutPublicAccessBlock,
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

  // Bucket command members
  createBucket: CreateBucket = (input) =>
    this.send(new CreateBucketCommand(input));

  deleteBucket: DeleteBucket = (input) =>
    this.send(new DeleteBucketCommand(input));

  getBucketAcl: GetBucketAcl = (input) =>
    this.send(new GetBucketAclCommand(input));

  getBucketEncryption: GetBucketEncryption = (input) =>
    this.send(new GetBucketEncryptionCommand(input));

  getBucketPolicy: GetBucketPolicy = (input) =>
    this.send(new GetBucketPolicyCommand(input));

  deleteBucketPolicy: DeleteBucketPolicy = (input) =>
    this.send(new DeleteBucketPolicyCommand(input));

  setBucketPolicy: SetBucketPolicy = (input) =>
    this.send(new PutBucketPolicyCommand(input));

  getBucketTagging: GetBucketTagging = (input) =>
    this.send(new GetBucketTaggingCommand(input));

  getBucketVersioning: GetBucketVersioning = (input) =>
    this.send(new GetBucketVersioningCommand(input));

  putBucketVersioning: PutBucketVersioning = (input) =>
    this.send(new PutBucketVersioningCommand(input));

  listBuckets: ListBuckets = (input) =>
    this.send(new ListBucketsCommand(input));

  putBucketTags: PutBucketTags = (input) =>
    this.send(new PutBucketTaggingCommand(input));

  getBucketLifecycleConfiguration: GetBucketLifecycleConfiguration = (input) =>
    this.send(new GetBucketLifecycleConfigurationCommand(input));

  putBucketLifecycleConfiguration: PutBucketLifecycleConfiguration = (input) =>
    this.send(new PutBucketLifecycleConfigurationCommand(input));

  deleteBucketLifecycle: DeleteBucketLifecycleConfiguration = (input) =>
    this.send(new DeleteBucketLifecycleCommand(input));

  getBucketCors: GetBucketCors = (input) =>
    this.send(new GetBucketCorsCommand(input));

  putBucketCors: PutBucketCors = (input) =>
    this.send(new PutBucketCorsCommand(input));

  deleteBucketCors: DeleteBucketCors = (input) =>
    this.send(new DeleteBucketCorsCommand(input));

  getBucketPolicyStatus: GetBucketPolicyStatus = (input) =>
    this.send(new GetBucketPolicyStatusCommand(input));

  getPublicAccessBlock: GetPublicAccessBlock = (input) =>
    this.send(new GetPublicAccessBlockCommand(input));

  putPublicAccessBlock: PutPublicAccessBlock = (input) =>
    this.send(new PutPublicAccessBlockCommand(input));

  // Object command members
  listObjects: ListObjectsV2 = (input) =>
    this.send(new ListObjectsV2Command(input));

  listObjectVersions: ListObjectVersions = (input) =>
    this.send(new ListObjectVersionsCommand(input));

  getSignedUrl: GetSignedUrl = (input, expiresIn) =>
    getSignedUrl(this, new GetObjectCommand(input), { expiresIn }).then(
      (url) => {
        // We must set the proxy URL because the S3 client
        // doesn't execute 'finalizeRequest' step for this action.
        const proxyUrl = new URL(url);
        proxyUrl.protocol = window.location.protocol;
        proxyUrl.hostname = window.location.hostname;
        proxyUrl.port = window.location.port;
        proxyUrl.pathname = `${getProxyPath()}${proxyUrl.pathname}`;
        return proxyUrl.toString();
      }
    );

  getObject: GetObject = (input) => this.send(new GetObjectCommand(input));

  getObjectTagging: GetObjectTagging = (input) =>
    this.send(new GetObjectTaggingCommand(input));

  deleteObjects: DeleteObjects = (input) =>
    this.send(new DeleteObjectsCommand(input));

  getUploader = (file: File, key: string, bucketName: string): Upload => {
    const uploader = new Upload({
      client: this,
      params: {
        Bucket: bucketName,
        Key: key,
        Body: file,
        ...(file.type ? { ContentType: file.type } : {}),
      },
      partSize: 5 * 1024 * 1024,
      queueSize: 4,
    });
    return uploader;
  };
}
