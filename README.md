![.github — default community health files for uinaf repositories.](https://uinaf.dev/og/banner/github-defaults.png)

# uinaf/.github

Fallback community-health files for repositories owned by uinaf.

Repository-local files take precedence when a project needs more specific
security, contribution, or pull-request guidance.

The shared scan runs on GitHub-hosted Ubuntu runners by default. Private
callers pass the `runner` input, because GitHub-hosted Actions do not dispatch
for private repositories under the organization's paid-usage budget:

```yaml
uses: uinaf/.github/.github/workflows/scan.yml@273d0888178ba4795605c440bef144d8882331fc # v1.0.0
with:
  runner: "blacksmith-2vcpu-ubuntu-2404"
```

A caller declaring that label also needs `.github/actionlint.yaml` listing it,
or the Actionlint job rejects its own workflows. Public callers omit the input
and stay on free GitHub-hosted minutes. `zizmor-args` passes extra zizmor
flags for a documented need, such as `--no-online-audits` when a workflow pins
a private first-party action whose tags the repository token cannot list.

Pull requests scan only commits outside the PR base with Gitleaks; its weekly
and manual runs scan full history. TruffleHog retains full-history scans because
its range traversal can stop before older PR commits when the base advances.
Actionlint and Zizmor
allocate runners only when a PR changes `.github/`, action metadata, Zizmor
configuration, or ShellCheck configuration; weekly and manual runs always lint.
Path detection uses a GitHub-owned action and reuses the Gitleaks checkout and
runner. Shared workflow dependencies must remain compatible with adopters’
selected-action policies without new permission exceptions. Detection failures fail
Gitleaks and still run both linters. Required check names remain unchanged;
job-level skips report success without allocating a runner.

Renovate uses the shared organization preset and tracks the four scanner image
tags and digests in `scan.yml`. Digest-only updates remain manual under that
preset. Image tags provide update metadata; execution remains pinned by digest.

## Pinning

Every push to `main` that carries a releasable Conventional Commit tags a
release ([`release.yml`](.github/workflows/release.yml)). Callers pin the
workflows and the action to that release's commit with the tag as the version
comment, and the [shared Renovate preset](https://github.com/uinaf/renovate-config)
moves the pins:

```yaml
uses: uinaf/.github/.github/workflows/scan.yml@273d0888178ba4795605c440bef144d8882331fc # v1.0.0
```

Zizmor's `ref-version-mismatch` audit fails a pin whose comment names a
branch that has since moved, so branch annotations such as `# main` are out.

Compatibility: removing an input, adding a required input, renaming an output,
or changing a default that alters caller behavior is a breaking change and
ships as a major (`feat!:` or a `BREAKING CHANGE` footer). The preset
automerges patch and minor pins only; majors wait for a human in each caller.
This README describes `main`; read the tagged commit for the contract a given
pin carries.

## Release

[`release-npm.yml`](.github/workflows/release-npm.yml) publishes an npm package
with semantic-release and npm trusted publishing. The caller keeps its own
verify and scan jobs and its own workflow filename, because npm's trusted
publisher configuration checks the calling workflow's name. The App client id
and private key live on the caller's `release` Environment. A caller cannot
pass an Environment secret through `workflow_call`; it passes the name, and
the shared job, bound to the same Environment, receives the Environment's
value. npm trusted publishing supports GitHub-hosted runners only, so the
release job stays GitHub-hosted in repositories that otherwise run on
Blacksmith.

Inputs, all optional: `runner`, `ref` (defaults to the triggering commit),
`node-version-file`, `semantic-version`, `extra-plugins` (newline-separated,
exact versions; the default set covers analysis, notes, npm, GitHub Release,
and the Conventional Commits preset), `pack-command` with `working-directory`
for packages whose publish does not build itself. The caller's `release`
Environment must also define the `UINAF_CI_APP_CLIENT_ID` variable.
semantic-release runs at the repository root.

```yaml
release:
  needs: [verify, scan]
  permissions:
    contents: read
    id-token: write
  uses: uinaf/.github/.github/workflows/release-npm.yml@273d0888178ba4795605c440bef144d8882331fc # v1.0.0
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

Repositories ready for immediate GitHub-native Renovate automerge opt in with
`platformAutomerge: true` and an active `default-branch-checks` ruleset. The
[shared preset](https://github.com/uinaf/renovate-config) keeps this opt-in off
by default. Update eligibility and release age remain preset-owned.

Required checks constrain every update to the default branch, including direct
pushes. Approved content and release writers need repository-specific exceptions
to the checks ruleset. Signing, deletion, and force-push protections remain in
the separate organization baseline. An App's repository access alone does not
authorize an exception.

Before changing a rule, compare its checks and exceptions with the owning
workflow or publishing contract. Preserve a before-state and review the exact
change; verify live rules after a canary and after the rollout. Keep fleet
inventories that include private repositories in a private repository.

## Verify

Run changed workflow checks locally with `mise run verify`. Before handoff, run
the exhaustive gate with `mise run --force verify`. The repository self-caller
runs the shared scan workflow at the pull request's merge commit.
