import * as React from 'react';
import { AccessKeyMetadata, Tag } from '@aws-sdk/client-iam';
import { useCustomTranslation } from '@odf/shared';
import { S3IAMCommands } from '@odf/shared/iam';
import {
  GreenCheckCircleIcon,
  useModal,
} from '@openshift-console/dynamic-plugin-sdk';
import { LaunchModal } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
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
import './AccessKeysDetails.scss';
import DeleteAccessKeyModal from '../../modals/DeleteAccessKeyModal';
// import UpdateAccessKey from '../../modals/UpdateAccessKey';

type AccessKeyCardProps = {
  accessKeyCard: AccessKeyMetadata;
  accessKeyNumber: number;
  tags: Tag[];
  noobaaS3IAM: S3IAMCommands;
  refetchAll: () => Promise<void>;
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
    refetchAll: () => Promise<void>;
    noobaaS3IAM: S3IAMCommands;
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
    aria-label="Card header images and actions example kebab toggle"
  >
    <EllipsisVIcon aria-hidden="true" />
  </MenuToggle>
);
const HeaderActions: React.FC<HeaderProps> = ({ headerProps }) => {
  const { launchModal, accessKeyCard, refetchAll, noobaaS3IAM } = headerProps;
  const [isOpen, setIsOpen] = React.useState<boolean>(false);
  const onSelect = () => {
    setIsOpen(!isOpen);
  };
  const { t } = useCustomTranslation();
  const dropdownItems = (
    <>
      <DropdownItem
        key="activate-deactivate"
        // onClick={()=>
        //   launchModal(UpdateAccessKey,{
        //     name: accessKeyCard.UserName,
        //     AccessKeyId: accessKeyCard.AccessKeyId,
        //     status: accessKeyCard.Status,
        //     noobaaS3IAM,
        //     refetchAll,
        //   })
        // }
      >
        {accessKeyCard.Status === 'Active'
          ? t('Deactivate accesskey')
          : t('Activate accesskey')}
      </DropdownItem>

      <DropdownItem key="edit">{t('Edit description tag')}</DropdownItem>
      <DropdownItem
        key="delete"
        onClick={() =>
          launchModal(DeleteAccessKeyModal, {
            isOpen: true,
            extraProps: {
              accessKeyCard,
              noobaaS3IAM,
              refetchAll,
            },
          })
        }
      >
        {t('Delete accesskey')}
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
  refetchAll,
  noobaaS3IAM,
}) => {
  const { t } = useCustomTranslation();
  const launchModal = useModal();

  const descriptionTag =
    tags.find((tag) => tag.Key === accessKeyCard.AccessKeyId)?.Value || '-';

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
                  refetchAll,
                  noobaaS3IAM,
                }}
              />
            ),
            hasNoOffset: false,
          }}
        >
          <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }}>
            <FlexItem>
              <CardTitle>{`${t('AccessKey')} ${accessKeyNumber}`} </CardTitle>
              <Text>{accessKeyCard.AccessKeyId || '-'}</Text>
            </FlexItem>
            <FlexItem>
              <Label
                icon={
                  accessKeyCard.Status === 'Active' ? (
                    <GreenCheckCircleIcon />
                  ) : (
                    <BanIcon />
                  )
                }
              >
                {accessKeyCard.Status === 'Active'
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
