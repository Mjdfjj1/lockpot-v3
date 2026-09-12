# LockPot V3 — Server-side Lock Prototype

This is a DEMO. It does not move real money and it does not connect to M-Pesa.

## What V3 proves

The browser is no longer the authority for withdrawals.

The server stores:
- pot ID
- pot name
- balance
- unlock date

When `/api/pots/:id/withdraw` is called, the server independently checks the stored unlock date.

## Run it

You need Node.js installed.

1. Open a terminal in this folder.
2. Run:

```bash
npm install
npm start
```

3. Open:

http://localhost:3000

## Test the security

Create a pot with a future date.

The UI will show Withdraw Locked.

More importantly, even if you manually call the withdrawal API, the server returns HTTP 403 until the unlock date.

For example, in the browser developer console:

```js
fetch("/api/pots/YOUR_POT_ID/withdraw", {method:"POST"})
  .then(r => r.json()).then(console.log)
```

It should be rejected while the pot is locked.

## Important

This demo uses an in-memory database. Restarting the server clears all pots.

Before real M-Pesa:
- use a real database
- authenticate users
- authorize pot ownership
- add idempotency keys
- verify M-Pesa callbacks
- use secure secrets/environment variables
- handle failed/reversed payments
- implement proper audit logs
- perform required regulatory/compliance work

Only after those pieces are designed should real-money payouts be enabled.
