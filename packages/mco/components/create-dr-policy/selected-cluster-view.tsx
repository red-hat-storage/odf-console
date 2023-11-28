import * as React from 'react';
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
};

export const SelectedCluster: React.FC<SelectedClusterProps> = ({
  id,
  cluster,
}) => {
  const { name, region, isManagedClusterAvailable, odfInfo } = cluster;
  const { t } = useCustomTranslation();
  const { cephFSID, storageSystem } = odfInfo?.odfConfigInfo?.[0] || {};
  const [storageSystemName] = !!storageSystem
    ? parseNamespaceName(storageSystem)
    : [];
  const anyError =
    !isManagedClusterAvailable ||
    !odfInfo?.isValidODFVersion ||
    !storageSystem ||
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
