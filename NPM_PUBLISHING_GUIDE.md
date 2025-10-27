# npm Publishing Guide for Docle Packages

## ✅ Packages Ready to Publish

All four packages are prepared and ready:
- `@doclehq/sdk` - v0.1.1
- `@doclehq/react` - v0.1.1
- `@doclehq/vue` - v0.1.1
- `@doclehq/rate-limit` - v0.1.0

## Prerequisites

### 1. Create an npm Account

If you don't have one: https://www.npmjs.com/signup

### 2. Login to npm

```bash
npm login
```

You'll be prompted for:
- Username
- Password
- Email
- One-time password (if 2FA is enabled)

### 3. Verify Login

```bash
npm whoami
```

Should display your npm username.

### 4. Create npm Organization (if needed)

Your packages use the `@doclehq` scope, so you need to either:

**Option A: Create the organization on npm**
1. Go to https://www.npmjs.com/org/create
2. Create organization named `doclehq`
3. Choose "Unlimited public packages" (free)

**Option B: Change package names to remove scope**

If you don't want an organization, you can publish without the `@doclehq/` prefix:
- `@doclehq/sdk` → `docle-sdk`
- `@doclehq/react` → `docle-react`
- `@doclehq/vue` → `docle-vue`
- `@doclehq/rate-limit` → `docle-rate-limit`

## Publishing Methods

### Method 1: Automated (Recommended)

Use the provided script to publish all packages at once:

```bash
./publish-packages.sh
```

This will:
1. ✅ Check npm login status
2. ✅ Build each package
3. ✅ Publish in correct order (SDK first)
4. ✅ Set packages as public

### Method 2: Manual Publishing

Publish each package individually:

```bash
# 1. SDK (publish first - others depend on it)
cd sdk
npm run build
npm publish --access public
cd ..

# 2. Rate Limit
cd packages/rate-limit
npm run build
npm publish --access public
cd ../..

# 3. React
cd packages/react
npm run build
npm publish --access public
cd ../..

# 4. Vue
cd packages/vue
npm run build
npm publish --access public
cd ../..
```

**Note:** `--access public` is required for scoped packages (`@doclehq/*`)

## After Publishing

### Verify Packages

Check that your packages are live:

```bash
npm view @doclehq/sdk
npm view @doclehq/react
npm view @doclehq/vue
npm view @doclehq/rate-limit
```

### Test Installation

Try installing in a test project:

```bash
mkdir test-install
cd test-install
npm init -y
npm install @doclehq/sdk
npm install @doclehq/react
npm install @doclehq/vue
npm install @doclehq/rate-limit
```

### View on npm Website

Your packages will be available at:
- https://www.npmjs.com/package/@doclehq/sdk
- https://www.npmjs.com/package/@doclehq/react
- https://www.npmjs.com/package/@doclehq/vue
- https://www.npmjs.com/package/@doclehq/rate-limit

## Publishing Updates

### Updating Version Numbers

Before publishing updates, bump the version:

```bash
cd sdk
npm version patch  # 0.1.1 → 0.1.2
# or
npm version minor  # 0.1.1 → 0.2.0
# or
npm version major  # 0.1.1 → 1.0.0
```

### Publishing New Versions

```bash
npm run build
npm publish
```

Or use the automated script again:
```bash
./publish-packages.sh
```

## Common Issues

### Issue: "You do not have permission to publish"

**Solution:** Add `--access public` flag:
```bash
npm publish --access public
```

### Issue: "Package name too similar to existing package"

**Solution:** npm might flag similar names. Choose different names or contact npm support.

### Issue: "Version already published"

**Solution:** Bump the version number:
```bash
npm version patch
npm publish
```

### Issue: "E402: You must sign up for private packages"

**Solution:** Use `--access public`:
```bash
npm publish --access public
```

### Issue: "ENEEDAUTH: need auth"

**Solution:** Login again:
```bash
npm logout
npm login
```

## Best Practices

1. **Always test locally first** - Install packages in a test project before announcing
2. **Use semantic versioning** - Follow semver (major.minor.patch)
3. **Update changelogs** - Document what changed in each version
4. **Tag git commits** - Create git tags for each release
5. **Announce updates** - Let users know about new versions

## Unpublishing (Emergency Only)

If you need to unpublish a package within 72 hours:

```bash
npm unpublish @doclehq/sdk@0.1.1
```

**⚠️ Warning:** Unpublishing is permanent and can break projects that depend on that version. Only do this for critical security issues or accidental publishes.

## CI/CD Publishing (Future)

For automated publishing on git tags, you can use GitHub Actions:

```yaml
# .github/workflows/publish.yml
name: Publish to npm

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      - run: ./publish-packages.sh
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Need Help?

- npm documentation: https://docs.npmjs.com/
- npm support: https://www.npmjs.com/support
- GitHub issues: https://github.com/kagehq/docle/issues

---

**Ready to publish?** Run `./publish-packages.sh` and your packages will be live on npm! 🚀

