import { useMemo, useState } from 'react'
import {
  activeCollectionDate,
  collections,
  initialDonations,
  managers,
  members,
  withdrawals,
} from './data'
import hcrCollections from './hcrCollections.json'
import memberPhotoCatalog from './memberPhotos.json'
import './App.css'

const money = (n) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)

const moneyExact = (n) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)

const hcrAmount = (n) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 }).format(n)

const prettyDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

const getWeekStart = (isoDate) => {
  const date = new Date(`${isoDate}T00:00:00`)
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const initials = (name) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()

const hcrMemberAliases = new Map([['maxx carter', 'max carter']])

const findHcrMember = (collection) => {
  const rawName = collection.race?.trim().toLowerCase()
  const name = rawName ? hcrMemberAliases.get(rawName) || rawName : undefined
  return name ? members.find((member) => member.name.toLowerCase() === name) : undefined
}

const getHcrDuesCredit = (collection) => {
  if (
    collection.duesEligible === false ||
    !findHcrMember(collection) ||
    !Number.isFinite(collection.unitValue) ||
    collection.unitValue <= 0
  ) {
    return 0
  }
  return collection.amount * collection.unitValue
}

const getWeeklyMemberPayments = (week, donations = []) => {
  const payments = new Map(
    members.map((member) => [
      member.name.toLowerCase(),
      { cash: 0, donations: 0, hcrAmount: 0, hcrValue: 0, unpricedHcr: 0 },
    ]),
  )

  collections.forEach((collection) => {
    const payment = payments.get(collection.member.toLowerCase())
    if (!payment || collection.weeklyEligible === false) return
    if (collection.weeklyAllocations) {
      const allocation = collection.weeklyAllocations.find(
        (entry) => getWeekStart(entry.week) === week,
      )
      if (allocation) payment.cash += allocation.amount
      return
    }
    if (getWeekStart(collection.date) === week) payment.cash += collection.amount
  })

  hcrCollections.forEach((collection) => {
    if (getWeekStart(collection.week) !== week || collection.duesEligible === false) return
    const member = findHcrMember(collection)
    if (!member) return

    const payment = payments.get(member.name.toLowerCase())
    const value = getHcrDuesCredit(collection)
    payment.hcrAmount += collection.amount
    payment.hcrValue += value
    if (!Number.isFinite(collection.unitValue) || collection.unitValue <= 0) {
      payment.unpricedHcr += collection.amount
    }
  })

  donations.forEach((donation) => {
    if (getWeekStart(donation.date) !== week) return
    const donorName = donation.donor.trim()
    const donorFirstName = donorName.split(/\s+/)[0].toLowerCase()
    const member = members.find((candidate) => {
      const memberName = candidate.name.toLowerCase()
      return memberName === donorName.toLowerCase() ||
        memberName.split(/\s+/)[0] === donorFirstName
    })
    if (!member) return
    const payment = payments.get(member.name.toLowerCase())
    payment.donations += donation.amount
  })

  return payments
}

function App() {
  const [tab, setTab] = useState('overview')
  const [query, setQuery] = useState('')
  const [day, setDay] = useState('All')
  const [donations] = useState(() => {
    try {
      const saved = localStorage.getItem('grove-fund-donations')
      return saved ? JSON.parse(saved) : initialDonations
    } catch {
      return initialDonations
    }
  })
  const [memberWeek, setMemberWeek] = useState(activeCollectionDate)
  const memberWeeks = useMemo(
    () => [...new Set([
      ...collections
        .filter((collection) => collection.weeklyEligible !== false)
        .flatMap((collection) =>
          collection.weeklyAllocations
            ? collection.weeklyAllocations.map((allocation) => getWeekStart(allocation.week))
            : [getWeekStart(collection.date)],
        ),
      ...hcrCollections.map((collection) => getWeekStart(collection.week)),
      ...donations.map((donation) => getWeekStart(donation.date)),
      getWeekStart(activeCollectionDate),
    ])].sort((a, b) => b.localeCompare(a)),
    [donations],
  )
  const currentWeekPayments = useMemo(
    () => getWeeklyMemberPayments(getWeekStart(activeCollectionDate), donations),
    [donations],
  )
  const selectedMemberPayments = useMemo(
    () => getWeeklyMemberPayments(memberWeek, donations),
    [memberWeek, donations],
  )

  const totals = useMemo(() => {
    const totalMembers = members.length
    const totalContributions = collections.reduce((s, c) => s + c.amount, 0)
    const contributingMembers = new Set(collections.map((c) => c.member)).size
    const totalDonations = donations.reduce((s, d) => s + d.amount, 0)
    const totalFund = totalContributions + totalDonations
    const totalReturned = members.reduce((s, m) => s + m.returned, 0)
    const outstanding = members.reduce((s, m) => s + m.balance, 0)
    const paidMembers = members.filter((member) => {
      const payment = currentWeekPayments.get(member.name.toLowerCase())
      return payment.cash + payment.hcrValue >= member.weeklyRate
    }).length
    const totalWithdrawals = withdrawals.reduce((s, w) => s + w.amount, 0)
    const available = totalFund - totalReturned - totalWithdrawals
    const logged = totalContributions
    const collectionDay = new Date(`${activeCollectionDate}T00:00:00`).toLocaleDateString('en-US', {
      weekday: 'long',
    })
    const missingLogs = members.filter((member) => {
      const payment = currentWeekPayments.get(member.name.toLowerCase())
      return (
        member.day === collectionDay &&
        payment.cash + payment.hcrValue < member.weeklyRate
      )
    })
    const byCollector = collections.reduce((acc, c) => {
      if (c.by) acc[c.by] = (acc[c.by] || 0) + c.amount
      return acc
    }, {})
    const monday = members.filter((m) => m.day === 'Monday')
    const tuesday = members.filter((m) => m.day === 'Tuesday')
    return {
      totalMembers,
      contributingMembers,
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
  }, [donations, currentWeekPayments])

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

  const sortedCollections = useMemo(
    () => [...filteredCollections].sort((a, b) => b.date.localeCompare(a.date)),
    [filteredCollections],
  )

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
        fund: 0,
        donations: 0,
        hcrValue: 0,
      }
      return acc
    }, {})

    collections.forEach((collection) => {
      const key = collection.member.toLowerCase()
      const contributor = byContributor[key] || {
        name: collection.member,
        fund: 0,
        donations: 0,
        hcrValue: 0,
      }
      contributor.fund += collection.amount
      byContributor[key] = contributor
    })

    hcrCollections.forEach((collection) => {
      if (
        collection.duesEligible === false ||
        !Number.isFinite(collection.unitValue) ||
        collection.unitValue <= 0
      ) {
        return
      }

      const member = findHcrMember(collection)
      const name = member?.name || collection.race?.trim()
      if (!name) return

      const key = name.toLowerCase()
      const contributor = byContributor[key] || {
        name,
        fund: 0,
        donations: 0,
        hcrValue: 0,
      }
      contributor.hcrValue += collection.amount * collection.unitValue
      byContributor[key] = contributor
    })

    donations.forEach((donation) => {
      const donorName = donation.donor.trim()
      const donorFirstName = donorName.split(/\s+/)[0].toLowerCase()
      const matchingMember = members.find((member) => {
        const memberName = member.name.toLowerCase()
        return memberName === donorName.toLowerCase() || memberName.split(/\s+/)[0] === donorFirstName
      })
      const key = matchingMember ? matchingMember.name.toLowerCase() : donorName.toLowerCase()
      const contributor = byContributor[key] || {
        name: donorName,
        fund: 0,
        donations: 0,
        hcrValue: 0,
      }
      contributor.donations += donation.amount
      byContributor[key] = contributor
    })

    return Object.values(byContributor)
      .map((contributor) => ({
        ...contributor,
        total: contributor.fund + contributor.donations + contributor.hcrValue,
      }))
      .filter((contributor) => contributor.total > 0)
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
  }, [donations])

  const sortedDonations = useMemo(
    () => [...filteredDonations].sort((a, b) => b.amount - a.amount || b.date.localeCompare(a.date)),
    [filteredDonations],
  )

  const collectorMax = Math.max(...Object.values(totals.byCollector), 1)
  const filteredHcrCollections = hcrCollections.filter(
    (collection) =>
      (!query.trim() ||
        (collection.race || '').toLowerCase().includes(query.trim().toLowerCase()) ||
        (collection.collector || '').toLowerCase().includes(query.trim().toLowerCase())),
  )
  const totalHcr = filteredHcrCollections.reduce((sum, collection) => sum + collection.amount, 0)
  const totalHcrValue = filteredHcrCollections.reduce(
    (sum, collection) =>
      sum +
      (Number.isFinite(collection.unitValue)
        ? collection.amount * collection.unitValue
        : 0),
    0,
  )
  const pricedHcrCount = filteredHcrCollections.filter(
    (collection) => Number.isFinite(collection.unitValue),
  ).length
  const totalHcrDuesCredit = filteredHcrCollections.reduce(
    (sum, collection) => sum + getHcrDuesCredit(collection),
    0,
  )
  const hcrCardsByRace = new Map()
  filteredHcrCollections.forEach((collection) => {
    const race = collection.race?.trim() || 'Unknown'
    const key = race.toLowerCase()
    const member = findHcrMember(collection)
    const card = hcrCardsByRace.get(key) || {
      race: member?.name || race,
      member,
      amount: 0,
      estimatedValue: 0,
      duesCredit: 0,
      unpriced: 0,
      collectors: new Set(),
    }

    card.amount += collection.amount
    card.estimatedValue += Number.isFinite(collection.unitValue)
      ? collection.amount * collection.unitValue
      : 0
    card.duesCredit += getHcrDuesCredit(collection)
    if (!Number.isFinite(collection.unitValue) || collection.unitValue <= 0) {
      card.unpriced += collection.amount
    }
    if (collection.collector) card.collectors.add(collection.collector)
    hcrCardsByRace.set(key, card)
  })
  const hcrMemberCards = [...hcrCardsByRace.values()].sort(
    (a, b) => b.amount - a.amount || a.race.localeCompare(b.race),
  )

  return (
    <div className="page">
      <div className="glow glow-a" />
      <div className="glow glow-b" />

      <header className="top">
        <div className="brand">
          <img className="crest" src={`${import.meta.env.BASE_URL}ballas-logo.png`} alt="Ballas logo" />
          <div>
            <p className="eyebrow">HydraSync · Fund Tracker</p>
            <h1>South Side Ballas</h1>
            <p className="managed">
              Group leader and account owner <strong>Lance</strong> · Fund manager <strong>Steven</strong>
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
          ['collections', 'Fund Collection'],
          ['hcr', 'HCR Collection'],
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
            placeholder="Search members, collectors, races, reasons…"
          />
        </div>
      </nav>

      {tab === 'overview' && (
        <section className="panel">
          <div className="kpis">
            <Kpi label="Contributing Members" value={String(totals.contributingMembers)} hint="Members with recorded collections" />
            <Kpi label="Paid This Week" value={`${totals.paidMembers}/${totals.totalMembers}`} hint="Cash + eligible HCR value" />
            <Kpi label="Member Contributions" value={money(totals.totalContributions)} hint="Cumulative dues recorded" />
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
                Cycle started Oct 26, 2026. Week 3 collections are in progress. No amounts have been returned yet.
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
                  <strong>Still outstanding for Monday:</strong>{' '}
                  {totals.missingLogs.map((m) => `${m.name} (${money(m.weeklyRate)})`).join(', ')}.
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
            <label className="count" htmlFor="member-week">Week starting</label>
            <select
              id="member-week"
              value={memberWeek}
              onChange={(event) => setMemberWeek(event.target.value)}
            >
              {memberWeeks.map((week) => (
                <option key={week} value={week}>Week of {prettyDate(week)}</option>
              ))}
            </select>
            <span className="count">{filteredMembers.length} members · Week of {prettyDate(memberWeek)}</span>
          </div>
          <div className="top-donor-heading">
            <h2>Top Contributors</h2>
            <span>All-time · ranked by fund contributions + donations + HCR value</span>
          </div>
          <div className="top-donors">
            {contributorRanking.slice(0, 3).map((contributor, index) => {
              const photo = memberPhotoCatalog[contributor.name]
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
                      <span>
                        {money(contributor.fund)} fund · {money(contributor.donations)} donations ·{' '}
                        {money(contributor.hcrValue)} HCR
                      </span>
                    </div>
                  </div>
                  <strong className="top-donor-amount">
                    {money(contributor.total)} total contributed
                  </strong>
                </article>
              )
            })}
          </div>
          <div className="member-grid">
            {filteredMembers.map((member) => {
              const photo = memberPhotoCatalog[member.name]
              const totalContributed =
                contributorRanking.find(
                  (contributor) => contributor.name.toLowerCase() === member.name.toLowerCase(),
                )?.total || 0
              const weeklyPayment = selectedMemberPayments.get(member.name.toLowerCase())
              const paidThisWeek =
                weeklyPayment.cash + weeklyPayment.hcrValue >= member.weeklyRate
              const paidWithHcr = paidThisWeek && weeklyPayment.cash < member.weeklyRate

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
                </div>
                <div className="member-details">
                  <div className="member-name-row">
                    <h2>{member.name}</h2>
                    <span className={paidThisWeek ? 'status yes' : 'status no'}>
                      {paidThisWeek ? (paidWithHcr ? 'Paid with HCR' : 'Paid') : 'Pending'}
                    </span>
                  </div>
                  <span className={`pill ${member.day.toLowerCase()}`}>{member.day}</span>
                  <div className="member-contribution">
                    <span>Week's fund contribution</span>
                    <strong>{money(weeklyPayment.cash)}</strong>
                  </div>
                  <div className="member-contribution">
                    <span>HCR contributed</span>
                    <strong>
                      {weeklyPayment.hcrAmount
                        ? `${hcrAmount(weeklyPayment.hcrAmount)} HCR · ${
                            weeklyPayment.unpricedHcr
                              ? `${hcrAmount(weeklyPayment.unpricedHcr)} unpriced`
                              : money(weeklyPayment.hcrValue)
                          }`
                        : '—'}
                    </strong>
                  </div>
                  <div className="member-contribution">
                    <span>All-time contributed</span>
                    <strong>{money(totalContributed)}</strong>
                  </div>
                  <div className="member-contribution">
                    <span>Weekly contribution</span>
                    <strong>{money(member.weeklyRate)}</strong>
                  </div>
                </div>
                </article>
              )
            })}
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
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {sortedCollections.map((c, i) => (
                  <tr key={`${c.member}-${i}`}>
                    <td>{prettyDate(c.date)}</td>
                    <td className="name-cell">
                      <span className="avatar sm">{initials(c.member)}</span>
                      {c.member}
                    </td>
                    <td>{money(c.amount)}</td>
                    <td>
                      <span className="manager-mini">{c.by || '—'}</span>
                    </td>
                    <td>{c.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}>Logged total</td>
                  <td>{money(filteredCollections.reduce((s, c) => s + c.amount, 0))}</td>
                  <td colSpan={2} />
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

      {tab === 'hcr' && (
        <section className="panel">
          <div className="kpis compact">
            <Kpi label="HCR collected" value={`${hcrAmount(totalHcr)} HCR`} hint="All recorded collections" accent />
            <Kpi
              label="Estimated value"
              value={moneyExact(totalHcrValue)}
              hint={`${pricedHcrCount} of ${filteredHcrCollections.length} entries priced in USD`}
            />
          </div>
          <p className="note">Showing all HCR collection records. Data is maintained in src/hcrCollections.json.</p>
          <div className="member-grid hcr-member-grid">
            {hcrMemberCards.map((card) => {
              const photo = card.member && memberPhotoCatalog[card.member.name]
              const payment = card.member
                ? currentWeekPayments.get(card.member.name.toLowerCase())
                : undefined
              const paid = payment && payment.cash + payment.hcrValue >= card.member.weeklyRate

              return (
                <article className="member-card hcr-member-card" key={card.race}>
                  <div className="member-photo">
                    <div className="member-photo-frame">
                      {photo ? (
                        <img
                          src={photo.src}
                          alt={photo.alt}
                          style={{ '--photo-position': photo.position, '--photo-zoom': photo.zoom }}
                        />
                      ) : (
                        <span className="member-photo-fallback">{initials(card.race)}</span>
                      )}
                    </div>
                  </div>
                  <div className="member-details">
                    <div className="member-name-row">
                      <h2>{card.race}</h2>
                      <span className={paid ? 'status yes' : 'status no'}>
                        {paid ? 'Paid' : card.member ? 'Pending' : 'HCR'}
                      </span>
                    </div>
                    <div className="member-contribution">
                      <span>HCR collected</span>
                      <strong>{hcrAmount(card.amount)} HCR</strong>
                    </div>
                    <div className="member-contribution">
                      <span>HCR value</span>
                      <strong>
                        {card.unpriced
                          ? `${moneyExact(card.estimatedValue)} + ${hcrAmount(card.unpriced)} unpriced`
                          : moneyExact(card.estimatedValue)}
                      </strong>
                    </div>
                    <div className="member-contribution">
                      <span>Dues credit</span>
                      <strong>{moneyExact(card.duesCredit)}</strong>
                    </div>
                    <div className="member-contribution">
                      <span>Collected by</span>
                      <strong>{[...card.collectors].join(', ') || '—'}</strong>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Week</th>
                  <th>Race</th>
                  <th>Collected by</th>
                  <th>HCR collected</th>
                  <th>Value per HCR</th>
                  <th>Estimated value</th>
                  <th>Weekly dues credit</th>
                </tr>
              </thead>
              <tbody>
                {filteredHcrCollections.length ? filteredHcrCollections.map((collection, index) => (
                  <tr key={`${collection.week}-${collection.id || index}`}>
                    <td>{prettyDate(collection.week)}</td>
                    <td>{collection.race || '—'}</td>
                    <td>{collection.collector || '—'}</td>
                    <td className="strong">{hcrAmount(collection.amount)} HCR</td>
                    <td>
                      {Number.isFinite(collection.unitValue) ? moneyExact(collection.unitValue) : '—'}
                    </td>
                    <td>
                      {!Number.isFinite(collection.unitValue)
                        ? '—'
                        : moneyExact(collection.amount * collection.unitValue)}
                    </td>
                    <td>
                      {collection.duesEligible === false
                        ? 'Fund purchase'
                        : !findHcrMember(collection)
                          ? 'No member match'
                          : !Number.isFinite(collection.unitValue) || collection.unitValue <= 0
                            ? 'Rate needed'
                            : moneyExact(getHcrDuesCredit(collection))}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7}>No HCR collections found.</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}>All-time total</td>
                  <td>{hcrAmount(totalHcr)} HCR</td>
                  <td />
                  <td>{pricedHcrCount ? moneyExact(totalHcrValue) : '—'}</td>
                  <td>{moneyExact(totalHcrDuesCredit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="note">
            Priced HCR contributed by a member credits that member’s dues for this week. HCR bought with fund money does not count toward dues.
          </p>
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
