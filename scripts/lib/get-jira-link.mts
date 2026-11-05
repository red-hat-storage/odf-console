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

const findJiraIssues = async (cveId: string): Promise<JiraIssue[]> => {
  const headers = jiraHeaders();
  if (!headers) return [];
  const jql = encodeURIComponent(`project = DFBUGS AND summary ~ "${cveId}"`);
  const url = `${JIRA_BASE}/rest/api/2/search?jql=${jql}&fields=summary,key`;
  const data = await fetchJSON(url, headers);
  return data.issues.map((i: any) => ({
    key: i.key,
    summary: i.fields.summary,
    url: `${JIRA_BASE}/browse/${i.key}`,
  }));
};

export const lookup = async (id: string): Promise<LookupResult> => {
  const result: LookupResult = { input: id, ghsa: null, cve: null, jira: [] };

  if (/^GHSA-/i.test(id)) {
    result.ghsa = id;
    const adv = await fetchJSON(`${GH_API}/${id}`, ghHeaders());
    result.cve = adv.cve_id || null;
  } else if (/^CVE-/i.test(id)) {
    result.cve = id;
    const data = await fetchJSON(`${GH_API}?cve_id=${id}`, ghHeaders());
    result.ghsa = data[0]?.ghsa_id || null;
  } else {
    throw new Error(`Unrecognized ID format: ${id}. Expected GHSA-* or CVE-*`);
  }

  if (result.cve) {
    result.jira = await findJiraIssues(result.cve);
  }

  return result;
};
