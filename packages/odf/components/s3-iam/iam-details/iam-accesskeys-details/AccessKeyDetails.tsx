import * as React from 'react';
import { AccessKeyMetadata, Tag } from '@aws-sdk/client-iam';
import { useCustomTranslation } from '@odf/shared';
import { SectionHeading } from '@odf/shared/heading/page-heading';
import { MAX_ACCESS_KEYS } from '@odf/shared/iam';
import {
  GreenCheckCircleIcon,
  useModal,
} from '@openshift-console/dynamic-plugin-sdk';
import { ModalComponent } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import {
  Alert,
  AlertVariant,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Dropdown,
  DropdownItem,
  DropdownList,
  Flex,
  FlexItem,
  Grid,
  GridItem,
  Label,
  MenuToggle,
  MenuToggleElement,
  Spinner,
  Text,
  Title,
} from '@patternfly/react-core';
import {
  BanIcon,
  EllipsisVIcon,
  PlusCircleIcon,
} from '@patternfly/react-icons';
import { GenerateAnotherAccessKeyModal } from '../../modals/GenerateAnotherAccessKeyModal';
import './AccessKeyDetails.scss';

type IAMAccesskeyDetailsProps = {
  obj: {
    userName: string;
    iamAccessKeys: AccessKeyMetadata[];
    tags: Tag[];
    isLoading: boolean;
    error: any;
    refetchAll?: () => Promise<void>;
    noobaaS3IAM?: any;
  };
};

type AccessKeyCardProps = {
  accessKeyCard: AccessKeyMetadata;
  accessKeyNumber: number;
  tags: Tag[];
};

type DropdownToggleProps = {
  toggleRef: React.Ref<MenuToggleElement>;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
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
const HeaderActions: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState<boolean>(false);
  const onSelect = () => {
    setIsOpen(!isOpen);
  };
  const { t } = useCustomTranslation();
  const dropdownItems = (
    <>
      <DropdownItem key="deactivate">{t('Deactivate accesskey')}</DropdownItem>
      <DropdownItem key="edit">{t('Edit description tag')}</DropdownItem>
      <DropdownItem key="delete">{t('Delete accesskey')}</DropdownItem>
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
}) => {
  const { t } = useCustomTranslation();

  const descriptionTag =
    tags.find((tag) => tag.Key === accessKeyCard.AccessKeyId)?.Value || '-';

  return (
    <GridItem xl={4} lg={6} md={6} sm={12} className="pf-v5-u-my-md">
      <Card>
        <CardHeader
          actions={{ actions: <HeaderActions />, hasNoOffset: false }}
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

/**
 * Displays AccessKeyDetails in a Card.
 * Create Another Accesskey if only one Accesskey exists
 * @param userName @param iamAccessKeys @param tags @param refetchAll @param noobaaS3IAM
 */
export const IAMAccessKeyDetails: React.FC<IAMAccesskeyDetailsProps> = ({
  obj,
}) => {
  const { t } = useCustomTranslation();
  const launchModal = useModal();

  const {
    userName,
    iamAccessKeys,
    tags,
    /* eslint-disable @typescript-eslint/no-unused-vars */
    refetchAll,
    noobaaS3IAM,
  } = obj;
  const isLoading = false;

  const launchModalOnClick = (modalComponent: ModalComponent) => () => {
    launchModal(modalComponent, {
      isOpen: true,
      userName,
      refetchAll,
      noobaaS3IAM,
    });
  };

  return (
    <div className="odf-m-pane__body">
      <div className="row pf-v5-u-mt-md">
        <div className="col-sm-12">
          <SectionHeading text={t('Access Keys')} />
          {isLoading ? (
            <div className="pf-v5-u-text-align-center pf-v5-u-p-lg">
              <Spinner size="lg" />
            </div>
          ) : iamAccessKeys.length > 0 ? (
            <>
              <Alert
                title={t('You can define only {{maxKeys}} access keys', {
                  maxKeys: MAX_ACCESS_KEYS,
                })}
                variant={AlertVariant.info}
                isInline
              >
                {t('State the reason, how it is helpful')}
              </Alert>

              <Grid hasGutter>
                {iamAccessKeys.map(
                  (iamAccessKey: AccessKeyMetadata, index: number) => (
                    <AccessKeyCard
                      key={iamAccessKey.AccessKeyId}
                      accessKeyCard={iamAccessKey}
                      accessKeyNumber={index + 1}
                      tags={tags}
                    />
                  )
                )}
              </Grid>
              {iamAccessKeys.length < MAX_ACCESS_KEYS && (
                <Button
                  variant="secondary"
                  onClick={launchModalOnClick(GenerateAnotherAccessKeyModal)}
                  icon={<PlusCircleIcon />}
                  aria-label={t('Generate another access key')}
                >
                  {t('Generate another access key')}
                </Button>
              )}
            </>
          ) : (
            <div className="pf-v5-u-text-align-center pf-v5-u-p-lg pf-v5-u-color-200">
              {t('No access keys found')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
