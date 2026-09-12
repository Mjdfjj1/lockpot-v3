const express = require("express");
const crypto = require("crypto");

const app = express();
app.use(express.json());
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;

// DEMO DATABASE: memory only.
// In the real version this becomes PostgreSQL/MySQL/etc.
const db = {
  pots: new Map(),
  transactions: []
};

function now() {
  return new Date();
}

function isValidDate(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s + "T00:00:00Z").getTime());
}

// The critical security function.
// The client cannot decide whether a pot is unlocked.
function canWithdraw(pot) {
  const unlock = new Date(pot.unlockDate + "T00:00:00Z");
  return now() >= unlock;
}

function record(type, potId, amount, note) {
  db.transactions.unshift({
    id: crypto.randomUUID(),
    type,
    potId,
    amount,
    note,
    createdAt: now().toISOString()
  });
}

// Create a pot. Fake funding for V3.
app.post("/api/pots", (req, res) => {
  const { name, amount, unlockDate } = req.body;

  if (!name || !Number.isFinite(Number(amount)) || Number(amount) <= 0 || !isValidDate(unlockDate)) {
    return res.status(400).json({ error: "Invalid pot details." });
  }

  const date = new Date(unlockDate + "T00:00:00Z");
  if (date <= now()) {
    return res.status(400).json({ error: "Unlock date must be in the future." });
  }

  const pot = {
    id: crypto.randomUUID(),
    name: String(name).slice(0, 80),
    balance: Number(amount),
    unlockDate,
    createdAt: now().toISOString()
  };

  db.pots.set(pot.id, pot);
  record("DEPOSIT", pot.id, pot.balance, "Demo initial deposit");
  res.status(201).json(pot);
});

// Add money to a locked pot. Fake funding for V3.
app.post("/api/pots/:id/add", (req, res) => {
  const pot = db.pots.get(req.params.id);
  const amount = Number(req.body.amount);

  if (!pot) return res.status(404).json({ error: "Pot not found." });
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: "Invalid amount." });
  }
  if (canWithdraw(pot)) {
    return res.status(409).json({ error: "Pot is already unlocked; no more deposits in this demo." });
  }

  pot.balance += amount;
  record("DEPOSIT", pot.id, amount, "Demo add-money deposit");
  res.json(pot);
});

// Read pots.
app.get("/api/pots", (req, res) => {
  res.json([...db.pots.values()]);
});

// Read transaction history.
app.get("/api/transactions", (req, res) => {
  res.json(db.transactions);
});

// THE IMPORTANT ENDPOINT.
// Even if somebody bypasses the UI and sends POST /api/pots/:id/withdraw,
// the server checks the stored unlock date.
app.post("/api/pots/:id/withdraw", (req, res) => {
  const pot = db.pots.get(req.params.id);

  if (!pot) return res.status(404).json({ error: "Pot not found." });

  if (!canWithdraw(pot)) {
    return res.status(403).json({
      error: "Pot is still locked.",
      unlockDate: pot.unlockDate
    });
  }

  const amount = pot.balance;
  record("WITHDRAWAL", pot.id, amount, "Demo withdrawal");
  db.pots.delete(pot.id);

  // Later this is where M-Pesa B2C would be initiated,
  // after authorization/idempotency/security checks.
  res.json({
    success: true,
    amount,
    message: "Demo withdrawal approved by server."
  });
});

app.listen(PORT, () => {
  console.log(`LockPot V3 running at http://localhost:${PORT}`);
});
