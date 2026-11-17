# Breikkiliitto Event Calendar Wix App

The goal of this project is to create an accessible, user-friendly calendar on our website where people can find all breaking events in one place.

Currently, breakdance events are mostly posted on Instagram and occasionally Facebook. While active members of the scene know where to look, newcomers and outsiders struggle to find this information. This project focuses on events in Finland.

## MVP checklist

- [x] Display approved Finnish events one month at a time, with city filters.
- [x] Display flyer thumbnails and an event-details popup in Finnish.
- [x] Add an organizer field and support formatted descriptions from the Wix CMS.
- [x] Test the public API, filtering, and monthly event listing.
- [x] Verify the latest popup, accessibility, and CMS schema in a Wix preview.
- [ ] Add anonymous event submissions with server-side validation and moderation.
- [ ] Verify CMS moderation access and the submission flow in a Wix preview.
- [ ] Verify the shared, server-side limit of 5 submissions per contact per hour in Wix.
- [ ] Enforce JPEG/PNG and 5 MB limits when public flyer uploads are added.
- [ ] Automatically delete rejected submissions 30 days after rejection.
- [ ] Add automated tests for submissions, moderation, and privacy.

Submissions are reviewed in Wix CMS. A per-contact limit is implemented but must be verified
in Wix before public use. It can be bypassed by changing the contact, so it is not a
replacement for IP-based rate limiting. Restrict CMS access to trusted moderators.

## Submission, security, and privacy requirements

The public API currently returns only records whose status is lowercase `approved`, matching
the existing collection. Do not change the stored status spelling without migrating existing
records. The collection is privileged; future submissions must be created as `pending` on
the server, never with a status supplied by the visitor.
The API no longer accepts `category` or `country` filters; obsolete filter requests receive
HTTP 400 rather than an unfiltered result. City options come from approved Finnish events
across all dates. Counts show approved Finnish events overlapping the selected month,
regardless of the active city filter, including events without a city in the overall total.
Events are listed once in start-date order for each month they overlap. The list shows at most 500 matching
events and displays a notice if more exist; country counts still include all matching events.
An event's optional CMS `picture` field appears as a small flyer next to its title; opening
the title shows a larger, size-limited flyer above the event name in the details dialog.
Displaying it smaller does not reduce the original image's file size. Missing organizer names
are supported for existing events.

The `organizer` field is declared in the app's Events collection. Collection schema changes
require a major app release and an update of the app on the site; allow up to five minutes
for propagation. Existing collection data is preserved. In CMS, open an event's Description
field to use Wix's rich-text formatting toolbar. The popup supports basic text formatting,
headings, lists, blockquotes, and links; other styling and embedded content are removed.

Enter the official Finnish municipality name in the new `city` field. The API normalizes
capitalization and whitespace and checks it against Statistics Finland's 2026 municipality
classification. An invalid city is logged and shown as `Kaupunki puuttuu`; the CMS text
field itself does not prevent invalid values from being saved. A future submission form must
validate the municipality on the server before saving it.

Existing events explicitly marked as Finnish stay visible even without a city; add their
cities in CMS. Existing events marked with another country stay hidden, even if they have a
city. Events without a country need a valid Finnish municipality to be shown. The old
`country` field remains in the collection solely to protect this migration and must not be
removed until the existing records have been reviewed. Existing initial data is not reloaded
on a schema update.

Municipality data: [Statistics Finland, municipalities 2026](https://stat.fi/fi/luokitukset/corrmaps/kunta_1_20260101%23maakunta_1_20260101),
licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The bundled list is
a 2026 snapshot and must be updated when the official classification changes.

For the submission MVP, require the event name, start and end times, Finnish municipality,
organizer, and a public email address or Instagram username. Location, an event link,
description, and image are optional. The existing
`contactEmail` field stores the public contact for approved events and is displayed in the popup; only enter
a contact intended for publication. Events without a contact or description
remain visible, and the popup omits the corresponding sections. Collect a separate private contact email only if
needed to follow up, and never expose it in the public API. The form requires consent to
publication of the event information and public contact.
This is a minimization recommendation, not a guarantee of GDPR compliance; define the legal
basis, privacy notice, access/deletion process, and retention periods for other records.

The submission form uses a municipality selector and checks its value, dates, field lengths,
and HTTPS links on the server. Submitted descriptions are plain text. A public contact
email or Instagram username and consent to publication are required for new submissions.

Weekly events can repeat until a date at most one year from their start, using Finnish local
time. In CMS, add cancelled occurrence dates to `cancelledDates` as comma-separated
`YYYY-MM-DD` dates. `location`, `repeatUntil` and `cancelledDates` are new collection fields: release a
major version and update the app on the site before testing. Review new records in CMS and
change `status` from `pending` to `approved` to publish them; use `rejected` to hide them.
Check CMS access permissions, since anyone allowed to edit the collection can change status.

The limiter stores a SHA-256 hash of the normalized contact and recent submission timestamps in
the privileged `submission-limits` collection. It reserves a slot before saving, so a failed
save can still count toward the limit. The limit expires after one hour, but stored records
are not automatically deleted: arrange periodic deletion of records whose last update is more
than one hour old while submissions are paused. Hashes of contacts may still be personal data. A new collection requires
an app release and site update; verify the limiter and CMS permissions before enabling submissions.
When flyer uploads are implemented, allow only JPEG (`.jpg` or `.jpeg`) and PNG images up to
5 MB (5,000,000 bytes). Enforce the limit and verify the actual file format on the server,
not only the browser's filename or MIME type. Public uploads do not exist yet, and these
restrictions are not currently enforced by the CMS image picker.
The API sanitizes rich-text descriptions with an allowlist before the dialog renders the HTML;
never render unsanitized descriptions. Wix Data query-builder values are passed as values rather than
concatenated into SQL; any future SQL must use parameterized queries. Never trust a browser
to authorize moderation or to choose the approval status.

An IP-based rate limiter remains deferred. Automatic deletion of rejected submissions is
not implemented.
