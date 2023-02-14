import * as React from 'react';
import { ModalBody, ModalFooter } from '@odf/shared/modals/Modal';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  Modal,
  Button,
  ButtonVariant,
  ModalVariant,
  Text,
  TextContent,
  TextVariants,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  SearchInput,
  Bullseye,
} from '@patternfly/react-core';
import {
  TableComposable,
  Tbody,
  Tr,
  Td,
  Th,
  Thead,
  ThProps,
} from '@patternfly/react-table';
import { ApplicationRefKind } from '../../../hooks/applications-hook';
import './connected-apps-modal.scss';

const reactPropFix = {
  translate: 'yes',
};

const filterItems = (name: string, searchValue: string) =>
  name.toLowerCase().includes(searchValue.toLowerCase());

export const ConnectedApplicationsModal: React.FC<ConnectedApplicationsModalProps> =
  (props) => {
    const { t } = useCustomTranslation();
    const { applicationRefs, isOpen, onClose } = props;
    const [filteredApplications, setFilteredApplications] = React.useState<
      ApplicationRefKind[]
    >([]);
    const [searchAppName, setSearchAppName] = React.useState('');
    const [activeSortIndex, setActiveSortIndex] = React.useState<number>();
    const [activeSortDirection, setActiveSortDirection] = React.useState<
      'asc' | 'desc'
    >();

    React.useEffect(
      () => setFilteredApplications(applicationRefs),
      [applicationRefs]
    );

    const onClear = () => {
      setSearchAppName('');
      setFilteredApplications(applicationRefs);
    };

    // **Note: PatternFly change the fn signature
    // From: (value: string, event: React.FormEvent<HTMLInputElement>) => void
    // To: (_event: React.FormEvent<HTMLInputElement>, value: string) => void
    // both cases need to be handled for backwards compatibility
    const onSearch = (input: any) => {
      const searchValue =
        typeof input === 'string'
          ? input
          : (input.target as HTMLInputElement)?.value;
      if (searchValue === '') {
        onClear();
      } else {
        setSearchAppName(searchValue);
        setFilteredApplications(
          applicationRefs?.filter((app) =>
            filterItems(app?.applicationName, searchValue)
          )
        );
      }
    };

    let sortedRepositories = filteredApplications;
    if (activeSortIndex !== null && sortedRepositories?.length) {
      sortedRepositories = filteredApplications.sort((a, b) => {
        const name1 = a?.applicationName;
        const name2 = b?.applicationName;
        if (activeSortDirection === 'asc') {
          return name1.localeCompare(name2);
        }
        return name2.localeCompare(name1);
      });
    }

    const getSortParams = (columnIndex: number): ThProps['sort'] => ({
      sortBy: {
        index: activeSortIndex,
        direction: activeSortDirection,
      },
      onSort: (_event, index, direction) => {
        setActiveSortIndex(index);
        setActiveSortDirection(direction);
      },
      columnIndex,
    });

    return (
      <Modal
        variant={ModalVariant.small}
        title={t('Connected applications')}
        isOpen={isOpen}
        onClose={onClose}
        className="mco-application-status__form"
      >
        <ModalBody>
          <TextContent>
            <Text component={TextVariants.small}>
              {t('List all the connected applications under a policy.')}
            </Text>
          </TextContent>
          <Toolbar inset={{ default: 'insetNone' }}>
            <ToolbarContent>
              <ToolbarItem>
                <SearchInput
                  data-test="appSearch"
                  placeholder={t('Application name')}
                  type="text"
                  aria-label={t('application name search')}
                  value={searchAppName}
                  onChange={onSearch}
                  onClear={() => onClear()}
                />
              </ToolbarItem>
            </ToolbarContent>
          </Toolbar>
          <div className="mco-application-status__box">
            {filteredApplications.length === 0 ? (
              <Bullseye className="mco-application-status__bullseye">
                {t('No matching application found')}
              </Bullseye>
            ) : (
              <div className="mco-application-status__table">
                <TableComposable
                  {...reactPropFix}
                  variant="compact"
                  aria-label={t('Application list')}
                  borders={false}
                  gridBreakPoint=""
                  isStickyHeader
                >
                  <Thead {...reactPropFix}>
                    <Tr {...reactPropFix}>
                      <Th {...reactPropFix} sort={getSortParams(0)}>
                        {t('Name')}
                      </Th>
                      <Th {...reactPropFix} sort={getSortParams(1)}>
                        {t('Namespace')}
                      </Th>
                      <Th {...reactPropFix} sort={getSortParams(2)}>
                        {t('Type')}
                      </Th>
                    </Tr>
                  </Thead>
                  <Tbody {...reactPropFix}>
                    {sortedRepositories.map((app, rowIndex) => (
                      <Tr {...reactPropFix} key={rowIndex}>
                        <Td {...reactPropFix}>{app?.applicationName}</Td>
                        <Td {...reactPropFix}>{app?.applicationNamespace}</Td>
                        <Td {...reactPropFix}>{app?.applicationType}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </TableComposable>
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button key="close" variant={ButtonVariant.primary} onClick={onClose}>
            {t('Close')}
          </Button>
        </ModalFooter>
      </Modal>
    );
  };

type ConnectedApplicationsModalProps = {
  applicationRefs: ApplicationRefKind[];
  onClose: () => void;
  isOpen: boolean;
};
