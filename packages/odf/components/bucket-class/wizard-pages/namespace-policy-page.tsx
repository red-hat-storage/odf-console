import * as React from 'react';
import { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  AlertActionCloseButton,
  Radio,
  Title,
  Form,
} from '@patternfly/react-core';
import { NamespacePolicyType } from '../../../constants';
import { Action, State } from '../state';
import '../create-bc.scss';

export const namespacePolicyTypeRadios = (t: TFunction) => [
  {
    id: NamespacePolicyType.SINGLE,
    value: NamespacePolicyType.SINGLE,
    label: t('Single NamespaceStore'),
    description:
      'The namespace bucket will read and write its data to a selected namespace store',
  },
  {
    id: NamespacePolicyType.MULTI,
    value: NamespacePolicyType.MULTI,
    label: t('Multi NamespaceStores'),
    description: t(
      'The namespace bucket will serve reads from several selected backing stores, creating a virtual namespace on top of them and will write to one of those as its chosen write target'
    ),
  },
  {
    id: NamespacePolicyType.CACHE,
    value: NamespacePolicyType.CACHE,
    label: t('Cache NamespaceStore'),
    description: t(
      'The caching bucket will serve data from a large raw data out of a local caching tiering.'
    ),
  },
];

export const NamespacePolicyPage: React.FC<NamespacePolicyPageProps> = ({
  dispatch,
  state,
}) => {
  const { t } = useTranslation();
  const [showHelp, setShowHelp] = React.useState(true);

  return (
    <div className="nb-create-bc-step-page">
      {showHelp && (
        <Alert
          isInline
          variant="info"
          title={t('What is a Namespace Policy?')}
          className="nb-create-bc-step-page__info"
          actionClose={
            <AlertActionCloseButton onClose={() => setShowHelp(false)} />
          }
        >
          <p>
            {t(
              'Namespace policy can be set to one single read and write source, multi read sources or cached policy.'
            )}
          </p>
        </Alert>
      )}
      <Form className="nb-create-bc-step-page-form">
        <Title
          size="xl"
          headingLevel="h2"
          className="nb-bc-step-page-form__title"
        >
          {t('Namespace Policy Type')}
        </Title>
        {namespacePolicyTypeRadios(t).map((radio) => {
          const checked = radio.value === state.namespacePolicyType;
          return (
            <Radio
              {...radio}
              key={radio.id}
              data-test={`${radio.value.toLowerCase()}-radio`}
              className="nb-create-bc-step-page-form__radio"
              onChange={() => {
                dispatch({
                  type: 'setNamespacePolicyType',
                  value: radio.value,
                });
              }}
              checked={checked}
              name="namespace-policy-type"
            />
          );
        })}
      </Form>
    </div>
  );
};

type NamespacePolicyPageProps = {
  dispatch: React.Dispatch<Action>;
  state: State;
};
