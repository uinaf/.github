![.github — default community health files for uinaf repositories.](https://uinaf.dev/og/banner/github-defaults.png)

# uinaf/.github

Fallback community-health files for repositories owned by uinaf.

Repository-local files take precedence when a project needs more specific
security, contribution, or pull-request guidance.

## Verify

Run changed workflow checks locally with `mise run verify`. Before handoff, run
the exhaustive gate with `mise run --force verify`. The repository self-caller
runs the shared scan workflow at the pull request's exact revision.
