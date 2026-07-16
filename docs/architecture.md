# Centralized architecture

```mermaid
flowchart TB
    SEC[Security team] -->|Protected pull request| CONTROL

    subgraph CONTROL[security-control-plane]
        WORKFLOW[.github/workflows/sensitive-log-review.yml]
        POLICY[Central policy]
        RULES[Semgrep rules]
        TOOLS[Prompt, schema and enforcement]
        POLICY --> WORKFLOW
        RULES --> WORKFLOW
        TOOLS --> WORKFLOW
    end

    OWNER[Organization owner] --> SETTINGS[Organization Settings<br/>Repository - Rulesets]
    SETTINGS --> REQUIRED[Require workflows to pass before merging]
    WORKFLOW -->|Source repository + workflow path| REQUIRED

    subgraph TARGETS[Target repositories]
        A[repo-a<br/>no local caller]
        B[repo-b<br/>no local caller]
        C[repo-c<br/>no local caller]
    end

    REQUIRED --> A
    REQUIRED --> B
    REQUIRED --> C

    A --> RUN[Ruleset workflow run]
    B --> RUN
    C --> RUN

    RUN --> CP[Checkout control plane<br/>github.workflow_sha]
    RUN --> TARGET[Checkout target PR<br/>target/]
    TARGET --> STATIC[Static Semgrep scan<br/>no target code execution]
    CP --> STATIC
    STATIC --> CANDIDATES{Candidates found?}
    CANDIDATES -->|No| PASS[Passing structured result]
    CANDIDATES -->|Yes| PROMPT[Trusted policy + compact candidates + diff]
    PROMPT --> QUARANTINE[Remove target AGENTS, .codex and .git]
    QUARANTINE --> CODEX[Codex Action<br/>read-only + drop-sudo]
    SECRET[Scoped organization secret] --> CODEX
    CODEX --> ENFORCE[Schema and deterministic enforcement]
    ENFORCE --> CHECK{Central Sensitive Log Review}
    PASS --> CHECK
    CHECK -->|Pass| MERGE[Merge]
    CHECK -->|Fail, missing or pending| BLOCK[Block merge]
```

## Trust boundaries

1. The control-plane commit identified by `github.workflow_sha` is trusted.
2. The target checkout, its diff, source, comments, documentation, and configuration are untrusted evidence.
3. Semgrep and the prompt builder run before any credential is provided.
4. No target-controlled command runs in the credential-bearing job.
5. Only `openai/codex-action` receives the API key, and Codex runs last among steps that can access it.
6. Deterministic enforcement validates the structured decision and fails on `block` or `needs-review`.
