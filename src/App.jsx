import { useMemo, useState } from 'react'
import { collections, managers, members, withdrawals } from './data'
import './App.css'

const money = (n) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)

const prettyDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

const initials = (name) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()

function App() {
  const [tab, setTab] = useState('overview')
  const [query, setQuery] = useState('')
  const [day, setDay] = useState('All')
  const [paid, setPaid] = useState('All')

  const totals = useMemo(() => {
    const totalMembers = members.length
    const totalFund = members.reduce((s, m) => s + m.amount, 0)
    const totalReturned = members.reduce((s, m) => s + m.returned, 0)
    const outstanding = members.reduce((s, m) => s + m.balance, 0)
    const paidMembers = members.filter((m) => m.paid).length
    const totalWithdrawals = withdrawals.reduce((s, w) => s + w.amount, 0)
    const available = totalFund - totalReturned - totalWithdrawals
    const logged = collections.reduce((s, c) => s + c.amount, 0)
    const loggedNames = new Set(collections.map((c) => c.member.toLowerCase()))
    const missingLogs = members.filter((m) => !loggedNames.has(m.name.toLowerCase()))
    const byCollector = collections.reduce((acc, c) => {
      acc[c.by] = (acc[c.by] || 0) + c.amount
      return acc
    }, {})
    const monday = members.filter((m) => m.day === 'Monday')
    const tuesday = members.filter((m) => m.day === 'Tuesday')
    return {
      totalMembers,
      totalFund,
      totalReturned,
      outstanding,
      paidMembers,
      totalWithdrawals,
      available,
      logged,
      missingLogs,
      byCollector,
      monday,
      tuesday,
    }
  }, [])

  const filteredMembers = useMemo(() => {
    const q = query.trim().toLowerCase()
    return members.filter((m) => {
      if (day !== 'All' && m.day !== day) return false
      if (paid === 'Paid' && !m.paid) return false
      if (paid === 'Unpaid' && m.paid) return false
      if (q && !m.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [query, day, paid])

  const filteredCollections = useMemo(() => {
    const q = query.trim().toLowerCase()
    return collections.filter(
      (c) =>
        !q ||
        c.member.toLowerCase().includes(q) ||
        c.by.toLowerCase().includes(q),
    )
  }, [query])

  const filteredWithdrawals = useMemo(() => {
    const q = query.trim().toLowerCase()
    return withdrawals.filter((w) => !q || w.reason.toLowerCase().includes(q))
  }, [query])

  const collectorMax = Math.max(...Object.values(totals.byCollector), 1)

  return (
    <div className="page">
      <div className="glow glow-a" />
      <div className="glow glow-b" />

      <header className="top">
        <div className="brand">
          <div className="crest" aria-hidden>
            G
          </div>
          <div>
            <p className="eyebrow">Grove Group · Family Fund</p>
            <h1>Grove Fund Tracker</h1>
            <p className="managed">
              Managed by <strong>Lance</strong> and <strong>Steven Vincent</strong>
            </p>
          </div>
        </div>
        <div className="managers">
          {managers.map((name) => (
            <div className="manager-chip" key={name}>
              <span className="avatar">{initials(name)}</span>
              <span>
                <small>Fund manager</small>
                {name}
              </span>
            </div>
          ))}
        </div>
      </header>

      <nav className="tabs">
        {[
          ['overview', 'Overview'],
          ['members', 'Members'],
          ['collections', 'Collection Log'],
          ['withdrawals', 'Withdrawals'],
        ].map(([id, label]) => (
          <button
            key={id}
            className={tab === id ? 'tab on' : 'tab'}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
        <div className="search-wrap">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search members, collectors, reasons…"
          />
        </div>
      </nav>

      {tab === 'overview' && (
        <section className="panel">
          <div className="kpis">
            <Kpi label="Total Members" value={String(totals.totalMembers)} hint="Active Grove contributors" />
            <Kpi label="Paid Members" value={`${totals.paidMembers}/${totals.totalMembers}`} hint="Marked paid in tracker" />
            <Kpi label="Total Fund" value={money(totals.totalFund)} hint="Sum of member amounts" accent />
            <Kpi label="Total Returned" value={money(totals.totalReturned)} hint="Paid back to members" />
            <Kpi label="Outstanding Balance" value={money(totals.outstanding)} hint="Amount − returned" />
            <Kpi label="Total Withdrawals" value={money(totals.totalWithdrawals)} hint="Cash taken from the fund" warn />
            <Kpi label="Available Cash" value={money(totals.available)} hint="Fund − returned − withdrawals" accent />
            <Kpi label="Logged Collections" value={money(totals.logged)} hint="From the collection sheet" />
          </div>

          <div className="grid-2">
            <article className="card">
              <h2>Cash position</h2>
              <p className="formula">
                Available cash = Total fund − Total returned − Total withdrawals
              </p>
              <div className="stack-bars">
                <Bar label="Total fund" value={totals.totalFund} max={totals.totalFund} tone="gold" />
                <Bar label="Withdrawals" value={totals.totalWithdrawals} max={totals.totalFund} tone="rose" />
                <Bar label="Available cash" value={totals.available} max={totals.totalFund} tone="mint" />
              </div>
              <p className="note">
                Cycle started 26 Oct 2026. All listed members are marked paid. No amounts have been returned yet.
              </p>
            </article>

            <article className="card">
              <h2>Collected by managers</h2>
              {Object.entries(totals.byCollector).map(([who, amt]) => (
                <Bar
                  key={who}
                  label={`${who} · ${money(amt)}`}
                  value={amt}
                  max={collectorMax}
                  tone={who === 'Lance' ? 'gold' : 'mint'}
                />
              ))}
              {totals.missingLogs.length > 0 && (
                <div className="alert">
                  <strong>Not yet on the collection log:</strong>{' '}
                  {totals.missingLogs.map((m) => `${m.name} (${money(m.amount)})`).join(', ')}
                  . Member sheet total is {money(totals.totalFund)}; logged collections are {money(totals.logged)}.
                </div>
              )}
            </article>
          </div>

          <div className="grid-2">
            <article className="card">
              <h2>Collection days</h2>
              <div className="day-row">
                <div>
                  <span className="pill monday">Monday</span>
                  <strong>{totals.monday.length} members</strong>
                  <em>{money(totals.monday.reduce((s, m) => s + m.amount, 0))}</em>
                </div>
                <div>
                  <span className="pill tuesday">Tuesday</span>
                  <strong>{totals.tuesday.length} members</strong>
                  <em>{money(totals.tuesday.reduce((s, m) => s + m.amount, 0))}</em>
                </div>
              </div>
            </article>
            <article className="card">
              <h2>Recent withdrawals</h2>
              <ul className="mini-list">
                {withdrawals.map((w) => (
                  <li key={w.reason}>
                    <span>
                      {prettyDate(w.date)} · {w.reason}
                    </span>
                    <b>{money(w.amount)}</b>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </section>
      )}

      {tab === 'members' && (
        <section className="panel">
          <div className="filters">
            <select value={day} onChange={(e) => setDay(e.target.value)}>
              <option>All</option>
              <option>Monday</option>
              <option>Tuesday</option>
            </select>
            <select value={paid} onChange={(e) => setPaid(e.target.value)}>
              <option>All</option>
              <option>Paid</option>
              <option>Unpaid</option>
            </select>
            <span className="count">{filteredMembers.length} shown</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Amount</th>
                  <th>Day</th>
                  <th>Weeks</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Paid</th>
                  <th>Returned</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((m) => (
                  <tr key={m.name}>
                    <td className="name-cell">
                      <span className="avatar sm">{initials(m.name)}</span>
                      {m.name}
                    </td>
                    <td>{money(m.amount)}</td>
                    <td>
                      <span className={`pill ${m.day.toLowerCase()}`}>{m.day}</span>
                    </td>
                    <td>{m.weeks}</td>
                    <td>{prettyDate(m.start)}</td>
                    <td>{prettyDate(m.end)}</td>
                    <td>
                      <span className={m.paid ? 'status yes' : 'status no'}>
                        {m.paid ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td>{money(m.returned)}</td>
                    <td className="strong">{money(m.balance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>Totals</td>
                  <td>{money(filteredMembers.reduce((s, m) => s + m.amount, 0))}</td>
                  <td colSpan={5} />
                  <td>{money(filteredMembers.reduce((s, m) => s + m.returned, 0))}</td>
                  <td>{money(filteredMembers.reduce((s, m) => s + m.balance, 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}

      {tab === 'collections' && (
        <section className="panel">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Member</th>
                  <th>Amount collected</th>
                  <th>Collected by</th>
                  <th>Method</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredCollections.map((c, i) => (
                  <tr key={`${c.member}-${i}`}>
                    <td>{prettyDate(c.date)}</td>
                    <td className="name-cell">
                      <span className="avatar sm">{initials(c.member)}</span>
                      {c.member}
                    </td>
                    <td>{money(c.amount)}</td>
                    <td>
                      <span className="manager-mini">{c.by}</span>
                    </td>
                    <td>{c.method || '—'}</td>
                    <td>{c.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}>Logged total</td>
                  <td>{money(filteredCollections.reduce((s, c) => s + c.amount, 0))}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}

      {tab === 'withdrawals' && (
        <section className="panel">
          <div className="kpis compact">
            <Kpi label="Entries" value={String(withdrawals.length)} hint="Withdrawal sheet rows" />
            <Kpi label="Total withdrawn" value={money(totals.totalWithdrawals)} hint="Keys, expenses, rent" warn />
            <Kpi label="Cash still available" value={money(totals.available)} hint="After these withdrawals" accent />
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description / reason</th>
                  <th>Amount withdrawn</th>
                  <th>Withdrawn by</th>
                  <th>Payment method</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredWithdrawals.map((w) => (
                  <tr key={w.reason}>
                    <td>{prettyDate(w.date)}</td>
                    <td>{w.reason}</td>
                    <td className="strong rose-text">{money(w.amount)}</td>
                    <td>{w.by || '—'}</td>
                    <td>{w.method || '—'}</td>
                    <td>{w.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <footer>
        Grove Group Fund Tracker · sourced from the Lance & Steven Vincent workbook · figures update from member amounts, returns, and withdrawals
      </footer>
    </div>
  )
}

function Kpi({ label, value, hint, accent, warn }) {
  return (
    <article className={`kpi ${accent ? 'accent' : ''} ${warn ? 'warn' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </article>
  )
}

function Bar({ label, value, max, tone }) {
  const pct = max ? Math.max(4, Math.round((value / max) * 100)) : 0
  return (
    <div className="bar">
      <div className="bar-meta">
        <span>{label}</span>
        <span>{money(value)}</span>
      </div>
      <div className="track">
        <div className={`fill ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default App
