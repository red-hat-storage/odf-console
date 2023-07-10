import * as React from 'react';
import {
  ACM_SEARCH_PROXY_ENDPOINT,
  HUB_CLUSTER_NAME,
} from '@odf/mco/constants';
import { SearchQuery, SearchResult } from '@odf/mco/types';
import { useSafeFetch } from '@odf/shared/hooks/custom-prometheus-poll/safe-fetch-hook';

export const useACMSafeFetch: ACMSafeFetchProps = (
  searchQuery: SearchQuery
): [SearchResult, any] => {
  const safeFetch = useSafeFetch();
  const [error, setError] = React.useState();
  const [response, setResponse] = React.useState<SearchResult>();
  React.useEffect(() => {
    safeFetch({
      url: ACM_SEARCH_PROXY_ENDPOINT,
      method: 'post',
      cluster: HUB_CLUSTER_NAME,
      options: {
        headers: {
          'Content-type': 'application/json',
        },
        body: JSON.stringify(searchQuery),
      },
    })
      .then((data) => {
        setResponse(data);
      })
      .catch((err) => {
        setError(err);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setResponse, searchQuery]);
  return [response, error];
};

type ACMSafeFetchProps = (searchQuery: SearchQuery) => [SearchResult, any];
