AI Context: Post-Call Survey Feature
Overview
The post-call-survey feature allows contact centers to seamlessly transfer a customer to an automated survey (typically a Twilio Studio Flow) after the agent finishes the conversation. Instead of disconnecting the customer when the agent ends the call, the feature intercepts the hang-up action, drops the agent's leg of the call, and redirects the customer's active call leg to a configured survey experience.

Frontend Architecture (plugin-flex-ts-template-v2/src/feature-library/post-call-survey)
Following the template's standard architecture, this feature relies heavily on the Flex Actions Framework to modify default behavior without heavily modifying global files.

Flex Hooks (/flex-hooks/actions/):
Action Interception: The feature registers a hook (typically beforeHangupCall or a custom transfer button action).
Behavior Overwrite: When the agent attempts to end the call, the hook checks if the post-call survey feature is enabled via the flex-config. If enabled, it aborts the default hangup payload.
API Service (/utils/ or /helpers/):
The feature contains a utility class extending the standard ApiService (as defined in the template's core utilities).
This class is responsible for taking context from the active task (e.g., callSid, taskSid, workerSid) and preparing an HTTP request to the Serverless backend to execute the routing change.
Backend Integration (serverless-functions)
Because frontend plugins cannot securely hold Twilio API credentials or perform sensitive account-level operations, the actual redirection of the call is handled by Twilio Serverless Node.js functions.

Serverless Endpoint:
A dedicated function for the survey routing (e.g., /features/post-call-survey/...) is exposed on the serverless domain.
Call Modification:
Once the backend receives the request, it validates the Flex worker's JWT token to ensure the request is authorized.
It utilizes the Twilio Node.js SDK to locate the specific Call Resource using the provided callSid.
It performs an update on the Call Resource (client.calls(callSid).update(...)), pointing the url property to the TwiML or Studio Flow configured for the survey.
How Frontend and Backend Connect (The Data Flow)
Trigger: The agent clicks the "Hang Up" or "Send to Survey" button in the Flex UI.
Intercept (Frontend): The flex-hooks/actions hook catches the event, stops the standard call termination, and grabs the callSid from the task payload.
Request (Frontend to Backend): The frontend's ApiService sends a POST request to the Serverless backend, passing the callSid and any relevant metadata (like the agent's name or task attributes) so the survey can record who handled the call.
Execution (Backend): The Serverless function securely updates the Twilio active call to redirect the customer leg to the Studio Flow webhook.
Resolution (Backend to Frontend): The backend responds with a success status (200 OK).
Wrap-up (Frontend): Upon receiving the success response, the frontend forces the agent's Flex UI to drop the call leg locally and moves the agent's task state to wrapup. The agent is freed to take notes, while the customer is now actively interacting with the IVR survey.