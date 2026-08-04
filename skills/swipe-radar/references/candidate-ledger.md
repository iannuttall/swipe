# Radar candidate ledger

The candidate ledger is the editorial audit trail for a Radar run. Write it as
the research happens to `notes/radar/<YYYY-MM-DD>/candidates.md`.

It is not a dump of every Hacker News story or GitHub search result. Include
every named product, skill, prompt, article, or workflow that passes the first
feed scan and reaches source inspection. Record items rejected before testing
as carefully as selected items. Summarise kill-list filtering separately with
counts and the discovery file or query that produced it.

Start with:

- run date and mode;
- discovery files and queries;
- total raw results inspected;
- count removed by each broad editorial filter;
- count that reached named source inspection.

Give every inspected candidate its own heading and record:

- **Type:** tool, skill, prompt, loop, workflow, article, or other;
- **Verdict:** selected, catalogue-only, incubated, rejected after source
  review, rejected after test, duplicate, or deferred;
- **Discovery source:** the exact feed, query, Keep item, submission, or URL;
- **Manual signal:** `swipe`, `ianslist`, another tag, untagged save, or none;
- **Swipe history:** unseen, previously rejected, catalogued, or previously
  featured, with the matching ledger, page, or issue;
- **Catalogue action:** created, updated, existing, duplicate of a canonical
  page, rejected with the exact exclusion test, or not an eligible artefact;
- **Catalogue page:** the stable `apps/site/src/content/tools/<slug>.md` path
  when one exists or is created;
- **Sources checked:** every exact URL actually opened, labelled primary or
  secondary with the date checked;
- **What the source supports:** the source's main point and the exact useful
  move it supports;
- **Test:** command, disposable input, or manual check performed, with a link
  to any saved receipt; write `not tested` and explain why when appropriate;
- **Result:** what happened, including failures;
- **Limitations:** material constraints or uncertainty;
- **Decision:** the concrete reason it was selected, deferred, or discarded.

For an article-derived artifact, also record the incubator path, original
source and author, what the artifact adds, licence or copying boundary, exact
test, result, and whether Ian has approved public release. Never describe a
local incubator as publicly usable.

Never write “docs checked” or “search results reviewed” without the URLs. Do
not claim a test happened when Radar only read the source. A selected item must
have at least one primary source, an exact supported move, and a safe test or a
plain explanation of why direct testing was not possible.

End with two explicit lists:

1. selected issue items;
2. every discarded or deferred named candidate and its one-line reason.

The `swipe radar run` wrapper archives this ledger unchanged under
`radar/candidates/`. Ian's corrections belong in the matching
`radar/feedback/` file so the original evidence remains intact.
