import { IAMUsers } from '@odf/core/types/s3-iam';

//single user
export const GetUserMock = {
  User: {
    Arn: 'arn:aws:iam::123456789012:user/division_abc/subdivision_xyz/engineering/Juan',
    UserId: 'AID2MAB8DPLSRHEXAMPLE',
    UserName: 'Juan',
    Path: '/division_abc/subdivision_xyz/engineering/',
    CreateDate: new Date('2019-09-05T19:38:48Z'),
    PasswordLastUsed: new Date('2016-09-08T21:47:36Z'),
    Tags: [
      { Key: 'AKIA111111111EXAMPLE', Value: 'Engineering' },
      { Key: 'Description', Value: 'Senior Engineer' },
    ],
  },
};

//list of users with accesskey
export const usersMock: IAMUsers[] = [
  {
    userDetails: {
      Arn: 'arn:aws:iam::123456789012:user/division_abc/subdivision_xyz/engineering/Juan',
      UserId: 'AID2MAB8DPLSRHEXAMPLE',
      UserName: 'Juan',
      Path: '/division_abc/subdivision_xyz/engineering/',
      CreateDate: new Date('2019-09-05T19:38:48Z'),
      PasswordLastUsed: new Date('2016-09-08T21:47:36Z'),
      Tags: [
        { Key: 'AKIA111111111EXAMPLE', Value: 'Engineering' },
        { Key: 'Description', Value: 'Senior Engineer' },
      ],
    },
    accessKeys: [
      {
        AccessKeyId: 'AKIA111111111EXAMPLE',
        CreateDate: new Date('2016-12-01T22:20:01Z'),
        Status: 'Active',
        UserName: 'Juan',
      },
      {
        AccessKeyId: 'AKIA222222222EXAMPLE',
        CreateDate: new Date('2016-12-01T22:20:01Z'),
        Status: 'Active',
        UserName: 'Juan',
      },
    ],
  },
  {
    userDetails: {
      Arn: 'arn:aws:iam::123456789012:user/division_abc/subdivision_xyz/engineering/Anika',
      UserId: 'AIDIODR4TAW7CSEXAMPLE',
      UserName: 'Anika',
      Path: '/division_abc/subdivision_xyz/engineering/',
      CreateDate: new Date('2014-04-09T15:43:45Z'),
      PasswordLastUsed: new Date('2016-09-24T16:18:07Z'),
      Tags: [
        { Key: 'Department', Value: 'Engineering' },
        { Key: 'Description', Value: 'Lead Developer' },
      ],
    },

    accessKeys: [
      {
        AccessKeyId: 'AKIA111111111EXAMPLE',
        CreateDate: new Date('2016-12-01T22:20:01Z'),
        Status: 'Active',
        UserName: 'Anika',
      },
      {
        AccessKeyId: 'AKIA222222222EXAMPLE',
        CreateDate: new Date('2016-12-01T22:19:58Z'),
        Status: 'Active' as const,
        UserName: 'Juan',
      },
    ],
  },
];

// Mock response for access keys
export const accessKeysMock = {
  AccessKeyMetadata: [
    {
      AccessKeyId: 'AKIA222222222EXAMPLE',
      CreateDate: new Date('2016-12-01T22:19:58Z'),
      Status: 'Active' as const,
      UserName: 'Anika',
    },
    {
      AccessKeyId: 'AKIA222222222EXAMPLE',
      CreateDate: new Date('2016-12-01T22:19:58Z'),
      Status: 'Inactive' as const,
      UserName: 'Juan',
    },
  ],
};

// Mock response for tags
export const tagsMock = {
  Tags: [
    {
      Key: 'Department',
      Value: 'Engineering',
    },
    {
      Key: 'AKIA222222222EXAMPLE',
      Value: 'Senior Developer with admin access',
    },
  ],
};
