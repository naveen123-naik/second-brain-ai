import { useEffect, useState } from "react";
import API from "../api/api";
import { Calendar as CalendarIcon, Clock, RefreshCw, Plus, X, Loader2, Wifi, WifiOff, HardDrive, Trash2 } from "lucide-react";

function Calendar() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ summary: "", start: "", end: "" });
  const [adding, setAdding] = useState(false);
  const [addMsg, setAddMsg] = useState("");

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const res = await API.get("/calendar/");
      setEvents(res.data.events || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!form.summary || !form.start || !form.end) return;
    setAdding(true);
    setAddMsg("");
    try {
      await API.post("/calendar/add", form);
      setAddMsg("Event anchored successfully.");
      setForm({ summary: "", start: "", end: "" });
      setShowForm(false);
      await loadEvents(); // Refresh list
    } catch {
      setAddMsg("Failed to anchor event.");
    }
    setAdding(false);
  };

  const handleDeleteEvent = async (eventId) => {
    if (!eventId) return;
    if (!window.confirm("Are you sure you want to delete this event from the timeline?")) return;
    
    setLoading(true);
    try {
      await API.delete(`/calendar/${eventId}`);
      await loadEvents(); // refresh list
    } catch (e) {
      console.error(e);
      alert("Failed to delete event.");
    }
    setLoading(false);
  };

  const sourceIcon = (source) => {
    if (source === "google") return <Wifi className="w-3 h-3" />;
    if (source === "local") return <HardDrive className="w-3 h-3" />;
    return <WifiOff className="w-3 h-3" />;
  };

  const sourceBadge = (source) => {
    const labels = { google: "Google Calendar", local: "Local", demo: "Demo" };
    const colors = {
      google: "text-[#00affe] border-[#00affe]/30 bg-[#00affe]/10",
      local: "text-[#e966ff] border-[#e966ff]/30 bg-[#e966ff]/10",
      demo:  "text-[#aba9bb] border-white/10 bg-white/5",
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-mono ${colors[source] || colors.demo}`}>
        {sourceIcon(source)}
        {labels[source] || "unknown"}
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto">

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl text-[#e9e6f9] mb-2 tracking-tight">Temporal Timeline</h1>
          <p className="text-[#aba9bb]">Synchronized events and memory anchors in the temporal grid.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setShowForm(v => !v); setAddMsg(""); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#a882ff] hover:bg-[#b6a0ff] text-white rounded-xl text-sm font-semibold transition-all hover:shadow-[0_0_15px_rgba(168,130,255,0.4)]"
          >
            <Plus className="w-4 h-4" />
            Add Event
          </button>
          <button
            onClick={loadEvents}
            className="p-3 bg-[#121220] border border-white/10 rounded-full hover:bg-white/5 transition-colors group"
          >
            <RefreshCw className={`w-5 h-5 text-[#b6a0ff] ${loading ? 'animate-spin' : 'group-hover:-rotate-90 transition-transform duration-300'}`} />
          </button>
        </div>
      </div>

      {/* Add Event Form */}
      {showForm && (
        <div className="mb-8 glass-card p-6 border border-[#a882ff]/20 relative">
          <button
            onClick={() => setShowForm(false)}
            className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <h3 className="font-mono text-sm tracking-widest uppercase text-[#a882ff] mb-5">Anchor New Event</h3>
          <form onSubmit={handleAddEvent} className="flex flex-col gap-4">
            <input
              className="w-full bg-[#121220] border border-white/10 text-[#e9e6f9] p-3 rounded-xl focus:outline-none focus:border-[#a882ff]/50 transition-colors placeholder:text-white/30"
              placeholder="Event title..."
              value={form.summary}
              onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-mono text-[#aba9bb] mb-1 block">START</label>
                <input
                  type="datetime-local"
                  className="w-full bg-[#121220] border border-white/10 text-[#e9e6f9] p-3 rounded-xl focus:outline-none focus:border-[#a882ff]/50 transition-colors"
                  value={form.start}
                  onChange={e => setForm(f => ({ ...f, start: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-mono text-[#aba9bb] mb-1 block">END</label>
                <input
                  type="datetime-local"
                  className="w-full bg-[#121220] border border-white/10 text-[#e9e6f9] p-3 rounded-xl focus:outline-none focus:border-[#a882ff]/50 transition-colors"
                  value={form.end}
                  onChange={e => setForm(f => ({ ...f, end: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={adding}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#a882ff] hover:bg-[#b6a0ff] disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all"
              >
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {adding ? "Anchoring..." : "Anchor Event"}
              </button>
              {addMsg && <span className="text-sm font-mono text-[#00affe]">{addMsg}</span>}
            </div>
          </form>
        </div>
      )}

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.length === 0 && !loading && (
          <div className="col-span-full py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_rgba(255,255,255,0.05)]">
              <CalendarIcon className="w-7 h-7 text-white" />
            </div>
            <p className="text-[#aba9bb] font-mono tracking-widest uppercase text-sm">No temporal anchors found.</p>
            <p className="text-white/30 text-xs mt-2">Add an event above to get started.</p>
          </div>
        )}

        {events.map((ev, i) => (
          <div key={i} className="glass-card flex flex-col relative overflow-hidden group">
            {/* Hover glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#a882ff] opacity-0 blur-[60px] group-hover:opacity-10 transition-opacity duration-500 pointer-events-none"></div>

            <div className="p-5 border-b border-white/5 flex items-start justify-between gap-3">
              <h2 className="font-display text-base text-[#e9e6f9] leading-tight flex-1 min-w-0" title={ev.summary}>{ev.summary}</h2>
              <div className="flex items-center gap-2 shrink-0">
                {sourceBadge(ev.source || "demo")}
                <button
                  onClick={() => handleDeleteEvent(ev.id)}
                  className="p-1 rounded-lg text-white/40 hover:text-red-400 hover:bg-white/5 transition-all"
                  title="Delete event"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="p-5 flex flex-col gap-3 flex-1 bg-[#121220]/30">
              {ev.start && (
                <div className="flex items-center gap-3 text-sm text-[#aba9bb]">
                  <Clock className="w-4 h-4 text-[#a882ff] shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-[11px] font-mono text-white/40 uppercase">STARTS</span>
                    <span>{new Date(ev.start).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
                  </div>
                </div>
              )}
              {ev.end && (
                <div className="flex items-center gap-3 text-sm text-[#aba9bb]">
                  <Clock className="w-4 h-4 text-[#00affe] shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-[11px] font-mono text-white/40 uppercase">ENDS</span>
                    <span>{new Date(ev.end).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
                  </div>
                </div>
              )}
              {ev.start && ev.end && (
                <div className="mt-1 text-xs font-mono text-[#aba9bb]">
                  Duration:{" "}
                  <span className="text-[#e9e6f9]">
                    {Math.round((new Date(ev.end) - new Date(ev.start)) / 60000)} min
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="col-span-full flex justify-center py-10">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#b6a0ff] animate-bounce"></div>
              <div className="w-2 h-2 rounded-full bg-[#00affe] animate-bounce delay-100"></div>
              <div className="w-2 h-2 rounded-full bg-[#e966ff] animate-bounce delay-200"></div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

export default Calendar;