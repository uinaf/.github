![.github — default community health files for uinaf repositories.](https://uinaf.dev/og/banner/github-defaults.png)

# uinaf/.github

Fallback community-health files and shared CI for uinaf repositories.
Repository-local files take precedence.

## Pinning

A push to `main` with a releasable Conventional Commit tags a release. Pin
every workflow and action here to that release's commit, with the tag as the
comment, and let the [Renovate preset](#renovate) move the pins:

```yaml
uses: uinaf/.github/.github/actions/scan@<sha> # vX.Y.Z
```

- Zizmor fails a comment that names a branch, such as `# main`.
- Removing an input, adding a required input, renaming an output, or changing
  a default that alters caller behavior ships as a major (`feat!:` or a
  `BREAKING CHANGE` footer). Majors need a human merge in each caller.

## Scan

Add [`actions/scan`](.github/actions/scan/action.yml) as the last step of the
caller's `verify` job, after a checkout. Public repositories rely on GitHub
secret scanning unless they pass `gitleaks: true`.

The scan covers each pushed range only if no newer run cancels it. Group the
caller's `verify` runs like this:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event_name == 'pull_request' && github.ref || github.run_id }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}
```

Release, publish, and deploy jobs in that workflow each take a job-level
`release-${{ github.repository }}-main` group with `cancel-in-progress: false`
and `queue: max`, and check out `github.sha`, as
[`release-npm.yml`](.github/workflows/release-npm.yml) does. Actionlint
1.7.12 rejects `queue`; scope an ignore to those files as
[`.github/actionlint.yaml`](.github/actionlint.yaml) does. gh-setup's
[runner cost](https://github.com/uinaf/ffss/blob/main/skills/gh-setup/references/runner-cost.md)
owns these rules.

## Renovate

Opt in to the shared [`renovate-config.json`](renovate-config.json):

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["github>uinaf/.github:renovate-config"]
}
```

A repository without enforced required checks sets
`"platformAutomerge": false`.

Vite+ repositories with explicit Vitest or `@vitest/*` pins extend
`github>uinaf/.github:renovate-vite-plus` instead. It derives component
versions from Vite+ manifests. Standalone Vitest keeps the base preset.

## Release an npm package

```yaml
release:
  needs: [verify]
  permissions:
    contents: read
    id-token: write
  uses: uinaf/.github/.github/workflows/release-npm.yml@<sha> # vX.Y.Z
  secrets:
    UINAF_CI_APP_PRIVATE_KEY: ${{ secrets.UINAF_CI_APP_PRIVATE_KEY }}
```

- Keep the caller's workflow filename: npm trusted publishing checks it.
- The caller's `release` Environment holds the `UINAF_CI_APP_CLIENT_ID`
  variable and the `UINAF_CI_APP_PRIVATE_KEY` secret.

## Changed paths

[`actions/changes`](.github/actions/changes/action.yml) takes inline filters
and returns matched names as a JSON array. Private callers set
`full-history: "true"`. Map names to job outputs with
`contains(fromJSON(...), 'name')` so `if:` conditions stay boolean.

## Verify

```bash
mise run verify          # changed workflows
mise run --force verify  # before handoff
npm run verify           # Renovate preset
```

This README describes `main`; read the tagged commit for a given pin's
contract.
