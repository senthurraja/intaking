# IT Triage Agent

A Copilot Studio agent in Microsoft Teams. Staff tell it what's broken; it writes the ticket,
you approve it on a card, and it emails `ITSupport@thefa.com` and closes the loop with the
person who asked.

Built to the answers in the requirements intake, 2 August 2026.

---

## Read this first: what you asked for vs. what this is

You originally described an agent that **monitors your Teams inbox** and forwards IT requests.
You then chose **Option C — a Copilot Studio bot** on Q01.

Those are different things, and the difference matters:

- **Nobody's messages are read.** This agent has no access to your chats. It only sees what
  someone deliberately types into a conversation with it.
- **It only catches people who go to the bot.** A colleague who DMs *you* "hey I'm locked out"
  is invisible to it.

That gap is real but closable. **Build guide step 8** adds a free `When I am mentioned in a
chat` flow — twenty minutes, no licence cost — which covers people who tag you out of habit.
It's the closest you get to the original ask without a premium licence.

And worth checking before you settle: **Copilot Studio licences usually include Power Automate
premium-connector rights for flows the agent calls.** If yours does, Option A (poll Graph for
all your 1:1 chats) is available after all, and you can have both. Ask your Power Platform admin
— it's a one-line question and it changes what's possible.

---

## How it works

```
Colleague opens Teams, messages "IT Triage"
        │
        │  "I'm locked out and I've got a board meeting at 2"
        ▼
Copilot Studio topic ── asks for detail if the description is thin
        │
        ▼
Flow 1: Classify and Draft
        ├─ checks for another open ticket from the same person in the last 5 min
        ├─ AI: is this IT? which category? how urgent? write the summary
        └─ logs the decision to SharePoint — including the ones it filters out
        │
        ▼
Topic shows the write-up back to the requester ── "have I got that right?"
        │
        ▼
Flow 2: Request Approval and Send
        ├─ out of hours? → queue it, tell them it goes first thing
        └─ in hours? → Adaptive Card to you: Send / Edit / Discard
                          │
                          └─ Send → email ITSupport@thefa.com
                                  → mark Sent in the log
                                  → message the requester back in Teams
        │
        ▼
Flow 3: Release Queued Approvals ── hourly; at 09:05 on a working day,
                                    releases the overnight queue one at a time
```

---

## What's here

| Path | What it is |
|---|---|
| [`docs/build-guide.md`](docs/build-guide.md) | **Start here.** Twelve steps, 3–4 hours. |
| [`docs/data-flow.md`](docs/data-flow.md) | One-pager for whoever signs this off. Q10. |
| [`config/taxonomy.json`](config/taxonomy.json) | Categories, keywords, urgency rules. The only place they live. |
| [`copilot-studio/prompt-classify.md`](copilot-studio/prompt-classify.md) | The AI prompt, with the reasoning behind each instruction. |
| [`copilot-studio/topic-report-it-issue.yaml`](copilot-studio/topic-report-it-issue.yaml) | The conversation, ready to paste into the code editor. |
| [`flows/`](flows/) | Three flow definitions + the Parse JSON schema. |
| [`adaptive-cards/approval-card.json`](adaptive-cards/approval-card.json) | Your Send / Edit / Discard card. |
| [`templates/ticket-email.html`](templates/ticket-email.html) | The email IT receives. |
| [`sharepoint/audit-list.md`](sharepoint/audit-list.md) | Log schema, indexes, views, retention. |
| [`solution/`](solution/) | Importable zip. Run `./pack.sh`. **Read its README first.** |

The zip is a build artifact and isn't committed — run `solution/pack.sh` to produce it, so it
can never drift from the flow definitions in `flows/`.

---

## Your answers, and where each one landed

| | Answer | Where it lives |
|---|---|---|
| Q01 | Copilot Studio bot | Whole architecture. See the caveat above. |
| Q02 | 24 keywords | `config/taxonomy.json` — repurposed as the **category map**, since a bot doesn't need keywords to *detect* (the person came on purpose), it needs them to *categorise*. |
| Q03 | Category floor + language escalation | Prompt step 3, and `urgencyEscalation` in the taxonomy. Capped at one level. |
| Q04 | Everyone internal | Teams channel availability. Build guide step 10 starts you at five people anyway — widen after a fortnight. |
| Q05 | Bundle within 5 minutes | The `Find_recent_open_draft` action in flow 1. Mostly redundant here, since a bot conversation is already one submission — it catches the person who comes back three minutes later with more. |
| Q06 | Hourly | The release flow's recurrence. There's no polling for *detection* — a bot is event-driven and instant. |
| Q07 | Queue overnight, release 09:00 | Working-hours condition in flow 2, release loop in flow 3. |
| Q08 | SharePoint list | `sharepoint/audit-list.md`. Filtered submissions are logged too — those rows are the tuning data. |
| Q09 | Auto-reply after approval | `Tell_the_requester` in flow 2. |
| Q10 | Seeking approval | `docs/data-flow.md`, plus a disclosure line in every email. |
| Q11 | Summary only, no quote | No `RawDescription` column exists. See below. |
| Q12 | Both | Guide + solution. |

---

## The one toggle worth revisiting

You answered Q11 **summary only** — correct when the design was reading your private chats.
It isn't any more. Someone typing their problem into a ticketing bot has deliberately submitted
it, and quoting a person's own submitted words back to the support team is what every ticketing
system on earth does. Summary-only loses detail IT will have to come back and ask for.

I've built it your way. Changing your mind is:

1. `config/taxonomy.json` → `includeVerbatimDescription: true`
2. Add a `RawDescription` column to the list
3. Uncomment the block at the foot of `templates/ticket-email.html`

Try it summary-only for a fortnight. If IT keep replying to ask what the actual error message
said, that's your answer.

---

## Where this will go wrong first

In the order you'll hit them:

1. **The AI wraps its JSON in a markdown fence** and Parse JSON fails. Build guide step 6a has
   the pre-emptive fix. Do it before you test, not after.
2. **You can't publish a Teams app** without admin approval. Check on day one; it's the longest
   lead time in the build.
3. **Eight approval cards at once** on Monday morning. The concurrency-1 setting in flow 3
   prevents it — don't skip it.
4. **SharePoint column internal names don't match** what the flows expect. If cards arrive with
   blank fields, this is why. Compare character by character.

---

## Not built, deliberately

- **The @mention safety net** (build guide step 8) — sketched, not built, because it's twenty
  minutes and worth doing once you've seen the bot working.
- **Ticket status lookup.** People will ask the bot "where's my ticket". It can't answer — a
  shared mailbox has no ticket IDs to look up. If IT ever moves to a real ITSM tool, that's the
  first thing to add.
- **Retention on the audit log.** Needs a decision, not code. `sharepoint/audit-list.md`.
