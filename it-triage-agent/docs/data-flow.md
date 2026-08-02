# Data flow summary

**For:** whoever signs this off — IT, InfoSec, or your line manager.
**Purpose:** one page, so the review is a conversation about facts rather than an interrogation.

You answered "planning to seek approval" on Q10. This is the document to hand over. Read it
yourself first and correct anything I've assumed wrongly about your tenant.

---

## What it is

A Copilot Studio agent published to Microsoft Teams. Staff message it directly to report an IT
problem. It writes up the request, a named human approves it, and it emails
`ITSupport@thefa.com`.

It replaces a person forwarding Teams messages to IT by hand. It does not replace the service
desk, and it does not attempt to resolve anything.

---

## What it does **not** do

This is usually the first question, so it leads.

- **It does not read anyone's Teams messages.** It has no access to chats, channels, or
  mailboxes. It only sees what a person deliberately types into a conversation with the agent
  itself — the same as any other Teams bot.
- **It does not act autonomously.** Every email is approved by a named person before sending.
  Nothing is sent while that person is asleep.
- **It does not diagnose or advise.** General AI knowledge is disabled. It cannot invent an
  answer about internal systems because it has no knowledge sources attached.
- **It does not store the requester's original wording.** The audit log holds an AI-written
  summary only.

---

## Data collected

| Item | Source | Where it goes | Retained |
|---|---|---|---|
| Requester name and work email | Entra ID via Teams SSO | Audit log, ticket email | Per list retention |
| Description of the IT problem | Typed by the requester | Used to generate the summary; **not stored** | Not retained outside the Teams conversation |
| AI-generated summary, category, priority | Generated | Audit log, ticket email | Per list retention |
| Approver's decision and optional comment | The approver | Audit log | Per list retention |
| Teams conversation ID | Teams | Audit log | Per list retention |

**No special-category data is deliberately collected.** A person could type something personal
into a free-text field — that risk exists identically in an email to the service desk, and the
summary step reduces rather than increases what is passed on.

---

## Where the data goes

```
Requester (Teams)
      │  types a problem description
      ▼
Copilot Studio agent            ── stays in tenant
      │
      ▼
Power Automate flow             ── stays in tenant
      │
      ├──▶ AI Builder / Azure OpenAI      ── Microsoft-operated, in-tenant data boundary,
      │      classification + summary        not used to train foundation models
      │
      ├──▶ SharePoint list (audit log)   ── stays in tenant
      │
      ▼
Approver (Teams Adaptive Card)  ── a named human, in tenant
      │  clicks Send
      ▼
ITSupport@thefa.com             ── internal shared mailbox
```

**Nothing leaves the Microsoft 365 tenant at any point.** No third-party service, no external
API, no data crossing an organisational boundary.

---

## Access

| Who | Can see |
|---|---|
| The requester | Their own conversation only |
| The approver | Every submission, including filtered ones |
| IT Support mailbox | Approved tickets only |
| SharePoint site owners | The audit log |

The audit log lives on a site owned by the approver. If this moves to a team, the list should
move with it and inherit that team's permissions.

---

## Transparency

Every ticket email carries a disclosure line stating it was raised via the assistant and
reviewed by a named person. The agent's Teams description says what it does. Nobody interacts
with it without knowing what it is.

---

## Points a reviewer will reasonably raise

Prepared answers, so you're not caught out:

**"What if the AI gets the priority wrong?"**
A human approves every one, and the priority reasoning is shown on the approval card. The log
records both the AI's call and the human's decision, so drift is measurable.

**"What if it summarises something inaccurately?"**
The requester is shown the summary and asked to confirm it before it goes to the approver.
Two humans see it before IT does.

**"How long is the log kept?"**
Not yet decided — see `sharepoint/audit-list.md`. Agree this before go-live. Twelve months is a
defensible default.

**"What happens if the approver leaves?"**
The approver email is a flow parameter, not hardcoded in logic. It's a one-field change. If this
becomes load-bearing, point it at a shared mailbox with more than one owner rather than a person.

**"Who can use it?"**
Initially five named colleagues (Q04 was "everyone internal", but step 10 of the build guide
deliberately starts narrow). Widening is a channel setting.

**"Is this shadow IT?"**
Fair question, and the honest answer is that it's a personal productivity tool being brought
forward for approval before it's widened — which is the right order. If IT would rather own it,
the whole thing transfers: it's one solution, three flows, and a SharePoint list.
