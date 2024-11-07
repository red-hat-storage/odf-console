import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  Alert,
  AlertActionCloseButton,
  Button,
  Radio,
  Title,
  Form,
} from '@patternfly/react-core';
import { MinusCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import { PlacementPolicy } from '../../../types';
import { Action, State } from '../state';

const PlacementPolicyPage: React.FC<PlacementPolicyPageProps> = ({
  dispatch,
  state,
}) => {
  const { t } = useCustomTranslation();

  const { tier1Policy, tier2Policy } = state;
  const [showHelp, setShowHelp] = React.useState(true);
  const showTier2 = !!tier2Policy;

  const onChange = (_checked: boolean, event) => {
    const { name, value } = event.target;
    if (name === 'placement-policy-1') {
      dispatch({ type: 'setPlacementPolicyTier1', value });
    } else if (name === 'placement-policy-2') {
      dispatch({ type: 'setPlacementPolicyTier2', value });
    }
  };
  return (
    <div className="nb-create-bc-step-page">
      {showHelp && (
        <Alert
          isInline
          variant="info"
          title={t('What is a Placement Policy?')}
          className="nb-create-bc-step-page__info"
          actionClose={
            <AlertActionCloseButton onClose={() => setShowHelp(false)} />
          }
        >
          <p>
            {t(
              'Data placement capabilities are built as a multi-layer structure here are the layers bottom-up:'
            )}
          </p>
          <ul>
            <li>
              {t(
                'Spread Tier - list of BackingStores aggregates the storage of multiple stores.'
              )}
            </li>
            <li>
              {t(
                'Mirroring Tier - list of spread-layers async-mirroring to all mirrors with locality optimization (will allocate on the closest region to the source endpoint). Mirroring requires at least two BackingStores.'
              )}
            </li>
          </ul>
          {t(
            'The number of replicas can be configured via the NooBaa management console.'
          )}
        </Alert>
      )}
      <Form className="nb-create-bc-step-page-form">
        <Title
          size="xl"
          headingLevel="h2"
          className="nb-bc-step-page-form__title"
        >
          {t('Tier 1 - Policy Type')}
        </Title>
        <Radio
          data-test="placement-policy-spread1"
          value={PlacementPolicy.Spread}
          isChecked={tier1Policy === PlacementPolicy.Spread}
          onChange={(event, checked: boolean) => onChange(checked, event)}
          id="radio-1"
          label={t('Spread')}
          name="placement-policy-1"
        />
        <p className="nb-create-bc-step-page-form__element--light-text">
          {t(
            'Spreading the data across the chosen resources. By default a replica of one copy is used and does not include failure tolerance in case of resource failure.'
          )}
        </p>
        <Radio
          data-test="placement-policy-mirror1"
          value={PlacementPolicy.Mirror}
          isChecked={tier1Policy === PlacementPolicy.Mirror}
          onChange={(event, checked: boolean) => onChange(checked, event)}
          id="radio-2"
          label={t('Mirror')}
          name="placement-policy-1"
        />
        <p className="nb-create-bc-step-page-form__element--light-text">
          {t(
            'Full duplication of the data in each chosen resource. By default a replica of one copy per location is used. Includes failure tolerance in case of resource failure.'
          )}
        </p>
      </Form>
      {!showTier2 && (
        <Button
          variant="link"
          icon={<PlusCircleIcon />}
          onClick={() =>
            dispatch({
              type: 'setPlacementPolicyTier2',
              value: PlacementPolicy.Spread,
            })
          }
          isInline
          data-testid="add-tier-btn"
          data-test="add-tier-btn"
        >
          {t('Add Tier')}
        </Button>
      )}
      {showTier2 && (
        <Form className="nb-create-bc-step-page-form">
          <Title
            headingLevel="h2"
            size="xl"
            className="nb-bc-step-page-form__title"
          >
            {t('Tier 2 - Policy type')}
            <Button
              variant="link"
              icon={<MinusCircleIcon />}
              onClick={() =>
                dispatch({ type: 'setPlacementPolicyTier2', value: null })
              }
              isInline
            >
              {t('Remove Tier')}
            </Button>
          </Title>
          <Radio
            data-test="placement-policy-spread2"
            value={PlacementPolicy.Spread}
            isChecked={tier2Policy === PlacementPolicy.Spread}
            onChange={(event, checked: boolean) => onChange(checked, event)}
            id="radio-3"
            label={t('Spread')}
            name="placement-policy-2"
          />
          <p className="nb-create-bc-step-page-form__element--light-text">
            {t(
              'Spreading the data across the chosen resources does not include failure tolerance in case of resource failure.'
            )}
          </p>
          <Radio
            data-test="placement-policy-mirror2"
            value={PlacementPolicy.Mirror}
            isChecked={tier2Policy === PlacementPolicy.Mirror}
            onChange={(event, checked: boolean) => onChange(checked, event)}
            id="radio-4"
            label={t('Mirror')}
            name="placement-policy-2"
          />
          <p className="nb-create-bc-step-page-form__element--light-text">
            {t(
              'Full duplication of the data in each chosen resource includes failure tolerance in cause of resource failure.'
            )}
          </p>
        </Form>
      )}
    </div>
  );
};

export default PlacementPolicyPage;

type PlacementPolicyPageProps = {
  dispatch: React.Dispatch<Action>;
  state: State;
};
