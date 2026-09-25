![.github — default community health files for uinaf repositories.](https://uinaf.dev/og/banner/github-defaults.png)

# uinaf/.github

Fallback community-health files for repositories owned by uinaf.

Repository-local files take precedence when a project needs more specific
security, contribution, or pull-request guidance.

## Scan

[`actions/scan`](.github/actions/scan/action.yml) is the push-time scan. Callers
add it as the last step of their existing `verify` job, after a checkout, so it
costs no runner of its own:

```yaml
- uses: uinaf/.github/.github/actions/scan@<sha> # vX.Y.Z
```

It acts only on `push` and `workflow_dispatch`; on pull requests it exits at
once, so it never blocks a merge. Findings fail the pushed commit's `verify`
run, and GitHub's failed-run email is the notification. No ruleset requires it
to pass before a push.

- Gitleaks scans the pushed range of private repositories, where GitHub push
  protection is unavailable without paid Secret Protection. Public
  repositories rely on GitHub secret scanning and push protection; pass
  `gitleaks: true` to scan them anyway.
- Actionlint and Zizmor run only when the range changes `.github/`, action
  metadata, Zizmor configuration, or ShellCheck configuration.
- Manual dispatch, a new branch, or a previous head that is not an ancestor
  scans full history and always lints.
- The action deepens a shallow, credential-less checkout with the job token
  until the previous head resolves.

Linux runners use the digest-pinned scanner images, which Renovate tracks.
macOS runners install the scanners from Homebrew. Pass `zizmor-args` for
documented needs such as `--no-online-audits`.

There are no pull-request or scheduled scans: every change reaches the default
branch as a push, and new advisories for pinned dependencies arrive as
Dependabot alerts and Renovate pull requests.

## Pinning

Every push to `main` that carries a releasable Conventional Commit tags a
release ([`release.yml`](.github/workflows/release.yml)). Callers pin the
workflows and the action to that release's commit with the tag as the version
comment, and the [shared Renovate preset](https://github.com/uinaf/renovate-config)
moves the pins:

```yaml
uses: uinaf/.github/.github/actions/scan@<sha> # vX.Y.Z
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
verify job and its own workflow filename, because npm's trusted
publisher configuration checks the calling workflow's name. The App client id
and private key live on the caller's `release` Environment. A caller cannot
pass an Environment secret through `workflow_call`; it passes the name, and
the shared job, bound to the same Environment, receives the Environment's
value. npm trusted publishing supports GitHub-hosted runners only, so the
release job stays GitHub-hosted in repositories that otherwise run on
Blacksmith.

Inputs and defaults are documented in the workflow. The caller's `release`
Environment must also define the `UINAF_CI_APP_CLIENT_ID` variable.
semantic-release runs at the repository root.

```yaml
release:
  needs: [verify]
  permissions:
    contents: read
    id-token: write
  uses: uinaf/.github/.github/workflows/release-npm.yml@168dfda80c93edc6c7085675e0982e32e2229c97 # v1.0.2
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
