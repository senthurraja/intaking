# Classification prompt

This is the AI step. It runs **once per submission**, inside the `ClassifyAndDraft` flow, in an
**AI Builder → Create text with GPT** action (or a Copilot Studio **Prompt** node — both take the
same text).

It does three jobs in one call: confirm this is genuinely an IT request, categorise it, and write
the ticket summary. One call keeps the cost predictable — you are not paying per keyword.

---

## Inputs to bind

| Placeholder | Bind to |
|---|---|
| `{{Description}}` | `Topic.IssueDescription` — what the requester typed |
| `{{RequesterName}}` | `System.User.DisplayName` |
| `{{RequesterEmail}}` | `System.User.Email` |
| `{{SubmittedAt}}` | `utcNow()`, formatted `dd MMM yyyy HH:mm` |

---

## The prompt

```text
You are triaging an IT support request submitted by an employee through a Microsoft Teams
assistant. Your output goes to a shared IT support mailbox where a human reads it.

REQUEST
Submitted by: {{RequesterName}} ({{RequesterEmail}})
Submitted at: {{SubmittedAt}}
What they wrote: """{{Description}}"""

STEP 1 — Is this actually an IT support request?
Answer no if it is social chat, a question about an existing ticket rather than a new problem,
an HR or facilities matter, or something the person says they have already fixed. Answer yes
only if there is a specific IT problem or request that support can act on.

STEP 2 — Categorise it as exactly one of:
ACCOUNT      Account and access: passwords, lockouts, MFA, permissions, mailboxes
CONNECTIVITY Network, VPN, Wi-Fi, remote access, unable to reach systems
SECURITY     Suspected phishing, malware, compromise, data exposure
HARDWARE     Laptops, printers, peripherals, physical device faults
SOFTWARE     Applications, licences, installs, updates, crashes
JML          New starters, leavers, role or department changes

STEP 3 — Assign urgency using these rules, in order:
a) Start at the category floor: SECURITY=P1, ACCOUNT=P2, CONNECTIVITY=P2, HARDWARE=P3,
   SOFTWARE=P3, JML=P3.
b) If the person indicates they are blocked from working, or names a hard time pressure
   (a match day, a broadcast, a meeting today, an explicit "urgent" or "ASAP"), raise it
   exactly one level. Never raise more than one level. P1 is the ceiling.
c) Judge the substance, not the punctuation. Capital letters and exclamation marks are not
   evidence of urgency. Someone calmly stating they cannot log in and have a game tonight
   outranks someone shouting about a font.

STEP 4 — Write the ticket.
- subject: under 80 characters, states the problem, no name, no greeting
- summary: two or three sentences in plain English, third person, past tense for what
  happened and present tense for the current state. Include every concrete detail they gave
  (error messages, system names, device names, timings). Do not invent detail. Do not
  speculate about the cause. Do not suggest a fix.
- missingInfo: up to three specific questions IT will need answered that the person did not
  cover. Empty array if they gave you enough.

Return ONLY valid JSON matching this shape, with no markdown fence and no commentary:

{
  "isITRequest": true,
  "notARequestReason": "",
  "category": "ACCOUNT",
  "urgency": "P2",
  "urgencyReason": "Category floor P2; no escalation language present.",
  "subject": "Unable to sign in to Outlook after password change",
  "summary": "...",
  "missingInfo": ["Which device are they using?"],
  "confidence": "high"
}

Rules for the JSON:
- isITRequest false means every other field except notARequestReason may be empty.
- urgency is exactly one of P1, P2, P3.
- confidence is exactly one of high, medium, low. Use low when the description is too short
  or vague to categorise with any certainty.
```

---

## Why the output is JSON

The flow parses it with **Parse JSON** and uses the fields directly to build the card and the
email. Free text would mean string-wrangling in expressions, which is where Power Automate
builds go to die.

Schema for the Parse JSON action is in [`../flows/parse-schema.json`](../flows/parse-schema.json).

---

## Tuning it

`confidence: "low"` is your tuning signal. After a fortnight, filter the SharePoint log to
low-confidence rows and read what people actually wrote. Almost always the fix is a better
**question** in the topic, not a better prompt — people give thin descriptions when the bot
asks a thin question.

Change the prompt only when the categories themselves are wrong. Change the topic when the
input is thin.
