import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

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
  // Berry has .yarnrc.yml; Classic (yarn 1) does not.
  const berry = fs.existsSync(
    path.join(opts.cwd || process.cwd(), '.yarnrc.yml')
  );
  const flags = ['--json'];
  // Classic's --level filters printed advisories but exit code still counts
  // all severities, so an audit with only lower-severity CVEs would exit
  // non-zero with zero matching lines → false "no parseable output" error.
  // Fetch everything from Classic and filter after parsing.
  if (opts.severity && berry) {
    flags.push(`--severity ${opts.severity}`);
  }
  if (berry && opts.recursive) flags.push('--recursive');
  if (berry && opts.all) flags.push('--all');

  const cmd = `${berry ? 'yarn npm audit' : 'yarn audit'} ${flags.join(' ')}`;

  let raw = '';
  let stderr = '';
  let auditFailed = false;
  try {
    raw = childProcess.execSync(cmd, {
      encoding: 'utf-8',
      cwd: opts.cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (e) {
    const err = e as {
      stdout?: string;
      stderr?: string;
      code?: string;
      message?: string;
    };
    // Partial stdout on overflow would look like a successful short audit and
    // can cause prune mode to drop still-needed resolutions.
    if (
      err.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER' ||
      err.message?.includes('maxBuffer length exceeded')
    ) {
      throw new Error(
        `${cmd} output exceeded maxBuffer; refusing partial results.`
      );
    }
    auditFailed = true;
    raw = err.stdout || '';
    stderr = err.stderr || '';
  }

  const entries = raw
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        const parsed = JSON.parse(line);
        // Yarn Classic emits { type, data: { advisory } }; normalize to Berry shape.
        if (!berry && parsed.type === 'auditAdvisory') {
          const a = parsed.data.advisory;
          return {
            value: a.module_name,
            children: {
              ID: a.id,
              Issue: a.title,
              URL: a.url,
              Severity: a.severity,
              'Vulnerable Versions': a.vulnerable_versions,
              'Tree Versions': (a.findings || [])
                .map((f: { version?: string }) => f.version)
                .filter(Boolean),
            },
          } as AuditEntry;
        }
        if (!berry && parsed.type) return null;
        return parsed as AuditEntry;
      } catch {
        return null;
      }
    })
    .filter((f): f is AuditEntry => f !== null);

  if (auditFailed && entries.length === 0) {
    const detail = stderr.trim();
    throw new Error(
      `${cmd} failed and produced no parseable output.${detail ? `\n${detail}` : ''}`
    );
  }

  // Classic: severity filter was deferred to avoid the --level exit-code mismatch.
  if (!berry && opts.severity) {
    const sevOrder = ['info', 'low', 'moderate', 'high', 'critical'];
    const minIdx = sevOrder.indexOf(opts.severity);
    if (minIdx > 0) {
      return entries.filter((e) => {
        const s = e.children?.Severity?.toLowerCase() ?? '';
        return sevOrder.indexOf(s) >= minIdx;
      });
    }
  }

  return entries;
};

export const isDeprecation = (entry: AuditEntry): boolean =>
  typeof entry.children?.ID === 'string';
