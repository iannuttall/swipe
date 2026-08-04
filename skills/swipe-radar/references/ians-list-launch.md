# Ian's List launch edition

## Channel ownership

- The canonical issue and archive belong to Swipe.
- The one-off launch email is sent only by Ian's List.
- The sender remains the familiar Ian's List identity.
- Do not send the same edition to Swipe; it has not been promoted yet.

## Content shape

The email should contain:

1. a short personal intro from Ian explaining that the practical weekly AI
   material is moving to Swipe;
2. the actual Swipe issue, so the invitation proves what readers will get;
3. one clear CTA to opt into Swipe;
4. the normal Ian's List unsubscribe and compliance footer.

Do not frame existing Ian's List contacts as Swipe subscribers. The CTA begins
a separate, explicit double opt-in.

## Markdown handoff

Radar authors one canonical issue in Swipe. For the launch send, copy that
`.md` file into Ian's issue collection and add the personal intro and CTA
there. The Ian copy is a delivery artifact, not a second editorial source.

The text is portable Markdown, but component blocks are renderer behavior.
Before the handoff can render faithfully, Ian's newsletter renderer must
support Swipe's `<Item>`, `<Why>`, and `<Try>` blocks. Treat a failed or
degraded preview as a launch blocker rather than converting the issue by hand.

## Confirmation-link contract

The CTA must use a recipient-specific, expiring Swipe invitation. Clicking it
must lead to the Swipe confirmation flow and require the same server-side
Turnstile verification as a normal signup.

Never:

- copy Ian's List contacts into Swipe;
- mark consent on a GET request;
- expose a shared secret in the email;
- use one reusable confirmation URL for the whole list.

## Pre-send gate

Before any real Ian's List send, verify:

- the Ian composer can render one recipient-specific Swipe invite per contact;
- the copied Swipe issue renders its item blocks without losing layout or
  labels;
- Ian and Swipe share only the invite-signing secret required for this flow;
- a test recipient can complete confirmation into the Swipe database;
- an expired, reused, or malformed invite fails closed;
- the canonical Swipe issue is live before the email links to it;
- no Swipe broadcast exists for the launch edition.

The Radar skill prepares content and evidence. It does not bypass this gate or
perform the real send.
