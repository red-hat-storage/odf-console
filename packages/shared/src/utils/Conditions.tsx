import * as React from 'react';
import { CamelCaseWrap } from '@openshift-console/dynamic-plugin-sdk';
import { Timestamp } from '../details-page/timestamp';
import { K8sResourceCondition } from '../types';
import { useCustomTranslation } from '../useCustomTranslationHook';
import { LinkifyExternal } from './link';

/**
 * Since ClusterServiceVersionCondition type is different from K8sResourceCondition, but InstallPlanCondition and SubscriptionCondition are identical, we will use the following enum to render the proper conditions table based on type.
 */
export enum ConditionTypes {
  ClusterServiceVersion = 'ClusterServiceVersion',
  K8sResource = 'K8sResource',
}

type ClusterServiceVersionCondition = {
  phase: string;
  lastTransitionTime?: string;
  reason?: string;
  message?: string;
};

export const Conditions: React.FC<ConditionsProps> = ({
  conditions,
  type = ConditionTypes.K8sResource,
}) => {
  const { t } = useCustomTranslation();

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'True':
        return t('True');
      case 'False':
        return t('False');
      default:
        return status;
    }
  };

  const rows = (
    conditions as Array<K8sResourceCondition | ClusterServiceVersionCondition>
  )?.map?.(
    (
      condition: K8sResourceCondition & ClusterServiceVersionCondition,
      i: number
    ) => (
      <div
        className="row"
        data-test={
          type === ConditionTypes.ClusterServiceVersion
            ? condition.phase
            : condition.type
        }
        key={i}
      >
        {type === ConditionTypes.ClusterServiceVersion ? (
          <div
            className="col-xs-4 col-sm-2 col-md-2"
            data-test={`condition[${i}].phase`}
          >
            <CamelCaseWrap value={condition.phase} />
          </div>
        ) : (
          <>
            <div
              className="col-xs-4 col-sm-2 col-md-2"
              data-test={`condition[${i}].type`}
            >
              <CamelCaseWrap value={condition.type} />
            </div>
            <div
              className="col-xs-4 col-sm-2 col-md-2"
              data-test={`condition[${i}].status`}
            >
              {getStatusLabel(condition.status)}
            </div>
          </>
        )}
        <div
          className="hidden-xs hidden-sm col-md-2"
          data-test={`condition[${i}].lastTransitionTime`}
        >
          <Timestamp timestamp={condition.lastTransitionTime} />
        </div>
        <div
          className="col-xs-4 col-sm-3 col-md-2"
          data-test={`condition[${i}].reason`}
        >
          <CamelCaseWrap value={condition.reason} />
        </div>
        {/* remove initial newline which appears in route messages */}
        <div
          className="hidden-xs col-sm-5 col-md-4 co-break-word co-pre-line co-conditions__message"
          data-test={`condition[${i}].message`}
        >
          <LinkifyExternal>{condition.message?.trim() || '-'}</LinkifyExternal>
        </div>
      </div>
    )
  );

  return (
    <>
      {conditions?.length ? (
        <div className="co-m-table-grid co-m-table-grid--bordered">
          <div className="row co-m-table-grid__head">
            {type === ConditionTypes.ClusterServiceVersion ? (
              <div className="col-xs-4 col-sm-2 col-md-2">{t('Phase')}</div>
            ) : (
              <>
                <div className="col-xs-4 col-sm-2 col-md-2">{t('Type')}</div>
                <div className="col-xs-4 col-sm-2 col-md-2">{t('Status')}</div>
              </>
            )}
            <div className="hidden-xs hidden-sm col-md-2">{t('Updated')}</div>
            <div className="col-xs-4 col-sm-3 col-md-2">{t('Reason')}</div>
            <div className="hidden-xs col-sm-5 col-md-4">{t('Message')}</div>
          </div>
          <div className="co-m-table-grid__body">{rows}</div>
        </div>
      ) : (
        <div className="cos-status-box">
          <div className="pf-v6-u-text-align-center">
            {t('No conditions found')}
          </div>
        </div>
      )}
    </>
  );
};
Conditions.displayName = 'Conditions';

export type ConditionsProps = {
  conditions: K8sResourceCondition[] | ClusterServiceVersionCondition[];
  title?: string;
  subTitle?: string;
  type?: keyof typeof ConditionTypes;
};
