# UI APPROVAL FLOW

```mermaid
flowchart TD
    A([user opens UI]) --> P["root / is the project selector<br/>each card shows the pending count<br/>and links to /projects/{projectId}"]
    P --> B["pending tab: fetches that project's diffs<br/>with status == 'created', older first"]
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
- Root `/` is the project selector; each project card links to its project page and shows a pending-count badge.
- The project page has tabs: Pending (created), Decided (approved/denied), Shipped (implemented/failed). Approve/deny only on Pending; shipped cards link to the commit on the project repo.
- Both rows (denied and approved) leave the Pending list immediately; a refetch also drops them because the pending fetch filters `status == 'created'`.
- "message queue" is fulfilled by Temporal: approval starts `DiffImplementationWorkflow` with `workflowId: diff-{id}` (dedupe; see sdlc-flow.md).
