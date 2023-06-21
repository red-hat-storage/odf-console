import * as React from 'react';
import { ActionDropdown } from '@odf/shared/dropdown/action-dropdown';
import { ModalBody } from '@odf/shared/modals/Modal';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { TFunction } from 'i18next';
import {
  Button,
  Pagination,
  PaginationVariant,
  SearchInput,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  Text,
} from '@patternfly/react-core';
import { PolicyListViewTable } from './helper/policy-list-view-table';
import {
  ManagePolicyStateType,
  ModalActionContext,
  ModalViewContext,
  PolicyListViewState,
} from './utils/reducer';
import { ManagePolicyStateAction } from './utils/reducer';
import { DataPolicyType } from './utils/types';
import './style.scss';

const INITIAL_PAGE_NUMBER = 1;
const COUNT_PER_PAGE_NUMBER = 4;

const getRange = (currentPage: number, perPage: number) => {
  const indexOfLastRow = currentPage * perPage;
  const indexOfFirstRow = indexOfLastRow - perPage;
  return [indexOfFirstRow, indexOfLastRow];
};

const filterPolicies = (dataPolicyInfo: DataPolicyType[], searchText: string) =>
  dataPolicyInfo?.filter((policy) =>
    getName(policy)?.toLowerCase()?.includes(searchText)
  );

export const PolicyListViewToolBar: React.FC<PolicyListViewToolBarProps> = ({
  searchText,
  isActionDisabled,
  onSearchChange,
  setModalActionContext,
  t,
}) => {
  return (
    <Toolbar>
      <ToolbarContent>
        <ToolbarItem>
          <SearchInput
            placeholder={t('Search')}
            aria-label={t('Search input')}
            value={searchText}
            onChange={(value) => onSearchChange(value)}
          />
        </ToolbarItem>
        <ToolbarItem>
          <ActionDropdown
            id="secondary-actions"
            aria-label={t('Secondary actions')}
            text={t('Actions')}
            toggleVariant={'primary'}
            isDisabled={isActionDisabled}
            onSelect={(id: ModalActionContext) => setModalActionContext(id)}
            dropdownItems={[
              {
                id: ModalActionContext.UN_ASSIGNING_POLICIES,
                text: t('Unassign policy'),
              },
            ]}
          />
        </ToolbarItem>
      </ToolbarContent>
    </Toolbar>
  );
};

export const PolicyListView: React.FC<PolicyListViewProps> = ({
  dataPolicyInfo,
  state,
  dispatch,
  setModalContext,
  setModalActionContext,
}) => {
  const { t } = useCustomTranslation();
  const [page, setPage] = React.useState(INITIAL_PAGE_NUMBER);
  const [perPage, setPerPage] = React.useState(COUNT_PER_PAGE_NUMBER);
  const [searchText, onSearchChange] = React.useState('');
  const [start, end] = getRange(page, perPage);
  const policies = filterPolicies(dataPolicyInfo, searchText);
  const paginatedPolicies = policies?.slice(start, end);

  const setPolicies = (selectedPolicies: DataPolicyType[]) =>
    dispatch({
      type: ManagePolicyStateType.SET_SELECTED_POLICIES,
      context: ModalViewContext.POLICY_LIST_VIEW,
      payload: selectedPolicies,
    });

  const setPolicy = (
    policy: DataPolicyType,
    modalViewContext: ModalViewContext
  ) =>
    dispatch({
      type: ManagePolicyStateType.SET_SELECTED_POLICY,
      context: modalViewContext,
      payload: policy,
    });

  return (
    <ModalBody>
      <div className="mco-manage-policies__header">
        <Text component="h3"> {t('My policies')} </Text>
        <Button
          variant="primary"
          id="primary-action"
          isDisabled={!!state.policies.length}
          onClick={() => setModalContext(ModalViewContext.ASSIGN_POLICY_VIEW)}
        >
          {t('Assign policy')}
        </Button>
      </div>
      <PolicyListViewToolBar
        searchText={searchText}
        isActionDisabled={!state.policies.length}
        onSearchChange={onSearchChange}
        setModalActionContext={setModalActionContext}
        t={t}
      />
      <div className="mco-manage-policies__col-padding">
        <PolicyListViewTable
          policies={paginatedPolicies}
          selectedPolicies={state.policies}
          modalActionContext={state.modalActionContext}
          setModalActionContext={setModalActionContext}
          setModalContext={setModalContext}
          setPolicies={setPolicies}
          setPolicy={setPolicy}
        />
        <Pagination
          perPageComponent="button"
          itemCount={policies?.length || 0}
          widgetId="data-policy-list"
          perPage={perPage}
          page={page}
          variant={PaginationVariant.bottom}
          dropDirection="up"
          perPageOptions={[]}
          isStatic
          onSetPage={(_event, newPage) => setPage(newPage)}
          onPerPageSelect={(_event, newPerPage, newPage) => {
            setPerPage(newPerPage);
            setPage(newPage);
          }}
        />
      </div>
    </ModalBody>
  );
};

type PolicyListViewProps = {
  dataPolicyInfo: DataPolicyType[];
  state: PolicyListViewState;
  dispatch: React.Dispatch<ManagePolicyStateAction>;
  setModalContext: (modalViewContext: ModalViewContext) => void;
  setModalActionContext: (modalActionContext: ModalActionContext) => void;
  setError: (error: string) => void;
};

type PolicyListViewToolBarProps = {
  searchText: string;
  isActionDisabled: boolean;
  onSearchChange: React.Dispatch<React.SetStateAction<string>>;
  setModalActionContext: (modalActionContext: ModalActionContext) => void;
  t: TFunction;
};
