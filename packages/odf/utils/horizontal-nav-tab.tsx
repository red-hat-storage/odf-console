import * as React from 'react';
import {
  HorizontalNavTabExtensionProps,
  HorizontalNavTab,
} from '@odf/odf-plugin-sdk/extensions';
import {
  NavPage,
  ResolvedExtension,
} from '@openshift-console/dynamic-plugin-sdk';
import { ResolvedCodeRefProperties } from '@openshift-console/dynamic-plugin-sdk/lib/types';
import * as _ from 'lodash-es';

type SortPagesProps = {
  extensions: ResolvedExtension<HorizontalNavTab>[];
  haveExtensionsResolved: boolean;
  staticPages?: HorizontalNavProps[];
};

type UseSortPages = (props: SortPagesProps) => HorizontalNavProps[];

export type HorizontalNavProps =
  ResolvedCodeRefProperties<HorizontalNavTabExtensionProps>;

const sortPages = (horizontalNavTabs: HorizontalNavProps[]): void => {
  for (let i = 0; i < horizontalNavTabs.length; i++) {
    const element = horizontalNavTabs[i];
    if (_.has(element, 'before')) {
      const before = element.before;
      const placeAt = horizontalNavTabs.findIndex((tab) => tab.id === before);
      if (placeAt === -1) {
        // eslint-disable-next-line no-continue
        continue;
      }
      if (placeAt === 0) {
        horizontalNavTabs.splice(i, 1);
        horizontalNavTabs.splice(0, 0, element);
      } else if (placeAt > 0) {
        horizontalNavTabs.splice(placeAt, 0, element);
        if (i > placeAt) {
          horizontalNavTabs.splice(i + 1, 1);
        } else {
          horizontalNavTabs.splice(i, 1);
        }
      }
    }
    if (_.has(element, 'after')) {
      const after = element.after;
      const placeAt = horizontalNavTabs.findIndex((tab) => tab.id === after);
      if (placeAt === -1) {
        // eslint-disable-next-line no-continue
        continue;
      }
      if (placeAt === 0) {
        horizontalNavTabs.splice(i, 1);
        horizontalNavTabs.splice(1, 0, element);
      } else if (placeAt > 0) {
        horizontalNavTabs.splice(placeAt + 1, 0, element);
        if (i > placeAt) {
          horizontalNavTabs.splice(i + 1, 1);
        } else {
          horizontalNavTabs.splice(i, 1);
        }
      }
    }
  }
};

export const useSortPages: UseSortPages = ({
  extensions,
  haveExtensionsResolved,
  staticPages,
}) => {
  return React.useMemo(() => {
    const updatedPages = !!staticPages ? [...staticPages] : [];
    if (haveExtensionsResolved) {
      extensions.forEach((extension) => {
        const alreadyAdded =
          updatedPages.findIndex((pg) => pg.id === extension.properties.id) >=
          0;
        if (alreadyAdded) {
          return;
        } else {
          const page: HorizontalNavProps = {
            id: extension.properties.id,
            href: extension.properties.href,
            name: extension.properties.name,
            component: extension.properties.component,
            contextId: extension.properties.contextId,
            before: extension.properties.before,
            after: extension.properties.after,
          };
          updatedPages.push(page);
        }
      });
      sortPages(updatedPages);
    }
    return updatedPages;
  }, [extensions, haveExtensionsResolved, staticPages]);
};

export const convertHorizontalNavTabToNavPage = (
  horizontalNavTabs: HorizontalNavProps[]
): NavPage[] =>
  horizontalNavTabs.map((tab) => ({
    name: tab.name,
    href: tab.href,
    component: tab.component,
  }));
