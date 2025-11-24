import * as React from 'react';
import { IAMClientConfig, StatusType } from '@aws-sdk/client-iam';
import { useCustomTranslation } from '@odf/shared';
import {
  Button,
  Form,
  FormGroup,
  Modal,
  ModalVariant,
  Text,
  Title,
} from '@patternfly/react-core';
import { HelpIcon } from '@patternfly/react-icons';
import { updateAccessKey } from './IAMUserFunctions';

type UpdateAccessKeyProps = {
  name: string;
  AccessKeyId: string;
  config: IAMClientConfig;
  status: StatusType;
};

const UpdateAccessKey: React.FC<UpdateAccessKeyProps> = ({
  name,
  AccessKeyId,
  config,
  status,
}) => {
  const { t } = useCustomTranslation();
  const [isOpen, setIsOpen] = React.useState(true);
  async function handleSubmit() {
    await updateAccessKey(name, AccessKeyId, config, status);
    setIsOpen(false);
  }
  let descriptionText: string,
    title: string,
    buttonType: 'primary' | 'danger',
    buttonText: string;

  if (status === 'Active') {
    title = 'Activate accesskey';
    descriptionText =
      'Activate accesskey to assign policies,permissions and other actions';
    buttonType = 'primary';
    buttonText = 'Activate';
  } else {
    title = 'Deactivate accesskey';
    descriptionText =
      'Deactivation leads prevents to assign policies and permissions. You have to activate it to allow these actions';
    buttonType = 'danger';
    buttonText = 'Deactivate';
  }

  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      title={
        <div className="pf-v5-u-display-flex pf-v5-u-justify-content-space-between pf-v5-u-pb-0">
          <Title headingLevel="h2">{t(title)}</Title>
          <Button variant="plain" icon={<HelpIcon />} />
        </div>
      }
      description={<p className="pf-v5-u-color-200">{t(descriptionText)}</p>}
    >
      <Form>
        <FormGroup label={t('Accesskey')}>
          <Text className="pf-v5-u-color-200">{AccessKeyId}</Text>
        </FormGroup>
        <FormGroup>
          <Button variant={buttonType} onClick={handleSubmit}>
            {t(buttonText)}
          </Button>
          <Button variant="link" onClick={() => setIsOpen(false)}>
            {t('Cancel')}
          </Button>
        </FormGroup>
      </Form>
    </Modal>
  );
};

export default UpdateAccessKey;
