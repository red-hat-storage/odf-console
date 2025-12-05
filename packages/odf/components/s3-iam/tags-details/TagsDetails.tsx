import * as React from 'react';
import { MAX_TAGS } from '@odf/core/constants/s3-iam';
import { IamUserDetails } from '@odf/core/types';
import { DASH, StatusBox, useCustomTranslation } from '@odf/shared';
import { SectionHeading } from '@odf/shared/heading/page-heading';
import { Alert, AlertVariant } from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { useUserDetails } from '../hooks/useUserDetails';

type TagsDetailsProps = {
  obj: IamUserDetails;
};

export const TagsDetails: React.FC<TagsDetailsProps> = ({ obj }) => {
  const { t } = useCustomTranslation();

  const { userName, iamClient, fresh } = obj;

  const {
    userDetails,
    isLoading: isLoadingUserDetails,
    error: userDetailsError,
    refreshTokens,
  } = useUserDetails(userName, iamClient);

  const tags = userDetails?.Tags || [];
  const remainingTags = MAX_TAGS - tags.length;

  React.useEffect(() => {
    if (fresh) {
      refreshTokens?.();
    }
  }, [fresh, refreshTokens]);

  if (isLoadingUserDetails || userDetailsError) {
    return (
      <StatusBox loaded={!isLoadingUserDetails} loadError={userDetailsError} />
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
