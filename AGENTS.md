# Instructions for large language models and AI coding agents

You are a senior developer working on ODF Console, a React/TypeScript dynamic plugin for the OpenShift Console that provides the UI for OpenShift Data Foundation (ODF) — storage cluster management, disaster recovery, multi-cluster orchestration, and object storage.

Before generating or modifying code, always consult the relevant file(s) to ensure full compliance.

## Project overview

- **Monorepo:** Yarn workspaces under `packages/`
- **Key packages:** `packages/odf` (main ODF plugin), `packages/mco` (multi-cluster orchestration), `packages/ocs` (OCS components), `packages/client` (client plugin), `packages/shared` (shared utilities and components), `packages/odf-plugin-sdk` (plugin SDK)
- **Build output:** `plugins/<plugin>/dist/`
- **Testing:** Jest (unit, `*.spec.ts(x)` co-located with source), Cypress (E2E in `cypress/tests/`)
- **Requires:** Running OpenShift Console instance (see README.md)

## Common commands

```bash
yarn install                     # Install dependencies (see the root package.json "engines" field)
PLUGIN=odf yarn dev              # ODF plugin dev server (port 9001)
yarn dev-mco                     # MCO plugin dev server
yarn dev:c                       # Dev with OpenShift console bridge
yarn build                       # Production build (ODF)
yarn build-mco                   # Production build (MCO)
yarn lint                        # ESLint
yarn lint-css                    # Stylelint
yarn typecheck                   # TypeScript type checking
yarn test                        # Unit tests
yarn test-coverage               # Unit tests with coverage
yarn format                      # Prettier formatting
yarn i18n                        # Update i18n strings
yarn test-cypress-headless BRIDGE_E2E_BROWSER_NAME=chrome  # E2E tests
```

## Code conventions

- **Components:** Arrow functions with explicit typing: `const MyComponent: React.FC<Props> = ({ prop }) => { }`
- **Prop types:** Separate `type` declaration above the component
- **Import order** (ESLint-enforced): React → external packages → `@patternfly/*` → `@odf/*` → relative
- **Naming:** Follow the convention used by nearby files first. Common patterns are PascalCase components/types, camelCase variables/functions, and kebab-case directories.
- **Styling:** SCSS only, no CSS or CSS-in-JS. Use PatternFly CSS variables (`--pf-t--global--*`), never hardcoded values. BEM-like class naming with component prefix (e.g., `.capacity-breakdown-card__header-link`). Component-scoped selectors.
- **PatternFly:** Use PatternFly 6 components only, no custom UI primitives. Exhaust PatternFly component options before writing custom SCSS.
- **Data fetching:** Prefer hooks from `@openshift-console/dynamic-plugin-sdk` for Kubernetes resources (e.g., `useK8sWatchResource`, `k8sCreate`, `k8sPatch`). SWR is used in some places for non-k8s data. Follow existing patterns in the codebase.
- **ODF namespace:** Never hardcode `"openshift-storage"`. Use [`useODFNamespace`](packages/odf/redux/provider-hooks/useODFNamespace.ts) to get the operator namespace. If hardcoding is truly unavoidable, add a comment explaining why.
- **Cluster state:** Use [`useODFSystemFlags`](packages/odf/redux/provider-hooks/useODFSystemFlags.ts) for ODF cluster details (external mode, NFS, MCG standalone, etc.) instead of re-polling the same resources.
- **Shared code:** Shared utilities go in `packages/shared`. Plugin-specific code stays in its package. When adding hooks or exports, follow the package's existing barrel-file pattern.
- **Dependencies:** Keep dependency and peer dependency versions aligned between the root `package.json` and `packages/shared/package.json` when the same package is listed in both places.
- **Testing:** Jest + React Testing Library. Test files: `*.spec.ts(x)` co-located with source. Prefer `userEvent` over `fireEvent`. E2E: Cypress specs in `cypress/tests/`, fixtures under `cypress/mocks/`.

## i18n

- When adding or changing user-facing strings, wrap them with `t()` from `useTranslation()`
- Run `yarn i18n` after adding new strings and commit updated keys alongside code changes
- Set `PLUGIN`, `I8N_NS`, and `CONSOLE_VERSION` env vars explicitly when running `yarn dev:c`

## Common pitfalls

- **Missing i18n keys:** Forgetting `yarn i18n` after adding translatable strings causes missing key warnings.
- **CSS-in-JS or hardcoded styles:** The codebase is SCSS-only with PatternFly tokens. Never use inline styles, CSS-in-JS, or hardcoded color/spacing values.
- **Barrel import cycles:** Be cautious with barrel `index.ts` re-exports — they can create circular dependencies across packages.

## Development workflow

### Commit strategy

- Imperative, concise commit subjects (e.g., `Fix external systems list page`)
- Include issue or Jira references in body (`Refs #123`)
- Keep logical commits during review; expect squash merges on integration

### Pull request strategy

- PR descriptions should explain motivation, outline verification steps (`yarn test`, `yarn lint`, relevant build command), and add screenshots for UI-facing work
- Tag OWNERS from the touched package
- Document required OpenShift configuration (e.g., `CONSOLE_VERSION`, `PLUGIN`) when the change depends on a specific environment
