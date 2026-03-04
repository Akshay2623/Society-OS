import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "../services/api";

function Amenities() {
  const [amenitiesData, setAmenitiesData] = useState([]);
  const [selected, setSelected] = useState({});
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [residentName, setResidentName] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingAmenityId, setSavingAmenityId] = useState(null);
  const [actionBookingId, setActionBookingId] = useState(null);
  const [editingBookingId, setEditingBookingId] = useState(null);
  const [editSlotByBooking, setEditSlotByBooking] = useState({});
  const [feedback, setFeedback] = useState("");

  const loadAmenities = async (selectedDate) => {
    setLoading(true);
    try {
      const data = await api.getAmenities(selectedDate);
      setAmenitiesData(data || []);
    } catch {
      setAmenitiesData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAmenities(date);
  }, [date]);

  const bookAmenity = async (amenity) => {
    const slot = selected[amenity.id];
    if (!slot) {
      setFeedback(`Select a slot for ${amenity.name} first.`);
      return;
    }
    setFeedback("");
    setSavingAmenityId(amenity.id);
    try {
      const booking = await api.addAmenityBooking({
        amenityId: amenity.id,
        date,
        slot,
        residentName: residentName.trim() || undefined,
      });
      setFeedback(`Booked ${booking.amenityName} on ${booking.date} at ${booking.slot} for ${booking.residentName}.`);
      setSelected((prev) => ({ ...prev, [amenity.id]: "" }));
      await loadAmenities(date);
    } catch (error) {
      setFeedback(error.message || "Booking failed");
    } finally {
      setSavingAmenityId(null);
    }
  };

  const startEditBooking = (amenity, entry) => {
    setEditingBookingId(entry.bookingId);
    setEditSlotByBooking((prev) => ({ ...prev, [entry.bookingId]: entry.slot }));
    setFeedback("");
  };

  const saveEditBooking = async (amenity, entry) => {
    const nextSlot = editSlotByBooking[entry.bookingId];
    if (!nextSlot) {
      setFeedback("Please select a slot to update.");
      return;
    }
    setActionBookingId(entry.bookingId);
    setFeedback("");
    try {
      await api.updateAmenityBooking(entry.bookingId, { slot: nextSlot, date });
      setFeedback(`Updated booking ${entry.bookingId} to ${nextSlot} on ${date}.`);
      setEditingBookingId(null);
      await loadAmenities(date);
    } catch (error) {
      setFeedback(error.message || "Unable to update booking");
    } finally {
      setActionBookingId(null);
    }
  };

  const deleteBooking = async (entry) => {
    setActionBookingId(entry.bookingId);
    setFeedback("");
    try {
      await api.deleteAmenityBooking(entry.bookingId);
      setFeedback(`Deleted booking ${entry.bookingId}.`);
      if (editingBookingId === entry.bookingId) setEditingBookingId(null);
      await loadAmenities(date);
    } catch (error) {
      setFeedback(error.message || "Unable to delete booking");
    } finally {
      setActionBookingId(null);
    }
  };

  return (
    <section className="space-y-6">
      {/* Calendar control */}
      <div className="rounded-2xl border border-white/15 bg-slate-900/55 p-6 backdrop-blur">
        <h3 className="mb-3 text-lg font-semibold text-white">Book Amenities</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-300">Booking Date</label>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="w-full rounded-2xl border border-white/20 bg-slate-900/70 px-4 py-2.5 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-cyan-300/30"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-300">Resident Name (book for someone else)</label>
            <input
              value={residentName}
              onChange={(event) => setResidentName(event.target.value)}
              placeholder="Enter exact resident name"
              className="w-full rounded-2xl border border-white/20 bg-slate-900/70 px-4 py-2.5 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-cyan-300/30"
            />
          </div>
        </div>
        {feedback && <p className="mt-3 text-sm text-cyan-200">{feedback}</p>}
      </div>

      {/* Amenity cards and slots */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {amenitiesData.map((amenity) => (
          <motion.article
            key={amenity.id}
            whileHover={{ y: -4 }}
            className="rounded-2xl border border-white/15 bg-slate-900/55 p-6 backdrop-blur"
          >
            <h4 className="text-xl font-semibold text-white">{amenity.name}</h4>
            <p className="mt-1 text-sm text-slate-300">
              Window: {amenity.slotTime} | Capacity: {amenity.capacity}
            </p>
            <p className="mt-1 text-xs text-slate-300">Choose a free slot for {date}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {amenity.availableSlots.map((slot) => {
                const active = selected[amenity.id] === slot;
                return (
                  <motion.button
                    key={slot}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSelected((prev) => ({ ...prev, [amenity.id]: slot }))}
                    className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                      active ? "bg-indigo-600 text-white shadow-soft" : "bg-white/10 text-slate-100 hover:bg-white/20"
                    }`}
                  >
                    {slot}
                  </motion.button>
                );
              })}
            </div>
            <button
              onClick={() => bookAmenity(amenity)}
              disabled={savingAmenityId === amenity.id || !selected[amenity.id] || loading}
              className="mt-4 rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingAmenityId === amenity.id ? "Booking..." : "Book Selected Slot"}
            </button>
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-300">Booked Slots</p>
              {amenity.bookedSlots?.length ? (
                amenity.bookedSlots.map((entry) => (
                  <div key={entry.bookingId} className="rounded-xl bg-white/10 px-3 py-2 text-xs text-slate-100">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span>
                        #{entry.bookingId} {entry.slot} - {entry.residentName}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEditBooking(amenity, entry)}
                          className="rounded-lg bg-white/10 px-2 py-1 text-[11px] font-semibold text-cyan-200 hover:bg-white/20"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteBooking(entry)}
                          disabled={actionBookingId === entry.bookingId}
                          className="rounded-lg bg-white/10 px-2 py-1 text-[11px] font-semibold text-rose-200 hover:bg-white/20 disabled:opacity-60"
                        >
                          {actionBookingId === entry.bookingId ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                    {editingBookingId === entry.bookingId && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <select
                          value={editSlotByBooking[entry.bookingId] || entry.slot}
                          onChange={(event) =>
                            setEditSlotByBooking((prev) => ({ ...prev, [entry.bookingId]: event.target.value }))
                          }
                          className="rounded-lg border border-white/20 bg-slate-900/70 px-2 py-1 text-[11px] text-slate-100 outline-none"
                        >
                          {[entry.slot, ...(amenity.availableSlots || [])]
                            .filter((slot, index, arr) => arr.indexOf(slot) === index)
                            .map((slot) => (
                              <option key={slot} value={slot}>
                                {slot}
                              </option>
                            ))}
                        </select>
                        <button
                          onClick={() => saveEditBooking(amenity, entry)}
                          disabled={actionBookingId === entry.bookingId}
                          className="rounded-lg bg-indigo-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
                        >
                          {actionBookingId === entry.bookingId ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={() => setEditingBookingId(null)}
                          className="rounded-lg bg-white/10 px-2 py-1 text-[11px] font-semibold text-slate-100 hover:bg-white/20"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-300">No bookings for this date.</p>
              )}
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

export default Amenities;
