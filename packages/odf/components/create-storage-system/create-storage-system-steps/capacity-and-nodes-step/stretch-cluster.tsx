import * as React from 'react';
import { arbiterText } from '@odf/core/constants';
import { AdvancedSubscription } from '@odf/shared/badges/advanced-subscription';
import { useTranslation } from 'react-i18next';
import {
  FormGroup,
  Alert,
  Checkbox,
  Select,
  SelectVariant,
  SelectOption,
  TextContent,
  TextVariants,
  Text,
  SelectProps,
} from '@patternfly/react-core';
import { WizardState } from '../../reducer';
import './capacity-and-nodes.scss';

const HelperText: React.FC<{ enableArbiter: boolean }> = ({ enableArbiter }) => {
  const { t } = useTranslation('plugin__odf-console');
  return (
    <>
      <TextContent>
        <Text component={TextVariants.small}>
          {t(
            'To support high availability when two data centers can be used, enable arbiter to get a valid quorum between the two data centers.',
          )}
        </Text>
      </TextContent>
      {enableArbiter && (
        <Alert
          aria-label={t('Arbiter minimum requirements')}
          title={t('Arbiter minimum requirements')}
          variant="info"
          isInline
        >
          {arbiterText(t)}
        </Alert>
      )}
    </>
  );
};

const EnableArbiterLabel: React.FC = () => {
  const { t } = useTranslation('plugin__odf-console');

  return (
    <div className="ocs-enable-arbiter-label">
      <span className="ocs-enable-arbiter-label__title--padding">
        {t('Enable arbiter')}
      </span>
      <AdvancedSubscription />
    </div>
  );
};

export const StretchCluster: React.FC<StretchClusterProps> = ({
  onSelect,
  onChecked,
  zones,
  enableArbiter,
  arbiterLocation,
}) => {
  const { t } = useTranslation('plugin__odf-console');
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <>
      <TextContent>
        <Text component={TextVariants.h3}>{t('Stretch Cluster')}</Text>
      </TextContent>
      <Checkbox
        aria-label={t('Enable arbiter')}
        id="stretch-cluster"
        isChecked={enableArbiter}
        data-checked-state={enableArbiter}
        label={<EnableArbiterLabel />}
        description={<HelperText enableArbiter={enableArbiter} />}
        onChange={(hasChecked: boolean) => {
          if (!hasChecked) onSelect(null, '');
          onChecked(hasChecked);
        }}
        body={
          enableArbiter && (
            <FormGroup
              label={t('Arbiter zone')}
              fieldId="arbiter-zone-selection"
              helperText={t(
                'An arbiter node will be automatically selected from this zone',
              )}
            >
              <Select
                variant={SelectVariant.single}
                placeholderText={t('Select an arbiter zone')}
                aria-label={t('Arbiter zone selection')}
                onToggle={(value: boolean) => setIsOpen(value)}
                onSelect={onSelect}
                selections={arbiterLocation}
                isOpen={isOpen}
                id="arbiter-zone-selection"
              >
                {zones.map((zone) => (
                  <SelectOption key={zone} value={zone} />
                ))}
              </Select>
            </FormGroup>
          )
        }
      />
    </>
  );
};

type StretchClusterProps = {
  onSelect: SelectProps['onSelect'];
  onChecked: (isChecked: boolean) => void;
  arbiterLocation: WizardState['capacityAndNodes']['arbiterLocation'];
  enableArbiter: WizardState['capacityAndNodes']['enableArbiter'];
  zones: string[];
};
