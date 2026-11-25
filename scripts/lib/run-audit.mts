import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface AuditInstance {
  version: string;
  /** Immediate parent package names (for nested resolutions like eslint/ajv). */
  parents: string[];
}

export interface AuditEntry {
  value: string;
  children?: {
    ID?: string | number;
    Issue?: string;
    URL?: string;
    Severity?: string;
    'Vulnerable Versions'?: string;
    'Tree Versions'?: string[];
    Instances?: AuditInstance[];
  };
}

/** `eslint>ajv` / `@scope/pkg>dep>ajv` → immediate parent name. */
const parentFromClassicPath = (depPath: string): string | null => {
  const segs = depPath.split('>').filter(Boolean);
  if (segs.length < 2) return null;
  return segs[segs.length - 2] || null;
};

/** `eslint@npm:8.57.0` / `@scope/pkg@workspace:.` → package name. */
export const nameFromLocator = (locator: string): string | null => {
  const m = locator.match(/^(.*?)@(?:npm|workspace|patch):/);
  return m?.[1] || null;
};

const unique = (items: string[]): string[] => [
  ...new Set(items.filter(Boolean)),
];

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
          const instances: AuditInstance[] = (a.findings || [])
            .filter((f: { version?: string }) => f.version)
            .map((f: { version: string; paths?: string[] }): AuditInstance => ({
              version: f.version,
              parents: unique(
                (f.paths || [])
                  .map(parentFromClassicPath)
                  .filter((p): p is string => Boolean(p))
              ),
            }));
          return {
            value: a.module_name,
            children: {
              ID: a.id,
              Issue: a.title,
              URL: a.url,
              Severity: a.severity,
              'Vulnerable Versions': a.vulnerable_versions,
              'Tree Versions': unique(instances.map((i) => i.version)),
              Instances: instances,
            },
          } as AuditEntry;
        }
        if (!berry && parsed.type) return null;

        // Berry: Dependents correlate to Tree Versions only when there is a
        // single vulnerable version; otherwise leave parents empty so the
        // sweep won't invent wrong nested pins.
        const treeVersions: string[] = parsed.children?.['Tree Versions'] || [];
        const dependents = unique(
          (parsed.children?.Dependents || [])
            .map(nameFromLocator)
            .filter((p: string | null): p is string => Boolean(p))
        ).filter((p: string) => p !== parsed.value);
        const instances: AuditInstance[] =
          treeVersions.length === 1
            ? [{ version: treeVersions[0], parents: dependents }]
            : treeVersions.map((version) => ({ version, parents: [] }));

        return {
          value: parsed.value,
          children: {
            ...parsed.children,
            'Tree Versions': treeVersions,
            Instances: instances,
          },
        } as AuditEntry;
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
