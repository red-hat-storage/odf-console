import * as React from 'react';
import { GetPublicAccessBlockCommandOutput } from '@aws-sdk/client-s3';
import { TFunction } from 'react-i18next';
import {
  TreeViewDataItem,
  Content,
  ContentVariants,
  Label,
} from '@patternfly/react-core';
import { BanIcon, ExclamationTriangleIcon } from '@patternfly/react-icons';

export const SupportedConfig = {
  BlockPublicPolicy: 'BlockPublicPolicy',
  RestrictPublicBuckets: 'RestrictPublicBuckets',
};

export const areAllChildrenChecked = (checkedItems: Set<string>) =>
  Object.values(SupportedConfig).every((child) => checkedItems.has(child));

export const areSomeChildrenChecked = (checkedItems: Set<string>) =>
  Object.values(SupportedConfig).some((child) => checkedItems.has(child));

export const isNoChildChecked = (checkedItems: Set<string>) =>
  Object.values(SupportedConfig).every((child) => !checkedItems.has(child));

export const getConfigText = (t: TFunction) => ({
  [SupportedConfig.BlockPublicPolicy]: t(
    'Block public access to buckets and objects granted through new public bucket policies'
  ),
  [SupportedConfig.RestrictPublicBuckets]: t(
    'Block public and cross-account access to buckets and objects through any public bucket policies'
  ),
});

export const showModal = (
  pabData: GetPublicAccessBlockCommandOutput,
  checkedItems: Set<string>,
  t: TFunction
) => {
  const configText = getConfigText(t);
  const disabledConfig = [];

  Object.entries(SupportedConfig).forEach(([key, value]) => {
    if (
      pabData?.PublicAccessBlockConfiguration?.[key] === true &&
      !checkedItems.has(value)
    )
      disabledConfig.push(configText[value]);
  });

  return [disabledConfig.length > 0, disabledConfig];
};

const getLabel = (manage: boolean, checkedItems: Set<string>, t: TFunction) => {
  let color;
  let text;
  let icon;
  const variant = manage ? 'outline' : 'filled';
  if (areAllChildrenChecked(checkedItems)) {
    color = 'green';
    text = t('Blocked all');
    icon = <BanIcon />;
  } else if (areSomeChildrenChecked(checkedItems)) {
    color = 'gold';
    text = t('Partially blocked');
    icon = <ExclamationTriangleIcon />;
  } else {
    color = 'red';
    text = t('Unblocked all');
    icon = <ExclamationTriangleIcon />;
  }

  return (
    <Label color={color} icon={icon} variant={variant}>
      {text}
    </Label>
  );
};

const getChildLabel = (
  manage: boolean,
  checkedItems: Set<string>,
  id: string,
  t: TFunction
) => {
  let color;
  let text;
  let icon;
  const variant = manage ? 'outline' : 'filled';
  if (checkedItems.has(id)) {
    color = 'green';
    text = t('Blocked');
    icon = <BanIcon />;
  } else {
    color = 'red';
    text = t('Unblocked');
    icon = <ExclamationTriangleIcon />;
  }

  return (
    <Label color={color} icon={icon} variant={variant}>
      {text}
    </Label>
  );
};

export const getOptions = (
  manage: boolean,
  checkedItems: Set<string>,
  t: TFunction
): TreeViewDataItem[] => {
  const configText = getConfigText(t);
  return [
    {
      name: (
        <Content>
          <Content component={ContentVariants.p}>
            {t('Block all public access')} {getLabel(manage, checkedItems, t)}
          </Content>
          <Content component={ContentVariants.small}>
            {t(
              'Prevent all forms of public access to this bucket and its objects.'
            )}{' '}
            <br />
            {t(
              'Overrides all policies and permissions that grant public access. When enabled, it ensures the bucket and all stored data are private and accessible only through explicitly granted permissions.'
            )}
          </Content>
        </Content>
      ),
      id: 'PublicAccessBlockConfiguration',
      checkProps: { checked: false, disabled: !manage },
      children: [
        {
          name: (
            <Content>
              <Content component={ContentVariants.p}>
                {configText[SupportedConfig.BlockPublicPolicy]}{' '}
                {getChildLabel(
                  manage,
                  checkedItems,
                  SupportedConfig.BlockPublicPolicy,
                  t
                )}
              </Content>
              <Content component={ContentVariants.small}>
                {t('Prevent new policies from making your data public.')} <br />
                {t(
                  'Blocks any newly created bucket policy that grants public access to your data, helping prevent accidental exposure in the future.'
                )}
              </Content>
            </Content>
          ),
          id: SupportedConfig.BlockPublicPolicy,
          checkProps: { checked: false, disabled: !manage },
        },
        {
          name: (
            <Content>
              <Content component={ContentVariants.p}>
                {configText[SupportedConfig.RestrictPublicBuckets]}{' '}
                {getChildLabel(
                  manage,
                  checkedItems,
                  SupportedConfig.RestrictPublicBuckets,
                  t
                )}
              </Content>
              <Content component={ContentVariants.small}>
                {t(
                  'Block all public and cross-account access granted by existing policies.'
                )}{' '}
                <br />
                {t(
                  'Restrict access from other accounts or the public internet, even if existing policies currently allow it. This is recommended for keeping your data isolated and secure.'
                )}
              </Content>
            </Content>
          ),
          id: SupportedConfig.RestrictPublicBuckets,
          checkProps: { checked: false, disabled: !manage },
        },
      ],
      defaultExpanded: true,
    },
  ];
};
