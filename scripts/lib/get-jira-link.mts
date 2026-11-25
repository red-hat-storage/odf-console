const GH_API = 'https://api.github.com/advisories';
const JIRA_BASE = 'https://redhat.atlassian.net';

export interface JiraIssue {
  key: string;
  summary: string;
  url: string;
}

export interface LookupResult {
  input: string;
  ghsa: string | null;
  cve: string | null;
  jira: JiraIssue[];
}

const ghHeaders = (): Record<string, string> => {
  const h: Record<string, string> = { Accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN)
    h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
};

const jiraHeaders = (): Record<string, string> | null => {
  const token = process.env.JIRA_TOKEN;
  if (!token) return null;
  return { Accept: 'application/json', Authorization: `Basic ${token}` };
};

const fetchJSON = async (
  url: string,
  headers: Record<string, string>
): Promise<any> => {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText} (${url})`);
  return res.json();
};

/**
 * Resolve GHSA IDs to CVE IDs via the GitHub Advisories API,
 * then batch-query Jira for all CVEs in a single request.
 */
export const lookupAll = async (
  ghsaIds: string[]
): Promise<Map<string, LookupResult>> => {
  const results = new Map<string, LookupResult>();
  const cveToGhsa = new Map<string, string>();

  // Phase 1: GHSA → CVE (GitHub API, one call per GHSA — no batch endpoint)
  await Promise.all(
    ghsaIds.map(async (id) => {
      const r: LookupResult = { input: id, ghsa: id, cve: null, jira: [] };
      try {
        const adv = await fetchJSON(`${GH_API}/${id}`, ghHeaders());
        r.cve = adv.cve_id || null;
        if (r.cve) cveToGhsa.set(r.cve, id);
      } catch {
        /* best-effort */
      }
      results.set(id, r);
    })
  );

  // Phase 2: batch Jira search — one call for all CVEs
  const cveIds = [...cveToGhsa.keys()];
  if (cveIds.length === 0) return results;

  const headers = jiraHeaders();
  if (!headers) return results;

  const clauses = cveIds.map((c) => `summary ~ "${c}"`).join(' OR ');
  const jql = encodeURIComponent(
    `project = DFBUGS AND status != Closed AND (${clauses})`
  );
  const url = `${JIRA_BASE}/rest/api/2/search/jql?jql=${jql}&fields=summary,key&maxResults=100`;

  try {
    const data = await fetchJSON(url, headers);
    for (const issue of data.issues) {
      const summary: string = issue.fields.summary;
      const ji: JiraIssue = {
        key: issue.key,
        summary,
        url: `${JIRA_BASE}/browse/${issue.key}`,
      };
      // Match issue back to its CVE/GHSA — word boundary avoids CVE-2025-1234 matching CVE-2025-12345
      for (const cve of cveIds) {
        if (new RegExp(`\\b${cve}\\b`).test(summary)) {
          const ghsa = cveToGhsa.get(cve)!;
          results.get(ghsa)!.jira.push(ji);
        }
      }
    }
  } catch {
    /* best-effort */
  }

  return results;
};
