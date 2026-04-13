import * as React from 'react';
import StaticDropdown from '@odf/shared/dropdown/StaticDropdown';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import * as _ from 'lodash-es';
import { TFunction } from 'react-i18next';
import {
  Switch,
  FormGroup,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';

type PreConfiguredPoliciesProps = {
  setCode: React.Dispatch<React.SetStateAction<string>>;
};

enum Policies {
  AllowPublicReadAccess = 'AllowPublicReadAccess',
  AllowAccessToSpecificAccount = 'AllowAccessToSpecificAccount',
  EnforceSecureTransportHTTPS = 'EnforceSecureTransportHTTPS',
  AllowReadWriteAccessToFolder = 'AllowReadWriteAccessToFolder',
}

const getLabels = (t: TFunction) => ({
  [Policies.AllowPublicReadAccess]: (
    <>
      {t('Grant Public Read Access to All Objects')}
      <HelperText>
        <HelperTextItem variant="indeterminate">
          {t('Allows anyone to read all objects in the bucket')}
        </HelperTextItem>
      </HelperText>
    </>
  ),
  [Policies.AllowAccessToSpecificAccount]: (
    <>
      {t('Allow Access to a Specific S3 Account')}
      <HelperText>
        <HelperTextItem variant="indeterminate">
          {t('Grants full access to the bucket to another S3 account')}
        </HelperTextItem>
      </HelperText>
    </>
  ),
  [Policies.EnforceSecureTransportHTTPS]: (
    <>
      {t('Enforce Secure Transport (HTTPS)')}
      <HelperText>
        <HelperTextItem variant="indeterminate">
          {t(
            'Denies access to the bucket if the request is not made over HTTPS'
          )}
        </HelperTextItem>
      </HelperText>
    </>
  ),
  [Policies.AllowReadWriteAccessToFolder]: (
    <>
      {t('Grant Read and Write Access to a Specific Folder')}
      <HelperText>
        <HelperTextItem variant="indeterminate">
          {t(
            'Grants account an access to a specific folder (prefix) within a bucket'
          )}
        </HelperTextItem>
      </HelperText>
    </>
  ),
});

const getPolicies = () => ({
  [Policies.AllowPublicReadAccess]:
    '{\n  "Version": "2012-10-17",\n  "Statement": [\n    {\n      "Sid": "AllowPublicReadAccess",\n      "Effect": "Allow",\n      "Principal": "*",\n      "Action": "s3:GetObject",\n      "Resource": "arn:aws:s3:::your-bucket-name/*"\n    }\n  ]\n}',
  [Policies.AllowAccessToSpecificAccount]:
    '{\n  "Version": "2012-10-17",\n  "Statement": [\n    {\n      "Sid": "AllowAccessToSpecificAccount",\n      "Effect": "Allow",\n      "Principal": {\n        "AWS": "your-account-name-or-id"\n      },\n      "Action": "s3:*",\n      "Resource": [\n        "arn:aws:s3:::your-bucket-name",\n        "arn:aws:s3:::your-bucket-name/*"\n      ]\n    }\n  ]\n}',
  [Policies.EnforceSecureTransportHTTPS]:
    '{\n  "Version": "2012-10-17",\n  "Statement": [\n    {\n      "Sid": "EnforceSecureTransportHTTPS",\n      "Effect": "Deny",\n      "Principal": "*",\n      "Action": "s3:*",\n      "Resource": [\n        "arn:aws:s3:::your-bucket-name",\n        "arn:aws:s3:::your-bucket-name/*"\n      ],\n      "Condition": {\n        "Bool": {\n          "aws:SecureTransport": "false"\n        }\n      }\n    }\n  ]\n}',
  [Policies.AllowReadWriteAccessToFolder]:
    '{\n  "Version": "2012-10-17",\n  "Statement": [\n    {\n      "Sid": "AllowReadWriteAccessToFolder",\n      "Effect": "Allow",\n      "Principal": {\n        "AWS": "your-account-name-or-id"\n      },\n      "Action": [\n        "s3:GetObject",\n        "s3:PutObject",\n        "s3:DeleteObject"\n      ],\n      "Resource": "arn:aws:s3:::your-bucket-name/your-folder-name/*"\n    }\n  ]\n}',
});

export const PreConfiguredPolicies: React.FC<PreConfiguredPoliciesProps> = ({
  setCode,
}) => {
  const { t } = useCustomTranslation();

  const [isChecked, setIsChecked] = React.useState(false);

  const onSelect = (policy: Policies) => setCode(getPolicies()[policy]);

  return (
    <>
      <Switch
        label={t('Use a predefined policy configuration?')}
        className="pf-v6-u-my-sm"
        isChecked={isChecked}
        onChange={(_event, checked) => setIsChecked(checked)}
        isReversed
      />
      {isChecked && (
        <FormGroup label={t('Available policies')} className="pf-v6-u-mb-md">
          <StaticDropdown
            dropdownItems={getLabels(t)}
            onSelect={onSelect}
            className="pf-v6-u-w-50"
            defaultText={t('Select from available policies')}
          />
        </FormGroup>
      )}
    </>
  );
};
