import * as React from 'react';
import { DRPlacementControlModel } from '@odf/shared';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getErrorMessage } from '@odf/shared/utils';
import { k8sPatch, Patch } from '@openshift-console/dynamic-plugin-sdk';
import { Alert, AlertVariant, Button, Flex } from '@patternfly/react-core';
import {
  getEndTestFailoverPatch,
  getPromoteTestFailoverPatch,
} from '../../utils/test-failover';

type TestFailoverHoldAlertProps = {
  drpcName?: string;
  drpcNamespace?: string;
  homeCluster?: string;
};

export const TestFailoverHoldAlert: React.FC<TestFailoverHoldAlertProps> = ({
  drpcName,
  drpcNamespace,
  homeCluster,
}) => {
  const { t } = useCustomTranslation();
  const [pendingAction, setPendingAction] = React.useState<
    'promote' | 'end' | ''
  >('');
  const [errorMessage, setErrorMessage] = React.useState('');
  const canPatch = !!drpcName && !!drpcNamespace;

  const submit = (action: 'promote' | 'end', patch: Patch[]) => {
    if (!canPatch || pendingAction) return;
    setPendingAction(action);
    setErrorMessage('');
    k8sPatch({
      model: DRPlacementControlModel,
      resource: {
        metadata: { name: drpcName, namespace: drpcNamespace },
      },
      data: patch,
    }).catch((error) => {
      setPendingAction('');
      setErrorMessage(getErrorMessage(error));
    });
  };

  return (
    <Alert
      variant={AlertVariant.info}
      isInline
      title={t('Test failover requires action')}
    >
      {t(
        'The workloads are secured in both the clusters. To conclude the test failover session. You should proceed for clean up. You can convert the test to a real failover.'
      )}
      <Flex className="pf-v6-u-mt-sm" spaceItems={{ default: 'spaceItemsSm' }}>
        <Button
          variant="secondary"
          isDisabled={!canPatch || !!pendingAction}
          isLoading={pendingAction === 'promote'}
          onClick={() => submit('promote', getPromoteTestFailoverPatch())}
        >
          {t('Convert to real failover')}
        </Button>
        <Button
          variant="primary"
          isDisabled={!canPatch || !!pendingAction || !homeCluster}
          isLoading={pendingAction === 'end'}
          onClick={() =>
            homeCluster && submit('end', getEndTestFailoverPatch(homeCluster))
          }
        >
          {t('Clean up test')}
        </Button>
      </Flex>
      {errorMessage && (
        <Alert
          className="pf-v6-u-mt-sm"
          variant={AlertVariant.danger}
          isInline
          title={errorMessage}
        />
      )}
    </Alert>
  );
};
