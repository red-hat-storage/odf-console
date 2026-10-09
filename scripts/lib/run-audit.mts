import * as childProcess from 'child_process';

export interface AuditEntry {
  value: string;
  children?: {
    ID?: string | number;
    Issue?: string;
    URL?: string;
    Severity?: string;
    'Vulnerable Versions'?: string;
    'Tree Versions'?: string[];
  };
}

export const runAudit = (opts: {
  severity?: string | null;
  cwd?: string;
  recursive?: boolean;
  all?: boolean;
}): AuditEntry[] => {
  const flags = ['--json'];
  if (opts.severity) flags.push(`--severity ${opts.severity}`);
  if (opts.recursive) flags.push('--recursive');
  if (opts.all) flags.push('--all');

  let raw = '';
  let auditFailed = false;
  try {
    raw = childProcess.execSync(`yarn npm audit ${flags.join(' ')}`, {
      encoding: 'utf-8',
      cwd: opts.cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (e) {
    auditFailed = true;
    raw = (e as { stdout?: string }).stdout || '';
  }

  const entries = raw
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as AuditEntry;
      } catch {
        return null;
      }
    })
    .filter((f): f is AuditEntry => f !== null);

  if (auditFailed && entries.length === 0) {
    throw new Error('yarn npm audit failed and produced no parseable output.');
  }

  return entries;
};

export const isDeprecation = (entry: AuditEntry): boolean =>
  typeof entry.children?.ID === 'string';
