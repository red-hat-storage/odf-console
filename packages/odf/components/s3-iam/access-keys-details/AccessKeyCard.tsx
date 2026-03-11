import * as React from 'react';
import { AccessKeyMetadata, Tag } from '@aws-sdk/client-iam';
import { AccessKeyStatus } from '@odf/core/constants/s3-iam';
import DeleteAccessKeyModal from '@odf/core/modals/s3-iam/DeleteAccessKeyModal';
import EditDescriptionTagModal from '@odf/core/modals/s3-iam/EditDescriptonTagModal';
import UpdateAccessKeyModal from '@odf/core/modals/s3-iam/UpdateAccessKeyModal';
import { DASH, useCustomTranslation } from '@odf/shared';
import { IamCommands } from '@odf/shared/iam';
import {
  GreenCheckCircleIcon,
  useModal,
} from '@openshift-console/dynamic-plugin-sdk';
import { LaunchModal } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import { TFunction } from 'react-i18next';
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
  Content,
  Title,
} from '@patternfly/react-core';
import { BanIcon, EllipsisVIcon } from '@patternfly/react-icons';

type AccessKeyCardProps = {
  accessKeyCard: AccessKeyMetadata;
  accessKeyNumber: number;
  tags: Tag[];
  iamClient: IamCommands;
  refreshTokens: () => void;
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
    refreshTokens: () => void;
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
const renderStatusLabel = (status: string, t: TFunction) => (
  <Label
    icon={
      status === AccessKeyStatus.ACTIVE ? <GreenCheckCircleIcon /> : <BanIcon />
    }
  >
    {status === AccessKeyStatus.ACTIVE ? t('Active') : t('Deactivated')}
  </Label>
);

const HeaderActions: React.FC<HeaderProps> = ({ headerProps }) => {
  const { launchModal, accessKeyCard, refreshTokens, iamClient } = headerProps;
  const [isOpen, setIsOpen] = React.useState<boolean>(false);
  const onSelect = () => {
    setIsOpen(false);
  };
  const { t } = useCustomTranslation();
  const dropdownItems = React.useMemo(
    () => (
      <>
        <DropdownItem
          key="activate-deactivate"
          onClick={() =>
            launchModal(UpdateAccessKeyModal, {
              isOpen: true,
              extraProps: {
                name: accessKeyCard.UserName,
                AccessKeyId: accessKeyCard.AccessKeyId,
                updateStatusTo:
                  accessKeyCard.Status === AccessKeyStatus.ACTIVE
                    ? AccessKeyStatus.INACTIVE
                    : AccessKeyStatus.ACTIVE,
                iamClient,
                refreshTokens,
              },
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
            launchModal(EditDescriptionTagModal, {
              isOpen: true,
              extraProps: {
                name: accessKeyCard.UserName,
                AccessKeyId: accessKeyCard.AccessKeyId,
                iamClient,
                refreshTokens,
              },
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
                refreshTokens,
              },
            })
          }
        >
          {t('Delete access key')}
        </DropdownItem>
      </>
    ),
    [launchModal, accessKeyCard, iamClient, refreshTokens, t]
  );

  const renderToggle = React.useCallback(
    (toggleRef: React.Ref<MenuToggleElement>) => (
      <DropdownToggle
        toggleRef={toggleRef}
        isOpen={isOpen}
        setIsOpen={setIsOpen}
      />
    ),
    [isOpen, setIsOpen]
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
  refreshTokens,
  iamClient,
}) => {
  const { t } = useCustomTranslation();
  const launchModal = useModal();

  const descriptionTag = React.useMemo(
    () =>
      tags.find((tag) => tag.Key === accessKeyCard.AccessKeyId)?.Value || DASH,
    [tags, accessKeyCard.AccessKeyId]
  );

  return (
    <GridItem xl={4} lg={6} md={6} sm={12} className="pf-v6-u-my-md">
      <Card>
        <CardHeader
          actions={{
            actions: (
              <HeaderActions
                headerProps={{
                  launchModal,
                  accessKeyCard,
                  refreshTokens,
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
              <Content component="p">
                {accessKeyCard.AccessKeyId || DASH}
              </Content>
            </FlexItem>
            <FlexItem>{renderStatusLabel(accessKeyCard.Status, t)}</FlexItem>
          </Flex>
        </CardHeader>
        <CardBody className="pf-v6-u-mt-md">
          <Title headingLevel="h4" className="pf-v6-u-mb-sm">
            {t('Description tag')}
          </Title>
          <Content component="p">{descriptionTag}</Content>
        </CardBody>
      </Card>
    </GridItem>
  );
};

export default AccessKeyCard;
