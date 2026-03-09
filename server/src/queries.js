import { query } from "./db.js";
import bcrypt from "bcryptjs";

function toTitleCase(value) {
  if (!value) return value;
  return value
    .replaceAll("_", " ")
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export async function getDashboardSummary() {
  const sql = `
    WITH paid_payments AS (
      SELECT
        amount,
        CASE
          WHEN payment_date IS NOT NULL THEN date_trunc('month', payment_date)::date
          WHEN month ~ '^[A-Za-z]{3}\\s+\\d{4}$' THEN to_date(month, 'Mon YYYY')
          WHEN month ~ '^[A-Za-z]+\\s+\\d{4}$' THEN to_date(month, 'Month YYYY')
          WHEN month ~ '^\\d{4}-\\d{2}$' THEN to_date(month || '-01', 'YYYY-MM-DD')
          ELSE NULL
        END AS month_date
      FROM payments
      WHERE status = 'paid'
    ),
    target_month AS (
      SELECT COALESCE(
        (SELECT date_trunc('month', now())::date
         WHERE EXISTS (
           SELECT 1 FROM paid_payments
           WHERE month_date = date_trunc('month', now())::date
         )),
        (SELECT MAX(month_date) FROM paid_payments)
      ) AS month_date
    )
    SELECT
      (SELECT COUNT(*)::int FROM users WHERE role = 'resident') AS total_residents,
      (SELECT COUNT(*)::int FROM flats) AS total_flats,
      (SELECT COUNT(*)::int FROM complaints WHERE status IN ('open', 'in_progress')) AS pending_complaints,
      (
        SELECT COALESCE(SUM(pp.amount), 0)::bigint
        FROM paid_payments pp
        CROSS JOIN target_month tm
        WHERE pp.month_date = tm.month_date
      ) AS monthly_revenue
  `;
  const { rows } = await query(sql);
  return rows[0];
}

export async function getMonthlyMaintenance() {
  const sql = `
    WITH months AS (
      SELECT date_trunc('month', now()) - (n * interval '1 month') AS month_start
      FROM generate_series(5, 0, -1) AS n
    ),
    paid AS (
      SELECT
        date_trunc('month', COALESCE(payment_date, now())) AS month_start,
        SUM(amount)::bigint AS revenue
      FROM payments
      WHERE status = 'paid'
      GROUP BY 1
    ),
    expected AS (
      SELECT COALESCE(SUM(maintenance_amount), 0)::bigint AS monthly_expected
      FROM flats
    )
    SELECT
      to_char(m.month_start, 'Mon') AS month,
      COALESCE(p.revenue, 0)::bigint AS revenue,
      ROUND(e.monthly_expected * 0.72)::bigint AS expense,
      CASE
        WHEN e.monthly_expected = 0 THEN 0
        ELSE ROUND((COALESCE(p.revenue, 0)::numeric / e.monthly_expected::numeric) * 100)::int
      END AS collection
    FROM months m
    LEFT JOIN paid p ON p.month_start = m.month_start
    CROSS JOIN expected e
    ORDER BY m.month_start
  `;
  const { rows } = await query(sql);
  return rows;
}

export async function getComplaintCategories() {
  const sql = `
    SELECT
      INITCAP(category) AS name,
      COUNT(*)::int AS value
    FROM complaints
    GROUP BY category
    ORDER BY value DESC
  `;
  const { rows } = await query(sql);
  return rows;
}

export async function getRecentActivities() {
  const sql = `
    (
      SELECT
        ('Maintenance payment received from Flat ' || f.flat_number) AS message,
        COALESCE(p.payment_date, now()) AS created_at
      FROM payments p
      JOIN users u ON u.id = p.user_id
      LEFT JOIN flats f ON f.id = u.flat_id
      WHERE p.status = 'paid'
      ORDER BY COALESCE(p.payment_date, now()) DESC
      LIMIT 4
    )
    UNION ALL
    (
      SELECT
        ('Complaint #' || c.id || ' moved to ' || replace(c.status, '_', ' ')) AS message,
        c.created_at
      FROM complaints c
      ORDER BY c.created_at DESC
      LIMIT 4
    )
    ORDER BY created_at DESC
    LIMIT 10
  `;
  const { rows } = await query(sql);
  return rows;
}

export async function getResidents({ search = "", status = "All" }) {
  const schema = await getUsersSchemaFlags();
  const sql = `
    SELECT
      u.id,
      u.name,
      lower(u.email) AS email,
      u.phone,
      u.role,
      u.flat_id AS flat_id,
      ${
        schema.hasPassword
          ? "COALESCE(u.password, '')"
          : schema.hasPasswordHash
            ? "CASE WHEN COALESCE(u.password_hash, '') <> '' THEN '********' ELSE '' END"
            : "''"
      } AS password,
      ${schema.hasIsActive ? "u.is_active" : "true"} AS is_active,
      CASE WHEN ${schema.hasIsActive ? "u.is_active" : "true"} THEN 'Active' ELSE 'Inactive' END AS status
    FROM users u
    WHERE (
        $1 = ''
        OR u.name ILIKE '%' || $1 || '%'
        OR u.email ILIKE '%' || $1 || '%'
        OR u.role ILIKE '%' || $1 || '%'
        OR CAST(u.flat_id AS text) ILIKE '%' || $1 || '%'
      )
      AND (
        $2 = 'All'
        OR ($2 = 'Active' AND ${schema.hasIsActive ? "u.is_active = true" : "true"})
        OR ($2 = 'Inactive' AND ${schema.hasIsActive ? "u.is_active = false" : "false"})
      )
    ORDER BY u.name
  `;
  const { rows } = await query(sql, [search, status]);
  return rows;
}

export async function addResident({ name, email, phone, role, flatId, password, isActive }) {
  const schema = await getUsersSchemaFlags();
  const normalizedRole = (role || "resident").toLowerCase();
  if (!["admin", "resident", "security"].includes(normalizedRole)) {
    throw new Error("Role must be admin, resident, or security");
  }

  const normalizedFlatId = Number(flatId);
  if (!Number.isInteger(normalizedFlatId) || normalizedFlatId <= 0) {
    throw new Error("Flat ID must be a positive number");
  }

  if (!schema.hasPasswordHash && !schema.hasPassword) {
    throw new Error("users table needs password_hash or password column");
  }

  const columns = ["name", "email", "phone", "role", "flat_id"];
  const values = [name, String(email).trim().toLowerCase(), phone, normalizedRole, normalizedFlatId];

  if (schema.hasPasswordHash) {
    const passwordHash = await bcrypt.hash(password, 12);
    columns.push("password_hash");
    values.push(passwordHash);
  } else if (schema.hasPassword) {
    columns.push("password");
    values.push(password);
  }

  if (schema.hasIsActive) {
    columns.push("is_active");
    values.push(isActive !== false);
  }

  const placeholders = values.map((_, index) => `$${index + 1}`).join(", ");
  const sql = `
    INSERT INTO users (${columns.join(", ")})
    VALUES (${placeholders})
    RETURNING id
  `;
  const { rows } = await query(sql, values);
  return rows[0];
}

export async function deleteResident(id) {
  await query("DELETE FROM users WHERE id = $1 AND role = 'resident'", [id]);
}

export async function getVisitors() {
  const schema = await getVisitorsSchemaFlags();
  const sql = `
    SELECT
      v.id,
      v.name,
      ${schema.hasPurpose ? "COALESCE(v.purpose, '-')" : "COALESCE(v.phone, '-')"} AS purpose,
      ${schema.hasPhone ? "COALESCE(v.phone, '-')" : "'-'"} AS phone,
      f.flat_number AS flat,
      INITCAP(v.status) AS status,
      v.entry_time,
      v.exit_time
    FROM visitors v
    JOIN flats f ON f.id = v.flat_id
    ORDER BY v.entry_time DESC
  `;
  const { rows } = await query(sql);
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    purpose: row.purpose,
    phone: row.phone,
    flat: row.flat,
    status: row.status,
    entry: formatTime(row.entry_time),
    exit: formatTime(row.exit_time),
    entry_at: row.entry_time,
    exit_at: row.exit_time,
  }));
}

export async function addVisitor({ name, phone, purpose, flatId, status }) {
  const schema = await getVisitorsSchemaFlags();
  const normalizedFlatId = Number(flatId);
  if (!Number.isInteger(normalizedFlatId) || normalizedFlatId <= 0) {
    throw new Error("flatId must be a positive number");
  }

  const normalizedStatus = String(status || "pending").toLowerCase();
  if (!["pending", "approved", "rejected", "exited"].includes(normalizedStatus)) {
    throw new Error("status must be pending, approved, rejected, or exited");
  }

  const columns = ["name", "flat_id", "status", "entry_time"];
  const values = [name, normalizedFlatId, normalizedStatus, new Date()];

  if (schema.hasPhone) {
    columns.push("phone");
    values.push(phone || null);
  }
  if (schema.hasPurpose) {
    columns.push("purpose");
    values.push(purpose || null);
  }

  const placeholders = values.map((_, index) => `$${index + 1}`).join(", ");
  const sql = `
    INSERT INTO visitors (${columns.join(", ")})
    VALUES (${placeholders})
    RETURNING id, name, ${schema.hasPhone ? "phone" : "NULL::text AS phone"}, ${
      schema.hasPurpose ? "purpose" : "NULL::text AS purpose"
    }, flat_id, status, entry_time, exit_time
  `;
  const { rows } = await query(sql, values);
  const row = rows[0];

  const flatRow = await query("SELECT flat_number FROM flats WHERE id = $1 LIMIT 1", [row.flat_id]);
  const flatNumber = flatRow.rows[0]?.flat_number || String(row.flat_id);

  return {
    id: row.id,
    name: row.name,
    purpose: row.purpose || row.phone || "-",
    phone: row.phone || "-",
    flat: flatNumber,
    status: toTitleCase(row.status),
    entry: formatTime(row.entry_time),
    exit: formatTime(row.exit_time),
    entry_at: row.entry_time,
    exit_at: row.exit_time,
  };
}

export async function updateVisitor({ id, status, exitTime }) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new Error("Invalid visitor id");
  }

  const normalizedStatus = String(status || "").toLowerCase();
  if (!["pending", "approved", "rejected", "denied", "exited"].includes(normalizedStatus)) {
    throw new Error("status must be pending, approved, rejected, denied, or exited");
  }
  const mappedStatus = normalizedStatus === "denied" ? "rejected" : normalizedStatus;
  const normalizedExit = exitTime ? new Date(exitTime) : null;
  if (exitTime && Number.isNaN(normalizedExit.getTime())) {
    throw new Error("Invalid exitTime");
  }

  const sql = `
    UPDATE visitors
    SET status = $2, exit_time = $3
    WHERE id = $1
    RETURNING id, name, flat_id, status, entry_time, exit_time
  `;
  const { rows } = await query(sql, [numericId, mappedStatus, normalizedExit]);
  if (!rows[0]) {
    throw new Error("Visitor not found");
  }
  const row = rows[0];

  const schema = await getVisitorsSchemaFlags();
  const extraSql = `
    SELECT
      ${schema.hasPurpose ? "COALESCE(purpose, '-')" : "COALESCE(phone, '-')"} AS purpose,
      ${schema.hasPhone ? "COALESCE(phone, '-')" : "'-'"} AS phone
    FROM visitors
    WHERE id = $1
  `;
  const extra = await query(extraSql, [numericId]);
  const flatRow = await query("SELECT flat_number FROM flats WHERE id = $1 LIMIT 1", [row.flat_id]);

  return {
    id: row.id,
    name: row.name,
    purpose: extra.rows[0]?.purpose || "-",
    phone: extra.rows[0]?.phone || "-",
    flat: flatRow.rows[0]?.flat_number || String(row.flat_id),
    status: toTitleCase(row.status),
    entry: formatTime(row.entry_time),
    exit: formatTime(row.exit_time),
    entry_at: row.entry_time,
    exit_at: row.exit_time,
  };
}

export async function getComplaints() {
  const sql = `
    SELECT
      c.id,
      ('CMP-' || c.id) AS ticket_no,
      c.description AS title,
      INITCAP(c.category) AS category,
      INITCAP(c.priority) AS priority,
      c.status
    FROM complaints c
    JOIN users u ON u.id = c.user_id
    ORDER BY c.created_at DESC
  `;
  const { rows } = await query(sql);
  return rows.map((row) => ({
    id: row.ticket_no,
    title: row.title,
    category: row.category,
    priority: row.priority === "Urgent" ? "High" : row.priority,
    status: toTitleCase(row.status),
  }));
}

export async function addComplaint({ userId, title, category, priority }) {
  const sql = `
    INSERT INTO complaints (user_id, description, category, priority, status)
    VALUES ($1, $2, $3, $4, 'open')
    RETURNING id, description, category, priority, status
  `;
  const { rows } = await query(sql, [
    userId,
    title,
    String(category || "").toLowerCase(),
    String(priority || "").toLowerCase(),
  ]);
  const row = rows[0];
  return {
    id: `CMP-${row.id}`,
    title: row.description,
    category: toTitleCase(row.category),
    priority: toTitleCase(row.priority),
    status: toTitleCase(row.status),
  };
}

export async function updateComplaintStatus(id, status) {
  const mapped = status.toLowerCase().replaceAll(" ", "_");
  const numericId = Number(String(id).replace("CMP-", ""));
  await query("UPDATE complaints SET status = $1 WHERE id = $2", [mapped, numericId]);
}

export async function getBilling() {
  const sql = `
    SELECT
      p.id,
      ('INV-' || p.id) AS invoice_no,
      u.name AS resident,
      f.flat_number AS flat,
      p.amount::bigint AS amount,
      p.month,
      INITCAP(p.status) AS status
    FROM payments p
    JOIN users u ON u.id = p.user_id
    LEFT JOIN flats f ON f.id = u.flat_id
    ORDER BY p.id DESC
  `;
  const { rows } = await query(sql);
  return rows.map((row) => ({
    id: row.invoice_no,
    resident: row.resident,
    flat: row.flat,
    amount: row.amount,
    month: row.month,
    status: row.status === "Paid" ? "Paid" : "Unpaid",
  }));
}

export async function getPaymentHistory(invoiceNo) {
  const numericId = Number(String(invoiceNo).replace("INV-", ""));
  const sql = `
    SELECT
      ('INV-' || p.id) AS id,
      u.name AS resident,
      f.flat_number AS flat,
      p.amount::bigint AS amount,
      INITCAP(p.status) AS status
    FROM payments p
    JOIN users u ON u.id = p.user_id
    LEFT JOIN flats f ON f.id = u.flat_id
    WHERE p.id = $1
  `;
  const { rows } = await query(sql, [numericId]);
  if (!rows[0]) return null;
  return {
    ...rows[0],
    status: rows[0].status === "Paid" ? "Paid" : "Unpaid",
  };
}

export async function updateBillingStatus(invoiceNo, status) {
  const numericId = Number(String(invoiceNo).replace("INV-", ""));
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new Error("Invalid invoice id");
  }

  const normalizedStatus = String(status || "").toLowerCase();
  if (!["paid", "unpaid", "pending", "failed"].includes(normalizedStatus)) {
    throw new Error("status must be Paid or Unpaid");
  }

  const mappedStatus = normalizedStatus === "unpaid" ? "pending" : normalizedStatus;
  const sql = `
    UPDATE payments
    SET status = $2
    WHERE id = $1
    RETURNING
      ('INV-' || id) AS id,
      INITCAP(status) AS status
  `;
  const { rows } = await query(sql, [numericId, mappedStatus]);
  if (!rows[0]) {
    throw new Error("Invoice not found");
  }

  return {
    id: rows[0].id,
    status: rows[0].status === "Paid" ? "Paid" : "Unpaid",
  };
}

export async function getAmenities() {
  const today = new Date();
  const selectedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const sql = `
    SELECT
      a.id,
      a.name,
      a.capacity,
      a.slot_time,
      COALESCE(
        json_agg(
          json_build_object(
            'bookingId', b.id,
            'slot', b.slot,
            'status', b.status,
            'residentName', u.name
          )
        ) FILTER (WHERE b.id IS NOT NULL),
        '[]'::json
      ) AS "bookedSlots"
    FROM amenities a
    LEFT JOIN bookings b
      ON b.amenity_id = a.id
      AND b.date = $1::date
      AND b.status = 'booked'
    LEFT JOIN users u ON u.id = b.user_id
    GROUP BY a.id, a.name, a.capacity, a.slot_time
    ORDER BY a.id
  `;
  const { rows } = await query(sql, [selectedDate]);
  return rows.map((row) => {
    const defaultSlots = ["Slot 1", "Slot 2", "Slot 3", "Slot 4", "Slot 5"];
    const bookedSlots = Array.isArray(row.bookedSlots) ? row.bookedSlots : [];
    const bookedSlotNames = new Set(bookedSlots.map((item) => item.slot));
    const availableSlots = defaultSlots.filter((slot) => !bookedSlotNames.has(slot));
    return {
      id: row.id,
      name: row.name,
      capacity: row.capacity,
      slotTime: row.slot_time,
      availableSlots,
      bookedSlots,
    };
  });
}

export async function getAmenitiesByDate(date) {
  const normalized = String(date || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error("date must be in YYYY-MM-DD format");
  }

  const sql = `
    SELECT
      a.id,
      a.name,
      a.capacity,
      a.slot_time,
      COALESCE(
        json_agg(
          json_build_object(
            'bookingId', b.id,
            'slot', b.slot,
            'status', b.status,
            'residentName', u.name
          )
        ) FILTER (WHERE b.id IS NOT NULL),
        '[]'::json
      ) AS "bookedSlots"
    FROM amenities a
    LEFT JOIN bookings b
      ON b.amenity_id = a.id
      AND b.date = $1::date
      AND b.status = 'booked'
    LEFT JOIN users u ON u.id = b.user_id
    GROUP BY a.id, a.name, a.capacity, a.slot_time
    ORDER BY a.id
  `;
  const { rows } = await query(sql, [normalized]);
  return rows.map((row) => {
    const defaultSlots = ["Slot 1", "Slot 2", "Slot 3", "Slot 4", "Slot 5"];
    const bookedSlots = Array.isArray(row.bookedSlots) ? row.bookedSlots : [];
    const bookedSlotNames = new Set(bookedSlots.map((item) => item.slot));
    const availableSlots = defaultSlots.filter((slot) => !bookedSlotNames.has(slot));
    return {
      id: row.id,
      name: row.name,
      capacity: row.capacity,
      slotTime: row.slot_time,
      availableSlots,
      bookedSlots,
    };
  });
}

export async function addAmenityBooking({ amenityId, residentName, date, slot, requestedByUserId }) {
  const numericAmenityId = Number(amenityId);
  if (!Number.isInteger(numericAmenityId) || numericAmenityId <= 0) {
    throw new Error("amenityId must be a positive number");
  }
  const normalizedDate = String(date || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
    throw new Error("date must be in YYYY-MM-DD format");
  }
  const normalizedSlot = String(slot || "").trim();
  if (!normalizedSlot) {
    throw new Error("slot is required");
  }

  const amenityRow = await query("SELECT id, name FROM amenities WHERE id = $1 LIMIT 1", [numericAmenityId]);
  if (!amenityRow.rows[0]) {
    throw new Error("Amenity not found");
  }

  let targetUser = null;
  const requestedBy = Number(requestedByUserId);
  if (residentName && String(residentName).trim()) {
    const name = String(residentName).trim();
    const users = await query(
      `
        SELECT id, name
        FROM users
        WHERE role = 'resident' AND lower(name) = lower($1)
        ORDER BY id
      `,
      [name],
    );
    if (users.rows.length === 0) {
      throw new Error(`Resident "${name}" not found`);
    }
    if (users.rows.length > 1) {
      throw new Error(`Multiple residents found for "${name}". Please use a unique full name.`);
    }
    targetUser = users.rows[0];
  } else {
    const self = await query("SELECT id, name FROM users WHERE id = $1 LIMIT 1", [requestedBy]);
    if (!self.rows[0]) {
      throw new Error("Booking user not found");
    }
    targetUser = self.rows[0];
  }

  const conflict = await query(
    `
      SELECT id
      FROM bookings
      WHERE amenity_id = $1
        AND date = $2::date
        AND lower(slot) = lower($3)
        AND status = 'booked'
      LIMIT 1
    `,
    [numericAmenityId, normalizedDate, normalizedSlot],
  );
  if (conflict.rows[0]) {
    throw new Error("This slot is already booked for the selected date");
  }

  const inserted = await query(
    `
      INSERT INTO bookings (amenity_id, user_id, date, slot, status)
      VALUES ($1, $2, $3::date, $4, 'booked')
      RETURNING id, amenity_id, user_id, date, slot, status
    `,
    [numericAmenityId, targetUser.id, normalizedDate, normalizedSlot],
  );
  const row = inserted.rows[0];
  return {
    id: row.id,
    amenityId: row.amenity_id,
    amenityName: amenityRow.rows[0].name,
    residentId: row.user_id,
    residentName: targetUser.name,
    date: normalizedDate,
    slot: row.slot,
    status: toTitleCase(row.status),
  };
}

export async function updateAmenityBooking({
  bookingId,
  slot,
  date,
  requestedByUserId,
  requestedByRole,
}) {
  const numericBookingId = Number(bookingId);
  if (!Number.isInteger(numericBookingId) || numericBookingId <= 0) {
    throw new Error("bookingId must be a positive number");
  }
  const normalizedSlot = String(slot || "").trim();
  if (!normalizedSlot) {
    throw new Error("slot is required");
  }
  const normalizedDate = String(date || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
    throw new Error("date must be in YYYY-MM-DD format");
  }

  const existing = await query(
    `
      SELECT id, amenity_id, user_id, date, slot, status
      FROM bookings
      WHERE id = $1
      LIMIT 1
    `,
    [numericBookingId],
  );
  const booking = existing.rows[0];
  if (!booking) {
    throw new Error("Booking not found");
  }
  if (requestedByRole !== "admin" && Number(requestedByUserId) !== Number(booking.user_id)) {
    throw new Error("You are not allowed to edit this booking");
  }

  const conflict = await query(
    `
      SELECT id
      FROM bookings
      WHERE amenity_id = $1
        AND date = $2::date
        AND lower(slot) = lower($3)
        AND status = 'booked'
        AND id <> $4
      LIMIT 1
    `,
    [booking.amenity_id, normalizedDate, normalizedSlot, numericBookingId],
  );
  if (conflict.rows[0]) {
    throw new Error("This slot is already booked for the selected date");
  }

  const updated = await query(
    `
      UPDATE bookings
      SET slot = $2, date = $3::date
      WHERE id = $1
      RETURNING id, amenity_id, user_id, date, slot, status
    `,
    [numericBookingId, normalizedSlot, normalizedDate],
  );
  const row = updated.rows[0];
  const amenity = await query("SELECT name FROM amenities WHERE id = $1 LIMIT 1", [row.amenity_id]);
  const resident = await query("SELECT name FROM users WHERE id = $1 LIMIT 1", [row.user_id]);
  return {
    id: row.id,
    amenityId: row.amenity_id,
    amenityName: amenity.rows[0]?.name || String(row.amenity_id),
    residentId: row.user_id,
    residentName: resident.rows[0]?.name || String(row.user_id),
    date: normalizedDate,
    slot: row.slot,
    status: toTitleCase(row.status),
  };
}

export async function deleteAmenityBooking({ bookingId, requestedByUserId, requestedByRole }) {
  const numericBookingId = Number(bookingId);
  if (!Number.isInteger(numericBookingId) || numericBookingId <= 0) {
    throw new Error("bookingId must be a positive number");
  }

  const existing = await query(
    `
      SELECT id, user_id
      FROM bookings
      WHERE id = $1
      LIMIT 1
    `,
    [numericBookingId],
  );
  const booking = existing.rows[0];
  if (!booking) {
    throw new Error("Booking not found");
  }
  if (requestedByRole !== "admin" && Number(requestedByUserId) !== Number(booking.user_id)) {
    throw new Error("You are not allowed to delete this booking");
  }

  await query("UPDATE bookings SET status = 'cancelled' WHERE id = $1", [numericBookingId]);
}

export async function getExpenseBreakdown() {
  const sql = `
    WITH revenue AS (
      SELECT COALESCE(SUM(amount), 0)::numeric AS total_revenue
      FROM payments
      WHERE status = 'paid'
    )
    SELECT name, pct AS value
    FROM (
      SELECT 'Utilities'::text AS name, 30::int AS pct
      UNION ALL SELECT 'Staff', 25
      UNION ALL SELECT 'Repairs', 20
      UNION ALL SELECT 'Security', 15
      UNION ALL SELECT 'Others', 10
    ) x
    CROSS JOIN revenue r
    WHERE r.total_revenue >= 0
  `;
  const { rows } = await query(sql);
  return rows;
}

export async function getDefaulters() {
  const sql = `
    SELECT
      u.name,
      f.flat_number AS flat,
      SUM(p.amount)::bigint AS due
    FROM payments p
    JOIN users u ON u.id = p.user_id
    LEFT JOIN flats f ON f.id = u.flat_id
    WHERE p.status IN ('pending', 'failed')
    GROUP BY u.name, f.flat_number
    ORDER BY due DESC
    LIMIT 10
  `;
  const { rows } = await query(sql);
  return rows;
}

export async function getAuthUsersByEmail(email) {
  const schema = await getUsersSchemaFlags();
  const hasPasswordHash = schema.hasPasswordHash;
  const hasPassword = schema.hasPassword;
  if (!hasPasswordHash && !hasPassword) {
    throw new Error("users table needs a password_hash column for login");
  }

  const sql = `
    SELECT
      id,
      email,
      role,
      ${hasPasswordHash ? "password_hash" : "NULL::text"} AS password_hash,
      ${hasPassword ? "password" : "NULL::text"} AS password_plain,
      ${hasPasswordHash ? "true" : "false"}::boolean AS has_password_hash_column
    FROM users
    WHERE lower(email) = lower($1)
    ORDER BY id ASC
  `;
  const { rows } = await query(sql, [email]);
  return rows;
}

async function getUsersSchemaFlags() {
  const checkSql = `
    SELECT
      EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'password_hash'
      ) AS has_password_hash,
      EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'password'
      ) AS has_password,
      EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'is_active'
      ) AS has_is_active
  `;
  const checks = await query(checkSql);
  return {
    hasPasswordHash: checks.rows[0].has_password_hash,
    hasPassword: checks.rows[0].has_password,
    hasIsActive: checks.rows[0].has_is_active,
  };
}

async function getVisitorsSchemaFlags() {
  const checkSql = `
    SELECT
      EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'visitors' AND column_name = 'phone'
      ) AS has_phone,
      EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'visitors' AND column_name = 'purpose'
      ) AS has_purpose
  `;
  const checks = await query(checkSql);
  return {
    hasPhone: checks.rows[0].has_phone,
    hasPurpose: checks.rows[0].has_purpose,
  };
}

export async function updateUserPasswordHash(userId, passwordHash) {
  const sql = `
    UPDATE users
    SET password_hash = $1
    WHERE id = $2
  `;
  await query(sql, [passwordHash, userId]);
}
