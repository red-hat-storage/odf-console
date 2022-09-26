import * as React from 'react';
import {
  ResourceYAMLEditor,
  ResourceEventStream,
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash';
import {
  RouteComponentProps,
  useHistory,
  useLocation,
  useRouteMatch,
} from 'react-router';
import {
  Tab,
  Tabs as PfTabs,
  TabsComponent,
  TabTitleText,
} from '@patternfly/react-core';
import { K8sResourceKind } from '../types';
import { useCustomTranslation } from '../useCustomTranslationHook';
import './tabs.scss';

export type TabPage = {
  component: React.ComponentType<any>;
  href: string;
  title: string;
};

type TabsProps = {
  match?: RouteComponentProps['match'];
  tabs: TabPage[];
  isSecondary?: boolean;
  id: string;
  basePath?: string; // The page that is common to these tabs
};

const Tabs: React.FC<TabsProps> = ({
  tabs,
  isSecondary = false,
  id,
  basePath,
}) => {
  const offset = isSecondary ? 10 : 1;
  const [activeTab, setActiveTab] = React.useState(0 + offset);

  const location = useLocation();
  const history = useHistory();
  const match = useRouteMatch();

  const { t } = useCustomTranslation();

  const elements = React.useMemo(() => {
    const temp = tabs.map((tab, i) => (
      <Tab
        eventKey={i + offset}
        title={<TabTitleText>{tab.title}</TabTitleText>}
        translate={t}
        key={tab.title}
        data-test={`horizontal-link-${tab.title}`}
      >
        <tab.component match={match} history={history} />
      </Tab>
    ));
    return temp;
  }, [history, match, offset, t, tabs]);

  const hrefToTabMap = React.useMemo(
    () =>
      tabs.reduce((acc, tab, i) => {
        acc[tab.href] = i + offset;
        return acc;
      }, {}),
    [tabs, offset]
  );

  const tabToHrefMap = React.useMemo(
    () => _.invert(hrefToTabMap),
    [hrefToTabMap]
  );

  React.useEffect(() => {
    const currentLocation = location.pathname;
    const firstMatchKey = Object.keys(hrefToTabMap).find(
      (href) =>
        currentLocation.endsWith(href) ||
        currentLocation.endsWith(`${href}/`) ||
        currentLocation.includes(href)
    );
    const trueActiveTab = hrefToTabMap[firstMatchKey];
    const isActiveBasePath = currentLocation.endsWith(basePath);
    if (!trueActiveTab && isActiveBasePath) {
      const activeHref = tabToHrefMap[activeTab];
      const sanitizedPath = location.pathname.endsWith('/')
        ? location.pathname.slice(0, -1)
        : location.pathname;
      const currentPath = sanitizedPath.split('/');
      const updatedPath = [...currentPath, activeHref].join('/');
      history.push(updatedPath);
    }
    // Fixing path based on initial page props
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const currentLocation = location.pathname;
    const firstMatchKey = Object.keys(hrefToTabMap).find(
      (href) =>
        currentLocation.endsWith(href) ||
        currentLocation.endsWith(`${href}/`) ||
        currentLocation.includes(href)
    );
    const trueActiveTab = hrefToTabMap[firstMatchKey];
    if (trueActiveTab !== activeTab) {
      setActiveTab(trueActiveTab);
    }
  }, [activeTab, history, hrefToTabMap, location.pathname, tabToHrefMap]);

  const onClick = (event, tabIndex) => {
    // Update the href only and let useEffect handle tabChange
    const isActive = tabIndex === activeTab;
    if (!isActive) {
      const requiredHref = tabToHrefMap[tabIndex];
      const sanitizedPath = location.pathname.endsWith('/')
        ? location.pathname.slice(0, -1)
        : location.pathname;
      const currentPath = sanitizedPath.split('/');
      const updateDepth = _.reverse([...currentPath]).indexOf(
        tabToHrefMap[activeTab]
      );
      _.times(updateDepth + 1, () => {
        currentPath.pop();
      });
      const updatedPath = [...currentPath, requiredHref].join('/');
      history.push(updatedPath);
    }
  };

  return (
    <PfTabs
      id={id}
      className="odf-tabs"
      unmountOnExit={true}
      activeKey={activeTab}
      onSelect={onClick}
      isSecondary={isSecondary}
      component={TabsComponent.nav}
    >
      {elements}
    </PfTabs>
  );
};

type WrappedProps = {
  obj?: K8sResourceKind;
};

export const YAMLEditorWrapped: React.FC<WrappedProps> = ({ obj }) => (
  <ResourceYAMLEditor initialResource={obj} />
);

export const EventStreamWrapped: React.FC<WrappedProps> = ({ obj }) => (
  <ResourceEventStream resource={obj} />
);

export default Tabs;
