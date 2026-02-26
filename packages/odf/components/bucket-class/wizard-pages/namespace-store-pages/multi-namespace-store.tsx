import * as React from 'react';
import { getName, getUID } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  Button,
  ButtonVariant,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  Title,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { NamespaceStoreKind } from '../../../../types';
import { NamespaceStoreDropdown } from '../../../namespace-store/namespace-store-dropdown';
import NamespaceStoreListWrapper from '../../../namespace-store/namespace-store-table';
import { Action, State } from '../../state';

export const MultiNamespaceStorePage: React.FC<MultiNamespaceStoreProps> =
  // eslint-disable-next-line react/display-name
  React.memo(
    ({
      state,
      dispatch,
      namespace,
      hideCreateNamespaceStore = false,
      launchModal,
    }) => {
      const { t } = useCustomTranslation();
      const [selectedCount, setSelectedCount] = React.useState(
        state.readNamespaceStore.length
      );
      const [enabledItems, setEnabledItems] = React.useState([]);
      const [selectedItem, setSelectedItem] = React.useState(
        getName(state.writeNamespaceStore[0]) ?? ''
      );

      React.useEffect(() => {
        const readItems = state.readNamespaceStore.map(getName);
        setEnabledItems(readItems);
      }, [state.readNamespaceStore]);

      const onSelectNamespaceStoreTable = (
        selectedNamespaceStore: NamespaceStoreKind[]
      ) => {
        dispatch({
          type: 'setReadNamespaceStore',
          value: selectedNamespaceStore,
        });
        setSelectedCount(selectedNamespaceStore.length);
        if (
          !selectedNamespaceStore
            .map(getName)
            .includes(getName(state.writeNamespaceStore[0]))
        ) {
          dispatch({ type: 'setWriteNamespaceStore', value: [] });
          setSelectedItem('');
        }
      };

      const onSelectNamespaceStoreDropdown = (
        selectedNamespaceStore: NamespaceStoreKind
      ) => {
        dispatch({
          type: 'setWriteNamespaceStore',
          value: [selectedNamespaceStore],
        });
        setSelectedItem(getName(selectedNamespaceStore));
      };

      return (
        <div className="nb-create-bc-step-page">
          <Flex
            justifyContent={{ default: 'justifyContentSpaceBetween' }}
            alignItems={{ default: 'alignItemsCenter' }}
          >
            <FlexItem>
              <Title size="xl" headingLevel="h2">
                {t('Read NamespaceStores')}
              </Title>
              <p className="nb-create-bc-step-page-form__element--light-text">
                {t(
                  'Select a list of NamespaceStores that defines the read targets of the namespace bucket.'
                )}
              </p>
            </FlexItem>
            {!hideCreateNamespaceStore && (
              <FlexItem>
                <Button
                  icon={<PlusCircleIcon />}
                  variant={ButtonVariant.link}
                  onClick={launchModal}
                  className="nb-bc-step-page-form__modal-launcher"
                >
                  {t('Create NamespaceStore')}
                </Button>
              </FlexItem>
            )}
          </Flex>
          <Form className="nb-create-bc-step-page-form">
            <FormGroup
              className="nb-create-bc-step-page-form"
              fieldId="namespacestoretable-input"
            >
              <NamespaceStoreListWrapper
                preSelected={state.readNamespaceStore.map(getUID)}
                onSelectNamespaceStore={onSelectNamespaceStoreTable}
              />
            </FormGroup>
            <p className="nb-create-bc-step-page-form__element--light-text">
              {t('{{nns, number}} namespace store ', {
                nns: selectedCount,
                count: selectedCount,
              })}
              {t(' selected')}
            </p>
            <Title size="xl" headingLevel="h2">
              {t('Write NamespaceStore')}
            </Title>
            <p className="nb-create-bc-step-page-form__element--light-text">
              {t(
                'Select a single NamespaceStore that defines the write targets of the namespace bucket.'
              )}
            </p>
            <FormGroup
              className="nb-create-bc-step-page-form"
              fieldId="namespacestore-input"
            >
              <NamespaceStoreDropdown
                id="namespacestore-input"
                selectedKey={selectedItem}
                className="nb-create-bc-step-page-form--dropdown"
                namespace={namespace}
                onChange={onSelectNamespaceStoreDropdown}
                enabledItems={enabledItems}
                namespacePolicy={state.namespacePolicyType}
                launchModal={launchModal}
                creatorDisabled
              />
            </FormGroup>
          </Form>
        </div>
      );
    }
  );

type MultiNamespaceStoreProps = {
  state: State;
  dispatch: React.Dispatch<Action>;
  namespace?: string;
  hideCreateNamespaceStore?: boolean;
  launchModal?: any;
};
