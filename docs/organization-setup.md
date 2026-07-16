# Organization setup

## Current limitation

`idir-oai` is a personal GitHub account. This repository can host and test the central workflow, but it cannot enforce an organization-level workflow against unrelated repositories until it is transferred to a GitHub Organization together with the target repositories.

## Activation steps

1. Create or select a GitHub Organization whose plan exposes organization ruleset workflows.
2. Transfer `security-control-plane` to that organization.
3. Change `repository: idir-oai/security-control-plane` in `.github/workflows/sensitive-log-review.yml` to the organization-owned repository name.
4. Protect the control-plane default branch and require Security ownership for `.github/workflows`, `policies`, `schemas`, and `scripts`.
5. In **Organization Settings → Secrets and variables → Actions**, add `OPENAI_API_KEY` as an organization secret and grant it only to selected target repositories.
6. Optionally add `CODEX_MODEL` as an organization variable.
7. In **Organization Settings → Repository → Rulesets**, create a branch ruleset.
8. Target the default branches of the selected application repositories. Do not target every branch because ruleset workflows are designed for pull-request and merge-queue paths.
9. Enable **Require a pull request before merging**.
10. Enable **Require workflows to pass before merging**.
11. Select:
    - Source repository: `security-control-plane`.
    - Source branch: protected `main`.
    - Workflow: `.github/workflows/sensitive-log-review.yml`.
12. Start in **Evaluate** mode, inspect results, then change the ruleset to **Active**.
13. Configure bypass only for an audited Security break-glass team or GitHub App.

## Expected target repository state

Target repositories do not need any of these files:

```text
.github/workflows/sensitive-log-review.yml
.github/workflows/call-security-control-plane.yml
```

There is no `workflow_call` dependency. GitHub injects the selected central workflow through the organization ruleset.

## Events

The central workflow declares:

```yaml
on:
  pull_request:
  merge_group:
```

GitHub ruleset workflows ignore branch, path, and activity-type filters for supported events. Repository targeting and protected branches must therefore be configured in the ruleset rather than in the workflow file.

## References

- [Require workflows to pass before merging](https://docs.github.com/en/enterprise-cloud@latest/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets#require-workflows-to-pass-before-merging)
- [Creating rulesets for repositories in your organization](https://docs.github.com/en/organizations/managing-organization-settings/creating-rulesets-for-repositories-in-your-organization)
- [Codex GitHub Action](https://developers.openai.com/codex/github-action/)
