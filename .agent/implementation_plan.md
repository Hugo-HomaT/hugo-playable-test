# Service Worker Implementation Plan

## Goal
Implement a Service Worker to act as a "fake local server". This will intercept requests to `/preview/<project-id>/...` and serve files directly from IndexedDB. This eliminates `file://` errors and the need for complex path rewriting, allowing Unity builds to load naturally.

## Proposed Changes

### [NEW] `public/sw.js`
- A raw JavaScript Service Worker.
- Listens for `fetch` events on `/preview/`.
- Parses the URL to get `projectId` and `filePath`.
- Opens the `homa-playables-db` IndexedDB.
- Retrieves the file Blob from `preview-files` store.
- Returns a `Response` with the correct MIME type.

### [MODIFY] `src/db.ts`
- Update `HomaDB` schema to include `preview-files` store.
- Key: `[projectId, filePath]` (compound key) or just string `${projectId}/${filePath}`.
- Value: `Blob`.

### [MODIFY] `src/main.tsx`
- Register the Service Worker on app startup.

### [MODIFY] `src/pages/Editor.tsx`
- Remove `URL.createObjectURL` logic for individual files.
- Instead of just parsing, iterate through files and `put` them into the `preview-files` IDB store.
- Set the `PlayablePreview` `src` to `/preview/${project.id}/index.html`.

### [MODIFY] `src/utils/ZipUtils.ts`
- Remove the complex "Smart Unity Config Injection" logic.
- Keep the `homa_config.json` parsing.
- Keep the extraction to Blobs (but `Editor` will handle saving them).

## Verification
- Upload a Unity build (even compressed).
- Verify it loads in the iframe without `file://` errors.
- Verify relative paths (like `Build/HomaPlayable.data.gz`) work correctly.
