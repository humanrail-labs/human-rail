# Mandara Product Subscriptions

P12 adds subscription-ready usage tracking and plan gates. It does not implement payment collection.

## Current P12 Behavior

- Every organization gets a default `dev_free` Mandara subscription.
- Agent Chat checks the monthly chat limit before processing accepted messages.
- Usage events are recorded for:
  - `agent_chat_message`
  - `signature_request_created`
  - `webhook_delivery`
- `GET /api/subscription` returns current plan, status, limits, and monthly usage.
- `POST /api/subscription/dev-upgrade` exists only when `MANDARA_ENV=development` for local plan testing.

## Plan Limits

| Plan | Chat / month | Requests / month | Webhooks / month | Agents | Mandates |
|---|---:|---:|---:|---:|---:|
| `dev_free` | 100 | 50 | 100 | 3 | 5 |
| `builder` | 2,000 | 1,000 | 5,000 | 10 | 25 |
| `team` | 10,000 | 5,000 | 25,000 | 50 | 200 |
| `enterprise` | High soft limits | High soft limits | High soft limits | High soft limits | High soft limits |

## No Stripe

Mandara does not use Stripe in this phase.

## P13 Direction

P13 is planned to add Solana-native subscription activation:

- User pays with Solana/SPL token/USDC.
- Backend verifies the transaction/signature.
- Subscription activates in the Mandara database.
- Usage limits and plan state continue to be enforced by Mandara API.

P13 must preserve the same custody boundary: no production custody claims, no service wallet exposure to the browser, and no browser-side access to backend secrets.

## Not Implemented Yet

- No wallet charging.
- No token minting.
- No payment verification.
- No production custody.

Mandara is devnet beta only. Ika is pre-alpha/mock signer.
