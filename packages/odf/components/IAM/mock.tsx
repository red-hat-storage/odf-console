let Users = [];

export function mockCreation(name, Tags = []) {
  const response = {
    User: {
      Path: '/developers/',
      UserName: name,
      UserId: 'MOCK1234567890',
      Arn: 'arn:aws:iam::000000000000:user/newDeveloperUser',
      CreateDate: new Date(),
      Tags: Tags,
    },
  };
  Users.push(response.User);
  return response;
}

export function mockListUsers() {
  return {
    Users,
  };
}

export function mockAccessKey(name) {
  const response = {
    AccessKey: {
      UserName: name,
      AccessKeyId: 'AAAAAAAAAAAAA',
      Status: 'Active',
      SecretAccessKey: 'SSSSSSSSSSSSSS',
      CreateDate: new Date('TIMESTAMP'),
    },
  };
  return response;
}
