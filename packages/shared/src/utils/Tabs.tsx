import * as React from 'react';
import {
  ResourceYAMLEditor,
  ResourceEventStream,
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { useLocation, useNavigate } from 'react-router-dom-v5-compat';
import {
  Tab,
  Tabs as PfTabs,
  TabsComponent,
  TabTitleText,
} from '@patternfly/react-core';
import { K8sResourceKind } from '../types';
import './tabs.scss';

export type TabPage = {
  id?: string;
  component: React.ComponentType<any>;
  href: string;
  title?: string;
  name?: string;
};

type TabsProps = {
  tabs: TabPage[];
  isSecondary?: boolean;
  id: string;
  basePath?: string; // The page that is common to these tabs
  updatePathOnSelect?: boolean;
  customData?: unknown;
};

const Tabs: React.FC<TabsProps> = ({
  tabs,
  isSecondary = false,
  id,
  basePath,
  updatePathOnSelect = true,
  customData = {},
}) => {
  const offset = isSecondary ? 10 : 1;
  const [activeTab, setActiveTab] = React.useState(0 + offset);

  const location = useLocation();
  const navigate = useNavigate();

  const elements = React.useMemo(() => {
    const temp = tabs.map((tab, i) => {
      const tabTitle = tab.title || tab.name;
      return (
        <Tab
          eventKey={i + offset}
          title={<TabTitleText>{tabTitle}</TabTitleText>}
          key={tabTitle}
          data-test={`horizontal-link-${tabTitle}`}
        >
          <tab.component obj={customData} />
        </Tab>
      );
    });
    return temp;
  }, [offset, tabs, customData]);

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
      navigate(updatedPath);
    }
    // Fixing path based on initial page props
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const currentLocation = location.pathname;
    const firstMatchKey = Object.keys(hrefToTabMap).find(
      (href) =>
        location.hash === href ||
        currentLocation.endsWith(href) ||
        currentLocation.endsWith(`${href}/`) ||
        currentLocation.includes(href)
    );
    const trueActiveTab = hrefToTabMap[firstMatchKey];
    if (trueActiveTab && trueActiveTab !== activeTab) {
      setActiveTab(trueActiveTab);
    }
  }, [activeTab, location.hash, hrefToTabMap, location.pathname, tabToHrefMap]);

  const onSelect = (_event, tabIndex) => {
    if (!updatePathOnSelect) {
      return setActiveTab(tabIndex);
    }
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
      const updatedPath = [...currentPath, requiredHref]
        .join('/')
        .replace('/#', '#');
      navigate(updatedPath);
    }
  };

  return (
    <PfTabs
      id={id}
      className="odf-tabs"
      unmountOnExit={true}
      activeKey={activeTab}
      onSelect={onSelect}
      isSubtab={isSecondary}
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
