# Database schemas

## users

- id
- name
- email

## projects

- id
- user_id (owner)
- active
- name
- created_at
- repo_url
- deployment_url
- version

## competitors

- id
- project_id
- active
- name
- url

## snapshots

- id
- competitor_id
- created_at
- dom_snapshot
- dom_hash (for quickly detect no changes)

## screenshots

- id
- title
- snapshot_id
- screenshot_bucket_id
- screenshot_public_url

## diffs

- id
- project_id
- competitor_id
- type (snapshot, analytic)
- old_screenshot_id (prev state)
- new_screenshot_id (new state)
- title
- description (human readable)
- instruction (for agents)
- created_at
- updated_at
- status (created, approved, denied, implemented)
- commit
