import * as React from 'react';
import { ODF_ADMIN } from '@odf/core/features';
import { S3ProviderType } from '@odf/core/types';
import {
  convertHorizontalNavTabToNavPage as convertObjectServiceTabToNav,
  useSortPages,
} from '@odf/core/utils';
import {
  HorizontalNavTab,
  isHorizontalNavTab,
} from '@odf/odf-plugin-sdk/extensions';
import { NooBaaObjectBucketClaimModel } from '@odf/shared';
import { StatusBox } from '@odf/shared/generic/status-box';
import PageHeading from '@odf/shared/heading/page-heading';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import Tabs, { TabPage } from '@odf/shared/utils/Tabs';
import {
  useResolvedExtensions,
  NamespaceBar,
  useFlag,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  Extension,
  ExtensionTypeGuard,
} from '@openshift-console/dynamic-plugin-sdk/lib/types';
import * as _ from 'lodash-es';
import { Helmet } from 'react-helmet';
import {
  useParams,
  useLocation,
  useNavigate,
} from 'react-router-dom-v5-compat';
import {
  S3_CREDENTIALS_SESSION_STORE_KEY,
  S3_CREDENTIALS_LOCAL_STORE_KEY,
  ODF_S3_STORAGE_EVENT,
} from '../../constants';
import { StoredCredentials } from '../s3-common/types';

const OBJECT_SERVICE_CONTEXT = 'odf-object-service';
const NAMESPACE_BAR_PATHS = [referenceForModel(NooBaaObjectBucketClaimModel)];

const isObjectServiceTab = (e: Extension) =>
  isHorizontalNavTab(e) && e.properties.contextId === OBJECT_SERVICE_CONTEXT;

const ObjectServicePage: React.FC = () => {
  const { t } = useCustomTranslation();
  const title = t('Object Storage');
  const isAdmin = useFlag(ODF_ADMIN);

  const [extensions, isLoaded, error] = useResolvedExtensions<HorizontalNavTab>(
    isObjectServiceTab as ExtensionTypeGuard<HorizontalNavTab>
  );

  // When the list of matching extensions changes, the resolution is restarted.
  // The hook will continue to return the previous result until the resolution completes.
  // Which means that value of "haveExtensionsResolved" can change later when new extensions are being loaded.
  const haveExtensionsResolved =
    isLoaded && _.isEmpty(error) && !_.isEmpty(extensions);
  const haveAlreadyResolvedOnce = React.useRef<Boolean>(false);
  if (!haveAlreadyResolvedOnce.current && haveExtensionsResolved) {
    haveAlreadyResolvedOnce.current = true;
  }
  const sortedPages = useSortPages({ extensions, haveExtensionsResolved });

  // Only needed for non-admin users
  const [filterIamTab, setFilterIamTab] = React.useState(false);

  // Current-tab, initial load (session has more priority than local)
  React.useEffect(() => {
    if (isAdmin) return;

    try {
      const sessionRaw = sessionStorage.getItem(
        S3_CREDENTIALS_SESSION_STORE_KEY
      );
      if (sessionRaw) {
        const sessionData: StoredCredentials = JSON.parse(sessionRaw);
        const noobaaCreds = sessionData[S3ProviderType.Noobaa];
        if (noobaaCreds) {
          setFilterIamTab(noobaaCreds.hasOBCOwnerRef ?? false);
          return;
        }
      }

      const localRaw = localStorage.getItem(S3_CREDENTIALS_LOCAL_STORE_KEY);
      if (localRaw) {
        const localData: StoredCredentials = JSON.parse(localRaw);
        const noobaaCreds = localData[S3ProviderType.Noobaa];
        if (noobaaCreds) {
          setFilterIamTab(noobaaCreds.hasOBCOwnerRef ?? false);
          return;
        }
      }

      setFilterIamTab(false);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error reading storage for initial IAM tab state:', err);
      setFilterIamTab(false);
    }
  }, [isAdmin]);

  // Current-tab updates via custom events (session and local storage)
  React.useEffect(() => {
    if (isAdmin) return;

    const handleS3StorageEvent = (event: CustomEvent) => {
      const { filterIamTab: shouldFilter, providerType } = event.detail || {};
      // For now only needed for Noobaa provider
      if (providerType === S3ProviderType.Noobaa) {
        setFilterIamTab(shouldFilter ?? false);
      }
    };

    window.addEventListener(
      ODF_S3_STORAGE_EVENT,
      handleS3StorageEvent as EventListener
    );
    return () => {
      window.removeEventListener(
        ODF_S3_STORAGE_EVENT,
        handleS3StorageEvent as EventListener
      );
    };
  }, [isAdmin]);

  // Cross-tab updates (only for localStorage)
  React.useEffect(() => {
    if (isAdmin) return;

    const onStorage = (e: StorageEvent) => {
      if (e.key === S3_CREDENTIALS_LOCAL_STORE_KEY) {
        try {
          const parsed: StoredCredentials = JSON.parse(e.newValue || '{}');
          const noobaaCreds = parsed[S3ProviderType.Noobaa];
          if (noobaaCreds) {
            setFilterIamTab(noobaaCreds.hasOBCOwnerRef ?? false);
          } else {
            // Noobaa credentials removed, show IAM tab
            setFilterIamTab(false);
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('Error parsing storage event for IAM tab filter:', err);
        }
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [isAdmin]);

  // Filter IAM tab based on filterIamTab state (only for non-admin users)
  const filteredPages = React.useMemo(
    () =>
      !isAdmin && filterIamTab
        ? sortedPages.filter((p) => p.id !== 'iam')
        : sortedPages,
    [filterIamTab, sortedPages, isAdmin]
  );

  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    if (
      (location.pathname.endsWith('/odf/object-storage') ||
        location.pathname.endsWith('/odf/object-storage/')) &&
      !_.isEmpty(filteredPages)
    ) {
      navigate('/odf/object-storage/' + filteredPages[0].href, {
        replace: true,
      });
    }
  }, [location.pathname, navigate, filteredPages]);

  const showNamespaceBar = NAMESPACE_BAR_PATHS.some((path) =>
    location.pathname.includes(path)
  );

  return (
    <>
      {showNamespaceBar && <NamespaceBar />}
      <Helmet>
        <title>{title}</title>
      </Helmet>
      <PageHeading title={title} />
      {haveExtensionsResolved || haveAlreadyResolvedOnce ? (
        <Tabs
          id="odf-object-storage"
          tabs={convertObjectServiceTabToNav(filteredPages) as TabPage[]}
        />
      ) : (
        <StatusBox loadError={error} loaded={isLoaded} />
      )}
    </>
  );
};

export const RerouteResource: React.FC<{}> = () => {
  const { kind } = useParams();
  const navigate = useNavigate();

  React.useEffect(() => {
    navigate(`/odf/object-storage/${kind}`);
  }, [navigate, kind]);
  return null;
};

export default ObjectServicePage;
