import * as React from 'react';
import { ButtonBar } from '@odf/shared/generic';
import { S3IAMCommands } from '@odf/shared/iam';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { ModalComponent } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import { ModalBody, ModalFooter } from '@patternfly/react-core/next';
import {
  Modal,
  Button,
  ModalVariant,
  FlexItem,
  Flex,
  FormGroup,
  TextInput,
  Text,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Alert,
  AlertVariant,
} from '@patternfly/react-core';

type GenerateAnotherAccessKeyModalProps = ModalComponent<{
  isOpen: boolean;
  userName?: string;
  refetchAll?: () => Promise<void>;
  noobaaS3IAM?: S3IAMCommands;
}>;

export const GenerateAnotherAccessKeyModal: GenerateAnotherAccessKeyModalProps =
  ({ isOpen, closeModal, userName }) => {
    const { t } = useCustomTranslation();
    const MODAL_TITLE = t('Generate another accesskey');
    const [description, setDescription] = React.useState('');
    /* eslint-disable @typescript-eslint/no-unused-vars */
    const [inProgress, setInProgress] = React.useState(false);
    /* eslint-disable @typescript-eslint/no-unused-vars */
    const [error, setError] = React.useState<Error>();

    const onGenerate = async () => {
      // setInProgress(true);
      // try {
      //   // Generate the access key
      //   await noobaaS3IAM.createAccessKey({
      //     UserName: userName,
      //   });
      //   // Refresh the data to show the new access key
      //   await refetchAll();
      //   setInProgress(false);
      //   closeModal();
      // } catch (err) {
      //   setInProgress(false);
      //   setError(err);
      // }
    };

    return (
      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        variant={ModalVariant.medium}
        title={MODAL_TITLE}
      >
        <ModalBody>
          <Flex direction={{ default: 'column' }}>
            <FlexItem className="pf-v5-u-my-sm">
              <FormGroup label={t('Username')} fieldId="username-input">
                <Text id="username-input">{userName}</Text>
              </FormGroup>
            </FlexItem>
            <FlexItem className="pf-v5-u-my-sm">
              <FormGroup
                label={t('Description Tag')}
                fieldId="description-input"
              >
                <TextInput
                  id="description-input"
                  type="text"
                  value={description}
                  onChange={(_event, value) => setDescription(value)}
                  placeholder={t('Enter description')}
                  aria-label={t('Description')}
                  className="pf-v5-u-mb-xs"
                  isDisabled={inProgress}
                />
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem>
                      {t(
                        'Maximum 256 characters. Use a combination of letters, numbers, spaces and special characters.'
                      )}
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              </FormGroup>
            </FlexItem>
            {error && (
              <FlexItem className="pf-v5-u-my-sm">
                <Alert
                  variant={AlertVariant.danger}
                  isInline
                  title={t('Error generating access key')}
                >
                  {error?.message || JSON.stringify(error)}
                </Alert>
              </FlexItem>
            )}
          </Flex>
        </ModalBody>
        <ModalFooter>
          <ButtonBar
            key="actions"
            inProgress={inProgress}
            errorMessage={error?.message}
          >
            <Flex>
              <FlexItem>
                <Button
                  onClick={() => onGenerate()}
                  isLoading={inProgress}
                  isDisabled={inProgress}
                >
                  {t('Generate')}
                </Button>
              </FlexItem>
              <FlexItem>
                <Button
                  variant="secondary"
                  onClick={() => closeModal()}
                  isDisabled={inProgress}
                >
                  {t('Cancel')}
                </Button>
              </FlexItem>
            </Flex>
          </ButtonBar>
        </ModalFooter>
      </Modal>
    );
  };
