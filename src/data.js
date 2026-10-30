const addWeeks = (isoDate, weeks) => {
  const d = new Date(`${isoDate}T00:00:00`)
  d.setDate(d.getDate() + weeks * 7)
  return d.toISOString().slice(0, 10)
}

const rawMembers = [
  { name: 'Vihaan', amount: 25000, day: 'Monday', weeks: 1, start: '2026-10-26', paid: true, returned: 0, notes: '' },
  { name: 'Jena', amount: 50000, day: 'Monday', weeks: 2, start: '2026-10-26', paid: true, returned: 0, notes: '' },
  { name: 'Steven Burgershot', amount: 50000, day: 'Monday', weeks: 1, start: '2026-10-26', paid: true, returned: 0, notes: '' },
  { name: 'Seenu', amount: 25000, day: 'Monday', weeks: 1, start: '2026-10-26', paid: true, returned: 0, notes: '' },
  { name: 'Paul', amount: 25000, day: 'Monday', weeks: 1, start: '2026-10-26', paid: true, returned: 0, notes: '' },
  { name: 'Ace', amount: 25000, day: 'Monday', weeks: 1, start: '2026-10-26', paid: true, returned: 0, notes: '' },
  { name: 'Babulal', amount: 25000, day: 'Monday', weeks: 1, start: '2026-10-26', paid: true, returned: 0, notes: '' },
  { name: 'Sam Morgam', amount: 25000, day: 'Monday', weeks: 1, start: '2026-10-26', paid: true, returned: 0, notes: '' },
  { name: 'Lance', amount: 120000, day: 'Monday', weeks: 5, start: '2026-10-26', paid: true, returned: 0, notes: '' },
  { name: 'Shaun', amount: 25000, day: 'Monday', weeks: 1, start: '2026-10-26', paid: true, returned: 0, notes: '' },
  { name: 'Shera Rajput', amount: 25000, day: 'Monday', weeks: 1, start: '2026-10-26', paid: true, returned: 0, notes: '' },
  { name: 'Max Carter', amount: 25000, day: 'Monday', weeks: 1, start: '2026-10-26', paid: true, returned: 0, notes: '' },
  { name: 'Uday Shetty', amount: 25000, day: 'Tuesday', weeks: 1, start: '2026-10-26', paid: true, returned: 0, notes: '' },
  { name: 'Marcus', amount: 25000, day: 'Tuesday', weeks: 1, start: '2026-10-26', paid: true, returned: 0, notes: '' },
  { name: 'Sivam', amount: 25000, day: 'Tuesday', weeks: 1, start: '2026-10-26', paid: true, returned: 0, notes: '' },
  { name: 'MARSHAL', amount: 25000, day: 'Tuesday', weeks: 1, start: '2026-10-26', paid: true, returned: 0, notes: '' },
]

export const managers = ['Lance', 'Steven Vincent']

export const members = rawMembers.map((m) => ({
  ...m,
  end: addWeeks(m.start, m.weeks),
  balance: m.amount - m.returned,
}))

export const collections = [
  { date: '2026-10-26', member: 'Vihaan', amount: 25000, by: 'Steven', method: '', notes: '' },
  { date: '2026-10-26', member: 'Jena', amount: 50000, by: 'Lance', method: '', notes: '' },
  { date: '2026-10-26', member: 'Steven Burgershot', amount: 50000, by: 'Steven', method: '', notes: '' },
  { date: '2026-10-26', member: 'Seenu', amount: 25000, by: 'Steven', method: '', notes: '' },
  { date: '2026-10-26', member: 'Paul', amount: 25000, by: 'Steven', method: '', notes: '' },
  { date: '2026-10-26', member: 'Ace', amount: 25000, by: 'Steven', method: '', notes: '' },
  { date: '2026-10-26', member: 'Babulal', amount: 25000, by: 'Steven', method: '', notes: '' },
  { date: '2026-10-26', member: 'Sam Morgam', amount: 25000, by: 'Steven', method: '', notes: '' },
  { date: '2026-10-26', member: 'Lance', amount: 120000, by: 'Lance', method: '', notes: '' },
  { date: '2026-10-26', member: 'Shaun', amount: 25000, by: 'Steven', method: '', notes: '' },
  { date: '2026-10-26', member: 'Max Carter', amount: 25000, by: 'Steven', method: '', notes: '' },
  { date: '2026-10-26', member: 'Shera Rajput', amount: 25000, by: 'Steven', method: '', notes: '' },
  { date: '2026-10-26', member: 'Uday Shetty', amount: 25000, by: 'Steven', method: '', notes: '' },
  { date: '2026-10-26', member: 'Marcus', amount: 25000, by: 'Steven', method: '', notes: '' },
]

export const withdrawals = [
  { date: '2026-10-30', reason: 'Keys and other expenses', amount: 300000, by: '', method: '', notes: '' },
  { date: '2026-10-30', reason: 'Rent', amount: 4000, by: '', method: '', notes: '' },
]
