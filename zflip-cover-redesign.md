# Iron Log Z Flip 6 Redesign

## Goal

Shift mobile workout navigation from stacked sections to a focused, screen-by-screen flow:

- full-screen workout viewing on phones
- one exercise per screen in cover mode
- horizontal swipe navigation between exercises
- persistent workout state when the phone is folded or unfolded

## Implemented

- viewport updated for fixed-scale mobile rendering
- PWA manifest linked and created
- device/screen detection added
- mobile section routing scaffold added with a bottom nav
- mobile workout focus mode added so the active workout can take over the screen
- cover workout player added with swipe navigation and session sync hooks
- quick finish modal extended with cover-friendly RPE and pain controls
- workout editor upgraded with drag-reorder handles
- stepper controls wired into modal editing flows
- cover-set data persisted into workout entries as `coverSets`

## Current technical constraint

The existing workout data model stores a single `weight`, `actualReps`, and `checked` state per exercise entry. The new cover player currently mirrors and updates that model so the redesign works immediately, but true multi-set logging pills will need a schema extension if you want every set persisted independently.

## Remaining constraint

The app now persists cover-screen set history under each exercise entry as `coverSets`, while still maintaining the legacy single-value `weight` / `actualReps` / `checked` fields for compatibility with the existing UI and stats logic.

## Touch points

- Main file: `ironlog.html`
- Manifest: `manifest.json`
