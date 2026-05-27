import * as React from 'react';
import { ConfigMapModel, useK8sGet } from '@odf/shared';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import yaml from 'js-yaml';
import {
  ODFMCO_OPERATOR_NAMESPACE,
  RAMEN_CONFIG_KEY,
  RAMEN_HUB_OPERATOR_CONFIG_NAME,
} from '../constants';
import { RamenConfig } from '../types';

type ConfigMapKind = K8sResourceCommon & { data?: Record<string, string> };

export const useRamenConfig = (): [RamenConfig, boolean, unknown] => {
  const [cm, loaded, loadError] = useK8sGet<ConfigMapKind>(
    ConfigMapModel,
    RAMEN_HUB_OPERATOR_CONFIG_NAME,
    ODFMCO_OPERATOR_NAMESPACE
  );

  return React.useMemo((): [RamenConfig, boolean, unknown] => {
    if (!loaded || loadError) {
      return [{} as RamenConfig, loaded, loadError];
    }

    const raw = cm?.data?.[RAMEN_CONFIG_KEY];
    if (!raw) {
      return [
        {} as RamenConfig,
        loaded,
        new Error(
          `Missing key ${RAMEN_CONFIG_KEY} in ConfigMap ${RAMEN_HUB_OPERATOR_CONFIG_NAME}/${ODFMCO_OPERATOR_NAMESPACE}`
        ),
      ];
    }

    try {
      const ramenConfig = (yaml.load(raw) || {}) as RamenConfig;
      return [ramenConfig, loaded, loadError];
    } catch (err: any) {
      return [
        {} as RamenConfig,
        loaded,
        new Error(
          `Failed to parse YAML from ConfigMap ${RAMEN_HUB_OPERATOR_CONFIG_NAME}: ${
            err?.message || JSON.stringify(err)
          }`
        ),
      ];
    }
  }, [cm, loaded, loadError]);
};
