import { execSync } from 'child_process';
import { lookup, type LookupResult } from './lib/get-jira-link.mts';

const GHSA_RE = /GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}/gi;
const JIRA_SECTION_HEADER = '### Jira Links';

const prNumber = process.argv[2];
if (!prNumber) {
  console.error('Usage: jira-link-pr.mts <pr-number>');
  process.exit(1);
}

if (!process.env.JIRA_TOKEN) {
  console.error(
    'JIRA_TOKEN is not set. Set it to a Base64-encoded email:api_token value.'
  );
  process.exit(1);
}

const body = execSync(`gh pr view ${prNumber} --json body --jq .body`, {
  encoding: 'utf-8',
}).trim();

// Only look at the "Fixed" section — stop at the next heading or end
const fixedMatch = body.match(/^### Fixed[\s\S]*?(?=\n###?\s|$)/m);
if (!fixedMatch) {
  console.log('No "### Fixed" section found in PR body.');
  process.exit(0);
}

const ghsaIds = [...new Set(fixedMatch[0].match(GHSA_RE) || [])];
if (ghsaIds.length === 0) {
  console.log('No GHSA IDs found in Fixed section.');
  process.exit(0);
}

console.log(`Found ${ghsaIds.length} GHSA ID(s): ${ghsaIds.join(', ')}`);

const results: LookupResult[] = [];
for (const id of ghsaIds) {
  try {
    // eslint-disable-next-line no-await-in-loop
    const r = await lookup(id);
    if (r.jira.length > 0) results.push(r);
  } catch (e) {
    console.warn(
      `Failed to look up ${id}: ${e instanceof Error ? e.message : e}`
    );
  }
}

if (results.length === 0) {
  console.log('No matching Jira issues found.');
  process.exit(0);
}

const lines = [`\n${JIRA_SECTION_HEADER}\n`];
for (const r of results) {
  const id = r.ghsa || r.cve || r.input;
  for (const j of r.jira) {
    lines.push(`- **${id}** → [${j.key}](${j.url}): ${j.summary}`);
  }
}
const section = lines.join('\n');

// Replace existing Jira section or append
const sectionRe = new RegExp(
  `\\n?^${JIRA_SECTION_HEADER}\\n[\\s\\S]*?(?=\\n###?\\s|$)`,
  'm'
);
const updated = sectionRe.test(body)
  ? body.replace(sectionRe, () => section)
  : `${body}\n${section}`;

execSync(`gh pr edit ${prNumber} --body -`, {
  input: updated,
  encoding: 'utf-8',
  stdio: ['pipe', 'inherit', 'inherit'],
});

console.log(`Updated PR #${prNumber} with ${results.length} Jira link(s).`);
