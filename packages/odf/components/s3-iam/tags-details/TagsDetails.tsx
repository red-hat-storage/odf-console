import * as React from 'react';
import { MAX_TAGS } from '@odf/core/constants/s3-iam';
import { IamUserDetails } from '@odf/core/types';
import { DASH, LoadingBox, StatusBox, useCustomTranslation } from '@odf/shared';
import { SectionHeading } from '@odf/shared/heading/page-heading';
import { IamCommands } from '@odf/shared/iam';
import {
  Alert,
  AlertVariant,
  EmptyState,
  EmptyStateHeader,
  EmptyStateVariant,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { useUserDetails } from '../hooks/useUserDetails';

type TagsDetailsProps = {
  obj: IamUserDetails;
};

type TagsDetailsContentProps = {
  userName: string;
  iamClient: IamCommands;
};

const TagsDetailsContent: React.FC<TagsDetailsContentProps> = ({
  userName,
  iamClient,
}) => {
  const { t } = useCustomTranslation();

  const {
    userDetails,
    isLoading: isLoadingUserDetails,
    error: userDetailsError,
  } = useUserDetails(userName, iamClient);

  const tags = userDetails?.Tags || [];
  const remainingTags = MAX_TAGS - tags.length;

  if (isLoadingUserDetails || userDetailsError) {
    return (
      <StatusBox loaded={!isLoadingUserDetails} loadError={userDetailsError} />
    );
  }

  if (tags.length === 0) {
    return (
      <EmptyState variant={EmptyStateVariant.lg}>
        <EmptyStateHeader titleText={t('No tags found')} headingLevel="h4" />
      </EmptyState>
    );
  }

  return (
    <div className="odf-m-pane__body">
      <div className="pf-v5-u-mt-md">
        <SectionHeading text={t('Tags')} />
        <Alert
          title={t('You can add {{remaining}} more tags', {
            remaining: remainingTags,
          })}
          variant={AlertVariant.info}
          isInline
        />
        <Table variant="compact" borders={true}>
          <Thead>
            <Tr>
              <Th>{t('Key')}</Th>
              <Th>{t('Value')}</Th>
            </Tr>
          </Thead>
          <Tbody>
            {tags.map((tag: { Key: string; Value: string }) => (
              <Tr key={tag.Key}>
                <Td dataLabel={t('Key')}>{tag.Key || DASH}</Td>
                <Td dataLabel={t('Value')}>{tag.Value || DASH}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </div>
    </div>
  );
};

export const TagsDetails: React.FC<TagsDetailsProps> = ({ obj }) => {
  const { userName, iamClient, fresh } = obj;

  return fresh ? (
    <TagsDetailsContent userName={userName} iamClient={iamClient} />
  ) : (
    <LoadingBox />
  );
};
