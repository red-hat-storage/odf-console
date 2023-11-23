import * as React from 'react';
import { useODFNamespaceSelector } from '@odf/core/redux';
import { StatusBox } from '@odf/shared/generic';

type SafetyBoxWrapperProps = {
  areResourcesLoaded?: boolean;
  resourcesError?: unknown;
  allowFallback?: boolean;
};

type SafetyBoxProps = {
  isAllSafe: boolean;
  isAllLoaded: boolean;
  anyError: unknown;
};

const SafetyBox: React.FC<SafetyBoxProps> = ({
  children,
  isAllSafe,
  isAllLoaded,
  anyError,
}) =>
  !isAllSafe ? (
    <StatusBox loaded={isAllLoaded} loadError={anyError} />
  ) : (
    <>{children}</>
  );

/**
 * ODF can be installed in any namespace, so figuring it out and storing it in Redux will be a prerequisite before using any CRUD pages.
 * "NamespaceSafetyBox" uses "StatusBox" which will ensure to add loading state (when namespace is being fetched) or reload button (in case of any error).
 * Where to use "NamespaceSafetyBox": can be used at root of any CRUD related page, which can be entry component for "Create" or "Edit" pages.
 * Where not to use "NamespaceSafetyBox": some of the imported/exposed components (eg: "DetailsPage", "VirtualizedTable" etc) internally add the functionality of "StatusBox",
 * those places we can simply pass the required props.
 * Also, no need to add it to the child component again, if root already handles this check.
 */
const NamespaceSafetyBox: React.FC<SafetyBoxWrapperProps> = ({
  children,
  areResourcesLoaded = true,
  resourcesError = null,
  allowFallback = false,
}) => {
  const { isODFNsLoaded, odfNsLoadError, isNsSafe, isFallbackSafe } =
    useODFNamespaceSelector();
  const isAllLoaded = isODFNsLoaded && areResourcesLoaded;
  const anyError = odfNsLoadError || resourcesError;
  const canUseFallback = allowFallback && isFallbackSafe;
  const isAllSafe =
    (isNsSafe || canUseFallback) && areResourcesLoaded && !resourcesError;

  return (
    <SafetyBox
      isAllSafe={isAllSafe}
      isAllLoaded={isAllLoaded}
      anyError={anyError}
    >
      {children}
    </SafetyBox>
  );
};

export default NamespaceSafetyBox;
