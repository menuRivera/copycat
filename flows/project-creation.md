# PROJECT CREATION FLOW

```mermaid
flowchart TD
    A([user opens webapp]) --> B{"signed in?"}
    B -- no --> C["Supabase auth<br/>(email magic link)"]
    C --> B
    B -- yes --> D["projects page"]
    D --> E["create project form<br/>name (required)<br/>repo_url (required)<br/>deployment_url (optional)<br/>competitors: at least one URL (required)"]
    E --> F{"valid form?<br/>name present,<br/>repo_url and competitor URLs absolute http(s)"}
    F -- no --> G["show field errors"]
    G --> E
    F -- yes --> H["insert project (user_id = auth.uid, active: true)<br/>insert competitor rows (active: true)<br/>start snapshotScanWorkflow { projectIds: [id], mode }"]
    H --> J{"deployment_url set?"}
    J -- yes --> K["mode: gap<br/>capture our site + each competitor,<br/>LLM gap analysis → initial diffs"]
    J -- no --> L["mode: init<br/>empty repo assumed,<br/>one LLM setup diff per competitor"]
    K --> I([project ready<br/>diffs appear in the Pending tab])
    L --> I
```

Notes:
- At least one competitor URL is required at creation. Enforced in the app, not by the DB.
- `repo_url` is required because the SDLC flow needs it. `deployment_url` is optional.
- Competitor URLs must be absolute `http(s)`.
- The create action starts the existing `snapshotScanWorkflow` with `{ projectIds: [id], mode }`; mode is `gap` when `deployment_url` exists, otherwise `init`. The request does not block on captures or LLM calls.
- Init/gap diffs are ordinary diff rows: approval runs the existing `diffImplementationWorkflow` (no separate workflow).
- The repo is assumed empty when `deployment_url` is absent; emptiness is not verified for now.
- Without `deployment_url`, the project is still included in the daily snapshot cron (`changes` mode).
- Editing a project (add/remove competitors) is out of scope for this iteration.
