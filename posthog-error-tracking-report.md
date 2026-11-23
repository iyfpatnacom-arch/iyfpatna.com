# PostHog error tracking setup

> ⚠️ **Needs your attention**
> - In GitHub repository **Settings → Secrets and variables → Actions**, create the secret `POSTHOG_API_KEY`.
> - In the same GitHub Actions settings, create repository variables `POSTHOG_PROJECT_ID`, `POSTHOG_HOST`, `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`, and `NEXT_PUBLIC_POSTHOG_HOST` with this project’s configured values.
> - On the VPS, verify `/home/iyfpatna/htdocs/iyfpatna.in/.env.production` defines `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST`.
> - Fix the existing Clerk package-resolution errors, then rerun the production deploy; the standard local build is also blocked on this Windows checkout by its invalid native Next.js SWC binary.

## What error tracking does now

Uncaught browser and server errors now reach PostHog:

- `instrumentation-client.js` enables browser exception capture.
- `app/global-error.js` reports errors handled by Next.js’s global React error boundary.
- `instrumentation.js` initializes the shared Node client and exports Next.js request-error capture for Server Components, Route Handlers, and Server Actions.
- `lib/posthog-server.js` enables Node exception autocapture for uncaught exceptions and unhandled rejections.
- `proxy.js` captures proxy/middleware errors that Next.js request-error handling cannot see.
- `lib/sarathi/observability.js` reuses the shared Node client so AI observability and exception tracking do not create competing clients.

The run installed and initialized the required server-side PostHog integration (`@posthog/next`) while preserving the existing browser integration. Capture remains guarded when PostHog configuration is absent.

## Source maps

Source-map upload is wired through `@posthog/nextjs-config` in these files:

- `next.config.mjs`
- `package.json`
- `package-lock.json`
- `.github/workflows/deploy.yml`
- `.env.example`

The exact production build command is:

```bash
npm run build
```

Every credentialed production build now uploads matching source maps and removes map files after upload. The GitHub Actions production build receives `POSTHOG_API_KEY` from a repository secret and `POSTHOG_PROJECT_ID` and `POSTHOG_HOST` from repository variables. If the upload variables are absent, the configured credential gate skips upload without breaking the build.

## Verification result

Final verification ran:

```bash
npm run build
```

That command did not pass on this Windows checkout because the installed native Next.js SWC binary is not a valid Win32 application and Turbopack cannot use its WASM fallback.

Verification also ran the documented webpack fallback:

```bash
npm run build -- --webpack
```

The PostHog integration resolved release `iyfpatna.com@92e07f8b22cfcb368af71b82deaedeaf66864e3e`. The first credentialed run uploaded **172 of 172** source-map chunks. Final verification found all 172 already present, then the build stopped on unrelated, pre-existing Clerk package-export/module-resolution errors involving `@clerk/shared/utils`, `@clerk/shared/underscore`, `@clerk/shared/loadClerkJsScript`, and `@clerk/shared/proxy`.

The source-map uploader is therefore verified and the first symbol set is already in PostHog, but a fully successful production build still needs to be run after the unrelated Clerk issue is corrected.

## What you still need to do

1. In GitHub, open the repository’s **Settings → Secrets and variables → Actions → Secrets** and create `POSTHOG_API_KEY` using the personal API key already configured locally. Do not commit that value.
2. Under **Settings → Secrets and variables → Actions → Variables**, create:
   - `POSTHOG_PROJECT_ID` with value `761328`
   - `POSTHOG_HOST` with the project’s configured PostHog host
   - `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` with the project’s configured public token
   - `NEXT_PUBLIC_POSTHOG_HOST` with the project’s configured PostHog host
3. On the VPS, verify `/home/iyfpatna/htdocs/iyfpatna.in/.env.production` contains `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST`. The deployment preserves and sources this file rather than writing those values remotely.
4. Correct the existing Clerk dependency/package-export resolution issue, then rerun the GitHub Actions production deploy. Confirm the deploy completes and a new symbol set appears in PostHog.
5. If validating from this Windows checkout, repair/reinstall the platform-appropriate Next.js SWC dependency and run `npm run build` once in your own shell.

## How to verify error tracking

1. Trigger an error in the deployed application.
2. Open [PostHog Error Tracking](https://us.posthog.com/project/761328/error_tracking) and confirm the exception appears.
3. Open [Error Tracking configuration](https://us.posthog.com/project/761328/error_tracking/configuration) to inspect uploaded symbol sets.
4. Open the exception and confirm its production stack trace is symbolicated to readable source locations.
