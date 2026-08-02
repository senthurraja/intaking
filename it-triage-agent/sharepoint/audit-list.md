# Audit list — `IT Triage Log`

Q08. One row per submission, including the ones the agent filtered out. The filtered rows are
the valuable ones: they are the only record of what the agent decided *not* to raise.

Create at your site → **New → List → Blank list**, name it `IT Triage Log`, then add the
columns below. The internal names must match exactly — the flows address them directly.

| Column (internal name) | Type | Notes |
|---|---|---|
| `Title` | Single line of text | Ticket ref, e.g. `ITT-260802-4f9a`. Generated in `ClassifyAndDraft`. |
| `RequesterName` | Single line of text | Display name from Teams SSO. |
| `RequesterEmail` | Single line of text | UPN. Used for the 5-minute bundling lookup, so **index this column**. |
| `Category` | Choice | `ACCOUNT`, `CONNECTIVITY`, `SECURITY`, `HARDWARE`, `SOFTWARE`, `JML` |
| `Urgency` | Choice | `P1`, `P2`, `P3` |
| `UrgencyReason` | Multiple lines of text | Why the AI landed on that priority. This is what you read when a priority looks wrong. |
| `Confidence` | Choice | `high`, `medium`, `low` |
| `DraftSubject` | Single line of text | |
| `DraftSummary` | Multiple lines of text | Plain text, not rich. Overwritten if you edit it on the approval card. |
| `Status` | Choice | `Awaiting approval`, `Queued — out of hours`, `Sent`, `Discarded`, `Edit requested`, `Filtered — not IT` |
| `FilterReason` | Single line of text | Populated only when `Status = Filtered — not IT`. |
| `ApprovedAt` | Date and time | |
| `ApproverComment` | Multiple lines of text | Your note from the card. |
| `ConversationId` | Single line of text | Teams conversation reference, so you can find the thread again. |

**Not present, deliberately:** there is no `RawDescription` column. Q11 = summary only, and the
cleanest way to honour that is for the requester's own words never to be written down outside
the Teams conversation they typed them into. If you flip the toggle later, adding this column
is step one — see the note at the bottom of `templates/ticket-email.html`.

---

## Indexing

Add an index on `RequesterEmail` and on `Status`. Both are filtered on every run, and the list
will pass 5,000 items faster than you expect if the agent gets used properly.

**List settings → Indexed columns → Create a new index.**

---

## Views worth creating

| View | Filter | What it's for |
|---|---|---|
| **Needs me** | `Status` is `Awaiting approval` | Your queue when a card gets lost or you dismissed it. |
| **Overnight queue** | `Status` is `Queued — out of hours` | Sanity-check what's waiting for the 09:05 release. |
| **Low confidence** | `Confidence` is `low` | Your fortnightly tuning session. Read what people actually wrote. |
| **Filtered out** | `Status` is `Filtered — not IT` | The false-negative check. If real requests are in here, the prompt's step 1 is too strict. |
| **This month** | `Created` is within last 30 days, grouped by `Category` | Volume by category — the number to show whoever signs this off. |

---

## Retention

Nothing here is deleted automatically. Before this is used in anger, agree a retention period
with whoever approves it — 12 months is a defensible default for operational logs — and set a
**retention label** on the list rather than trying to build deletion into a flow.

This matters for Q10: "how long do you keep it" is the second question any reviewer asks, right
after "what do you collect".
