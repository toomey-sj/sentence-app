# Quick To-Do

When implementing the items in this file,  give them a completed date stamp.

1) move the version number to the far right and center it vertically. — done 2026-07-23
2) move the ko-fi button to the far left and center it vertically. — done 2026-07-23
3) hide the light/dark mode toggle for now and just keep it in dark mode. — done 2026-07-23
4) hide the "quiz" interface for now. — done 2026-07-23

Items 3 and 4 are **reversible hides, not removals**, and other plans depend on
knowing that:

- 3 is one rule, `#theme-toggle { display: none; }` in `css/styles.css`. The light
  theme itself is untouched, so it is still unreachable-not-broken.
- 4 comments out three links (Library card in `js/app.js`, editor header in
  `js/editor.js`, Present header in `js/display.js`), each marked
  `quiz hidden for now — restore to re-enable`. The `#/quiz/<id>` route still
  works and `tools/dom-check.html` still drives the real Quiz view.

Both change what [005](005-presentation-ui-remediation.md)'s manual matrix can
actually walk — see its 2026-07-28 amendment.