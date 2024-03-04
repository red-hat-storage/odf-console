import * as React from 'react';
import {
  ACM_SEARCH_PROXY_ENDPOINT,
  HUB_CLUSTER_NAME,
} from '@odf/mco/constants';
import { SearchQuery, SearchResult } from '@odf/mco/types';
import { useSafeFetch } from '@odf/shared/hooks/custom-prometheus-poll/safe-fetch-hook';

export const useACMSafeFetch: ACMSafeFetchProps = (
  searchQuery: SearchQuery
): [SearchResult, any, boolean] => {
  const safeFetch = useSafeFetch();
  const [error, setError] = React.useState();
  const [loaded, setLoaded] = React.useState(false);
  const [response, setResponse] = React.useState<SearchResult>();
  React.useEffect(() => {
    setLoaded(false);
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
        setLoaded(true);
      })
      .catch((err) => {
        setError(err);
        setLoaded(true);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setResponse, searchQuery]);
  return [response, error, loaded];
};

type ACMSafeFetchProps = (
  searchQuery: SearchQuery
) => [SearchResult, any, boolean];
