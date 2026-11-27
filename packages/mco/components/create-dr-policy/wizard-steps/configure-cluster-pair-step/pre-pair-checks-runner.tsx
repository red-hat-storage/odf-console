import * as React from 'react';
import { PrePairCheckId } from '@odf/mco/constants';
import type { ManagedClusterInfoType } from '@odf/mco/types';
import type {
  PrePairCheckResult,
  StorageVendorDescriptor,
} from '@odf/mco/utils/storage-vendor-registry';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import * as _ from 'lodash-es';
import { Content, ContentVariants } from '@patternfly/react-core';
import { getPrePairChecks, type PrePairCheck } from './pre-pair-checks';

export type PrePairCheckResults = Map<PrePairCheckId, PrePairCheckResult>;

type PrePairCheckProbeProps = {
  check: PrePairCheck;
  clusters: ManagedClusterInfoType[];
  clusterNames: string[];
  enabled: boolean;
  onResult: (result: PrePairCheckResult) => void;
  onRemove: (checkId: PrePairCheckId) => void;
};

/** Gives each check's hook its own component, so hook order never depends on the vendor. */
const PrePairCheckProbe: React.FC<PrePairCheckProbeProps> = ({
  check,
  clusters,
  clusterNames,
  enabled,
  onResult,
  onRemove,
}) => {
  const result = check.useCheck({ clusters, clusterNames, enabled });

  React.useEffect(() => {
    onResult(result);
  }, [result, onResult]);

  React.useEffect(() => () => onRemove(check.id), [check.id, onRemove]);

  return null;
};

type PrePairChecksProps = {
  descriptor: StorageVendorDescriptor | null;
  clusters: ManagedClusterInfoType[];
  clusterNames: string[];
  enabled: boolean;
  acknowledgedChecks: Set<string>;
};

/** Runs the provider's pre-pair checks; the returned `probes` must be rendered. */
export const usePrePairChecks = ({
  descriptor,
  clusters,
  clusterNames,
  enabled,
  acknowledgedChecks,
}: PrePairChecksProps): {
  probes: React.ReactNode;
  results: PrePairCheckResults;
  passed: boolean;
} => {
  const [results, setResults] = React.useState<PrePairCheckResults>(
    () => new Map()
  );
  const checks = React.useMemo(
    () => getPrePairChecks(descriptor),
    [descriptor]
  );

  const onResult = React.useCallback((result: PrePairCheckResult) => {
    setResults((prev) =>
      _.isEqual(prev.get(result.id), result)
        ? prev
        : new Map(prev).set(result.id, result)
    );
  }, []);

  const onRemove = React.useCallback((checkId: PrePairCheckId) => {
    setResults((prev) => {
      if (!prev.has(checkId)) return prev;
      const next = new Map(prev);
      next.delete(checkId);
      return next;
    });
  }, []);

  // A new pair remounts the probes, so no result outlives the pair it was computed for.
  const pairKey = clusterNames.join(',');
  const probes = checks.map((check) => (
    <PrePairCheckProbe
      key={`${check.id}:${pairKey}`}
      check={check}
      clusters={clusters}
      clusterNames={clusterNames}
      enabled={enabled}
      onResult={onResult}
      onRemove={onRemove}
    />
  ));

  const passed = checks.every((check) => {
    const result = results.get(check.id);
    if (!result?.loaded || !result.canProceed) {
      return false;
    }
    return (
      !check.requiresAcknowledgement?.(result) ||
      acknowledgedChecks.has(check.id)
    );
  });

  return { probes, results, passed };
};

type PrePairChecksRunnerProps = {
  clusterNames: string[];
  descriptor: StorageVendorDescriptor;
  results: PrePairCheckResults;
  acknowledgedChecks: Set<string>;
  onAcknowledgeCheck: (checkId: string, acknowledged: boolean) => void;
  docHref?: string;
};

export const PrePairChecksRunner: React.FC<PrePairChecksRunnerProps> = ({
  clusterNames,
  descriptor,
  results,
  acknowledgedChecks,
  onAcknowledgeCheck,
  docHref,
}) => {
  const { t } = useCustomTranslation();
  const checks = getPrePairChecks(descriptor);

  if (checks.length === 0) {
    return null;
  }

  return (
    <>
      <Content className="pf-v6-u-mb-lg">
        <Content component={ContentVariants.small}>
          {t(
            'The first time a policy is created between two clusters, the clusters must be paired together.'
          )}
        </Content>
      </Content>
      {checks.map(({ id, Render }) => {
        const result = results.get(id);
        return result ? (
          <div key={id} className="pf-v6-u-mb-md">
            <Render
              clusterNames={clusterNames}
              result={result}
              acknowledged={acknowledgedChecks.has(id)}
              onAcknowledge={(acknowledged) =>
                onAcknowledgeCheck(id, acknowledged)
              }
              docHref={docHref}
            />
          </div>
        ) : null;
      })}
    </>
  );
};
