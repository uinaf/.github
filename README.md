![.github — default community health files for uinaf repositories.](https://uinaf.dev/og/banner/github-defaults.png)

# uinaf/.github

Fallback community-health files for repositories owned by uinaf.

Repository-local files take precedence when a project needs more specific
security, contribution, or pull-request guidance.

## Scan

[`actions/scan`](.github/actions/scan/action.yml) is the push-time scan. Callers
add it as the last step of their existing `verify` job, after a checkout:

```yaml
- uses: uinaf/.github/.github/actions/scan@<sha> # vX.Y.Z
```

It scans on `push` and `workflow_dispatch` and passes through every other
event. Findings fail the pushed commit's `verify` run, and GitHub's failed-run
email is the notification.

- Gitleaks scans the pushed range of private repositories. Public
  repositories use GitHub secret scanning and push protection; pass
  `gitleaks: true` to scan them too.
- Actionlint and Zizmor run when the range changes `.github/`, action
  metadata, Zizmor configuration, or ShellCheck configuration.
- Manual dispatch, a new branch, or a previous head that is not an ancestor
  scans full history and always lints.
- The action deepens a shallow, credential-less checkout with the job token
  until the previous head resolves.

Linux and macOS jobs run the same scanner versions, pinned in
[`action.yml`](.github/actions/scan/action.yml). Pass `zizmor-args` for
documented needs such as `--no-online-audits`.

Every change reaches the default branch as a push, so the push scan covers
merges too. New advisories for pinned dependencies arrive as Dependabot alerts
and Renovate pull requests.

A concurrency group keeps one pending run and cancels it when a newer one
arrives, so a shared push group leaves a pushed range unscanned. The caller's
`verify` workflow groups pull-request runs by ref and gives every other run its
own group:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event_name == 'pull_request' && github.ref || github.run_id }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}
```

That group no longer serializes release, publish, or deploy jobs in the same
workflow, so each takes a job-level `release-${{ github.repository }}-main`
group with `cancel-in-progress: false` and `queue: max` and checks out
`github.sha`, as [`release-npm.yml`](.github/workflows/release-npm.yml) does.
Actionlint 1.7.12 rejects `queue`; scope an ignore to those files, as this
repository's [`.github/actionlint.yaml`](.github/actionlint.yaml) does.
gh-setup's
[runner cost](https://github.com/uinaf/ffss/blob/main/skills/gh-setup/references/runner-cost.md)
owns these rules and their reasons.

## Pinning

Every push to `main` that carries a releasable Conventional Commit tags a
release ([`release.yml`](.github/workflows/release.yml)). Callers pin the
workflows and the action to that release's commit with the tag as the version
comment, and the [shared Renovate preset](#renovate) moves the pins:

```yaml
uses: uinaf/.github/.github/actions/scan@<sha> # vX.Y.Z
```

Zizmor's `ref-version-mismatch` audit fails a pin whose comment names a
branch that has since moved, so branch annotations such as `# main` are out.

Compatibility: removing an input, adding a required input, renaming an output,
or changing a default that alters caller behavior is a breaking change and
ships as a major (`feat!:` or a `BREAKING CHANGE` footer). The preset
automerges patch and minor pins only; majors wait for dashboard approval and a
human merge in each caller.

## Renovate

[`renovate-config.json`](renovate-config.json) is the shared uinaf Renovate
policy. A repository opts in with:

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["github>uinaf/.github:renovate-config"]
}
```

Daily window (00:00–05:59 Europe/Istanbul); three-day minimum release age, one
day for digest-pinned container images and Actions, none for this repository's
workflows and actions. Patch and minor updates group per manager and automerge
by squash after checks pass; `python` and `node` runtimes move as one PR.
Majors open only after approval on the Dependency Dashboard. Repositories
without checks and digest-only updates stay manual. Native GitHub automerge is
on; a repository without enforced required checks sets
`"platformAutomerge": false`. `npm run verify` validates the preset and
resolves its presets.
This README describes `main`; read the tagged commit for the contract a given
pin carries.

## Release

[`release-npm.yml`](.github/workflows/release-npm.yml) publishes an npm package
with semantic-release and npm trusted publishing. The caller keeps its own
verify job and its own workflow filename, because npm's trusted
publisher configuration checks the calling workflow's name. The App client id
and private key live on the caller's `release` Environment. A caller cannot
pass an Environment secret through `workflow_call`; it passes the name, and
the shared job, bound to the same Environment, receives the Environment's
value.

Inputs and defaults are documented in the workflow. The caller's `release`
Environment must also define the `UINAF_CI_APP_CLIENT_ID` variable.
semantic-release runs at the repository root.

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

## Changed paths

[`actions/changes`](.github/actions/changes/action.yml) runs `paths-filter`
with the checkout each event needs and accepts inline filters only, so a pull
request cannot edit its own lane selection. Private callers set
`full-history: "true"`. The action returns matched filter names as a JSON
array; map them to job outputs with `contains(fromJSON(...), 'name')` so
downstream `if:` conditions keep boolean names.

## Default-branch checks

Required checks constrain every update to the default branch, including direct
pushes. Rulesets and their bypasses are owned by `uinaf/infra` (`tofu/github`);
approved writers need a recorded bypass in the ruleset covering their
repository.

## Verify

Run changed workflow checks locally with `mise run verify`. Before handoff, run
the exhaustive gate with `mise run --force verify`. The repository's own
`verify` job runs that gate on pull requests and the scan action on pushes.
