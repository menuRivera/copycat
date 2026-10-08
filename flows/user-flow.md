# UI APPROVAL FLOW

```mermaid
flowchart TD
    A([user opens UI]) --> B["UI fetches diffs with status == 'created'<br/>renders them in a table, older first"]
    B --> C{{"for each diff X"}}
    C --> D{"user decision"}
    D -- denied --> E["diff.status -> denied"]
    D -- approved --> F["diff.status -> approved"]
    F --> G["add diff_id to message queue<br/>(starts DiffImplementationWorkflow)"]
    G --> H["notify user, remove row from list"]
    E --> C
    H --> C
    C --> I([list empty / user closes UI])
```

Notes:
- Both rows (denied and approved) leave the list immediately; a refetch also drops them because the fetch filters `status == 'created'`.
- "message queue" is fulfilled by Temporal: approval starts `DiffImplementationWorkflow` with `workflowId: diff-{id}` (dedupe; see sdlc-flow.md).
