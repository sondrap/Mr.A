---
name: Payment System → MRA Access Webhook
description: The inbound webhook your payment system calls when someone pays (or refunds). MRA doesn't run checkout — it just listens for "this person paid" and "this person's access is revoked" events.
---

# Payment System → MRA Access Webhook

MRA does not process payments. You run your own payment system elsewhere (Stripe Checkout, a custom Kajabi-replacement, whatever you're building). When a checkout completes, your payment system POSTs to MRA's access-grant webhook. When a refund or chargeback occurs, it POSTs to the revoke webhook.

This is the only integration point between your payment system and MRA. No outbound calls from MRA to your payment system. No API access needed to any third party. One-way inbound signals.

## Authentication

Both endpoints require an admin API key, generated in the MRA admin console (`ADMIN → API Keys → Create Key`). Store it in your payment system's environment.

```
Authorization: Bearer sk_your_admin_key_here
```

~~~
A dedicated "access webhook key" type (separate from the general admin key) is a potential future refinement — scoped to only the access endpoints. For v1 the admin key works and keeps things simple.
~~~

## Endpoints

### Grant access (new paid user, or existing user upgraded)

```
POST https://{your-app}.msagent.ai/_/api/access/grant
Content-Type: application/json
Authorization: Bearer sk_...

{
  "email": "customer@example.com",
  "plan": "full",
  "note": "Order #12345 · $1000 annual · Stripe pi_xyz"
}
```

**Body fields:**
- `email` (required) — the customer's email, exactly as they entered at checkout.
- `plan` (required) — one of `full` (paid access) or `free` (explicit free-tier grant, rarely needed since signup defaults to free anyway).
- `note` (optional) — any string your payment system wants to attach for record-keeping. Shown in the admin console. Order IDs, transaction IDs, payment plan notes.

**Response:**
```json
{
  "granted": true,
  "email": "customer@example.com",
  "plan": "full",
  "userPromoted": true,
  "accessGrantId": "ag_abc123"
}
```

- `granted` is `true` if the grant was recorded.
- `userPromoted` is `true` if an existing user with that email was immediately promoted to `student`. If the customer hasn't signed up yet, it's `false` — the grant is pre-recorded and will take effect the first time they log in.

Idempotent. POSTing the same email + plan twice updates the existing grant (refreshes the note) rather than creating duplicates.

### Revoke access (refund, chargeback, cancellation)

```
POST https://{your-app}.msagent.ai/_/api/access/revoke
Content-Type: application/json
Authorization: Bearer sk_...

{
  "email": "customer@example.com",
  "reason": "Refund · Order #12345"
}
```

**Body fields:**
- `email` (required) — the customer's email.
- `reason` (optional) — string shown in the admin console audit log.

**Response:**
```json
{
  "revoked": true,
  "email": "customer@example.com",
  "userDemoted": true
}
```

Marks the access grant as revoked (doesn't delete — preserves audit trail) and demotes the user's role back to `free`. The user can still log in and use the free-tier workflow, but everything else is locked again.

Idempotent. Revoking an already-revoked email is a no-op and returns `revoked: true`.

## Flows

**Happy path: new paid signup**
1. Customer hits your payment system's checkout page
2. Customer pays successfully
3. Your payment system POSTs to `/_/api/access/grant` with the email
4. MRA records the grant (pre-records if the user hasn't signed up yet)
5. Customer goes to MRA, signs up with the same email (or logs in if they already have an account)
6. MRA sees the access grant and promotes them to `student` immediately

**Refund path**
1. Customer requests a refund
2. Your payment system processes the refund
3. Your payment system POSTs to `/_/api/access/revoke`
4. MRA marks the grant revoked and demotes the user
5. User is still a valid account (they can log in, use free-tier) but paid features re-lock

**Manual grant path (still supported)**
Admins can still manually grant access from the MRA admin console's Users tab. Useful for comps, testing, support situations, team members. The webhook is the automated path; the admin UI is the backup.

## What your payment system owns

- Checkout UI, card processing, receipts, invoicing
- Subscription management (if you have subscriptions — Travis's plans are lifetime/annual, so likely not)
- Refund processing, chargeback handling
- Taxes, reporting, accounting
- Customer-facing payment support

## What MRA owns

- The access allowlist (`access_grants` table)
- Role enforcement (`student` / `free` / `admin`)
- The app itself

The payment system is free to send whatever metadata it wants in the `note` field — order IDs, plan descriptions, payment provider transaction IDs. MRA doesn't parse or interpret this; it's for human operators looking at the audit log.

## Error handling

Standard REST error codes:
- `401 Unauthorized` — bad or missing API key
- `400 Bad Request` — missing required field (`email` or `plan`), invalid plan value
- `500 Internal Server Error` — unexpected failure; safe to retry

Retries: your payment system should retry 5xx responses with exponential backoff. 4xx responses are deterministic (invalid request) and should be logged for human review rather than retried.

## Simple integration example (pseudocode)

```javascript
// After a successful payment in your checkout handler
async function onPaymentSuccess(payment) {
  await fetch('https://your-app.msagent.ai/_/api/access/grant', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.MRA_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: payment.customer.email,
      plan: 'full',
      note: `Order #${payment.orderId} · ${payment.amount} · ${payment.processor}`,
    }),
  });
}
```

That's it. The entire integration is two endpoints.
