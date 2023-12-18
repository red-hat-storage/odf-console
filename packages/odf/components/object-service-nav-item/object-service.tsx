import * as React from 'react';
import { NooBaaObjectBucketClaimModel } from '@odf/core/models';
import {
  convertHorizontalNavTabToNavPage as convertObjectServiceTabToNav,
  useSortPages,
} from '@odf/core/utils';
import {
  HorizontalNavTab,
  isHorizontalNavTab,
} from '@odf/odf-plugin-sdk/extensions';
import { StatusBox } from '@odf/shared/generic/status-box';
import PageHeading from '@odf/shared/heading/page-heading';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import Tabs, { TabPage } from '@odf/shared/utils/Tabs';
import {
  useResolvedExtensions,
  NamespaceBar,
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

const OBJECT_SERVICE_CONTEXT = 'odf-object-service';
const NAMESPACE_BAR_PATHS = [referenceForModel(NooBaaObjectBucketClaimModel)];

const isObjectServiceTab = (e: Extension) =>
  isHorizontalNavTab(e) && e.properties.contextId === OBJECT_SERVICE_CONTEXT;

const ObjectServicePage: React.FC = () => {
  const { t } = useCustomTranslation();
  const title = t('Object Storage');

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

  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    if (
      (location.pathname.endsWith('/odf/object-storage') ||
        location.pathname.endsWith('/odf/object-storage/')) &&
      !_.isEmpty(sortedPages)
    ) {
      navigate('/odf/object-storage/' + sortedPages[0].href, { replace: true });
    }
  }, [location.pathname, navigate, sortedPages]);

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
          tabs={convertObjectServiceTabToNav(sortedPages) as TabPage[]}
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
