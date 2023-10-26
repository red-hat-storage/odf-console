import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { RedExclamationCircleIcon } from '@openshift-console/dynamic-plugin-sdk';
import {
  Text,
  Badge,
  TextContent,
  TextVariants,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { Cluster, DRPolicyAction } from './reducer';
import './create-dr-policy.scss';

type SelectedClusterProps = {
  id: number;
  cluster: Cluster;
  dispatch: React.Dispatch<DRPolicyAction>;
};

export const SelectedCluster: React.FC<SelectedClusterProps> = ({
  id,
  cluster,
  dispatch, // eslint-disable-line @typescript-eslint/no-unused-vars
}) => {
  const {
    name,
    region,
    storageSystemName,
    isManagedClusterAvailable,
    isValidODFVersion,
    cephFSID,
  } = cluster;
  const { t } = useCustomTranslation();
  const anyError =
    !isManagedClusterAvailable ||
    !isValidODFVersion ||
    !storageSystemName ||
    !cephFSID;
  return (
    <Flex
      display={{ default: 'inlineFlex' }}
      className="mco-create-data-policy__flex"
    >
      <FlexItem>
        <Badge key={id} isRead>
          {id}
        </Badge>
      </FlexItem>
      <FlexItem>
        <TextContent>
          <Text component={TextVariants.p}>
            <span> {name} </span> &nbsp;
            {!!anyError && <RedExclamationCircleIcon />}
          </Text>
          {!!storageSystemName ? (
            <>
              <Text component={TextVariants.small}>{region}</Text>
              <Text component={TextVariants.small}>{storageSystemName}</Text>
            </>
          ) : (
            <Text component={TextVariants.small}>
              {t('Information unavailable')}
            </Text>
          )}
        </TextContent>
      </FlexItem>
    </Flex>
  );
};
