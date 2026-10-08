# TEMPORAL.IO WORKFLOW: DIFF IMPLEMENTATION

```mermaid
flowchart TD
    Q(["approved diff starts DiffImplementationWorkflow<br/>(workflowId: diff-{id}, dedupes)"])

    subgraph W["temporal.io workflow"]
        S(["start workflow"]) --> A["get diff data from DB<br/>project, competitor, snapshots, etc"]
        A --> B{"diff.status == 'approved'?"}
        B -- false --> Z(["exit (should never happen)"])
        B -- true --> C["create branch for target_project"]
        C --> D["plan activity (agentic)"]
        D --> E[/detailed feature plan/]
        E --> F["implementation activity (agentic)<br/>iterate until satisfied or max-iterations"]
        F --> G[/commit/]
        G --> H["review activity (agentic)<br/>runs repo test script when present"]
        H -.->|optional refined plan| F
        H --> I{"valid implementation?"}
        I -- NO --> R{"review rounds < max?"}
        R -- yes --> F
        R -- no --> U["update diff<br/>status: failed, updated_at: now()"]
        U --> M(["end workflow"])
        I -- YES --> J["release activity (non-agentic)"]
        J --> K[/HEAD commit/]
        K --> L["update diff<br/>status: implemented, commit: xxxx, updated_at: now()"]
        L --> M
    end

    Q -.->|start| S
```

Side notes / Documentation:

Note on temporal.io activities:
They are fundamentally units of code that belong to an orchestration workflow, they may or may not use AI agents within them.

plan activity:
use an agent to read the codebase, understand the requirement through diff.title, diff.description and diff.instruction columns; return a detailed instruction for the implementation agent (inside implementation activity)

implementation activity:
use the received instruction to perform write operations in the given codebase, iterate the process until the agent is satisfied with the changes (or reached max-iterations limit), commit the changes and return commit information

review activity:
run git diff, understand what the changes mean, compare with the intention of the diff data (description, instruction), run tests (the repo test script when present), make sure all is sound and that the change is ready to production. return an optional refined plan for further iteration of the dev process.

release activity:
merge feature branch into main, push changes to production, return head of the version control.

Implementation loop:
`valid implementation == NO` retries the implementation activity; the optional refined plan from review feeds into that same retry. Two bounds: max-iterations inside the implementation activity, and review rounds (R) on the outer loop. Exhausting the outer cap sets status: failed and ends the workflow.

Setup limitation:
one diff implementation per project at a time. A sandbox environment per diff would allow multiple diffs at once, but that requires an extra MERGE step to combine different features into prod. Nice to have.

Not modeled:
Temporal start/dedupe semantics in detail (see workflowId), and the full status lifecycle (created -> approved/denied -> implemented/failed) across the other flows.
