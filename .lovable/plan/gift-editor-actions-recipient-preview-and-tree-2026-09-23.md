# Gift editor actions, recipient preview, and Tree

## What will change

### 1. Editor action bar
- Add a sticky bar directly below the main navigation with the gift title, autosave state, and a short contribute-link explanation.
- Move Preview, contribute-link copying, and publishing into this bar.
- After publishing, replace Publish with a Published menu for viewing, copying, or unpublishing the live gift.
- On phones, keep Preview and Publish visible and move link copying into a compact overflow menu.
- Remove the Invite friends editor group while preserving the existing publish celebration.

### 2. Full-size recipient preview
- Open a full-screen, recipient-accurate preview from the action bar.
- Begin with the theme reveal, then show the interactive gift with sample content only where approved content is absent.
- Add a floating preview toolbar with recipient name, Phone/Desktop sizing, Replay intro, and Back to editing.
- Support Escape to close and retain countdown, songs, calendar interactions, locked dates, and audio unlocking.

### 3. Tree section
- Extend gift sites with a Tree reveal date and contributions with ornament choice and visibility.
- Add Tree to module setup, editor sections, previews, Christmas defaults, contribution submission, moderation, and the published gift.
- Provide 16 ornament choices, nickname/message limits, and Anyone or Only-recipient visibility.
- Render up to 12 approved ornaments per tree with page controls, ornament message cards, reveal-date locking, and Bo on the locked message.
- Private ornaments remain visible as locked decorations, but their messages never open on the public page.

## Technical details
- Apply an additive database migration with grants and existing row-level access patterns.
- Store `ornament_key` and `visibility` on contributions and `tree_reveal_date` on gift sites.
- Update generated database types through the migration tool, then update shared gift types and normalizers.
- Keep all new visuals in the existing warm palette and reuse the current theme palette, fonts, backgrounds, Bo, and sample-content system.
- Verify the editor, full preview, contributor submission, moderation, reveal locking, pagination, and published tree on desktop and phone layouts.
