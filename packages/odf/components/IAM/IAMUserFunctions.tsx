import {
  IAMClient,
  CreateUserCommand,
  CreateAccessKeyCommand,
  TagUserCommand,
  UpdateAccessKeyCommand,
  ListUsersCommand,
  StatusType,
  IAMClientConfig,
} from '@aws-sdk/client-iam';
import {
  NOOBAA_ACCESS_KEY_ID,
  NOOBAA_SECRET_ACCESS_KEY,
  NOOBAA_CLIENT_SECRET,
  NOOBAA_ADMIN_SECRET,
} from '@odf/core/constants';
import { useSafeK8sGet } from '@odf/core/hooks';
import { SecretModel } from '@odf/shared/models';
import { SecretKind } from '@odf/shared/types';
import { isClientPlugin } from '@odf/shared/utils/common';
import { KeyValuePair } from './AddKeyValuePair';
import { mockCreation, mockAccessKey, mockListUsers } from './mock';

// Will be replaced with context variable config.

export function useIAMClientConfig(): IAMClientConfig {
  const [secretData, secretLoaded, secretError] = useSafeK8sGet<SecretKind>(
    SecretModel,
    isClientPlugin() ? NOOBAA_CLIENT_SECRET : NOOBAA_ADMIN_SECRET
  );

  if (!secretLoaded || secretError || !secretData?.data) {
    return null;
  }

  const accessKeyId = atob(secretData.data[NOOBAA_ACCESS_KEY_ID]);
  const secretAccessKey = atob(secretData.data[NOOBAA_SECRET_ACCESS_KEY]);

  const config: IAMClientConfig = {
    region: 'none',
    credentials: {
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey,
    },
  };

  return config;
}

export async function createIAMUser(
  name: string,
  config: IAMClientConfig,
  pairs?: KeyValuePair[]
) {
  const Config = config;

  let input: any = {
    UserName: name,
  };

  if (pairs?.length !== 0) {
    input = { ...input, Tags: pairs };
  }

  const client = new IAMClient(Config);
  const command = new CreateUserCommand(input);
  //let response;
  //console.log(Config);
  try {
    await client.send(command);
  } catch {
    //response = mockCreation(input.UserName, pairs);
    mockCreation(input.UserName, pairs);
  }
  //console.log(response);
  const AccessKeyresponse = await createAccessKey(name, Config);
  return AccessKeyresponse;
}

export async function createAccessKey(name: string, config: IAMClientConfig) {
  const client = new IAMClient(config);
  const input = {
    UserName: name,
  };
  const command = new CreateAccessKeyCommand(input);
  let response;
  try {
    response = await client.send(command);
  } catch {
    response = mockAccessKey(input.UserName);
  }
  //console.log(_response);
  return response;
}

export async function tagUser(
  name: string,
  config: IAMClientConfig,
  Tag: KeyValuePair
) {
  const client = new IAMClient(config);
  const input = {
    UserName: name,
    Tags: [Tag],
  };

  const command = new TagUserCommand(input);
  //let response;
  try {
    await client.send(command);
  } catch {
    //response = 'taged user';
  }
  //console.log(response);
}

export async function updateAccessKey(
  name: string,
  AccessKeyId: string,
  config: IAMClientConfig,
  status: StatusType
) {
  const client = new IAMClient(config);
  const input = {
    UserName: name,
    AccessKeyId: AccessKeyId,
    Status: status,
  };
  const command = new UpdateAccessKeyCommand(input);
  //let response;
  try {
    await client.send(command);
  } catch {
    // response = 'Updated access key';
  }
  //console.log(response);
}

export async function listUsers(config: IAMClientConfig) {
  const client = new IAMClient(config);
  const input = {
    // ListUsersRequest
    PathPrefix: 'STRING_VALUE',
    Marker: 'STRING_VALUE',
    MaxItems: Number('int'),
  };
  const command = new ListUsersCommand(input);
  let response;
  try {
    response = await client.send(command);
  } catch {
    response = mockListUsers();
  }
  return response;
}
