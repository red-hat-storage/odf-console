import * as React from 'react';
import { useModalLauncher } from '@odf/shared/modals/modalLauncher';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Alert, AlertActionCloseButton } from '@patternfly/react-core';
import { ExternalLink } from '../../mcg-endpoints/gcp-endpoint-type';
import BackingStoreSelection from '../backingstore-table';
import { Action, State } from '../state';

const BS_MODAL_KEY = 'BUCKETCLASS_WIZARD_BS_CREATE_MODAL';

const modalMap = {
  [BS_MODAL_KEY]: React.lazy(() => import('../../create-bs/create-bs-modal')),
};

const BackingStorePage: React.FC<BackingStorePageProps> = React.memo(
  ({ dispatcher, state }) => {
    // CR data
    // CR data clones to maintain order and selection state for table rows
    const { tier2Policy, tier1Policy, tier1BackingStore, tier2BackingStore } =
      state;
    const [showHelp, setShowHelp] = React.useState(true);
    const { t } = useCustomTranslation();

    const [Modal, modalProps, launcher] = useModalLauncher(modalMap);

    const launchModal = () => launcher(BS_MODAL_KEY, null);

    return (
      <>
        <Modal {...modalProps} />
        <div className="nb-create-bc-step-page">
          {showHelp && (
            <Alert
              className="nb-create-bc-step-page__info"
              isInline
              variant="info"
              title={t('What is a BackingStore?')}
              actionClose={
                <AlertActionCloseButton onClose={() => setShowHelp(false)} />
              }
            >
              <p>
                {t(
                  'BackingStore represents a storage target to be used as the underlying storage for the data in Multicloud Object Gateway buckets.'
                )}
              </p>
              <p>
                {t(
                  'Multiple types of BackingStores are supported: asws-s3 s3-compatible google-cloud-storage azure-blob obc PVC.'
                )}
              </p>
              <ExternalLink
                href="https://github.com/noobaa/noobaa-operator/blob/master/doc/backing-store-crd.md"
                text={t('Learn More')}
              />
            </Alert>
          )}
          <BackingStoreSelection
            tier1Policy={tier1Policy}
            tier2Policy={tier2Policy}
            selectedTierA={tier1BackingStore}
            selectedTierB={tier2BackingStore}
            setSelectedTierA={(bs) =>
              dispatcher({ type: 'setBackingStoreTier1', value: [...bs] })
            }
            setSelectedTierB={(bs) =>
              dispatcher({ type: 'setBackingStoreTier2', value: [...bs] })
            }
            launchModal={launchModal}
          />
        </div>
      </>
    );
  }
);

BackingStorePage.displayName = 'BackingStorePage';

export default BackingStorePage;

type BackingStorePageProps = {
  dispatcher: React.Dispatch<Action>;
  state: State;
  namespace: string;
};
