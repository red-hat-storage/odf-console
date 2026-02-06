import * as React from 'react';
import { LinkifyExternal } from '@odf/shared/utils/link';
import {
  HorizontalNav,
  K8sKind,
  K8sResourceCommon,
  NavPage,
  ResourceLink,
  useAccessReview,
  useModal,
} from '@openshift-console/dynamic-plugin-sdk';
import classnames from 'classnames';
import * as _ from 'lodash-es';
import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Popover,
  Split,
  SplitItem,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
} from '@patternfly/react-core';
import { PencilAltIcon } from '@patternfly/react-icons';
import { LoadingBox } from '../generic/status-box';
import PageHeading from '../heading/page-heading';
import { EditLabelModal } from '../modals';
import AnnotationsModal from '../modals/EditAnnotations';
import { ResourceIcon } from '../resource-link/resource-link';
import { getName } from '../selectors';
import { K8sResourceKind } from '../types';
import { useCustomTranslation } from '../useCustomTranslationHook';
import { referenceForModel } from '../utils';
import { ErrorPage } from '../utils/Errors';
import { getPropertyDescription } from '../utils/swagger';
import { LabelList } from './label-list';
import { OwnerReferences } from './owner-references';
import { Timestamp } from './timestamp';
import '../style.scss';
import './details.scss';

type DetailsPageProps = {
  pages: NavPage[];
  actions?: any;
  resource: K8sResourceCommon;
  resourceModel: K8sKind;
  breadcrumbs?: { name: string; path: string }[];
  loaded?: boolean;
  loadError?: any;
};

type DetailsPageTitleProps = {
  resource: K8sResourceCommon;
  resourceModel: K8sKind;
};

export const DetailsPageTitle: React.FC<DetailsPageTitleProps> = ({
  resource,
  resourceModel,
}) => {
  const { t } = useCustomTranslation();

  const showOwnerRef = resource?.metadata?.ownerReferences;
  return (
    <div className="odf-details-title">
      <div>
        <ResourceIcon resourceModel={resourceModel} />
      </div>
      <div className="odf-title-owner-reference">
        {getName(resource)}
        {showOwnerRef && (
          <h4 className="odf-details-title odf-managed-owner--gap">
            {t('Managed by')}
            <OwnerReferences resource={resource} />
          </h4>
        )}
      </div>
    </div>
  );
};

const DetailsPage: React.FC<DetailsPageProps> = ({
  pages,
  resource,
  actions,
  breadcrumbs,
  resourceModel,
  loaded = true,
  loadError = null,
}) => (
  <>
    {!loaded && <LoadingBox />}
    {loaded && loadError && <ErrorPage message={loadError?.message} />}
    {loaded && !loadError && (
      <>
        <PageHeading
          breadcrumbs={breadcrumbs}
          title={
            <DetailsPageTitle
              resource={resource}
              resourceModel={resourceModel}
            />
          }
          actions={actions}
          resource={resource}
          className="odf-resource-details"
        />
        <HorizontalNav pages={pages} resource={resource} />{' '}
      </>
    )}
  </>
);

export default DetailsPage;

export type ResourceSummaryProps = {
  resource: K8sResourceKind;
  showAnnotations?: boolean;
  showLabelEditor?: boolean;
  canUpdateResource?: boolean;
  children?: React.ReactNode;
  customPathName?: string;
  resourceModel: K8sKind;
  ownerLabel?: string;
};

export type DetailsItemProps = {
  canEdit?: boolean;
  defaultValue?: React.ReactNode;
  description?: string;
  editAsGroup?: boolean;
  hideEmpty?: boolean;
  label: string;
  labelClassName?: string;
  obj: K8sResourceKind;
  onEdit?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  path?: string | string[];
  valueClassName?: string;
  model?: K8sKind;
};

export const PropertyPath: React.FC<{
  kind: string;
  path: string | string[];
}> = ({ kind, path }) => {
  const pathArray: string[] = _.toPath(path);
  return (
    <Breadcrumb className="pf-v5-c-breadcrumb--no-padding-top">
      <BreadcrumbItem>{kind}</BreadcrumbItem>
      {pathArray.map((property, i) => {
        const isLast = i === pathArray.length - 1;
        return (
          <BreadcrumbItem key={i} isActive={isLast}>
            {property}
          </BreadcrumbItem>
        );
      })}
    </Breadcrumb>
  );
};

type EditButtonProps = {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  testId?: string;
};

const EditButton: React.FC<EditButtonProps> = (props) => {
  return (
    <Button
      icon={
        <PencilAltIcon className="co-icon-space-l pf-v5-c-button-icon--plain" />
      }
      type="button"
      variant="link"
      isInline
      onClick={props.onClick}
      data-test={
        props.testId
          ? `${props.testId}-details-item__edit-button`
          : 'details-item__edit-button'
      }
    >
      {props.children}
    </Button>
  );
};

export type SwaggerDefinitions = {
  [name: string]: SwaggerDefinition;
};

export type SwaggerDefinition = {
  definitions?: SwaggerDefinitions;
  description?: string;
  type?: string;
  enum?: string[];
  $ref?: string;
  items?: SwaggerDefinition;
  required?: string[];
  properties?: {
    [prop: string]: SwaggerDefinition;
  };
};
export const DetailsItem: React.FC<DetailsItemProps> = ({
  children,
  defaultValue = '-',
  description,
  editAsGroup,
  hideEmpty,
  label,
  labelClassName,
  obj,
  onEdit,
  canEdit = true,
  path,
  valueClassName,
  model,
}) => {
  const { t } = useCustomTranslation();
  const hide = hideEmpty && _.isEmpty(_.get(obj, path));
  const popoverContent: string =
    description ?? getPropertyDescription(model, path);
  const value: React.ReactNode = children || _.get(obj, path, defaultValue);
  const editable = onEdit && canEdit;
  return hide ? null : (
    <DescriptionListGroup>
      <DescriptionListTerm
        className={classnames('details-item__label', labelClassName)}
        data-test-selector={`details-item-label__${label}`}
      >
        <Split>
          <SplitItem className="details-item__label">
            {popoverContent || path ? (
              <Popover
                headerContent={<div>{label}</div>}
                {...(popoverContent && {
                  bodyContent: (
                    <LinkifyExternal>
                      <div className="co-pre-line">{popoverContent}</div>
                    </LinkifyExternal>
                  ),
                })}
                {...(path && {
                  footerContent: (
                    <PropertyPath kind={model?.kind} path={path} />
                  ),
                })}
                maxWidth="30rem"
              >
                <DescriptionListTerm className="description-list-term">
                  {label}
                </DescriptionListTerm>
              </Popover>
            ) : (
              label
            )}
          </SplitItem>
          {editable && editAsGroup && (
            <>
              <SplitItem isFilled />
              <SplitItem className="pf-v5-u-ml-sm">
                <EditButton testId={label} onClick={onEdit}>
                  {t('Edit')}
                </EditButton>
              </SplitItem>
            </>
          )}
        </Split>
      </DescriptionListTerm>
      <DescriptionListDescription
        className={classnames('details-item__value', valueClassName, {
          'details-item__value--group': editable && editAsGroup,
        })}
        data-test-selector={`details-item-value__${label}`}
      >
        {editable && !editAsGroup ? (
          <EditButton testId={label} onClick={onEdit}>
            {value}
          </EditButton>
        ) : (
          value
        )}
      </DescriptionListDescription>
    </DescriptionListGroup>
  );
};

export const ResourceSummary: React.FC<ResourceSummaryProps> = ({
  children,
  resource,
  customPathName,
  showAnnotations = true,
  showLabelEditor = true,
  canUpdateResource = true,
  resourceModel,
  ownerLabel,
}) => {
  const { t } = useCustomTranslation();
  const { metadata } = resource;
  const reference = referenceForModel(resourceModel);
  const [canUpdateAccess] = useAccessReview({
    group: resourceModel.apiGroup,
    resource: resourceModel.plural,
    verb: 'patch',
    name: metadata.name,
    namespace: metadata.namespace,
  });
  const canUpdate = canUpdateAccess && canUpdateResource;

  const launchModal = useModal();

  return (
    <DescriptionList data-test-id="resource-summary">
      <DetailsItem
        label={t('Name')}
        obj={resource}
        path={customPathName || 'metadata.name'}
      />
      {metadata.namespace && (
        <DetailsItem
          label={t('Namespace')}
          obj={resource}
          path="metadata.namespace"
        >
          <ResourceLink
            kind="Namespace"
            name={metadata.namespace}
            title={metadata.uid}
            namespace={null}
          />
        </DetailsItem>
      )}
      <DetailsItem
        label={t('Labels')}
        obj={resource}
        path="metadata.labels"
        valueClassName="details-item__value--labels"
        onEdit={() =>
          launchModal(EditLabelModal, {
            extraProps: { resource, resourceModel },
            isOpen: true,
          })
        }
        canEdit={showLabelEditor && canUpdate && !!launchModal}
        editAsGroup
      >
        <LabelList kind={reference} labels={metadata.labels} />
      </DetailsItem>
      {showAnnotations && (
        <DetailsItem
          label={t('Annotations')}
          obj={resource}
          path="metadata.annotations"
        >
          {canUpdate && !!launchModal ? (
            <Button
              icon={
                <PencilAltIcon className="co-icon-space-l pf-v5-c-button-icon--plain" />
              }
              data-test="edit-annotations"
              type="button"
              isInline
              onClick={() =>
                launchModal(AnnotationsModal, {
                  extraProps: {
                    resource,
                    resourceModel,
                  },
                  isOpen: true,
                })
              }
              variant="link"
            >
              {t('{{count}} annotation', {
                count: _.size(metadata.annotations),
              })}
            </Button>
          ) : (
            t('{{count}} annotation', {
              count: _.size(metadata.annotations),
            })
          )}
        </DetailsItem>
      )}
      {children}
      <DetailsItem
        label={t('Created at')}
        obj={resource}
        path="metadata.creationTimestamp"
      >
        <Timestamp timestamp={metadata.creationTimestamp} />
      </DetailsItem>
      <DetailsItem
        label={ownerLabel || t('Owner')}
        obj={resource}
        path="metadata.ownerReferences"
      >
        <OwnerReferences resource={resource} />
      </DetailsItem>
    </DescriptionList>
  );
};
