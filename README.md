![.github — default community health files for uinaf repositories.](https://uinaf.dev/og/banner/github-defaults.png)

# uinaf/.github

Fallback community-health files for repositories owned by uinaf.

Repository-local files take precedence when a project needs more specific
security, contribution, or pull-request guidance.

The shared scan uses standard GitHub-hosted Ubuntu runners for every caller.

Renovate uses the shared organization preset and tracks the four scanner image
tags and digests in `scan.yml`. Digest-only updates remain manual under that
preset. Image tags provide update metadata; execution remains pinned by digest.

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
change; verify live rules after a canary and after the rollout. Fleet inventories
that include private repositories stay in their private policy owner.

## Verify

Run changed workflow checks locally with `mise run verify`. Before handoff, run
the exhaustive gate with `mise run --force verify`. The repository self-caller
runs the shared scan workflow at the pull request's exact revision.
