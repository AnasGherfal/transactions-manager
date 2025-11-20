export const companies = [
  {
    id: 1,
    name: "Anis Cards",
    email: "cards@anis.ly",
    percent_cut: 10,
    location: "Tripoli - Dahra",
    phone: "091-0000000",
    notes: "Pays usually every week.",
    total_paid: 12000,
    total_due: 3000,
    receipt: null, // placeholder for future uploads
    google_maps_url:'',
    orders: [
      { id: 1, date: "2025-11-01", amount: 5000, cards: 200, status: "Paid" },
      { id: 2, date: "2025-11-10", amount: 3000, cards: 120, status: "Pending" },
    ],
  },
  {
    id: 2,
    name: "Libya Pay",
        email: "cards@anis.ly",
    percent_cut: 8,
    location: "Benghazi",
    phone: "092-8888888",
        google_maps_url:'',

    notes: "Reliable.",
    total_paid: 9000,
    total_due: 1500,
    receipt: null,
    orders: [
      { id: 1, date: "2025-10-15", amount: 4000, cards: 150, status: "Paid" },
    ],
  },
]
