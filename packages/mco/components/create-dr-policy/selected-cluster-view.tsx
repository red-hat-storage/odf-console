import * as React from 'react';
import { parseNamespaceName } from '@odf/mco/utils';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  Content,
  Badge,
  ContentVariants,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { ManagedClusterInfoType } from './utils/reducer';
import './create-dr-policy.scss';

type SelectedClusterViewProps = {
  index: number;
  cluster: ManagedClusterInfoType;
};

export const SelectedClusterView: React.FC<SelectedClusterViewProps> = ({
  index,
  cluster,
}) => {
  const { t } = useCustomTranslation();
  const { odfInfo } = cluster;
  const [storageClusterName] = parseNamespaceName(
    odfInfo.storageClusterInfo.storageClusterNamespacedName
  );
  return (
    <Flex
      display={{ default: 'inlineFlex' }}
      className="mco-create-data-policy__flex"
    >
      <FlexItem>
        <Badge key={index} isRead>
          {index}
        </Badge>
      </FlexItem>
      <FlexItem>
        <Content>
          <Content component={ContentVariants.p}>{getName(cluster)}</Content>
          {!!storageClusterName ? (
            <Content component={ContentVariants.small}>
              {storageClusterName}
            </Content>
          ) : (
            <Content component={ContentVariants.small}>
              {t('Information unavailable')}
            </Content>
          )}
        </Content>
      </FlexItem>
    </Flex>
  );
};
