# Importable solution

**Read this before you use it.** A hand-authored Power Platform solution zip is the least
reliable part of this delivery. The flow definitions are structurally correct, but connection
references, AI Builder model IDs and environment variables are all environment-specific, and
Power Platform's importer is unforgiving about them. Expect to fix something.

**The build guide is the guaranteed path.** This is the shortcut. If the import throws an error
you don't recognise, don't debug it — build the three flows by hand from
[`../docs/build-guide.md`](../docs/build-guide.md) step 6. It takes about ninety minutes and you
end up understanding the thing you have to maintain.

---

## What's in the package

| Component | Type | Import brings it in? |
|---|---|---|
| `IT Triage — Classify and Draft` | Cloud flow | Yes |
| `IT Triage — Request Approval and Send` | Cloud flow | Yes |
| `IT Triage — Release Queued Approvals` | Cloud flow | Yes |
| Environment variables (7) | Config | Yes — you supply values at import |
| The Copilot Studio agent | Bot | **No — create it manually, step 2** |
| The SharePoint list | List | **No — create it manually, step 1** |

The agent and the list are deliberately out of scope. Agent components in solutions are fragile
across environments, and a solution-provisioned SharePoint list gives you no control over
indexing, which you need.

---

## Build the zip

```bash
cd it-triage-agent/solution
./pack.sh
```

Produces `dist/ITTriageAgent_1_0_0_0.zip`.

Requires `zip`. No Power Platform CLI needed — this is a plain unmanaged solution package.

If you do have the CLI, `pac solution pack --folder src --zipfile dist/ITTriageAgent.zip` is a
better-validated route.

---

## Import

1. **make.powerautomate.com → Solutions → Import solution → Browse** → the zip
2. **Next** → it will ask for connections. Map:
   - SharePoint → your account
   - Office 365 Outlook → your account
   - Microsoft Teams → your account
   - AI Builder → your account
3. **Next** → environment variable values:

| Variable | Value |
|---|---|
| `it_SiteUrl` | Your SharePoint site URL |
| `it_AuditListName` | `IT Triage Log` |
| `it_ApproverEmail` | Your work email |
| `it_ApproverName` | Your display name |
| `it_ITSupportMailbox` | `ITSupport@thefa.com` |
| `it_TimeZone` | `GMT Standard Time` |
| `it_GptPromptModelId` | The model ID from build guide step 5 |

4. **Import.** Takes 2–5 minutes.

---

## After import — three things that are never automatic

1. **Turn the flows on.** Solution imports leave cloud flows switched off. All three, in the
   solution's Cloud flows list.
2. **Paste the prompt.** The AI Builder action arrives with an empty prompt. Open
   `Classify and Draft` → `Create text with GPT` → paste from
   [`../copilot-studio/prompt-classify.md`](../copilot-studio/prompt-classify.md).
3. **Paste the card and email bodies.** Same reason — both are long literals that don't survive
   packaging cleanly. Card from `../adaptive-cards/approval-card.json`, email from
   `../templates/ticket-email.html`.

Then point the Copilot Studio topic's two `Call an action` nodes at the imported flows.

---

## Sanity check

Run test 1 from build guide step 9 (`I'm locked out and I've got a board meeting at 2`). If a
card lands in Teams marked **P1** with a filled-in summary, everything is wired. If the card
arrives with empty fields, the SharePoint column internal names don't match — check them
character by character against `../sharepoint/audit-list.md`.
