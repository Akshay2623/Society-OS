import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";
import {
  addVisitor,
  addComplaint,
  addResident,
  deleteResident,
  getAuthUserByEmailAndRole,
  getAmenities,
  getAmenitiesByDate,
  addAmenityBooking,
  updateAmenityBooking,
  deleteAmenityBooking,
  getBilling,
  getComplaintCategories,
  getComplaints,
  getDashboardSummary,
  getDefaulters,
  getExpenseBreakdown,
  getMonthlyMaintenance,
  getPaymentHistory,
  getRecentActivities,
  getResidents,
  getVisitors,
  updateUserPasswordHash,
  updateVisitor,
  updateComplaintStatus,
} from "./queries.js";
import { authenticateJWT, authorizeRoles, signAuthToken } from "./auth.js";
import { query as dbQuery } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
const port = process.env.PORT || 5000;
const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required in server/.env");
}

app.use(cors());
app.use(express.json());

app.get("/api/health", (_, res) => {
  res.json({ ok: true });
});

app.post("/api/auth/login", asyncHandler(async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ error: "Email, password, and role are required" });
  }

  if (!["admin", "resident", "security"].includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }

  const user = await getAuthUserByEmailAndRole(email, role);
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  let matched = false;
  const hashLooksBcrypt = typeof user.password_hash === "string" && user.password_hash.startsWith("$2");

  if (hashLooksBcrypt) {
    matched = await bcrypt.compare(password, user.password_hash);
  } else if (typeof user.password_hash === "string" && user.password_hash.length > 0) {
    matched = password === user.password_hash;
  } else if (typeof user.password_plain === "string" && user.password_plain.length > 0) {
    matched = password === user.password_plain;
  }

  if (!matched) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  // Legacy plain password auto-upgrade to bcrypt hash.
  if (!hashLooksBcrypt && user.has_password_hash_column) {
    const nextHash = await bcrypt.hash(password, 12);
    await updateUserPasswordHash(user.id, nextHash);
  }

  const token = signAuthToken(user);
  return res.json({ token, role: user.role });
}));

app.get("/api/auth/me", authenticateJWT, asyncHandler(async (req, res) => {
  res.json({
    id: req.user.sub,
    email: req.user.email,
    role: req.user.role,
  });
}));

app.get("/api/dashboard/summary", authenticateJWT, asyncHandler(async (_, res) => {
  const data = await getDashboardSummary();
  res.json(data);
}));

app.get("/api/dashboard/maintenance", authenticateJWT, asyncHandler(async (_, res) => {
  const data = await getMonthlyMaintenance();
  res.json(data);
}));

app.get("/api/dashboard/complaint-categories", authenticateJWT, asyncHandler(async (_, res) => {
  const data = await getComplaintCategories();
  res.json(data);
}));

app.get("/api/dashboard/activities", authenticateJWT, asyncHandler(async (_, res) => {
  const data = await getRecentActivities();
  res.json(data);
}));

app.get("/api/residents", authenticateJWT, authorizeRoles("admin"), asyncHandler(async (req, res) => {
  const data = await getResidents({
    search: req.query.search || "",
    status: req.query.status || "All",
  });
  res.json(data);
}));

app.post("/api/residents", authenticateJWT, authorizeRoles("admin"), asyncHandler(async (req, res) => {
  const { name, email, phone, role, flatId, password } = req.body || {};
  if (!name || !email || !phone || !role || !flatId || !password) {
    return res.status(400).json({ error: "name, email, phone, role, flatId, and password are required" });
  }
  const data = await addResident(req.body);
  res.status(201).json(data);
}));

app.delete("/api/residents/:id", authenticateJWT, authorizeRoles("admin"), asyncHandler(async (req, res) => {
  await deleteResident(req.params.id);
  res.status(204).end();
}));

app.get("/api/visitors", authenticateJWT, asyncHandler(async (_, res) => {
  const data = await getVisitors();
  res.json(data);
}));

app.post("/api/visitors", authenticateJWT, asyncHandler(async (req, res) => {
  const { name, phone, purpose, flatId, status } = req.body || {};
  if (!name || !flatId) {
    return res.status(400).json({ error: "name and flatId are required" });
  }
  const data = await addVisitor({ name, phone, purpose, flatId, status });
  res.status(201).json(data);
}));

app.patch("/api/visitors/:id", authenticateJWT, asyncHandler(async (req, res) => {
  const { status, exitTime } = req.body || {};
  if (!status) {
    return res.status(400).json({ error: "status is required" });
  }
  const data = await updateVisitor({
    id: req.params.id,
    status,
    exitTime: exitTime || null,
  });
  res.json(data);
}));

app.get("/api/complaints", authenticateJWT, asyncHandler(async (_, res) => {
  const data = await getComplaints();
  res.json(data);
}));

app.post("/api/complaints", authenticateJWT, asyncHandler(async (req, res) => {
  const { title, category, priority } = req.body || {};
  if (!title || !category || !priority) {
    return res.status(400).json({ error: "title, category, and priority are required" });
  }
  const data = await addComplaint({
    userId: req.user.sub,
    title,
    category,
    priority,
  });
  res.status(201).json(data);
}));

app.patch("/api/complaints/:id/status", authenticateJWT, asyncHandler(async (req, res) => {
  await updateComplaintStatus(req.params.id, req.body.status);
  res.json({ ok: true });
}));

app.get("/api/billing", authenticateJWT, asyncHandler(async (_, res) => {
  const data = await getBilling();
  res.json(data);
}));

app.get("/api/billing/:invoiceNo/history", authenticateJWT, asyncHandler(async (req, res) => {
  const data = await getPaymentHistory(req.params.invoiceNo);
  res.json(data);
}));

app.get("/api/amenities", authenticateJWT, asyncHandler(async (req, res) => {
  const date = req.query.date;
  const data = date ? await getAmenitiesByDate(date) : await getAmenities();
  res.json(data);
}));

app.post("/api/amenities/bookings", authenticateJWT, authorizeRoles("admin", "resident"), asyncHandler(async (req, res) => {
  const { amenityId, date, slot, residentName } = req.body || {};
  if (!amenityId || !date || !slot) {
    return res.status(400).json({ error: "amenityId, date, and slot are required" });
  }

  const isAdmin = req.user.role === "admin";
  const booking = await addAmenityBooking({
    amenityId,
    date,
    slot,
    residentName: isAdmin ? residentName : null,
    requestedByUserId: req.user.sub,
  });
  res.status(201).json(booking);
}));

app.patch("/api/amenities/bookings/:bookingId", authenticateJWT, authorizeRoles("admin", "resident"), asyncHandler(async (req, res) => {
  const { slot, date } = req.body || {};
  if (!slot || !date) {
    return res.status(400).json({ error: "slot and date are required" });
  }
  const updated = await updateAmenityBooking({
    bookingId: req.params.bookingId,
    slot,
    date,
    requestedByUserId: req.user.sub,
    requestedByRole: req.user.role,
  });
  res.json(updated);
}));

app.delete("/api/amenities/bookings/:bookingId", authenticateJWT, authorizeRoles("admin", "resident"), asyncHandler(async (req, res) => {
  await deleteAmenityBooking({
    bookingId: req.params.bookingId,
    requestedByUserId: req.user.sub,
    requestedByRole: req.user.role,
  });
  res.status(204).end();
}));

app.get("/api/financial/expense-breakdown", authenticateJWT, asyncHandler(async (_, res) => {
  const data = await getExpenseBreakdown();
  res.json(data);
}));

app.get("/api/financial/defaulters", authenticateJWT, asyncHandler(async (_, res) => {
  const data = await getDefaulters();
  res.json(data);
}));

const NOTIFICATION_CATEGORIES = ["digital_notice", "emergency_alert", "society_event", "festival_celebration"];

async function ensureNotificationTables() {
  await dbQuery(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      category TEXT NOT NULL CHECK (category IN ('digital_notice', 'emergency_alert', 'society_event', 'festival_celebration')),
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      created_by INT REFERENCES users(id) ON DELETE SET NULL,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await dbQuery(`
    CREATE TABLE IF NOT EXISTS notification_reads (
      notification_id INT NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (notification_id, user_id)
    )
  `);
}

app.get("/api/notifications", authenticateJWT, asyncHandler(async (req, res) => {
  await ensureNotificationTables();
  const category = normalizeText(req.query.category || "").toLowerCase();
  if (category && !NOTIFICATION_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: "Invalid category" });
  }

  const params = [req.user.sub];
  let filterSql = "";
  if (category) {
    filterSql = "AND n.category = $2";
    params.push(category);
  }

  const sql = `
    SELECT
      n.id,
      n.category,
      n.title,
      n.message,
      n.created_at,
      n.created_by,
      COALESCE(u.name, 'System') AS created_by_name,
      (nr.read_at IS NOT NULL) AS is_read
    FROM notifications n
    LEFT JOIN users u ON u.id = n.created_by
    LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.user_id = $1
    WHERE n.is_active = true
      ${filterSql}
    ORDER BY n.created_at DESC
    LIMIT 100
  `;
  const { rows } = await dbQuery(sql, params);
  res.json(rows);
}));

app.post("/api/notifications", authenticateJWT, asyncHandler(async (req, res) => {
  await ensureNotificationTables();
  const category = normalizeText(req.body?.category || "").toLowerCase();
  const title = normalizeText(req.body?.title);
  const message = normalizeText(req.body?.message);

  if (!NOTIFICATION_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: "Invalid category" });
  }
  if (!title || !message) {
    return res.status(400).json({ error: "title and message are required" });
  }

  const sql = `
    INSERT INTO notifications (category, title, message, created_by)
    VALUES ($1, $2, $3, $4)
    RETURNING id, category, title, message, created_at, created_by
  `;
  const { rows } = await dbQuery(sql, [category, title, message, req.user.sub]);
  res.status(201).json(rows[0]);
}));

app.patch("/api/notifications/:id/read", authenticateJWT, asyncHandler(async (req, res) => {
  await ensureNotificationTables();
  const notificationId = Number(req.params.id);
  const read = req.body?.read !== false;
  if (!Number.isInteger(notificationId) || notificationId <= 0) {
    return res.status(400).json({ error: "Invalid notification id" });
  }

  if (read) {
    await dbQuery(
      `
      INSERT INTO notification_reads (notification_id, user_id, read_at)
      VALUES ($1, $2, now())
      ON CONFLICT (notification_id, user_id)
      DO UPDATE SET read_at = now()
      `,
      [notificationId, req.user.sub],
    );
  } else {
    await dbQuery("DELETE FROM notification_reads WHERE notification_id = $1 AND user_id = $2", [notificationId, req.user.sub]);
  }

  res.json({ ok: true, notificationId, read });
}));

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeForIntent(value) {
  return normalizeText(value).toLowerCase().replace(/[^a-z0-9\s]/g, " ");
}

function containsAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function parseResidentFromPrompt(prompt) {
  const text = normalizeText(prompt);
  const lower = text.toLowerCase();
  const isCreateIntent = /(add|create|register)\s+(a\s+)?(new\s+)?resident/.test(lower);

  if (!isCreateIntent) {
    return { isCreateIntent: false };
  }

  const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const phoneMatch = text.match(/(?:\+?\d[\d\s-]{7,}\d)/);
  const flatMatch = text.match(/flat(?:\s*(?:id|number|no|#))?\s*(?:is|:|=)?\s*([A-Z0-9-]+)/i);
  const passwordMatch = text.match(/password(?:\s*(?:is|:|=))?\s*([^\s,;]+)/i);
  const roleMatch = text.match(/role(?:\s*(?:is|:|=))?\s*(admin|resident|security)/i);
  const nameLabelMatch = text.match(/name(?:\s*(?:is|:|=))\s*([A-Za-z][A-Za-z\s.'-]{1,80})/i);
  const inlineNameMatch = text.match(
    /(?:add|create|register)\s+(?:a\s+)?(?:new\s+)?resident\s+([A-Za-z][A-Za-z\s.'-]{1,80}?)(?=\s+(?:email|phone|flat|password|role)\b|$)/i,
  );
  const inactive = /\binactive\b/.test(lower);

  const name = normalizeText((nameLabelMatch?.[1] || inlineNameMatch?.[1] || "").replace(/\s+/g, " "));
  const email = normalizeText(emailMatch?.[0] || "");
  const phone = normalizeText(phoneMatch?.[0] || "").replace(/\s+/g, "");
  const flatToken = normalizeText(flatMatch?.[1] || "");
  const password = normalizeText(passwordMatch?.[1] || "");
  const role = normalizeText((roleMatch?.[1] || "resident").toLowerCase());
  const isActive = !inactive;

  const missing = [];
  if (!name) missing.push("name");
  if (!email) missing.push("email");
  if (!phone) missing.push("phone");
  if (!flatToken) missing.push("flatId or flat number");
  if (!password) missing.push("password");

  return {
    isCreateIntent: true,
    payload: { name, email, phone, flatToken, password, role, isActive },
    missing,
  };
}

function detectComplaintCategory(text) {
  if (containsAny(text, ["maintenance", "repair", "plumbing", "lift", "elevator", "water leakage"])) return "maintenance";
  if (containsAny(text, ["security", "guard", "gate", "intruder"])) return "security";
  if (containsAny(text, ["noise", "loud", "music"])) return "noise";
  if (containsAny(text, ["parking", "vehicle", "car"])) return "parking";
  if (containsAny(text, ["clean", "garbage", "waste", "hygiene"])) return "maintenance";
  return "general";
}

function detectComplaintPriority(text) {
  if (containsAny(text, ["urgent", "immediate", "emergency", "critical", "high"])) return "high";
  if (containsAny(text, ["low", "minor"])) return "low";
  return "medium";
}

function parseComplaintFromPrompt(prompt) {
  const normalized = normalizeForIntent(prompt);
  const isCreateIntent = containsAny(normalized, [
    "raise complaint",
    "create complaint",
    "add complaint",
    "log complaint",
    "register complaint",
  ]);

  if (!isCreateIntent) {
    return { isCreateIntent: false };
  }

  const cleaned = normalizeText(prompt)
    .replace(/^(please\s+)?(raise|create|add|log|register)\s+complaint\s*[-:]*\s*/i, "")
    .trim();
  const title = cleaned || "Complaint raised via AI assistant";
  const category = detectComplaintCategory(normalized);
  const priority = detectComplaintPriority(normalized);

  return {
    isCreateIntent: true,
    payload: { title, category, priority },
  };
}

function parseVisitorFromPrompt(prompt) {
  const text = normalizeText(prompt);
  const normalized = normalizeForIntent(prompt);
  const isCreateIntent = containsAny(normalized, [
    "add visitor",
    "create visitor",
    "register visitor",
    "new visitor",
  ]);
  if (!isCreateIntent) {
    return { isCreateIntent: false };
  }

  const nameLabelMatch = text.match(/name(?:\s*(?:is|:|=))\s*([A-Za-z][A-Za-z\s.'-]{1,80})/i);
  const inlineNameMatch = text.match(
    /(?:add|create|register)\s+(?:a\s+)?(?:new\s+)?visitor\s+([A-Za-z][A-Za-z\s.'-]{1,80}?)(?=\s+(?:phone|flat|purpose|status)\b|$)/i,
  );
  const phoneMatch = text.match(/(?:\+?\d[\d\s-]{7,}\d)/);
  const flatMatch = text.match(/flat(?:\s*(?:id|number|no|#))?\s*(?:is|:|=)?\s*([A-Z0-9-]+)/i);
  const purposeMatch = text.match(/purpose(?:\s*(?:is|:|=))?\s*([^,;]+)/i);

  const detectedStatus = containsAny(normalized, ["approved", "approve"])
    ? "approved"
    : containsAny(normalized, ["rejected", "reject", "denied", "deny"])
      ? "rejected"
      : "pending";

  const name = normalizeText((nameLabelMatch?.[1] || inlineNameMatch?.[1] || "").replace(/\s+/g, " "));
  const phone = normalizeText(phoneMatch?.[0] || "").replace(/\s+/g, "");
  const flatToken = normalizeText(flatMatch?.[1] || "");
  const purpose = normalizeText(purposeMatch?.[1] || "");

  const missing = [];
  if (!name) missing.push("name");
  if (!flatToken) missing.push("flatId or flat number");

  return {
    isCreateIntent: true,
    payload: { name, phone, purpose, flatToken, status: detectedStatus },
    missing,
  };
}

function parseComplaintStatusFromPrompt(prompt) {
  const text = normalizeText(prompt);
  const normalized = normalizeForIntent(prompt);
  const isUpdateIntent =
    containsAny(normalized, ["mark complaint", "update complaint", "set complaint", "change complaint"]) &&
    containsAny(normalized, ["status", "resolved", "closed", "open", "in progress", "inprogress"]);
  if (!isUpdateIntent) return { isUpdateIntent: false };

  const idMatch = text.match(/(?:cmp-)?(\d+)/i);
  const rawId = idMatch ? `CMP-${idMatch[1]}` : "";
  let status = "";
  if (containsAny(normalized, ["resolved", "closed", "complete", "completed"])) status = "Resolved";
  else if (containsAny(normalized, ["in progress", "inprogress", "working"])) status = "In Progress";
  else if (containsAny(normalized, ["open", "reopen"])) status = "Open";

  const missing = [];
  if (!rawId) missing.push("complaint id (example: CMP-12)");
  if (!status) missing.push("status (Open, In Progress, Resolved)");

  return { isUpdateIntent: true, payload: { id: rawId, status }, missing };
}

function parseVisitorStatusFromPrompt(prompt) {
  const text = normalizeText(prompt);
  const normalized = normalizeForIntent(prompt);
  const isUpdateIntent =
    containsAny(normalized, ["approve visitor", "reject visitor", "deny visitor", "mark visitor", "update visitor"]) &&
    containsAny(normalized, ["visitor"]);
  if (!isUpdateIntent) return { isUpdateIntent: false };

  const idMatch = text.match(/\b(\d+)\b/);
  let status = "";
  if (containsAny(normalized, ["approve", "approved"])) status = "approved";
  else if (containsAny(normalized, ["reject", "rejected", "deny", "denied"])) status = "rejected";
  else if (containsAny(normalized, ["exit", "exited"])) status = "exited";
  else if (containsAny(normalized, ["pending"])) status = "pending";

  const missing = [];
  if (!idMatch?.[1]) missing.push("visitor id");
  if (!status) missing.push("status (approved, rejected, exited, pending)");

  return {
    isUpdateIntent: true,
    payload: { id: idMatch?.[1], status },
    missing,
  };
}

function isLogoutIntent(prompt) {
  const normalized = normalizeForIntent(prompt);
  return containsAny(normalized, ["logout", "log out", "sign out", "signout"]);
}

async function resolveFlatId(flatToken) {
  if (!flatToken) return null;
  const numeric = Number(flatToken);
  if (Number.isInteger(numeric) && numeric > 0) {
    const byId = await dbQuery("SELECT id, flat_number FROM flats WHERE id = $1 LIMIT 1", [numeric]);
    if (byId.rows[0]) return byId.rows[0];
  }

  const normalized = String(flatToken).trim();
  const byNumber = await dbQuery(
    `
      SELECT id, flat_number
      FROM flats
      WHERE upper(flat_number) = upper($1)
         OR replace(upper(flat_number), '-', '') = replace(upper($1), '-', '')
      LIMIT 1
    `,
    [normalized],
  );
  return byNumber.rows[0] || null;
}

function isDataQuestion(text) {
  const normalized = normalizeForIntent(text);
  const questionStarters = ["what", "whats", "how", "show", "list", "tell", "give", "which", "who", "when"];
  const dataTerms = [
    "resident",
    "residents",
    "visitor",
    "visitors",
    "complaint",
    "complaints",
    "billing",
    "invoice",
    "payment",
    "revenue",
    "revnue",
    "revnua",
    "income",
    "collection",
    "due",
    "dues",
    "defaulter",
    "defaulters",
    "pending",
    "flat",
    "dashboard",
    "amenity",
    "amenities",
    "booking",
    "bookings",
    "slot",
    "slots",
  ];
  return containsAny(normalized, questionStarters) || containsAny(normalized, dataTerms);
}

app.post("/api/assistant", authenticateJWT, authorizeRoles("admin"), asyncHandler(async (req, res) => {
  const message = normalizeText(req.body?.message);
  if (!message) {
    return res.status(400).json({ error: "message is required" });
  }

  if (isLogoutIntent(message)) {
    return res.json({
      reply: "Logging you out now.",
      action: "logout_requested",
    });
  }

  const residentIntent = parseResidentFromPrompt(message);
  if (residentIntent.isCreateIntent) {
    if (residentIntent.missing.length > 0) {
      return res.json({
        reply: `I can add that resident, but I still need: ${residentIntent.missing.join(", ")}.`,
        action: "need_fields",
        data: { missing: residentIntent.missing },
      });
    }

    const flat = await resolveFlatId(residentIntent.payload.flatToken);
    if (!flat) {
      return res.json({
        reply: `I could not find flat "${residentIntent.payload.flatToken}". Please provide a valid flat ID or flat number.`,
        action: "flat_not_found",
      });
    }

    const created = await addResident({
      name: residentIntent.payload.name,
      email: residentIntent.payload.email,
      phone: residentIntent.payload.phone,
      role: residentIntent.payload.role,
      flatId: flat.id,
      password: residentIntent.payload.password,
      isActive: residentIntent.payload.isActive,
    });

    return res.status(201).json({
      reply: `Resident added successfully: ${residentIntent.payload.name} (${residentIntent.payload.email}), flat ${flat.flat_number}, role ${residentIntent.payload.role}.`,
      action: "resident_created",
      data: {
        id: created.id,
        name: residentIntent.payload.name,
        email: residentIntent.payload.email,
        phone: residentIntent.payload.phone,
        role: residentIntent.payload.role,
        flatId: flat.id,
        flatNumber: flat.flat_number,
        status: residentIntent.payload.isActive ? "Active" : "Inactive",
      },
    });
  }

  const complaintIntent = parseComplaintFromPrompt(message);
  if (complaintIntent.isCreateIntent) {
    const created = await addComplaint({
      userId: req.user.sub,
      title: complaintIntent.payload.title,
      category: complaintIntent.payload.category,
      priority: complaintIntent.payload.priority,
    });

    return res.status(201).json({
      reply: `Complaint created successfully: ${created.id} (${created.category}, ${created.priority}).`,
      action: "complaint_created",
      data: created,
    });
  }

  const visitorIntent = parseVisitorFromPrompt(message);
  if (visitorIntent.isCreateIntent) {
    if (visitorIntent.missing.length > 0) {
      return res.json({
        reply: `I can add that visitor, but I still need: ${visitorIntent.missing.join(", ")}.`,
        action: "need_fields",
        data: { missing: visitorIntent.missing },
      });
    }

    const flat = await resolveFlatId(visitorIntent.payload.flatToken);
    if (!flat) {
      return res.json({
        reply: `I could not find flat "${visitorIntent.payload.flatToken}". Please provide a valid flat ID or flat number.`,
        action: "flat_not_found",
      });
    }

    const created = await addVisitor({
      name: visitorIntent.payload.name,
      phone: visitorIntent.payload.phone || null,
      purpose: visitorIntent.payload.purpose || null,
      flatId: flat.id,
      status: visitorIntent.payload.status,
    });

    return res.status(201).json({
      reply: `Visitor added successfully: ${created.name} for flat ${created.flat} with status ${created.status}.`,
      action: "visitor_created",
      data: created,
    });
  }

  const complaintStatusIntent = parseComplaintStatusFromPrompt(message);
  if (complaintStatusIntent.isUpdateIntent) {
    if (complaintStatusIntent.missing.length > 0) {
      return res.json({
        reply: `I can update that complaint, but I still need: ${complaintStatusIntent.missing.join(", ")}.`,
        action: "need_fields",
        data: { missing: complaintStatusIntent.missing },
      });
    }
    await updateComplaintStatus(complaintStatusIntent.payload.id, complaintStatusIntent.payload.status);
    return res.json({
      reply: `Complaint ${complaintStatusIntent.payload.id} updated to ${complaintStatusIntent.payload.status}.`,
      action: "complaint_updated",
      data: complaintStatusIntent.payload,
    });
  }

  const visitorStatusIntent = parseVisitorStatusFromPrompt(message);
  if (visitorStatusIntent.isUpdateIntent) {
    if (visitorStatusIntent.missing.length > 0) {
      return res.json({
        reply: `I can update that visitor, but I still need: ${visitorStatusIntent.missing.join(", ")}.`,
        action: "need_fields",
        data: { missing: visitorStatusIntent.missing },
      });
    }
    const updated = await updateVisitor({
      id: visitorStatusIntent.payload.id,
      status: visitorStatusIntent.payload.status,
      exitTime: visitorStatusIntent.payload.status === "exited" ? new Date().toISOString() : null,
    });
    return res.json({
      reply: `Visitor ${updated.name} (ID ${updated.id}) updated to ${updated.status}.`,
      action: "visitor_updated",
      data: updated,
    });
  }

  const wantsGeneralChat = containsAny(normalizeForIntent(message), ["hi", "hello", "hey", "help"]);
  if (!isDataQuestion(message) && wantsGeneralChat) {
    return res.json({
      reply: "I can answer website data questions and perform tasks. Try: add resident, raise complaint, add visitor, update complaint status, or approve/reject visitor.",
      action: "help",
    });
  }

  const text = normalizeForIntent(message);
  const [summary, complaints, defaulters, billing, visitors] = await Promise.all([
    getDashboardSummary(),
    getComplaintCategories(),
    getDefaulters(),
    getBilling(),
    getVisitors(),
  ]);

  if (containsAny(text, ["top complaint", "complaint category", "most complaint", "highest complaint"])) {
    const top = complaints[0];
    if (!top) {
      return res.json({ reply: "No complaint data is available yet.", action: "query_answer", data: { complaints } });
    }
    return res.json({
      reply: `Top complaint category is ${top.name} with ${top.value} complaint(s).`,
      action: "query_answer",
      data: { topComplaint: top, complaints },
    });
  }

  if (containsAny(text, ["pending dues", "maintenance dues", "defaulter", "defaulters", "unpaid", "due amount"])) {
    const totalDue = defaulters.reduce((sum, row) => sum + Number(row.due || 0), 0);
    const topRows = defaulters.slice(0, 5);
    return res.json({
      reply: `Total pending dues are Rs ${totalDue.toLocaleString("en-IN")} across ${defaulters.length} defaulter(s).`,
      action: "query_answer",
      data: { totalDue, defaulters: topRows },
    });
  }

  if (containsAny(text, ["how many residents", "total residents", "resident count", "number of residents"])) {
    return res.json({
      reply: `Total residents: ${Number(summary.total_residents || 0)}.`,
      action: "query_answer",
      data: { totalResidents: Number(summary.total_residents || 0) },
    });
  }

  if (containsAny(text, ["pending complaint", "open complaint", "open complaints"])) {
    return res.json({
      reply: `Pending complaints: ${Number(summary.pending_complaints || 0)}.`,
      action: "query_answer",
      data: { pendingComplaints: Number(summary.pending_complaints || 0) },
    });
  }

  if (containsAny(text, ["monthly revenue", "revenue", "revnue", "revnua", "income", "collection"])) {
    return res.json({
      reply: `Monthly revenue is Rs ${Number(summary.monthly_revenue || 0).toLocaleString("en-IN")}.`,
      action: "query_answer",
      data: { monthlyRevenue: Number(summary.monthly_revenue || 0) },
    });
  }

  if (containsAny(text, ["visitor", "visitors"])) {
    const pending = visitors.filter((row) => String(row.status).toLowerCase() === "pending").length;
    const approved = visitors.filter((row) => String(row.status).toLowerCase() === "approved").length;
    return res.json({
      reply: `Visitors summary: total ${visitors.length}, pending ${pending}, approved ${approved}.`,
      action: "query_answer",
      data: { totalVisitors: visitors.length, pending, approved, visitors: visitors.slice(0, 5) },
    });
  }

  if (containsAny(text, ["billing", "invoice", "payment", "payments"])) {
    const unpaid = billing.filter((row) => String(row.status).toLowerCase() !== "paid");
    const unpaidAmount = unpaid.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    return res.json({
      reply: `Unpaid invoices: ${unpaid.length}, total Rs ${unpaidAmount.toLocaleString("en-IN")}.`,
      action: "query_answer",
      data: { unpaidInvoices: unpaid.length, unpaidAmount, invoices: unpaid.slice(0, 5) },
    });
  }

  if (containsAny(text, ["amenity", "amenities", "booking", "bookings", "slot", "slots"])) {
    const today = new Date();
    const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const amenities = await getAmenitiesByDate(date);
    const totals = amenities.reduce(
      (acc, row) => {
        const booked = Array.isArray(row.bookedSlots) ? row.bookedSlots.length : 0;
        const free = Array.isArray(row.availableSlots) ? row.availableSlots.length : 0;
        return {
          booked: acc.booked + booked,
          free: acc.free + free,
        };
      },
      { booked: 0, free: 0 },
    );

    return res.json({
      reply: `Amenities on ${date}: ${amenities.length} amenities, ${totals.booked} booked slot(s), ${totals.free} available slot(s).`,
      action: "query_answer",
      data: {
        date,
        amenities: amenities.slice(0, 5).map((item) => ({
          name: item.name,
          bookedSlots: item.bookedSlots?.length || 0,
          availableSlots: item.availableSlots?.length || 0,
        })),
        totalAmenities: amenities.length,
        totalBookedSlots: totals.booked,
        totalAvailableSlots: totals.free,
      },
    });
  }

  if (!isDataQuestion(message)) {
    return res.json({
      reply:
        "I did not understand that request. Try: total residents, pending complaints, monthly revenue, visitors summary, unpaid invoices, add resident, add visitor, raise complaint, or logout.",
      action: "help",
    });
  }

  return res.json({
    reply: `Here is the latest website snapshot: residents ${Number(summary.total_residents || 0)}, pending complaints ${Number(summary.pending_complaints || 0)}, monthly revenue Rs ${Number(summary.monthly_revenue || 0).toLocaleString("en-IN")}, visitors ${visitors.length}, unpaid invoices ${billing.filter((row) => String(row.status).toLowerCase() !== "paid").length}.`,
    action: "query_answer",
    data: {
      totalResidents: Number(summary.total_residents || 0),
      pendingComplaints: Number(summary.pending_complaints || 0),
      monthlyRevenue: Number(summary.monthly_revenue || 0),
      topComplaint: complaints[0] || null,
      defaulters: defaulters.slice(0, 5),
    },
  });
}));

app.use((error, _, res, __) => {
  res.status(500).json({
    error: "Server error",
    details: error.message,
  });
});

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
