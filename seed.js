// ============================================================
//  Seed data — Amin & fiancé's wedding
//  Palmer House (Empire Room / Honoré Room), Chicago
//  Wedding: 2027-07-10  ·  Welcome party: 2027-07-08
//  Used for: (1) instant demo mode in the browser, and
//            (2) one-click import into Supabase later.
// ============================================================

window.SEED = {
  settings: {
    id: 1,
    wedding_date: "2027-07-10",
    partner_a: "Amin",
    partner_b: "",
    venue: "Palmer House Hilton, Chicago",
    ceremony_room: "Empire Room",
    cocktail_room: "Honoré Room",
    welcome_date: "2027-07-08",
    welcome_venue: "",
    total_budget: 0,
    theme_color: "#8a6d3b",
  },

  // ---- Master checklist, backward-planned from the wedding date ----
  tasks: [
    // DONE / locked in
    { title: "Book ceremony + reception venue (Palmer House)", category: "Venue", due_date: "2026-05-01", owner: "Both", status: "done" },
    { title: "Set the date — July 10, 2027", category: "Venue", due_date: "2026-05-01", owner: "Both", status: "done" },
    { title: "Reserve Empire Room (ceremony/reception)", category: "Venue", due_date: "2026-05-01", owner: "Both", status: "done" },
    { title: "Reserve Honoré Room (cocktail hour)", category: "Venue", due_date: "2026-05-01", owner: "Both", status: "done" },

    // 12+ months out (now – mid 2026)
    { title: "Set overall budget & who's contributing", category: "Budget", due_date: "2026-07-01", owner: "Both", status: "todo" },
    { title: "Draft the guest list (aim ~150)", category: "Guests", due_date: "2026-07-15", owner: "Both", status: "todo" },
    { title: "Decide wedding party (who's standing up)", category: "People", due_date: "2026-08-01", owner: "Both", status: "todo" },
    { title: "Book photographer", category: "Vendors", due_date: "2026-08-15", owner: "Both", status: "todo" },
    { title: "Book videographer", category: "Vendors", due_date: "2026-08-15", owner: "Both", status: "todo" },
    { title: "Lock the singer / band / DJ", category: "Vendors", due_date: "2026-08-30", owner: "Both", status: "todo", notes: "Singer tentatively identified — confirm & contract." },
    { title: "Book officiant", category: "Vendors", due_date: "2026-09-01", owner: "Both", status: "todo" },

    // 9–11 months out
    { title: "Hire florist / decor vendor", category: "Vendors", due_date: "2026-09-15", owner: "Both", status: "todo", notes: "Not yet booked — priority. Get Palmer House preferred-vendor list." },
    { title: "Confirm catering / menu path with Palmer House", category: "Food", due_date: "2026-09-15", owner: "Both", status: "todo" },
    { title: "Choose welcome party venue (Thu Jul 8)", category: "Welcome Party", due_date: "2026-09-30", owner: "Both", status: "todo", notes: "Still TBD. Pick a spot near the Palmer House for out-of-towners." },
    { title: "Book hotel room block for guests", category: "Logistics", due_date: "2026-10-01", owner: "Both", status: "todo" },
    { title: "Start wedding website", category: "Paper", due_date: "2026-10-01", owner: "Both", status: "todo" },
    { title: "Send save-the-dates", category: "Paper", due_date: "2026-11-01", owner: "Both", status: "todo" },

    // 6–8 months out
    { title: "Shop wedding dress / attire", category: "Attire", due_date: "2026-11-15", owner: "Both", status: "todo" },
    { title: "Order suits / tuxedos", category: "Attire", due_date: "2027-01-15", owner: "Amin", status: "todo" },
    { title: "Book hair & makeup", category: "Vendors", due_date: "2026-12-01", owner: "Both", status: "todo" },
    { title: "Book transportation (shuttles/cars)", category: "Logistics", due_date: "2026-12-15", owner: "Both", status: "todo" },
    { title: "Order cake / dessert tasting", category: "Food", due_date: "2027-01-10", owner: "Both", status: "todo" },
    { title: "Register for gifts", category: "Registry", due_date: "2027-01-15", owner: "Both", status: "todo" },

    // 4–6 months out
    { title: "Finalize invitation design & order", category: "Paper", due_date: "2027-02-15", owner: "Both", status: "todo" },
    { title: "Plan ceremony details & readings", category: "Ceremony", due_date: "2027-03-01", owner: "Both", status: "todo" },
    { title: "Book rehearsal dinner", category: "Events", due_date: "2027-03-01", owner: "Both", status: "todo" },
    { title: "Choose & order favors", category: "Decor", due_date: "2027-03-15", owner: "Both", status: "todo" },
    { title: "Arrange marriage license logistics (IL)", category: "Legal", due_date: "2027-03-15", owner: "Both", status: "todo" },

    // 2–4 months out
    { title: "Mail invitations", category: "Paper", due_date: "2027-04-10", owner: "Both", status: "todo" },
    { title: "Finalize menu & bar selections", category: "Food", due_date: "2027-04-20", owner: "Both", status: "todo" },
    { title: "Buy wedding bands", category: "Attire", due_date: "2027-04-15", owner: "Both", status: "todo" },
    { title: "Plan honeymoon", category: "Honeymoon", due_date: "2027-04-30", owner: "Both", status: "todo" },
    { title: "First dress fitting", category: "Attire", due_date: "2027-05-01", owner: "Both", status: "todo" },

    // 1–2 months out
    { title: "RSVP deadline — chase stragglers", category: "Guests", due_date: "2027-06-10", owner: "Both", status: "todo" },
    { title: "Build seating chart", category: "Guests", due_date: "2027-06-20", owner: "Both", status: "todo" },
    { title: "Finalize day-of timeline with venue & vendors", category: "Logistics", due_date: "2027-06-20", owner: "Both", status: "todo" },
    { title: "Get marriage license", category: "Legal", due_date: "2027-06-25", owner: "Both", status: "todo" },
    { title: "Final headcount to Palmer House", category: "Food", due_date: "2027-06-30", owner: "Both", status: "todo" },
    { title: "Write vows / toasts", category: "Ceremony", due_date: "2027-06-30", owner: "Both", status: "todo" },

    // Final weeks
    { title: "Final dress fitting", category: "Attire", due_date: "2027-07-01", owner: "Both", status: "todo" },
    { title: "Confirm all vendor arrival times & balances", category: "Vendors", due_date: "2027-07-03", owner: "Both", status: "todo" },
    { title: "Make final payments / prep gratuity envelopes", category: "Budget", due_date: "2027-07-06", owner: "Both", status: "todo" },
    { title: "Pack for welcome party + wedding night", category: "Logistics", due_date: "2027-07-07", owner: "Both", status: "todo" },
    { title: "Welcome party — Thursday", category: "Welcome Party", due_date: "2027-07-08", owner: "Both", status: "todo" },
    { title: "Rehearsal + rehearsal dinner", category: "Events", due_date: "2027-07-09", owner: "Both", status: "todo" },
    { title: "WEDDING DAY 🎉", category: "Events", due_date: "2027-07-10", owner: "Both", status: "todo" },
    { title: "Return rentals / send thank-you notes", category: "Post", due_date: "2027-07-20", owner: "Both", status: "todo" },
  ],

  // ---- Budget categories (estimates are rough Chicago/150-guest placeholders) ----
  budget_items: [
    { category: "Venue", label: "Reception venue", estimated: 50000, actual: 0, paid: false },
    { category: "Catering", label: "Dinner + service (150 guests)", estimated: 22000, actual: 0, paid: false },
    { category: "Bar", label: "Open bar package", estimated: 9000, actual: 0, paid: false },
    { category: "Photography", label: "Photographer", estimated: 6500, actual: 0, paid: false },
    { category: "Videography", label: "Videographer", estimated: 4500, actual: 0, paid: false },
    { category: "Music", label: "Singer / band / DJ", estimated: 5000, actual: 0, paid: false },
    { category: "Flowers/Decor", label: "Florist & decor", estimated: 12000, actual: 0, paid: false },
    { category: "Attire", label: "Dress, suit, alterations", estimated: 6000, actual: 0, paid: false },
    { category: "Hair/Makeup", label: "Hair & makeup", estimated: 1500, actual: 0, paid: false },
    { category: "Cake", label: "Cake / desserts", estimated: 1500, actual: 0, paid: false },
    { category: "Paper", label: "Invitations & stationery", estimated: 2000, actual: 0, paid: false },
    { category: "Welcome Party", label: "Thursday welcome party", estimated: 6000, actual: 0, paid: false },
    { category: "Transportation", label: "Shuttles / cars", estimated: 2000, actual: 0, paid: false },
    { category: "Officiant", label: "Officiant", estimated: 800, actual: 0, paid: false },
    { category: "Favors", label: "Favors & welcome bags", estimated: 1500, actual: 0, paid: false },
    { category: "Rings", label: "Wedding bands", estimated: 4000, actual: 0, paid: false },
    { category: "Misc", label: "Contingency / tips", estimated: 5000, actual: 0, paid: false },
  ],

  // ---- Vendors (one row per category to fill in) ----
  vendors: [
    { name: "Palmer House Hilton", category: "Venue", status: "booked", contract_signed: true, notes: "Empire Room + Honoré Room booked." },
    { name: "", category: "Catering", status: "researching" },
    { name: "", category: "Photography", status: "researching" },
    { name: "", category: "Videography", status: "researching" },
    { name: "", category: "Music", status: "contacted", notes: "Singer tentatively identified — confirm." },
    { name: "", category: "Flowers/Decor", status: "researching", notes: "Top priority to book." },
    { name: "", category: "Officiant", status: "researching" },
    { name: "", category: "Hair/Makeup", status: "researching" },
    { name: "", category: "Cake", status: "researching" },
    { name: "", category: "Transportation", status: "researching" },
  ],

  // ---- Seating: starter tables (15 × 10 = 150) ----
  tables_seating: Array.from({ length: 15 }, (_, i) => ({
    name: `Table ${i + 1}`, capacity: 10, sort: i,
  })),

  // ---- Guests: a few example rows so the UI isn't empty ----
  guests: [
    { name: "Example Guest", party: "Sample household", side: "Both", rsvp: "pending", attending_count: 2, invited_welcome: true, notes: "Delete me — replace with your real list." },
  ],

  // ---- Day-of run-of-show template (wedding day) ----
  timeline_events: [
    { event_day: "welcome", time: "18:30", title: "Welcome party begins", location: "TBD", responsible: "Both", sort: 0 },
    { event_day: "wedding", time: "14:00", title: "Hair & makeup done", location: "Suite", responsible: "Both", sort: 0 },
    { event_day: "wedding", time: "15:00", title: "First look / photos", location: "Palmer House", responsible: "Photographer", sort: 1 },
    { event_day: "wedding", time: "16:30", title: "Guests arrive", location: "Empire Room", responsible: "Venue", sort: 2 },
    { event_day: "wedding", time: "17:00", title: "Ceremony", location: "Empire Room", responsible: "Officiant", sort: 3 },
    { event_day: "wedding", time: "17:30", title: "Cocktail hour", location: "Honoré Room", responsible: "Catering", sort: 4 },
    { event_day: "wedding", time: "18:30", title: "Reception entrance & dinner", location: "Empire Room", responsible: "Catering", sort: 5 },
    { event_day: "wedding", time: "20:00", title: "First dance / toasts", location: "Empire Room", responsible: "Music", sort: 6 },
    { event_day: "wedding", time: "20:30", title: "Open dancing", location: "Empire Room", responsible: "Music", sort: 7 },
    { event_day: "wedding", time: "23:00", title: "Last dance / send-off", location: "Empire Room", responsible: "Both", sort: 8 },
  ],

  registry: [],
  inspiration: [],
  documents: [],

  // ---- Payment schedule (sample deposits — demo mode only) ----
  payments: [
    { payee: "Reception venue", label: "Deposit 1", amount: 5000, due_date: "2026-09-01", paid: true, paid_date: "2026-08-20", method: "Card", sort: 1 },
    { payee: "Reception venue", label: "Deposit 2", amount: 5000, due_date: "2027-02-01", paid: false, sort: 2 },
    { payee: "Reception venue", label: "Final balance", amount: 5000, due_date: "2027-06-15", paid: false, sort: 3 },
  ],
};
