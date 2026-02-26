# Yarn Berry Migration Plan for ODF Console

## Overview
This document outlines the migration plan from Yarn Classic (v1) to Yarn Berry (v4) for the odf-console project, following the approach used in the OpenShift console PR #15986.

## Migration Goals
- Migrate from Yarn Classic to Yarn Berry v4
- Maintain compatibility with existing workflows
- Ensure all build, test, and development scripts work correctly
- Update CI/CD pipelines to support Yarn Berry
- Follow the same approach as OpenShift console for consistency

## Current State Analysis

### Current Setup
- **Yarn Version**: Classic (v1) - indicated by `yarn.lock` format
- **Node Version**: 22.17 (from `.nvmrc`)
- **Package Manager**: Yarn Classic with workspaces
- **Workspaces**: 
  - `packages/shared`
  - `packages/odf`
  - `packages/mco`
  - `packages/client`
- **Build System**: Webpack with TypeScript
- **CI/CD**: GitHub Actions + OpenShift CI

### Key Files to Modify
1. `.yarnrc.yml` (create new)
2. `.gitignore` (update)
3. `.dockerignore` (update)
4. `Dockerfile.ci` (update)
5. `Dockerfile.ci.runner` (update)
6. `package.json` (update scripts)
7. `.github/workflows/*.yml` (update)
8. `README.md` (update documentation)
9. `yarn.lock` (regenerate)

## Detailed Migration Steps

### 1. Yarn Berry Configuration

#### Create `.yarnrc.yml`
Based on OpenShift console PR, create a new `.yarnrc.yml` file with:
```yaml
# Yarn v4 (Berry) configuration
nodeLinker: node-modules

# Enable Corepack for package manager version management
enableGlobalCache: false

# Compression settings
compressionLevel: mixed

# Network settings
httpTimeout: 300000
networkTimeout: 300000

# Plugin configuration
plugins:
  - path: .yarn/plugins/@yarnpkg/plugin-workspace-tools.cjs
    spec: "@yarnpkg/plugin-workspace-tools"
```

**Rationale**: 
- `nodeLinker: node-modules` maintains compatibility with existing tools
- No zero-installs (cache not committed to git)
- Extended timeouts for large dependencies
- Workspace tools plugin for monorepo management

### 2. Update `.gitignore`

Add Yarn Berry specific entries:
```gitignore
# Yarn v4 (Berry)
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/sdks
!.yarn/versions
.pnp.*
```

**Rationale**: Following OpenShift console approach - exclude cache but keep configuration

### 3. Update `.dockerignore`

Add Yarn Berry specific entries:
```dockerignore
.yarn/cache
.yarn/install-state.gz
```

**Rationale**: Reduce Docker image size by excluding Yarn cache

### 4. Update `Dockerfile.ci`

Replace Yarn installation with Corepack:
```dockerfile
FROM docker.io/library/node:22.17 AS builder

ARG PLUGIN=odf
ARG OPENSHIFT_CI=true
ARG COREPACK_VERSION=0.34.6

ENV OPENSHIFT_CI=${OPENSHIFT_CI}

WORKDIR /app

# Enable Corepack and install Yarn v4
RUN corepack enable && \
    corepack prepare yarn@4.12.0 --activate

COPY . /app

# Install dependencies with Yarn Berry
RUN yarn install --immutable --network-timeout 300000

# Build the plugin
RUN BUILD_SCRIPT=build; \
    if [ "$PLUGIN" = "client" ]; then \
      BUILD_SCRIPT="${BUILD_SCRIPT}-client"; \
    elif [ "$PLUGIN" = "mco" ]; then \
      BUILD_SCRIPT="${BUILD_SCRIPT}-mco"; \
    fi && \
    NODE_OPTIONS="--max-old-space-size=1024" yarn "${BUILD_SCRIPT}" && \
    mv /app/plugins/${PLUGIN}/dist /dist

FROM docker.io/library/node:22.17

RUN corepack enable && \
    corepack prepare yarn@4.12.0 --activate

COPY --from=builder /dist /app
COPY --from=builder /dist /app/compatibility
COPY --from=builder /app/http-server.sh .
ENTRYPOINT [ "./http-server.sh", "./app", "-S", "true", "-C", "/var/serving-cert/tls.crt", "-K", "/var/serving-cert/tls.key" ]
```

**Key Changes**:
- Use `corepack` instead of `yarn global add`
- Replace `--frozen-lockfile` with `--immutable`
- Specify Yarn version (4.12.0)
- Remove `--prod` flag (Yarn Berry handles this differently)

### 5. Update `Dockerfile.ci.runner`

Need to check current content and update similarly to use Corepack.

### 6. Update `package.json`

#### Scripts Changes
Replace Yarn Classic specific flags:
- `--frozen-lockfile` → `--immutable`
- `--prod` → handled by Yarn Berry automatically

**Before**:
```json
"scripts": {
  "prepare": "husky"
}
```

**After**:
```json
"scripts": {
  "prepare": "husky",
  "postinstall": "husky install"
}
```

#### Remove `resolutions` field
Yarn Berry uses different resolution mechanism. Convert to `resolutions` or handle via `.yarnrc.yml`:

```yaml
# In .yarnrc.yml
packageExtensions:
  "@remix-run/router@*":
    dependencies:
      "@remix-run/router": "1.23.2"
```

**Note**: May need to test if resolutions still work or need conversion.

### 7. Update GitHub Actions Workflows

#### `.github/workflows/frontend-build.yml`
```yaml
- uses: actions/setup-node@v3
  with:
    node-version: ${{ matrix.node-version }}
    cache: 'yarn'
- run: corepack enable
- run: yarn install --immutable
- run: yarn build
# ... rest of the steps
```

**Key Changes**:
- Add `corepack enable` before yarn commands
- Replace `--frozen-lockfile` with `--immutable`
- Remove `--prod` flag

#### `.github/workflows/ci-runner-image.yml`
Update Docker build to use new Dockerfile with Corepack.

### 8. Update CI Configuration

#### `.ci-operator.yaml`
Ensure the CI runner image is updated to support Yarn Berry.

### 9. Update Documentation

#### `README.md`
Update installation and development instructions:

**Before**:
```bash
yarn install
```

**After**:
```bash
# Enable Corepack (one-time setup)
corepack enable

# Install dependencies
yarn install
```

Add a new section:
```markdown
## Package Manager

This project uses Yarn Berry (v4) as the package manager. Yarn is managed via Corepack, which is included with Node.js 16.10+.

### First-time Setup
```bash
corepack enable
```

### Installing Dependencies
```bash
yarn install
```

### Updating Yarn Version
The Yarn version is specified in `package.json` under the `packageManager` field. To update:
```bash
corepack prepare yarn@4.x.x --activate
```
```

### 10. Package Manager Field

Add to `package.json`:
```json
{
  "packageManager": "yarn@4.12.0"
}
```

This tells Corepack which version to use.

## Migration Execution Plan

### Phase 1: Preparation (No Code Changes)
1. ✅ Review OpenShift console PR #15986
2. ✅ Analyze current odf-console structure
3. ✅ Create migration plan document
4. ⏳ Review and approve plan with team

### Phase 2: Configuration Files
1. Create `.yarnrc.yml`
2. Update `.gitignore`
3. Update `.dockerignore`
4. Add `packageManager` field to `package.json`

### Phase 3: Docker and CI Updates
1. Update `Dockerfile.ci`
2. Update `Dockerfile.ci.runner`
3. Update `.github/workflows/frontend-build.yml`
4. Update `.github/workflows/ci-runner-image.yml`

### Phase 4: Package.json Updates
1. Update scripts (remove `--frozen-lockfile`, add `--immutable`)
2. Handle `resolutions` field (test or convert)
3. Update any Yarn-specific commands

### Phase 5: Lock File Migration
1. Delete old `yarn.lock`
2. Run `yarn install` to generate new lock file
3. Commit new `yarn.lock`

### Phase 6: Documentation
1. Update `README.md`
2. Add migration notes
3. Update any developer documentation

### Phase 7: Testing
1. Test local development workflow
2. Test all build scripts (`yarn build`, `yarn build-mco`, `yarn build-client`)
3. Test all development scripts (`yarn dev`, `yarn dev-mco`, `yarn dev-client`)
4. Test unit tests (`yarn test`)
5. Test linting (`yarn lint`)
6. Test formatting (`yarn format-test`)
7. Test i18n (`yarn i18n-test`)
8. Test Docker builds
9. Test CI/CD pipelines

### Phase 8: Validation
1. Verify all GitHub Actions pass
2. Verify Docker images build correctly
3. Verify OpenShift CI builds pass
4. Verify no breaking changes in development workflow

## Risk Assessment

### High Risk Areas
1. **Lock file changes**: New lock file format may cause dependency resolution differences
2. **CI/CD pipelines**: Must ensure all pipelines work with Yarn Berry
3. **Docker builds**: Corepack must be properly configured
4. **Workspace dependencies**: Ensure workspace protocol works correctly

### Mitigation Strategies
1. **Thorough testing**: Test all scripts and workflows before merging
2. **Incremental rollout**: Test in development branch first
3. **Rollback plan**: Keep old configuration in separate branch
4. **Documentation**: Clear migration guide for developers

## Compatibility Considerations

### Node.js Version
- Current: 22.17
- Required: 16.10+ (for Corepack)
- ✅ Compatible

### Yarn Berry Features Used
- `nodeLinker: node-modules` - Maximum compatibility
- No PnP (Plug'n'Play) - Avoids compatibility issues
- No zero-installs - Simpler git workflow

### Breaking Changes
- Lock file format change (expected)
- Some scripts may need adjustment
- CI/CD pipelines require updates

## Success Criteria

### Must Have
- ✅ All builds pass (odf, mco, client)
- ✅ All tests pass
- ✅ All linting passes
- ✅ Development workflow works
- ✅ CI/CD pipelines pass
- ✅ Docker images build successfully

### Nice to Have
- Improved install performance
- Better workspace management
- Clearer dependency resolution

## Timeline Estimate

- **Phase 1**: 1 day (completed)
- **Phase 2-3**: 1 day (configuration and Docker updates)
- **Phase 4-5**: 1 day (package.json and lock file)
- **Phase 6**: 0.5 days (documentation)
- **Phase 7-8**: 2 days (testing and validation)

**Total**: ~5.5 days

## References

- OpenShift Console PR: https://github.com/openshift/console/pull/15986
- Yarn Berry Documentation: https://yarnpkg.com/
- Corepack Documentation: https://nodejs.org/api/corepack.html
- Migration Guide: https://yarnpkg.com/getting-started/migration

## Questions to Resolve

1. **Yarn Version**: Use 4.12.0 (same as OpenShift) or latest 4.x?
   - **Recommendation**: Use 4.12.0 for consistency with OpenShift console

2. **Resolutions Field**: Keep or convert to packageExtensions?
   - **Recommendation**: Test if resolutions still work in Yarn Berry, if not convert

3. **Zero-Installs**: Enable or disable?
   - **Recommendation**: Disable (follow OpenShift approach)

4. **Node Version**: Keep 22.17 or update?
   - **Recommendation**: Keep 22.17 (already compatible)

5. **Corepack Version**: Specify or use default?
   - **Recommendation**: Use default from Node.js 22.17

## Next Steps

1. Review this plan with the team
2. Get approval for the migration approach
3. Create a feature branch for migration
4. Execute phases 2-8
5. Create PR for review
6. Merge after successful testing

---

**Document Version**: 1.0  
**Created**: 2026-02-25  
**Author**: Bob (AI Planning Assistant)  
**Status**: Draft - Awaiting Review
