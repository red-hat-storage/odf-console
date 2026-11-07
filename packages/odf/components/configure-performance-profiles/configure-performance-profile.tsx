import * as React from 'react';
import { useClusterNodes } from '@odf/core/hooks';
import { useODFSystemFlagsSelector } from '@odf/core/redux';
import {
  PageHeading,
  StatusBox,
  StorageClusterKind,
  StorageClusterModel,
} from '@odf/shared';
import { referenceForModel } from '@odf/shared/utils';
import {
  useK8sWatchResource,
  useToast,
} from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import {
  Alert,
  AlertVariant,
  Content,
  ContentVariants,
} from '@patternfly/react-core';
import { ConfigurePerformanceProfileFormFooter } from './configure-performance-profile-footer';
import {
  CoreStorageSection,
  patchCoreStorageProfile,
} from './core-storage-section';
import {
  McgPerformanceSection,
  patchMcgPerformanceProfile,
} from './multicloud-object-gateway-section';
import {
  configurePerformanceProfileReducer,
  ConfigurePerformanceProfileActionType,
  initProfileStates,
} from './state';
import {
  isSaveDisabled,
  shouldShowCoreStorageSection,
  shouldShowMcgPerformanceSection,
} from './utils';
import './configure-performance-profile.scss';

type ConfigurePerformanceProfilePageProps = {
  storageCluster: StorageClusterKind;
  showCoreStorage: boolean;
  showMcgPerformance: boolean;
};

const ConfigurePerformanceProfilePage: React.FC<
  ConfigurePerformanceProfilePageProps
> = ({ storageCluster, showCoreStorage, showMcgPerformance }) => {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const { clusterNodes, nodesLoaded, nodesLoadError } = useClusterNodes();
  const [state, dispatch] = React.useReducer(
    configurePerformanceProfileReducer,
    storageCluster,
    initProfileStates
  );

  const onClose = () => navigate(-1);

  const onConfirm = async () => {
    if (isSaveDisabled(state, showCoreStorage, showMcgPerformance)) {
      return;
    }

    dispatch({
      type: ConfigurePerformanceProfileActionType.SET_ERROR_MESSAGE,
      payload: null,
    });
    dispatch({
      type: ConfigurePerformanceProfileActionType.SET_INPROGRESS,
      payload: true,
    });

    try {
      if (showCoreStorage && state.resourceProfile) {
        await patchCoreStorageProfile({
          storageCluster,
          resourceProfile: state.resourceProfile,
        });
      }
      if (showMcgPerformance && state.mcgPerformanceProfile) {
        await patchMcgPerformanceProfile({
          storageCluster,
          mcgPerformanceProfile: state.mcgPerformanceProfile,
        });
      }
      const coreChanged =
        showCoreStorage &&
        state.resourceProfile !== state.initialResourceProfile;
      const mcgChanged =
        showMcgPerformance &&
        state.mcgPerformanceProfile !== state.initialMcgPerformanceProfile;
      if (coreChanged && mcgChanged) {
        addToast({
          title: t('Performance profiles updated'),
          variant: AlertVariant.success,
          content: t(
            'Pod and service restarts have been scheduled. Storage may be unavailable for a few minutes.'
          ),
          dismissible: true,
          timeout: true,
        });
      } else if (coreChanged) {
        addToast({
          title: t('Core profile updated'),
          variant: AlertVariant.success,
          content: t(
            'Pod and service restarts have been scheduled. Storage may be unavailable for a few minutes.'
          ),
          dismissible: true,
          timeout: true,
        });
      } else if (mcgChanged) {
        addToast({
          title: t('Multicloud Object Gateway profile updated'),
          variant: AlertVariant.success,
          content: t(
            'MCG service restarts have been scheduled. Object storage may be unavailable for a few minutes.'
          ),
          dismissible: true,
          timeout: true,
        });
      }
      onClose();
    } catch (error) {
      const message = error?.message || t('An unexpected error has occured.');
      dispatch({
        type: ConfigurePerformanceProfileActionType.SET_ERROR_MESSAGE,
        payload: message,
      });
    } finally {
      dispatch({
        type: ConfigurePerformanceProfileActionType.SET_INPROGRESS,
        payload: false,
      });
    }
  };

  return (
    <StatusBox
      loaded={nodesLoaded}
      loadError={nodesLoadError}
      data={storageCluster}
      label={t('Configure performance profile')}
    >
      <div className="odf-m-pane__body odf-m-pane__form configure-performance-profile__content pf-v6-u-mt-xl">
        {!isSaveDisabled(state, showCoreStorage, showMcgPerformance) && (
          <Alert
            className="pf-v6-u-mb-2xl"
            variant={AlertVariant.info}
            isInline
            title={t('Saving will schedule pod and service restarts')}
          >
            {t(
              'Changes to core storage or Multicloud Object Gateway profiles trigger service and pod restarts. Storage may be unavailable for a few minutes.'
            )}
          </Alert>
        )}
        {showCoreStorage && (
          <CoreStorageSection
            state={state}
            dispatch={dispatch}
            storageCluster={storageCluster}
            clusterNodes={clusterNodes}
          />
        )}
        {showMcgPerformance && (
          <McgPerformanceSection
            state={state}
            dispatch={dispatch}
            storageCluster={storageCluster}
            clusterNodes={clusterNodes}
          />
        )}
      </div>
      <div className="odf-m-pane__body configure-performance-profile__footer">
        <ConfigurePerformanceProfileFormFooter
          state={state}
          showCoreStorage={showCoreStorage}
          showMcgPerformance={showMcgPerformance}
          cancel={onClose}
          onConfirm={onConfirm}
        />
      </div>
    </StatusBox>
  );
};

const ConfigurePerformanceProfile: React.FC = () => {
  const { t } = useTranslation();
  const { resourceName, namespace } = useParams();

  const { systemFlags, areFlagsLoaded, flagsLoadError } =
    useODFSystemFlagsSelector();
  const [storageCluster, storageClusterLoaded, storageClusterLoadError] =
    useK8sWatchResource<StorageClusterKind>({
      kind: referenceForModel(StorageClusterModel),
      name: resourceName,
      namespace,
    });

  const configurePerformanceProfileParams = {
    storageCluster,
    isNoobaaAvailable: systemFlags[namespace]?.isNoobaaAvailable,
  };
  const showCoreStorage = shouldShowCoreStorageSection(
    configurePerformanceProfileParams
  );
  const showMcgPerformance = shouldShowMcgPerformanceSection(
    configurePerformanceProfileParams
  );

  const isLoaded = areFlagsLoaded && storageClusterLoaded;
  const isLoadError = flagsLoadError || storageClusterLoadError;
  const showConfigurePerformancePage = showCoreStorage || showMcgPerformance;

  return (
    <>
      <PageHeading
        title={t('Configure performance profile')}
        hasUnderline={false}
      >
        <Content component={ContentVariants.p} className="pf-v6-u-mt-sm">
          {t(
            'Select performance profiles to optimize resource allocation based on your workload requirements.'
          )}
        </Content>
      </PageHeading>
      <StatusBox
        loaded={isLoaded}
        loadError={isLoadError}
        data={storageCluster}
        label={t('Configure performance profile')}
      >
        {showConfigurePerformancePage && (
          <ConfigurePerformanceProfilePage
            storageCluster={storageCluster}
            showCoreStorage={showCoreStorage}
            showMcgPerformance={showMcgPerformance}
          />
        )}
      </StatusBox>
    </>
  );
};

export default ConfigurePerformanceProfile;
