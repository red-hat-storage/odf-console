import * as React from 'react';
import { getName } from '@odf/shared/selectors';
import { useTranslation } from 'react-i18next';
import { Form, FormGroup, Title } from '@patternfly/react-core';
import { NamespaceStoreKind } from '../../../../types';
import { NamespaceStoreDropdown } from '../../../namespace-store/namespace-store-dropdown';
import { Action, State } from '../../state';

export const SingleNamespaceStorePage: React.FC<SingleNamespaceStoreProps> =
  // eslint-disable-next-line react/display-name
  React.memo(
    ({ dispatch, namespace, state, hideCreateNamespaceStore, launchModal }) => {
      const { t } = useTranslation();
      const handleNSStateChange = (
        selectedNamespaceStore: NamespaceStoreKind
      ) => {
        dispatch({
          type: 'setWriteNamespaceStore',
          value: [selectedNamespaceStore],
        });
        dispatch({
          type: 'setReadNamespaceStore',
          value: [selectedNamespaceStore],
        });
      };
      return (
        <div>
          <Title
            size="xl"
            headingLevel="h2"
            className="nb-bc-step-page-form__title"
          >
            {t('Read and Write NamespaceStore ')}
          </Title>
          <p className="nb-create-bc-step-page-form__element--light-text">
            {t(
              'Select one NamespaceStore which defines the read and write targets of the namespace bucket.'
            )}
          </p>
          <Form>
            <FormGroup
              className="nb-create-bc-step-page-form"
              fieldId="namespacestore-input"
            >
              <NamespaceStoreDropdown
                id="namespacestore-input"
                className="nb-create-bc-step-page-form__dropdown"
                namespace={namespace}
                onChange={handleNSStateChange}
                selectedKey={getName(state.readNamespaceStore[0])}
                creatorDisabled={hideCreateNamespaceStore}
                launchModal={launchModal}
              />
            </FormGroup>
          </Form>
        </div>
      );
    }
  );

type SingleNamespaceStoreProps = {
  dispatch: React.Dispatch<Action>;
  namespace?: string;
  state: State;
  hideCreateNamespaceStore?: boolean;
  launchModal?: () => void;
};
