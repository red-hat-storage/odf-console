import * as React from 'react';
import { DRPlacementControlModel, useModalWrapper } from '@odf/shared';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getErrorMessage } from '@odf/shared/utils';
import { k8sPatch } from '@openshift-console/dynamic-plugin-sdk';
import {
  Alert,
  AlertVariant,
  Button,
  ButtonVariant,
  Content,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { getEndTestFailoverPatch } from '../../utils/test-failover';

const ConvertTestFailoverModal = React.lazy(
  () => import('./convert-test-failover-modal')
);

type TestFailoverHoldAlertProps = {
  drpcName?: string;
  drpcNamespace?: string;
  homeCluster?: string;
  // False once Convert or Clean up is patched, until Ramen leaves the hold.
  dryRun?: boolean;
  onConvert?: () => void;
};

export const TestFailoverHoldAlert: React.FC<TestFailoverHoldAlertProps> = ({
  drpcName,
  drpcNamespace,
  homeCluster,
  dryRun,
  onConvert: onConvertLaunched,
}) => {
  const { t } = useCustomTranslation();
  const launcher = useModalWrapper();
  const [isCleaningUp, setCleaningUp] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const canPatch = !!drpcName && !!drpcNamespace && !!dryRun;

  const onConvert = () => {
    onConvertLaunched?.();
    launcher(ConvertTestFailoverModal, {
      isOpen: true,
      extraProps: { drpcName, drpcNamespace },
    });
  };

  const onCleanUp = () => {
    if (!canPatch || !homeCluster || isCleaningUp) return;
    setCleaningUp(true);
    setErrorMessage('');
    k8sPatch({
      model: DRPlacementControlModel,
      resource: {
        metadata: { name: drpcName, namespace: drpcNamespace },
      },
      data: getEndTestFailoverPatch(homeCluster),
    }).catch((error) => {
      setCleaningUp(false);
      setErrorMessage(getErrorMessage(error));
    });
  };

  return (
    <FlexItem>
      <Content component="p">
        {t(
          'Workloads are protected on both clusters. To complete the test failover session, proceed with Clean Up. If required, you can Convert to Failover to make the failover permanent.'
        )}
      </Content>
      <Flex
        className="pf-v6-u-mt-sm"
        flexWrap={{ default: 'nowrap' }}
        spaceItems={{ default: 'spaceItemsSm' }}
      >
        <Button
          variant={ButtonVariant.warning}
          isDisabled={!canPatch || isCleaningUp}
          onClick={onConvert}
        >
          {t('Convert to real failover')}
        </Button>
        <Button
          variant={ButtonVariant.primary}
          isDisabled={!canPatch || isCleaningUp || !homeCluster}
          isLoading={isCleaningUp}
          onClick={onCleanUp}
        >
          {t('Clean up test')}
        </Button>
      </Flex>
      {errorMessage && (
        <Alert
          className="pf-v6-u-mt-sm"
          variant={AlertVariant.danger}
          isInline
          title={t('An error occurred')}
        >
          {errorMessage}
        </Alert>
      )}
    </FlexItem>
  );
};
