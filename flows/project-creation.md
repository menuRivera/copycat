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
    F -- yes --> H["insert project (user_id = auth.uid, active: true)<br/>insert competitor rows (active: true)"]
    H --> I([project ready<br/>included in the next snapshot cron])
```

Notes:
- At least one competitor URL is required at creation. Enforced in the app, not by the DB.
- `repo_url` is required now because the SDLC flow needs it. `deployment_url` is optional for now.
- Competitor URLs must be absolute `http(s)`.
- Editing a project (add/remove competitors) is out of scope for this iteration.
