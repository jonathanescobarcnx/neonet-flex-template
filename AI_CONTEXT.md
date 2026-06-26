# Twilio Flex Project Template - AI Context

## Overview
This repository (`neonet-flex-template`) is a highly modular Twilio Flex solution based on the Twilio Professional Services Flex Project Template (Flex UI 2.x). It utilizes React, TypeScript, Node.js (Twilio Serverless), and Infrastructure as Code to manage contact center features.

## Repository Architecture
The project is a monorepo consisting of the following primary packages:
1. **`plugin-flex-ts-template-v2/`**: The frontend React/TypeScript Flex plugin.
2. **`serverless-functions/`**: The backend Twilio Serverless environment (Node.js).
3. **`flex-config/`**: JSON configuration pushed to Twilio's Flex Configuration API (`ui_attributes`).
4. **`infra-as-code/`**: Automated deployment configurations for TaskRouter and Studio.

## Feature Architecture (The "Hook" Pattern)
Features are entirely isolated. A feature should never heavily modify global/core files. Instead, features are added to `plugin-flex-ts-template-v2/src/feature-library/<feature_name>/` and use a standard structure:
- `/custom-components/`: React components specific to the feature.
- `/utils/` or `/helpers/`: Business logic and backend API callers.
- `/flex-hooks/`: Directory where the feature extends Flex.
  - `/actions/`: Intercepting or replacing Flex Actions (e.g., `beforeAcceptTask`).
  - `/components/`: Injecting React components into Flex UI programmable zones (e.g., `TaskCanvas.Content.add(...)`).
  - `/strings/`: Adding localized strings to the Flex manager.
  - `/css/`: Feature-specific styles.

## Configuration Management
Features are toggled and configured via `flex-config/ui_attributes.common.json` (for deployments) or `public/appConfig.js` (for local development). 

When writing code that relies on a feature flag or setting, ALWAYS use the template's configuration utility:
```typescript
import { getFeatureFlags } from '../../utils/configuration';
// Example: const config = getFeatureFlags().features?.my_feature_name;
```

## Backend Integration (Serverless)
Frontend code MUST NOT contain Twilio API Keys or Auth Tokens. 
- Any direct Twilio REST API interactions must be routed through a function in `serverless-functions/functions/`.
- Functions are accessed using the frontend `ApiService` utilities.
- The frontend automatically resolves the backend domain using the configuration property `serverless_functions_domain`.

## Coding Guidelines
1. **TypeScript First**: All frontend code must use TypeScript. Define interfaces for state, props, and API payloads.
2. **Graceful Degradation**: If a feature is disabled in the configuration, its hooks and components must not execute or render.
3. **UI Consistency**: Utilize Twilio Paste (`@twilio-paste/core`) for building new UI components to maintain a cohesive design system within Flex.
4. **Custom Features Existing**: Take note of existing custom implementations such as `outbound_email_new_task` (which uses Spanish keys like `remitentes`, `dominio`, `colas_permitidas`).

## Task Checklist for New Features
When prompted to create a new feature:
1. Register the feature in `flex-config/ui_attributes.common.json`.
2. Scaffold the feature directory under `src/feature-library/`.
3. Implement required React components (`custom-components/`).
4. Inject components or logic using `flex-hooks/`.
5. Create any required backend functions in `serverless-functions/`.
6. Document necessary TaskRouter primitives (Queues/Workflows) if the feature requires specific routing.
