# Build guide

Follow this in order. Nothing later works without something earlier. Budget **3–4 hours** for a
first build, most of it in step 6.

Build in a **Dev environment** and promote to Production only after step 11.

---

## Step 0 — Prerequisites

| What | Why | If you don't have it |
|---|---|---|
| Copilot Studio licence | The agent itself | Nothing works. This is the blocker. |
| Power Automate (standard) | The three child flows | Included with M365 for standard connectors. |
| AI Builder credits **or** a Copilot Studio Prompt node | The classification step | Copilot Studio licences usually include AI Builder credits — check before buying any. |
| SharePoint site you own | The audit log | Any Teams-backed site works. Use your own, not a departmental one. |
| Permission to publish a Teams app | Deploying the agent | Many tenants restrict this to admins. **Check this on day one** — it is the most common late surprise. |

> **Worth ten minutes before you start:** ask your Power Platform admin whether your Copilot
> Studio licence carries Power Automate premium-connector rights for flows called by the agent.
> If it does, Option A from the intake form (poll Graph for all your 1:1 chats) is back on the
> table and you get the "monitor my inbox" behaviour you originally described, on top of this
> bot. Most Copilot Studio licences do include this. It's worth confirming rather than assuming
> in either direction.

---

## Step 1 — Create the SharePoint list

Follow [`../sharepoint/audit-list.md`](../sharepoint/audit-list.md) exactly, including the two
indexes. Do this first — both flows write to it, and you cannot test them without it.

Note the site URL and list name. You'll paste both into every flow.

---

## Step 2 — Create the agent

**Copilot Studio → Create → New agent → Skip to configure.**

- **Name:** `IT Triage` — short, because people type it in Teams search
- **Description:** "Raises IT support tickets on your behalf. Tell it what's broken."
- **Instructions:** paste the block below
- **Language:** English (United Kingdom)

```text
You take IT support requests from staff and pass them to the IT Support team. You do not
diagnose problems, suggest fixes, or tell people to restart their machine — the support team
does that. Your job is to understand what is wrong, capture enough detail that support can act
without a follow-up email, and confirm the write-up with the person before it is sent.

If someone asks about an existing ticket, tell them you can only raise new ones and point them
at the service desk. If someone is reporting a suspected phishing email or a possible security
incident, treat it as the highest priority and say so.

Be brief. People messaging you are usually blocked and irritated.
```

Then **Settings → Generative AI → Moderation: High**, and turn **off** "Allow the AI to use its
own general knowledge". This agent should never improvise an answer about your systems.

---

## Step 3 — Authentication

**Settings → Security → Authentication → Authenticate with Microsoft.**

This gives you `System.User.DisplayName` and `System.User.Email` for free, which the topic
depends on. Without it you'd have to ask people who they are, which is a terrible first
impression for an internal tool.

---

## Step 4 — Turn off the noise

**Topics → System topics.** Disable `Start Over`, `Escalate` and `Multiple Topics Matched`.

The default `Conversation Start` message mentions capabilities this agent doesn't have. Replace
it with:

> Hi — tell me what's not working and I'll raise it with IT Support for you.

---

## Step 5 — Set up the classification prompt

Two routes; pick one.

**Route A — AI Builder (recommended).** Power Apps → AI hub → Prompts → Create custom prompt.
Paste the prompt from [`../copilot-studio/prompt-classify.md`](../copilot-studio/prompt-classify.md).
Add four inputs named `Description`, `RequesterName`, `RequesterEmail`, `SubmittedAt`. Save and
note the **model ID** — the flow needs it.

**Route B — Copilot Studio Prompt node.** Simpler, no AI Builder setup, but the prompt then
lives inside the agent where it's harder to version. Fine if you're the only maintainer.

Either way: **test it on six real messages before wiring it up.** Feed it two obvious tickets,
two things that aren't IT requests at all, and two vague one-liners. If it can't tell a real
request from social chat at this stage, no amount of flow-building fixes that.

---

## Step 6 — Build the child flows

This is the long part. Three flows, in this order.

### 6a. `IT Triage — Classify and Draft`

Definition: [`../flows/ClassifyAndDraft.json`](../flows/ClassifyAndDraft.json)

Trigger: **When Copilot Studio calls a flow**. Inputs: `Description`, `RequesterName`,
`RequesterEmail`, `ConversationId` (all text).

Actions in order:

1. **Initialize variable** `TicketRef` —
   `concat('ITT-', formatDateTime(utcNow(),'yyMMdd'), '-', substring(replace(guid(),'-',''),0,4))`
2. **Get items** (SharePoint) — the 5-minute bundling check. Filter query:
   `RequesterEmail eq '<email>' and Status eq 'Awaiting approval' and Created gt datetime'<now minus 5 min>'`
   Top count 1.
3. **Create text with GPT** — your prompt from step 5, bound to the trigger inputs.
4. **Parse JSON** — schema in [`../flows/parse-schema.json`](../flows/parse-schema.json).
5. **Create item** (SharePoint) — every field from the audit list except `ApprovedAt` and
   `ApproverComment`. Status is
   `if(body('Parse_result')?['isITRequest'], 'Awaiting approval', 'Filtered — not IT')`.
6. **Respond to Copilot Studio** — return all nine fields listed in the JSON definition.

> **The one that will bite you:** if the AI returns its JSON wrapped in a markdown fence, Parse
> JSON fails. Add a **Compose** between steps 3 and 4:
> `replace(replace(outputs, '```json', ''), '```', '')`. Do this pre-emptively; you will
> otherwise spend an hour on it.

### 6b. `IT Triage — Request Approval and Send`

Definition: [`../flows/RequestApproval.json`](../flows/RequestApproval.json)

Trigger: **When Copilot Studio calls a flow**. Input: `TicketRef`, `GapAnswers`.

1. **Get items** — fetch the row by `Title eq '<TicketRef>'`.
2. **Condition** — inside working hours? Uses `convertTimeZone` to `GMT Standard Time`, hour
   between 9 and 17, `dayOfWeek` between 1 and 5.
3. **If yes → Post adaptive card and wait for a response** (Teams). Recipient is your email.
   Card JSON: [`../adaptive-cards/approval-card.json`](../adaptive-cards/approval-card.json).
4. **Switch** on `submitActionId`:
   - `send` → **Send an email (V2)** to `ITSupport@thefa.com` using
     [`../templates/ticket-email.html`](../templates/ticket-email.html) → update item to `Sent`
     → **Post message in a chat** to the requester
   - `discard` → update item to `Discarded`
   - default (`edit`) → save the edited summary, status `Edit requested`, send nothing
5. **If no → update item to `Queued — out of hours`.**
6. **Respond to Copilot Studio** — `queued` boolean.

Set the card action's **timeout to 30 days** (Settings on the action → Timeout `P30D`).
The default is 30 days already in most regions, but check — a card that silently expires at
midnight is a ticket that never arrives and never errors.

### 6c. `IT Triage — Release Queued Approvals`

Definition: [`../flows/ReleaseQueuedApprovals.json`](../flows/ReleaseQueuedApprovals.json)

Recurrence: **every 1 hour at minute 5**, timezone GMT Standard Time. Q06.

Condition: hour = 9 and weekday. Then get all `Queued — out of hours` items, ordered by
`Urgency asc, Created asc`, and for each: reset status to `Awaiting approval` and call 6b.

**Set the Apply to each concurrency to 1.** Parallel is the default and it will fire eight
approval cards at you simultaneously on a Monday morning.

---

## Step 7 — Build the topic

**Topics → Add a topic → From blank → ⋯ → Open code editor.** Paste
[`../copilot-studio/topic-report-it-issue.yaml`](../copilot-studio/topic-report-it-issue.yaml).

If a node is rejected — and Copilot Studio's YAML dialect does shift between releases — build
that single node in the visual designer instead. The YAML comments tell you what each one does.
Don't fight the editor.

The two `Call an action` nodes need repointing at *your* flows after import; flow IDs are
environment-specific.

---

## Step 8 — Add the free safety net

The bot only catches people who go to the bot. Add this and you also catch the people who tag
you out of habit:

**New flow → `When I am mentioned in a chat` (Teams, standard connector) → Condition: message
text contains any of your keywords → Post an adaptive card to yourself: "Looks like an IT
request from {sender}. Raise it?" → on approval, call `ClassifyAndDraft`.**

Twenty minutes' work, no licence cost, and it covers the gap between what you originally asked
for and what a bot can do.

---

## Step 9 — Test in the canvas

Run these six, in this order, before you publish anything:

| # | Type this | Expect |
|---|---|---|
| 1 | `I'm locked out of my account and I've got a board meeting at 2` | ACCOUNT, **P1** (P2 floor + escalation), card arrives |
| 2 | `printer on 3rd floor is jammed` | HARDWARE, P3, no escalation |
| 3 | `I got a weird email asking me to log in to check a payment` | SECURITY, P1, high confidence |
| 4 | `morning! how was the weekend` | Filtered, no card, **row still logged** |
| 5 | `laptop` | Prompted for more detail before anything else happens |
| 6 | Anything, at 22:00 | Status `Queued — out of hours`, no card until 09:05 |

Test 4 is the one people skip. Check the SharePoint row exists — if filtered submissions aren't
logged, you have no false-negative data and no way to tune.

---

## Step 10 — Publish to Teams

**Publish → Channels → Microsoft Teams → Turn on Teams → Availability options.**

Choose **"Show to my teammates and shared users"** first, not org-wide. Give it to five people
for a fortnight. Org-wide from day one means fifty people hit the same rough edge before you've
found it.

Most tenants need admin approval to list the app in the Teams store. Start that request now —
it's usually the longest-lead item in the whole build.

---

## Step 11 — Tune, then widen

After two weeks:

1. Open the **Low confidence** view. Read what people actually typed. Nearly always the fix is
   a better *question* in step 7, not a better prompt.
2. Open the **Filtered out** view. Any real requests in there? Loosen step 1 of the prompt.
3. Check the split between `Sent` and `Discarded`. If you're discarding more than one in five,
   the agent is guessing and the prompt needs work. If you're discarding almost nothing, ask
   yourself honestly whether you're actually reading the cards.
4. Only then widen to the whole org.

---

## Step 12 — Monitor

**Copilot Studio → Analytics**, weekly.

| Metric | Target | If it's off |
|---|---|---|
| Sessions | Growing month on month | Nobody knows it exists — post it in a team channel |
| Resolution rate | > 70% | People are dropping out mid-conversation; shorten the topic |
| Escalation rate | < 20% | Too many requests falling outside the six categories — add one |
| Abandonment | < 15% | The confirm step is too slow, or the questions are too many |

Cross-reference with the SharePoint list. Analytics tells you about the conversation;
the list tells you about the tickets.
