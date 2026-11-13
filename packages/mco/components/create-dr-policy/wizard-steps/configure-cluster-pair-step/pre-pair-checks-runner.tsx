import * as React from 'react';
import {
  PrePairCheckResult,
  StorageVendorDescriptor,
} from '@odf/mco/utils/storage-vendor-registry';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Content, ContentVariants } from '@patternfly/react-core';

export type PrePairChecksState = {
  results: Map<string, PrePairCheckResult>;
  acknowledgedChecks: Set<string>;
};

type PrePairChecksRunnerProps = {
  clusterNames: string[];
  descriptor: StorageVendorDescriptor;
  enabled: boolean;
  acknowledgedChecks: Set<string>;
  onAcknowledgeCheck: (checkId: string, acknowledged: boolean) => void;
  docHref?: string;
};

export const PrePairChecksRunner: React.FC<PrePairChecksRunnerProps> = ({
  clusterNames,
  descriptor,
  enabled,
  acknowledgedChecks,
  onAcknowledgeCheck,
  docHref,
}) => {
  const { t } = useCustomTranslation();
  const checks = descriptor.prePairChecks;

  const checkResults = checks.map((check) => ({
    check,
    result: check.useCheck(clusterNames, enabled),
  }));

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
      {checkResults.map(({ check, result }) => (
        <div key={check.id} className="pf-v6-u-mb-md">
          {check.render({
            clusterNames,
            result,
            acknowledged: acknowledgedChecks.has(check.id),
            onAcknowledge: (acknowledged) =>
              onAcknowledgeCheck(check.id, acknowledged),
            docHref,
          })}
        </div>
      ))}
    </>
  );
};

export const usePrePairChecks = (
  descriptor: StorageVendorDescriptor | null,
  enabled: boolean,
  clusterNames: string[]
): {
  allLoaded: boolean;
  allPassed: boolean;
  requiresAcknowledgement: (
    checkId: string,
    result: PrePairCheckResult
  ) => boolean;
} => {
  const checks = React.useMemo(
    () => descriptor?.prePairChecks ?? [],
    [descriptor]
  );

  const checkResults = checks.map((check) => ({
    check,
    result: check.useCheck(clusterNames, enabled),
  }));

  const allLoaded = checkResults.every(({ result }) => result.loaded);
  const allPassed = checkResults.every(({ result }) => result.canProceed);

  const checksById = React.useMemo(() => {
    const map = new Map();
    checks.forEach((c) => map.set(c.id, c));
    return map;
  }, [checks]);

  const requiresAcknowledgement = React.useCallback(
    (checkId: string, result: PrePairCheckResult): boolean => {
      const check = checksById.get(checkId);
      return check?.requiresAcknowledgement?.(result) ?? false;
    },
    [checksById]
  );

  return { allLoaded, allPassed, requiresAcknowledgement };
};
