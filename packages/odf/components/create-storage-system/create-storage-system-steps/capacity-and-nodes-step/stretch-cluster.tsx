import * as React from 'react';
import { arbiterText } from '@odf/core/constants';
import { AdvancedSubscription } from '@odf/shared/badges/advanced-subscription';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  Select,
  SelectOption,
  SelectList,
  SelectProps,
  MenuToggle,
  MenuToggleElement,
  FormGroup,
  Alert,
  Checkbox,
  Content,
  ContentVariants,
  FormHelperText,
  HelperTextItem,
  HelperText as PfHelperText,
} from '@patternfly/react-core';
import { WizardState } from '../../reducer';
import './capacity-and-nodes.scss';

const HelperText: React.FC<{ enableArbiter: boolean }> = ({
  enableArbiter,
}) => {
  const { t } = useCustomTranslation();
  return (
    <>
      <Content>
        <Content component={ContentVariants.small}>
          {t(
            'To support high availability when two data centers can be used, enable arbiter to get a valid quorum between the two data centers.'
          )}
        </Content>
      </Content>
      {enableArbiter && (
        <Alert
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
  const { t } = useCustomTranslation();

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
  const { t } = useCustomTranslation();
  const [isOpen, setIsOpen] = React.useState(false);

  const handleSelection: SelectProps['onSelect'] = (e, selection) => {
    onSelect(e, selection);
    setIsOpen(false);
  };

  const arbiterLocationToggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      ref={toggleRef}
      onClick={() => setIsOpen((prev) => !prev)}
      isExpanded={isOpen}
      isFullWidth
    >
      {arbiterLocation || t('Select an arbiter zone')}
    </MenuToggle>
  );

  return (
    <>
      <Content>
        <Content component={ContentVariants.h3}>{t('Stretch Cluster')}</Content>
      </Content>
      <Checkbox
        aria-label={t('Enable arbiter')}
        id="stretch-cluster"
        isChecked={enableArbiter}
        data-checked-state={enableArbiter}
        label={<EnableArbiterLabel />}
        description={<HelperText enableArbiter={enableArbiter} />}
        onChange={(_event, hasChecked: boolean) => {
          if (!hasChecked) onSelect(null, '');
          onChecked(hasChecked);
        }}
        body={
          enableArbiter && (
            <FormGroup
              label={t('Arbiter zone')}
              fieldId="arbiter-zone-selection"
            >
              <Select
                id="arbiter-zone-selection"
                isOpen={isOpen}
                selected={arbiterLocation}
                onSelect={handleSelection}
                onOpenChange={setIsOpen}
                toggle={arbiterLocationToggle}
                aria-label={t('Arbiter zone selection')}
              >
                <SelectList>
                  {zones.map((zone) => (
                    <SelectOption key={zone} value={zone}>
                      {zone}
                    </SelectOption>
                  ))}
                </SelectList>
              </Select>
              <FormHelperText>
                <PfHelperText>
                  <HelperTextItem>
                    {t(
                      'An arbiter node will be automatically selected from this zone'
                    )}
                  </HelperTextItem>
                </PfHelperText>
              </FormHelperText>
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
