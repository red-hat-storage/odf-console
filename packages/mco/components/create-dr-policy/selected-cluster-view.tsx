import * as React from 'react';
import { REPLICATION_TYPE } from '@odf/mco/constants';
import { parseNamespaceName } from '@odf/mco/utils';
import { RedExclamationCircleIcon } from '@odf/shared/status/icons';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  Text,
  Badge,
  TextContent,
  TextVariants,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { ManagedClusterInfoType } from './reducer';
import './create-dr-policy.scss';

type SelectedClusterProps = {
  id: number;
  cluster: ManagedClusterInfoType;
  replicationType: REPLICATION_TYPE;
};

export const checkForErrors = (
  clusters: ManagedClusterInfoType[],
  replicationType: REPLICATION_TYPE
) =>
  clusters.some((cluster) => {
    const { isManagedClusterAvailable, odfInfo } = cluster;
    const { cephFSID, isDROptimized, storageSystemNamespacedName } =
      odfInfo.storageClusterInfo;
    const [storageSystemName] = parseNamespaceName(storageSystemNamespacedName);
    return (
      !isManagedClusterAvailable ||
      !odfInfo?.isValidODFVersion ||
      !storageSystemName ||
      !cephFSID ||
      (replicationType === REPLICATION_TYPE.ASYNC && !isDROptimized)
    );
  });

export const SelectedCluster: React.FC<SelectedClusterProps> = ({
  id,
  cluster,
  replicationType,
}) => {
  const { t } = useCustomTranslation();
  const { name, region, odfInfo } = cluster;
  const [storageSystemName] = parseNamespaceName(
    odfInfo.storageClusterInfo.storageSystemNamespacedName
  );
  const anyError = checkForErrors([cluster], replicationType);
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
