# AI Context: Post-Call Survey Feature

## Purpose
Intercepts the agent's "Hang Up" action and redirects the customer to an automated DTMF voice survey before disconnecting. Admins can create surveys, define questions, and map them to specific queues — all from within Flex.

---

## Frontend (`plugin-flex-ts-template-v2/src/feature-library/post-call-survey/`)

### Core Hook — the trigger
- `flex-hooks/events/beforeHangupCall.ts` — Intercepts `beforeHangupCall`, looks up a matching rule for the task's queue, and calls `surveyService.startSurvey()` if one is active.

### Service Layer
- `utils/SurveyService.ts` — All CRUD for surveys and rules (stored in Twilio Sync maps), plus `startSurvey(queueName, callSid, taskSid, surveyKey)` which POSTs to the serverless endpoint.
- `utils/SyncHelper.ts` — Paginated Sync map item fetcher.

### Admin UI (admin-only, role-gated via `utils/helpers.ts`)
- `custom-components/PostCallSurveyView.tsx` — Root view, manages three phases: `SurveyList → SurveyEditor → RuleEditor`
- `custom-components/SurveyDesigner.tsx` — Tabbed editor: general settings + up to 10 questions per survey
- `custom-components/RuleEditor.tsx` — Maps a TaskRouter queue → survey, with active/inactive toggle
- `custom-components/SurveyList.tsx` / `RuleList.tsx` — Tables with edit/delete actions
- `flex-hooks/components/SideNav.tsx` — Adds admin link to Flex sidebar
- `flex-hooks/components/ViewCollection.tsx` — Registers the "post-call-survey" view

### Configuration
- `config.ts` — Reads `features.post_call_survey` flags:
  - `enabled`: boolean
  - `survey_definitions_map_name`: Twilio Sync Map name (default: "Post Call Survey Definitions")
  - `rule_definitions_map_name`: Twilio Sync Map name (default: "Post Call Survey Rules")

### Notifications
- `flex-hooks/notifications/index.ts` — Defines `SAVE_ERROR`, `SAVE_SUCCESS`, `SAVE_DISABLED`, `SYNC_ERROR`

### i18n
- `flex-hooks/strings/index.ts` — EN-US primary + ES-ES, ES-MX, PT-BR, TH, ZH-HANS translations

---

## Key Types (`/types/`)

| Type | Description |
|------|-------------|
| `SurveyDefinition` | intro/end messages + array of `SurveyQuestion` |
| `SurveyQuestion` | label (≤30 chars), TTS prompt, `AnswerOptions` (DTMF 0–9 enabled/disabled) |
| `AnswerTypes` | Presets: Yes/No (1-2), 1-3 scale, 1-5 star, 0-9 NPS |
| `RuleDefinition` | `queue_name → survey_key` + `active` flag |
| `SurveyItem` / `RuleItem` | Sync map wrappers with metadata (created_by, date_created, date_updated, etc.) |
| `Phase` | Navigation phases: SurveyList, SurveyEditor, RuleEditor |

All surveys and rules are stored in Twilio Sync maps.

---

## Serverless Backend (`serverless-functions/src/functions/features/post-call-survey/`)

### `flex/start-voice-survey.js`
- **Endpoint:** `POST /features/post-call-survey/flex/start-voice-survey`
- **Receives:** `queueName`, `callSid`, `taskSid`, `surveyKey`, `Token`
- **Action:** Calls `client.calls(callSid).update({ url: surveyUrl })` — redirects the live call to the `survey-questions` endpoint

### `common/survey-questions.protected.js` — survey state machine
Handles DTMF interactions throughout the survey playback:

| `questionIndex` | Behavior |
|---|---|
| `0` | Plays intro message; creates a new TaskRouter task (kind: `Survey`) to track responses in Flex Insights |
| `1…n-1` | Records previous DTMF digit as `conversation_attribute_X` / `conversation_label_X` on the task; plays next question via TwiML `<Gather>` |
| `=== total` | Plays end message; marks task `abandoned: 'No'`; cancels the survey task |

- Timeout per question: 10 seconds
- Digits per response: 1
- Task attributes tracked: `conversation_id` (original taskSid), `queue`, `virtual`, `abandoned`, timing fields, `kind: 'Survey'`

---

## End-to-End Data Flow

```
Agent clicks Hang Up
  → beforeHangupCall hook fires
  → Rule lookup by queueName (from Sync map)
  → If active rule found: POST /flex/start-voice-survey
      → Twilio Calls API redirects customer call leg to survey-questions
          → New TaskRouter task created (surveyKey, timing metadata)
          → Customer answers DTMF per question
          → Responses stored as task attributes (visible in Flex Insights)
          → Survey task canceled on completion
  → Original agent task proceeds to wrap-up
```

---

## Admin UI Workflow

1. Admin navigates via sidebar button → "Post Call Survey Settings"
2. **Survey Management:** Create/edit/delete surveys with name, welcome prompt, end prompt, and up to 10 questions
3. **Rule Management:** Map TaskRouter queues to surveys, set active/inactive status
4. Data persists to Twilio Sync maps; all agents see the same configuration

---

## Key Files at a Glance

| File | Purpose |
|------|---------|
| `index.ts` | Feature registration & conditional loading |
| `config.ts` | Feature flag retrieval |
| `utils/SurveyService.ts` | Survey/rule CRUD + serverless integration |
| `flex-hooks/events/beforeHangupCall.ts` | Core: intercepts hangup, starts survey |
| `custom-components/PostCallSurveyView.tsx` | Admin UI root component |
| `custom-components/SurveyDesigner.tsx` | Survey editor with tabbed questions |
| `custom-components/RuleEditor.tsx` | Queue→Survey mapping UI |
| `serverless/flex/start-voice-survey.js` | Updates call to point to survey flow |
| `serverless/common/survey-questions.protected.js` | Handles DTMF collection & task tracking |
