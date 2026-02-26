# Yarn Berry Migration Checklist

## Quick Reference Guide

This checklist provides the exact changes needed for each file during the Yarn Classic to Yarn Berry migration.

---

## 📋 Files to Create

### 1. `.yarnrc.yml` (NEW FILE)
```yaml
nodeLinker: node-modules
enableGlobalCache: false
compressionLevel: mixed
httpTimeout: 300000
networkTimeout: 300000
```

---

## 📝 Files to Modify

### 2. `.gitignore` - ADD these lines
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

### 3. `.dockerignore` - ADD these lines
```dockerignore
.yarn/cache
.yarn/install-state.gz
```

### 4. `package.json` - ADD packageManager field
```json
"packageManager": "yarn@4.12.0"
```

### 5. `Dockerfile.ci` - Replace yarn installation with Corepack
- Add: `RUN corepack enable && corepack prepare yarn@4.12.0 --activate`
- Replace: `yarn install --prod --frozen-lockfile` with `yarn install --immutable`

### 6. `.github/workflows/frontend-build.yml` - Add Corepack
- Add step: `- run: corepack enable`
- Replace: `--frozen-lockfile` with `--immutable`

### 7. `README.md` - Update installation instructions
- Add Corepack setup instructions
- Update yarn install commands

---

## 🗑️ Files to Delete

### 8. `yarn.lock` (OLD)
- Delete the old Yarn Classic lock file
- New one will be generated with `yarn install`

---

## ✅ Verification Steps

1. Run `corepack enable`
2. Run `yarn install`
3. Run `yarn build`
4. Run `yarn test`
5. Run `yarn lint`
6. Test Docker builds
7. Verify CI/CD passes

---

**See YARN_BERRY_MIGRATION_PLAN.md for detailed explanations**
