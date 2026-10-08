# Database schemas

## `users`

- id
- name
- email

## `projects`

- id
- user_id (owner)
- active
- name
- created_at
- repo_url
- deployment_url
- version

## `competitors`

- id
- project_id
- active
- name
- url

## `elements` (to be considered)

- id
- competitor_id
- title
- dom_snapshot

## `snapshot`

- id
- competitor_id
- created_at
- screenshot_bucket_id
- screenshot_public_url
- dom_snapshot
- dom_hash (for quickly detect no changes)

## `diffs`

- id
- project_id
- competitor_id
- old_snapshot_id (prev state)
- new_snapshot_id (new state)
- title
- description (human readable)
- instruction (for agents)
- created_at
- status (created, approved, denied, implemented)
