import * as React from 'react';
import { getName } from '@odf/shared/selectors';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  AlertActionCloseButton,
  Form,
  FormGroup,
  Title,
  ValidatedOptions,
} from '@patternfly/react-core';
import { BackingStoreKind, NamespaceStoreKind } from '../../../../types';
import { convertToMS, validateDuration } from '../../../../utils';
import { BackingStoreDropdown } from '../../../create-bs/backing-store-dropdown';
import { NamespaceStoreDropdown } from '../../../namespace-store/namespace-store-dropdown';
import { Action, State } from '../../state';
import { TimeDurationDropdown } from '../../time-duration-dropdown';

export const CacheNamespaceStorePage: React.FC<CacheNamespaceStoreProps> =
  React.memo(
    ({ dispatch, namespace, state, hideCreateNamespaceStore, launchModal }) => {
      const { t } = useTranslation();
      const [showHelp, setShowHelp] = React.useState(true);

      const handleNSStateChange = (
        selectedNamespaceStore: NamespaceStoreKind
      ) =>
        dispatch({
          type: 'setHubNamespaceStore',
          value: selectedNamespaceStore,
        });

      const handleBSStateChange = (selectedBackingStore: BackingStoreKind) =>
        dispatch({ type: 'setCacheBackingStore', value: selectedBackingStore });

      const onTTLChange = (event, setValidated) => {
        const { unit, value } = event;
        const ms = convertToMS({ unit, value });
        dispatch({ type: 'setTimeToLive', value: ms });
        dispatch({ type: 'setTimeUnit', value: unit });
        if (Number.isInteger(parseFloat(value)) && validateDuration(ms)) {
          setValidated(ValidatedOptions.success);
        } else {
          setValidated(ValidatedOptions.error);
        }
      };
      return (
        <div className="nb-create-bc-step-page">
          {showHelp && (
            <Alert
              isInline
              variant="info"
              title={t('What is Caching?')}
              actionClose={
                <AlertActionCloseButton onClose={() => setShowHelp(false)} />
              }
            >
              {t(
                'Caching is a policy that creates local copies of the data. It saves the copies locally to improve performance for frequently accessed data. Each cached copy has a TTL and is verified against the hub. Each non-read operation (upload, overwrite, delete) is performed on the hub'
              )}
            </Alert>
          )}
          <br />
          <Form className="nb-create-bc-step-page-form">
            <Title
              size="xl"
              headingLevel="h3"
              className="nb-bc-step-page-form__title"
            >
              {t('Hub namespace store ')}
            </Title>
            <p className="nb-create-bc-step-page-form__element--light-text">
              {t(
                'A single NamespaceStore that defines the read and write target of the namespace bucket.'
              )}
            </p>
            <FormGroup
              className="nb-create-bc-step-page-form"
              label={t('NamespaceStore')}
              fieldId="namespacestore-input"
            >
              <NamespaceStoreDropdown
                id="namespacestore-input"
                selectedKey={getName(state.hubNamespaceStore)}
                namespace={namespace}
                onChange={handleNSStateChange}
                creatorDisabled={hideCreateNamespaceStore}
                launchModal={launchModal}
              />
            </FormGroup>

            <Title
              size="xl"
              headingLevel="h3"
              className="nb-bc-step-page-form__title"
            >
              {t('Cache data settings')}
            </Title>
            <p className="nb-create-bc-step-page-form__element--light-text">
              {t(
                'The data will be temporarily copied on a backing store in order to later access it much more quickly.'
              )}
            </p>
            <FormGroup
              className="nb-create-bc-step-page-form"
              label={t('Backing store')}
              fieldId="backingstore-input"
            >
              <BackingStoreDropdown
                creatorDisabled={hideCreateNamespaceStore}
                id="backingstore-input"
                selectedKey={getName(state.cacheBackingStore)}
                namespace={namespace}
                onChange={handleBSStateChange}
              />
              <p className="nb-create-bc-step-page-form__element--light-text">
                {t(
                  'a local backing store is recommended for better performance'
                )}
              </p>
            </FormGroup>
            <FormGroup
              className="nb-create-bc-step-page-form"
              label={t('Time to live')}
              fieldId="timetolive-input"
              isRequired
            >
              <TimeDurationDropdown
                testID="time-to-live-input"
                id="timetolive-input"
                inputID="ttl-input"
                onChange={onTTLChange}
              />
              <p className="nb-create-bc-step-page-form__element--light-text">
                {t(
                  'Time to live is the time that an object is stored in a caching system before it is deleted or refreshed. Default: 0, Max: 24 hrs'
                )}
              </p>
            </FormGroup>
          </Form>
        </div>
      );
    }
  );

type CacheNamespaceStoreProps = {
  dispatch: React.Dispatch<Action>;
  state: State;
  namespace: string;
  hideCreateNamespaceStore?: boolean;
  launchModal?: () => void;
};
