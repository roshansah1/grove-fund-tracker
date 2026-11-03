const addWeeks = (isoDate, weeks) => {
  const d = new Date(`${isoDate}T00:00:00`)
  d.setDate(d.getDate() + weeks * 7)
  return d.toISOString().slice(0, 10)
}

const rawMembers = [
  { name: 'Vihaan', amount: 25000, day: 'Monday', weeks: 1, start: '2026-10-26', paid: true, returned: 0, notes: '' },
  { name: 'Jenna', amount: 50000, day: 'Monday', weeks: 2, start: '2026-10-26', paid: true, returned: 0, notes: '' },
  { name: 'Steven Burgershot', amount: 100000, day: 'Monday', weeks: 1, start: '2026-10-26', paid: true, returned: 0, notes: '' },
  { name: 'Seenu', amount: 25000, day: 'Monday', weeks: 1, start: '2026-10-26', paid: true, returned: 0, notes: '' },
  { name: 'Paul', amount: 25000, day: 'Monday', weeks: 1, start: '2026-10-26', paid: true, returned: 0, notes: '' },
  { name: 'Ace', amount: 50000, day: 'Monday', weeks: 1, start: '2026-10-26', paid: true, returned: 0, notes: '' },
  { name: 'Babulal', amount: 25000, day: 'Monday', weeks: 1, start: '2026-10-26', paid: true, returned: 0, notes: '' },
  { name: 'Sam Morgam', amount: 25000, day: 'Monday', weeks: 1, start: '2026-10-26', paid: true, returned: 0, notes: '' },
  { name: 'Lance', amount: 25000, day: 'Monday', weeks: 1, start: '2026-10-26', paid: true, returned: 0, notes: '' },
  { name: 'Shaun', amount: 25000, day: 'Monday', weeks: 1, start: '2026-10-26', paid: true, returned: 0, notes: '' },
  { name: 'Shera Rajput', amount: 50000, day: 'Monday', weeks: 1, start: '2026-10-26', paid: true, returned: 0, notes: '' },
  { name: 'Max Carter', amount: 25000, day: 'Monday', weeks: 1, start: '2026-10-26', paid: true, returned: 0, notes: '' },
  { name: 'Uday Shetty', amount: 25000, day: 'Tuesday', weeks: 1, start: '2026-10-26', paid: true, returned: 0, notes: '' },
  { name: 'Marcus', amount: 25000, day: 'Tuesday', weeks: 1, start: '2026-10-26', paid: true, returned: 0, notes: '' },
  { name: 'Sivam', amount: 25000, day: 'Tuesday', weeks: 1, start: '2026-10-26', paid: true, returned: 0, notes: '' },
  { name: 'MARSHAL', amount: 25000, day: 'Tuesday', weeks: 1, start: '2026-10-26', paid: true, returned: 0, notes: '' },
]

export const managers = [
  { name: 'Lance', role: 'Owner · Group leader' },
  { name: 'Steven', role: 'Fund manager' },
]

export const activeCollectionDate = '2026-11-02'
export const activeCollectionWeekLabel = 'Week of Nov 2, 2026'

export const initialDonations = [
  { id: 'lance-initial', date: '2026-10-26', donor: 'Lance', amount: 95000, purpose: 'General fund' },
  { id: 'steven-initial', date: '2026-10-30', donor: 'Steven', amount: 100000, purpose: 'General fund' },
]

export const collections = [
  { date: '2026-10-26', member: 'Vihaan', amount: 25000, by: 'Steven', notes: 'Week 1' },
  { date: '2026-10-26', member: 'Jenna', amount: 50000, by: 'Lance', notes: 'Week 1' },
  { date: '2026-10-26', member: 'Steven Burgershot', amount: 50000, by: 'Steven', notes: 'Week 1' },
  { date: '2026-10-26', member: 'Seenu', amount: 25000, by: 'Steven', notes: 'Week 1' },
  { date: '2026-10-26', member: 'Paul', amount: 25000, by: 'Steven', notes: 'Week 1' },
  { date: '2026-10-26', member: 'Ace', amount: 25000, by: 'Steven', notes: 'Week 1' },
  { date: '2026-10-26', member: 'Babulal', amount: 25000, by: 'Steven', notes: 'Week 1' },
  { date: '2026-10-26', member: 'Sam Morgam', amount: 25000, by: 'Steven', notes: 'Week 1' },
  { date: '2026-10-26', member: 'Lance', amount: 25000, by: 'Lance', notes: 'Week 1' },
  { date: '2026-10-26', member: 'Shaun', amount: 25000, by: 'Steven', notes: 'Week 1' },
  { date: '2026-10-26', member: 'Max Carter', amount: 25000, by: 'Steven', notes: 'Week 1' },
  { date: '2026-10-26', member: 'Shera Rajput', amount: 25000, by: 'Steven', notes: 'Week 1' },
  { date: '2026-10-26', member: 'Uday Shetty', amount: 25000, by: 'Steven', notes: 'Week 1' },
  { date: '2026-10-26', member: 'Marcus', amount: 25000, by: 'Steven', notes: 'Week 1' },
  { date: '2026-10-26', member: 'Sivam', amount: 25000, by: 'Steven', notes: 'Week 1' },
  { date: '2026-10-26', member: 'MARSHAL', amount: 25000, by: 'Steven', notes: 'Week 1' },
  { date: '2026-11-02', member: 'Ace', amount: 25000, by: 'Steven', notes: 'Week 2' },
  { date: '2026-11-02', member: 'Shera Rajput', amount: 25000, by: 'Lance', notes: 'Week 2' },
  { date: '2026-11-02', member: 'Steven Burgershot', amount: 50000, by: 'Steven', notes: 'Week 2' },
]

export const members = rawMembers.map((m) => ({
  ...m,
  paid: collections.some(
    (collection) => collection.date === activeCollectionDate && collection.member === m.name,
  ),
  weeklyRate: m.name === 'Jenna' || m.name === 'Steven Burgershot' ? 50000 : 25000,
  end: addWeeks(m.start, m.weeks),
  balance: m.amount - m.returned,
}))

export const withdrawals = [
  { date: '2026-10-30', reason: 'Keys and other expenses', amount: 300000, by: '', notes: '' },
  { date: '2026-10-30', reason: 'Rent', amount: 4000, by: '', notes: '' },
]
