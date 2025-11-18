import * as React from 'react';
import { Tag } from '@aws-sdk/client-iam';
import { useCustomTranslation } from '@odf/shared';
import { SectionHeading } from '@odf/shared/heading/page-heading';
import { MAX_TAGS } from '@odf/shared/iam';
import { Alert, AlertVariant, Spinner } from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';

type IAMTagsDetailsProps = {
  obj: {
    tags: Tag[];
    isLoading: boolean;
    error: any;
  };
};

export const IAMTagsDetails: React.FC<IAMTagsDetailsProps> = ({ obj }) => {
  const { t } = useCustomTranslation();

  const { tags } = obj;
  const isLoading = false;
  const remainingTags = MAX_TAGS - tags.length;

  return (
    <div className="odf-m-pane__body">
      <div className="row pf-v5-u-mt-md">
        <div className="col-sm-12">
          <SectionHeading text={t('Tags')} />
          {isLoading ? (
            <div className="pf-v5-u-text-align-center pf-v5-u-p-lg">
              <Spinner size="lg" />
            </div>
          ) : tags.length > 0 ? (
            <>
              <Alert
                data-test="odf-not-found-alert"
                className="odf-alert mco-create-data-policy__alert"
                title={t(`You can add ${remainingTags} more tags`)}
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
                  {tags.map(
                    (tag: { Key: string; Value: string }, index: number) => (
                      <Tr key={index}>
                        <Td dataLabel={t('Key')}>{tag.Key || '-'}</Td>
                        <Td dataLabel={t('Value')}>{tag.Value || '-'}</Td>
                      </Tr>
                    )
                  )}
                </Tbody>
              </Table>
            </>
          ) : (
            <div className="pf-v5-u-text-align-center pf-v5-u-p-lg pf-v5-u-color-200">
              {t('No tags found')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
