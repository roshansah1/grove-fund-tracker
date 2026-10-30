import { useEffect, useMemo, useState } from 'react'
import { collections, initialDonations, managers, members, withdrawals } from './data'
import memberPhotoCatalog from './memberPhotos.json'
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

const today = new Date().toISOString().slice(0, 10)

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
  const [donations, setDonations] = useState(() => {
    try {
      const saved = localStorage.getItem('grove-fund-donations')
      return saved ? JSON.parse(saved) : initialDonations
    } catch {
      return initialDonations
    }
  })
  const [memberPhotos, setMemberPhotos] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('south-side-ballas-member-photos') || '{}')
    } catch {
      return {}
    }
  })
  const [donationForm, setDonationForm] = useState({
    donor: '',
    amount: '',
    date: today,
    purpose: 'General fund',
  })

  useEffect(() => {
    try {
      localStorage.setItem('grove-fund-donations', JSON.stringify(donations))
    } catch {
      // Keep the current session usable if browser storage is unavailable.
    }
  }, [donations])

  useEffect(() => {
    try {
      localStorage.setItem('south-side-ballas-member-photos', JSON.stringify(memberPhotos))
    } catch {
      // Keep the current session usable if browser storage is unavailable.
    }
  }, [memberPhotos])

  const totals = useMemo(() => {
    const totalMembers = members.length
    const totalContributions = members.reduce((s, m) => s + m.amount, 0)
    const totalDonations = donations.reduce((s, d) => s + d.amount, 0)
    const totalFund = totalContributions + totalDonations
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
      totalContributions,
      totalDonations,
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
  }, [donations])

  const filteredMembers = useMemo(() => {
    const q = query.trim().toLowerCase()
    return members.filter((m) => {
      if (day !== 'All' && m.day !== day) return false
      if (q && !m.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [query, day])

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

  const filteredDonations = useMemo(() => {
    const q = query.trim().toLowerCase()
    return donations.filter(
      (d) => !q || d.donor.toLowerCase().includes(q) || d.purpose.toLowerCase().includes(q),
    )
  }, [donations, query])

  const contributorRanking = useMemo(() => {
    const byContributor = members.reduce((acc, member) => {
      acc[member.name.toLowerCase()] = {
        name: member.name,
        dues: member.paid ? member.amount : 0,
        donations: 0,
      }
      return acc
    }, {})

    donations.forEach((donation) => {
      const donorName = donation.donor.trim()
      const donorFirstName = donorName.split(/\s+/)[0].toLowerCase()
      const matchingMember = members.find((member) => {
        const memberName = member.name.toLowerCase()
        return memberName === donorName.toLowerCase() || memberName.split(/\s+/)[0] === donorFirstName
      })
      const key = matchingMember ? matchingMember.name.toLowerCase() : donorName.toLowerCase()
      const contributor = byContributor[key] || { name: donorName, dues: 0, donations: 0 }
      contributor.donations += donation.amount
      byContributor[key] = contributor
    })

    return Object.values(byContributor)
      .filter((contributor) => contributor.dues + contributor.donations > 0)
      .sort((a, b) =>
        b.dues + b.donations - (a.dues + a.donations) || a.name.localeCompare(b.name),
      )
  }, [donations])

  const sortedDonations = useMemo(
    () => [...filteredDonations].sort((a, b) => b.amount - a.amount || b.date.localeCompare(a.date)),
    [filteredDonations],
  )

  const addDonation = (event) => {
    event.preventDefault()
    const amount = Number(donationForm.amount)
    if (!donationForm.donor.trim() || !Number.isFinite(amount) || amount <= 0) return

    setDonations((current) => [
      {
        id: `${Date.now()}`,
        donor: donationForm.donor.trim(),
        amount,
        date: donationForm.date,
        purpose: donationForm.purpose,
      },
      ...current,
    ])
    setDonationForm((current) => ({ ...current, donor: '', amount: '' }))
  }

  const addMemberPhoto = async (memberName, event) => {
    const file = event.target.files?.[0]
    if (!file?.type.startsWith('image/')) return

    try {
      const image = await createImageBitmap(file)
      const canvas = document.createElement('canvas')
      canvas.width = 256
      canvas.height = 256
      const context = canvas.getContext('2d')
      if (!context) return

      const scale = Math.max(256 / image.width, 256 / image.height)
      const width = image.width * scale
      const height = image.height * scale
      context.drawImage(image, (256 - width) / 2, (256 - height) / 2, width, height)
      image.close()

      const photo = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.8))
      if (!photo) return
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setMemberPhotos((current) => ({ ...current, [memberName]: reader.result }))
        }
      }
      reader.readAsDataURL(photo)
    } catch {
      event.target.value = ''
    }
  }

  const collectorMax = Math.max(...Object.values(totals.byCollector), 1)

  return (
    <div className="page">
      <div className="glow glow-a" />
      <div className="glow glow-b" />

      <header className="top">
        <div className="brand">
          <div className="crest" aria-hidden>
            B
          </div>
          <div>
            <p className="eyebrow">HydraSync · Fund Tracker</p>
            <h1>South Side Ballas</h1>
            <p className="managed">
              Group leader and account owner <strong>Lance</strong> · Fund manager <strong>Roshan</strong>
            </p>
          </div>
        </div>
        <div className="managers">
          {managers.map((name) => (
            <div className="manager-chip" key={name.name}>
              <span className="avatar">{initials(name.name)}</span>
              <span>
                <small>{name.role}</small>
                {name.name}
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
          ['donations', 'Donations'],
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
            <Kpi label="Weekly Contributions" value={money(totals.totalContributions)} hint="Member dues collected" />
            <Kpi label="Donations" value={money(totals.totalDonations)} hint="One-off contributions" />
            <Kpi label="Total Fund" value={money(totals.totalFund)} hint="Dues + donations" accent />
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
                Available cash = Contributions + donations − Total returned − Total withdrawals
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
                  . Member contributions total {money(totals.totalContributions)}; logged collections are {money(totals.logged)}.
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
            <span className="count">{filteredMembers.length} members · Week of Oct 26, 2026</span>
          </div>
          <div className="top-donor-heading">
            <h2>Top Contributors</h2>
            <span>Ranked by weekly dues + donations</span>
          </div>
          <div className="top-donors">
            {contributorRanking.slice(0, 3).map((contributor, index) => {
              const photo = memberPhotos[contributor.name]
                ? {
                    src: memberPhotos[contributor.name],
                    alt: `${contributor.name} profile`,
                    position: '50% 50%',
                    zoom: 1,
                  }
                : memberPhotoCatalog[contributor.name]
              return (
                <article className={`top-donor-card ${index === 0 ? 'featured' : ''}`} key={contributor.name}>
                  <div className="top-donor-rank">
                    {index === 0 ? <span aria-label="Top contributor">👑 Top contributor</span> : `#${index + 1} contributor`}
                  </div>
                  <div className="top-donor-profile">
                    {photo ? (
                      <div className="top-donor-photo">
                        <img
                          src={photo.src}
                          alt={photo.alt}
                          style={{ '--photo-position': photo.position, '--photo-zoom': photo.zoom }}
                        />
                      </div>
                    ) : (
                      <span className="top-donor-fallback">{initials(contributor.name)}</span>
                    )}
                    <div>
                      <h3>{contributor.name}</h3>
                      <span>{money(contributor.dues)} dues · {money(contributor.donations)} donations</span>
                    </div>
                  </div>
                  <strong className="top-donor-amount">
                    {money(contributor.dues + contributor.donations)} total contributed
                  </strong>
                </article>
              )
            })}
          </div>
          <div className="member-grid">
            {filteredMembers.map((member) => {
              const photo = memberPhotos[member.name]
                ? {
                    src: memberPhotos[member.name],
                    alt: `${member.name} profile`,
                    position: '50% 50%',
                    zoom: 1,
                  }
                : memberPhotoCatalog[member.name]

              return (
                <article className="member-card" key={member.name}>
                <div className="member-photo">
                  <div className="member-photo-frame">
                    {photo ? (
                      <img
                        src={photo.src}
                        alt={photo.alt}
                        style={{ '--photo-position': photo.position, '--photo-zoom': photo.zoom }}
                      />
                    ) : (
                      <span className="member-photo-fallback">{initials(member.name)}</span>
                    )}
                  </div>
                  <label className="photo-upload">
                    {photo ? 'Change photo' : 'Add photo'}
                    <input
                      type="file"
                      accept="image/*"
                      aria-label={`Upload ${member.name}'s photo`}
                      onChange={(event) => addMemberPhoto(member.name, event)}
                    />
                  </label>
                </div>
                <div className="member-details">
                  <div className="member-name-row">
                    <h2>{member.name}</h2>
                    <span className={member.paid ? 'status yes' : 'status no'}>
                      {member.paid ? 'Collected' : 'Pending'}
                    </span>
                  </div>
                  <span className={`pill ${member.day.toLowerCase()}`}>{member.day}</span>
                  <div className="member-contribution">
                    <span>Weekly contribution</span>
                    <strong>{money(member.weeklyRate)}</strong>
                  </div>
                </div>
                </article>
              )
            })}
          </div>
          <div className="collection-total">
            <span>Total collected this week</span>
            <strong>{money(filteredMembers.reduce((sum, member) => sum + (member.paid ? member.amount : 0), 0))}</strong>
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

      {tab === 'donations' && (
        <section className="panel">
          <div className="kpis compact">
            <Kpi label="Donation entries" value={String(donations.length)} hint="One-off gifts recorded" />
            <Kpi label="Total donations" value={money(totals.totalDonations)} hint="Included in the fund balance" accent />
            <Kpi label="Available cash" value={money(totals.available)} hint="After returns and withdrawals" />
          </div>
          <form className="donation-form" onSubmit={addDonation}>
            <label>
              Donor
              <input
                required
                value={donationForm.donor}
                onChange={(event) => setDonationForm({ ...donationForm, donor: event.target.value })}
                placeholder="Person's name"
              />
            </label>
            <label>
              Amount
              <input
                required
                min="1"
                step="1"
                type="number"
                value={donationForm.amount}
                onChange={(event) => setDonationForm({ ...donationForm, amount: event.target.value })}
                placeholder="100000"
              />
            </label>
            <label>
              Date
              <input
                required
                type="date"
                value={donationForm.date}
                onChange={(event) => setDonationForm({ ...donationForm, date: event.target.value })}
              />
            </label>
            <label>
              Purpose
              <select
                value={donationForm.purpose}
                onChange={(event) => setDonationForm({ ...donationForm, purpose: event.target.value })}
              >
                <option>General fund</option>
                <option>Gang support</option>
                <option>Other</option>
              </select>
            </label>
            <button type="submit">Add donation</button>
          </form>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Donor</th>
                  <th>Amount</th>
                  <th>Purpose</th>
                </tr>
              </thead>
              <tbody>
                {sortedDonations.map((donation) => (
                  <tr key={donation.id}>
                    <td>{prettyDate(donation.date)}</td>
                    <td className="name-cell">
                      <span className="avatar sm">{initials(donation.donor)}</span>
                      {donation.donor}
                    </td>
                    <td className="strong">{money(donation.amount)}</td>
                    <td>{donation.purpose}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}>Logged donations</td>
                  <td>{money(filteredDonations.reduce((sum, donation) => sum + donation.amount, 0))}</td>
                  <td />
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
        South Side Ballas · HydraSync fund tracker · weekly contributions, donations, returns, and withdrawals
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
