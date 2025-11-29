import * as React from 'react';
import {
  AccessKeyMetadata,
  ListAccessKeysCommandOutput,
  Tag,
} from '@aws-sdk/client-iam';
import { AccessKeyStatus } from '@odf/core/constants/s3-iam';
import DeleteAccessKeyModal from '@odf/core/modals/s3-iam/DeleteAccessKeyModal';
import { DASH, useCustomTranslation } from '@odf/shared';
import { IamCommands } from '@odf/shared/iam';
import {
  GreenCheckCircleIcon,
  useModal,
} from '@openshift-console/dynamic-plugin-sdk';
import { LaunchModal } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import { KeyedMutator } from 'swr';
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Dropdown,
  DropdownItem,
  DropdownList,
  Flex,
  FlexItem,
  GridItem,
  Label,
  MenuToggle,
  MenuToggleElement,
  Text,
  Title,
} from '@patternfly/react-core';
import { BanIcon, EllipsisVIcon } from '@patternfly/react-icons';
import EditDescriptionTag from '../../EditDescriptionTag';
import UpdateAccessKey from '../../UpdateAccessKey';

type AccessKeyCardProps = {
  accessKeyCard: AccessKeyMetadata;
  accessKeyNumber: number;
  tags: Tag[];
  iamClient: IamCommands;
  refetch: KeyedMutator<ListAccessKeysCommandOutput>;
};

type DropdownToggleProps = {
  toggleRef: React.Ref<MenuToggleElement>;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
};

type HeaderProps = {
  headerProps: {
    launchModal: LaunchModal;
    accessKeyCard: AccessKeyMetadata;
    refetch: KeyedMutator<ListAccessKeysCommandOutput>;
    iamClient: IamCommands;
  };
};

const DropdownToggle: React.FC<DropdownToggleProps> = ({
  toggleRef,
  isOpen,
  setIsOpen,
}) => (
  <MenuToggle
    ref={toggleRef}
    isExpanded={isOpen}
    onClick={() => setIsOpen(!isOpen)}
    variant="plain"
  >
    <EllipsisVIcon aria-hidden="true" />
  </MenuToggle>
);
const HeaderActions: React.FC<HeaderProps> = ({ headerProps }) => {
  const { launchModal, accessKeyCard, refetch, iamClient } = headerProps;
  const [isOpen, setIsOpen] = React.useState<boolean>(false);
  const onSelect = () => {
    setIsOpen(!isOpen);
  };
  const { t } = useCustomTranslation();
  const dropdownItems = (
    <>
      <DropdownItem
        key="activate-deactivate"
        onClick={() =>
          launchModal(UpdateAccessKey, {
            name: accessKeyCard.UserName,
            AccessKeyId: accessKeyCard.AccessKeyId,
            status: accessKeyCard.Status,
            iamClient,
            refetch,
          })
        }
      >
        {accessKeyCard.Status === AccessKeyStatus.ACTIVE
          ? t('Deactivate access key')
          : t('Activate access key')}
      </DropdownItem>

      <DropdownItem
        key="edit"
        onClick={() =>
          launchModal(EditDescriptionTag, {
            name: accessKeyCard.UserName,
            AccessKeyId: accessKeyCard.AccessKeyId,
            status: accessKeyCard.Status,
            iamClient,
            refetch,
          })
        }
      >
        {t('Edit description tag')}
      </DropdownItem>
      <DropdownItem
        key="delete"
        onClick={() =>
          launchModal(DeleteAccessKeyModal, {
            isOpen: true,
            extraProps: {
              accessKeyCard,
              iamClient,
              refetch,
            },
          })
        }
      >
        {t('Delete access key')}
      </DropdownItem>
    </>
  );

  const renderToggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <DropdownToggle
      toggleRef={toggleRef}
      isOpen={isOpen}
      setIsOpen={setIsOpen}
    />
  );

  return (
    <Dropdown
      onSelect={onSelect}
      toggle={renderToggle}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
    >
      <DropdownList>{dropdownItems}</DropdownList>
    </Dropdown>
  );
};

const AccessKeyCard: React.FC<AccessKeyCardProps> = ({
  accessKeyCard,
  accessKeyNumber,
  tags,
  refetch,
  iamClient,
}) => {
  const { t } = useCustomTranslation();
  const launchModal = useModal();

  const descriptionTag =
    tags.find((tag) => tag.Key === accessKeyCard.AccessKeyId)?.Value || DASH;

  return (
    <GridItem xl={4} lg={6} md={6} sm={12} className="pf-v5-u-my-md">
      <Card>
        <CardHeader
          actions={{
            actions: (
              <HeaderActions
                headerProps={{
                  launchModal,
                  accessKeyCard,
                  refetch,
                  iamClient,
                }}
              />
            ),
            hasNoOffset: false,
          }}
        >
          <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }}>
            <FlexItem>
              <CardTitle>{`${t('Access key')} ${accessKeyNumber}`} </CardTitle>
              <Text>{accessKeyCard.AccessKeyId || DASH}</Text>
            </FlexItem>
            <FlexItem>
              <Label
                icon={
                  accessKeyCard.Status === AccessKeyStatus.ACTIVE ? (
                    <GreenCheckCircleIcon />
                  ) : (
                    <BanIcon />
                  )
                }
              >
                {accessKeyCard.Status === AccessKeyStatus.ACTIVE
                  ? t('Active')
                  : t('Deactivated')}
              </Label>
            </FlexItem>
          </Flex>
        </CardHeader>
        <CardBody className="pf-v5-u-mt-md">
          <Title headingLevel="h4" className="pf-v5-u-mb-sm">
            {t('Description tag')}
          </Title>
          <Text>{descriptionTag}</Text>
        </CardBody>
      </Card>
    </GridItem>
  );
};

export default AccessKeyCard;
