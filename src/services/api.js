import { clearAuth, getToken } from "../utils/auth";
const API_BASE = "https://society-os.onrender.com";
async function request(path, options = {}) {
  const token = getToken();
  const mergedHeaders = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) {
    mergedHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: mergedHeaders,
  });
  if (!response.ok) {
    let errorMessage = `API error ${response.status}`;
    try {
      const data = await response.json();
      errorMessage = data.error || data.details || errorMessage;
    } catch {
      // no-op
    }
    if (response.status === 401) {
      clearAuth();
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    throw new Error(errorMessage);
  }
  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  login: (payload) => request("/api/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  me: () => request("/api/auth/me"),
  getDashboardSummary: () => request("/api/dashboard/summary"),
  getMaintenance: () => request("/api/dashboard/maintenance"),
  getComplaintCategories: () => request("/api/dashboard/complaint-categories"),
  getActivities: () => request("/api/dashboard/activities"),
  getResidents: (search = "", status = "All") =>
    request(`/api/residents?search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}`),
  addResident: (payload) => request("/api/residents", { method: "POST", body: JSON.stringify(payload) }),
  deleteResident: (id) => request(`/api/residents/${id}`, { method: "DELETE" }),
  getVisitors: () => request("/api/visitors"),
  addVisitor: (payload) => request("/api/visitors", { method: "POST", body: JSON.stringify(payload) }),
  updateVisitor: (id, payload) => request(`/api/visitors/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  getComplaints: () => request("/api/complaints"),
  addComplaint: (payload) => request("/api/complaints", { method: "POST", body: JSON.stringify(payload) }),
  updateComplaintStatus: (id, status) =>
    request(`/api/complaints/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  getBilling: () => request("/api/billing"),
  updateBillingStatus: (invoiceNo, status) =>
    request(`/api/billing/${invoiceNo}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  getPaymentHistory: (invoiceNo) => request(`/api/billing/${invoiceNo}/history`),
  getAmenities: (date) => request(`/api/amenities${date ? `?date=${encodeURIComponent(date)}` : ""}`),
  addAmenityBooking: (payload) => request("/api/amenities/bookings", { method: "POST", body: JSON.stringify(payload) }),
  updateAmenityBooking: (bookingId, payload) =>
    request(`/api/amenities/bookings/${bookingId}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteAmenityBooking: (bookingId) => request(`/api/amenities/bookings/${bookingId}`, { method: "DELETE" }),
  getExpenseBreakdown: () => request("/api/financial/expense-breakdown"),
  getDefaulters: () => request("/api/financial/defaulters"),
  getNotifications: (category = "") =>
    request(`/api/notifications${category ? `?category=${encodeURIComponent(category)}` : ""}`),
  createNotification: (payload) => request("/api/notifications", { method: "POST", body: JSON.stringify(payload) }),
  setNotificationRead: (id, read = true) =>
    request(`/api/notifications/${id}/read`, { method: "PATCH", body: JSON.stringify({ read }) }),
  askAssistant: (message) => request("/api/assistant", { method: "POST", body: JSON.stringify({ message }) }),
};
