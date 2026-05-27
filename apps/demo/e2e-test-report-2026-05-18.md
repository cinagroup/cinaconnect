# E2E Test Report — 2026-05-18

## Summary
- **Project:** Cinacoin Demo (`apps/demo/`)
- **Tests:** 51 E2E tests across 4 spec files
- **Installation:** Playwright Chromium binary ✅ installed
- **Execution:** ❌ ALL 51 FAILED (system library dependency)

## What Was Done
1. **Playwright Chromium installed** — `npx playwright install chromium` succeeded (binary downloaded to `/home/cina/.cache/ms-playwright/chromium-1223`)
2. **`--with-deps` failed** — `npx playwright install chromium --with-deps` failed because it requires `sudo` to install system packages, and no password is available
3. **E2E tests executed** — `CI=true pnpm -F cinacoin-demo test:e2e` ran all 51 tests

## Root Cause of Failure
Chromium fails to launch due to **missing system libraries**:
```
error while loading shared libraries: libatk-1.0.so.0: cannot open shared object file: No such file or directory
```

The following system packages are missing (none found via `ldconfig`):
- `libatk1.0-0` / `libatk-bridge2.0-0`
- `libcups2`
- `libpango-1.0-0`
- `libcairo2`
- `libgbm1`
- `libasound2`
- `libxcomposite1`
- `libxdamage1`
- `libxrandr2`
- `libnspr4`

`sudo` requires a password in this environment, so these cannot be installed automatically.

## Test Breakdown
| Spec File | Tests | Result |
|---|---|---|
| `wallet-connection.spec.ts` | 10 | ❌ All failed |
| `batch-page.spec.ts` | 15 | ❌ All failed |
| `multichain-page.spec.ts` | 14 | ❌ All failed |
| `swap-page.spec.ts` | 12 | ❌ All failed |

**Total: 51 tests, 0 passed, 51 failed** (all with retries ×3)

## Resolution Required
A system administrator (or the user `cina` with sudo privileges) needs to run:
```bash
sudo apt-get install -y \
  libatk1.0-0 libatk-bridge2.0-0 libcups2 libxkbcommon0 \
  libxcomposite1 libxdamage1 libxrandr2 libgbm1 \
  libpango-1.0-0 libcairo2 libasound2 libnspr4 libnss3
```

Then re-run:
```bash
cd /home/cina/.openclaw/workspace/onux/apps/demo
pnpm -F cinacoin-demo test:e2e
```

## Other Notes
- Next.js dev server started correctly (duplicate page warnings for `.js`/`.tsx` coexistence — not critical)
- No screenshots were generated (screenshot config is `only-on-failure` but Chromium never reached page rendering)
- Test artifacts (traces) saved in `apps/demo/test-results/` and `apps/demo/tests/playwright-report/`
