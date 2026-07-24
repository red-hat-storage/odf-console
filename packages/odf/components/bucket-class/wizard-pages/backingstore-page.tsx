import * as React from 'react';
import { useModalWrapper } from '@odf/shared';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  Alert,
  AlertActionCloseButton,
  Form,
  FormGroup,
  Title,
} from '@patternfly/react-core';
import { NamespaceStoreKind } from '../../../types';
import { ExternalLink } from '../../mcg-endpoints/gcp-endpoint-type';
import { NamespaceStoreDropdown } from '../../namespace-store/namespace-store-dropdown';
import BackingStoreSelection from '../backingstore-table';
import { Action, State } from '../state';

const CreateBackingStoreModal = React.lazy(
  () => import('../../create-bs/create-bs-modal')
);

const NamespaceStoreCreateModal = React.lazy(
  () => import('../../namespace-store/namespace-store-modal')
);

const BackingStorePage: React.FC<BackingStorePageProps> = React.memo(
  ({ dispatcher, state, namespace }) => {
    // CR data
    // CR data clones to maintain order and selection state for table rows
    const {
      tier2Policy,
      tier1Policy,
      tier1BackingStore,
      tier2BackingStore,
      isDeepArchive,
      archiveNamespaceStore,
    } = state;
    const [showHelp, setShowHelp] = React.useState(true);
    const { t } = useCustomTranslation();
    const launcher = useModalWrapper();

    const launchModal = () =>
      launcher(CreateBackingStoreModal, { isOpen: true });

    const launchArchiveNamespaceStoreModal = React.useCallback(
      () =>
        launcher(NamespaceStoreCreateModal, {
          isOpen: true,
          extraProps: {
            isArchivePreSelected: true,
          },
        }),
      [launcher]
    );

    const handleArchiveNamespaceStoreChange = React.useCallback(
      (selectedNamespaceStore: NamespaceStoreKind) => {
        dispatcher({
          type: 'setArchiveNamespaceStore',
          value: selectedNamespaceStore,
        });
      },
      [dispatcher]
    );

    return (
      <div className="nb-create-bc-step-page">
        {/* IBM Deep Archive - Archive NamespaceStore Section */}
        {isDeepArchive && (
          <>
            <Title
              size="xl"
              headingLevel="h2"
              className="nb-bc-step-page-form__title"
            >
              {t('Archive - IBM Deep archive')}
            </Title>
            <Form className="nb-create-bc-step-page-form">
              <FormGroup
                label={t('NamespaceStore')}
                fieldId="archive-namespacestore-input"
                isRequired
              >
                <NamespaceStoreDropdown
                  id="archive-namespacestore-input"
                  namespace={namespace}
                  onChange={handleArchiveNamespaceStoreChange}
                  selectedKey={getName(archiveNamespaceStore)}
                  launchModal={launchArchiveNamespaceStoreModal}
                  filterArchive
                />
              </FormGroup>
            </Form>
          </>
        )}

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
