import { CheckCircle2, Flame, ListChecks, Timer, TrendingDown, TrendingUp } from 'lucide-react'
import { useMemo, useState, type MouseEvent } from 'react'
import { formatDuration, formatMonth, formatShort, WEEKDAYS, WEEKDAYS_SHORT } from '../lib/date'
import {
  calendarGrid,
  categoryBreakdown,
  HOUR_BLOCKS,
  productivityMatrix,
  summary,
} from '../lib/stats'
import { useStore } from '../lib/store'
import { useUi } from './ui'

/** One hue, light to dark: magnitude never changes hue. */
const heat = (value: number, max: number) =>
  value === 0 || max === 0
    ? 'var(--surface-3)'
    : `color-mix(in oklab, var(--accent) ${Math.round(14 + (value / max) ** 1.8 * 86)}%, var(--surface-3))`

interface Tip {
  x: number
  y: number
  text: string
}

export function Insights() {
  const { tasks } = useStore()
  const { today } = useUi()
  const [tip, setTip] = useState<Tip | null>(null)

  const { stats, grid, matrix, categories } = useMemo(
    () => ({
      stats: summary(tasks, today),
      grid: calendarGrid(tasks, today),
      matrix: productivityMatrix(tasks, today),
      categories: categoryBreakdown(tasks, today),
    }),
    [tasks, today],
  )

  const showTip = (event: MouseEvent, text: string) =>
    setTip({ x: event.clientX, y: event.clientY, text })

  const gridMax = Math.max(0, ...grid.flat().map((d) => d.count ?? 0))
  const matrixMax = Math.max(0, ...matrix.flat())
  const best = useMemo(() => {
    let found = { day: 0, block: 0, value: 0 }
    matrix.forEach((row, day) =>
      row.forEach((value, block) => {
        if (value > found.value) found = { day, block, value }
      }),
    )
    return found
  }, [matrix])

  if (!tasks.some((t) => t.done)) {
    return (
      <div className="page">
        <header className="page-head">
          <div>
            <p className="eyebrow">Son 12 hafta</p>
            <h1>İçgörüler</h1>
          </div>
        </header>
        <p className="empty-note">Birkaç görev tamamladığında alışkanlıkların burada şekillenmeye başlayacak.</p>
      </div>
    )
  }

  const delta = stats.rateDelta === null ? null : Math.round(stats.rateDelta * 100)
  const monthLabels = grid.map((week, i) => {
    const month = formatMonth(week[0].date)
    return i === 0 || month !== formatMonth(grid[i - 1][0].date) ? month : ''
  })

  return (
    <div className="page insights" onMouseLeave={() => setTip(null)}>
      <header className="page-head">
        <div>
          <p className="eyebrow">Son 12 hafta</p>
          <h1>İçgörüler</h1>
        </div>
      </header>

      {best.value > 0 && (
        <p className="insight-headline">
          En güçlü zaman dilimin <em>{WEEKDAYS[best.day]} {HOUR_BLOCKS[best.block].label}</em>.
          Son 8 haftada burada {best.value} görev bitirdin.
        </p>
      )}

      <div className="stats">
        <article className="stat">
          <span><CheckCircle2 size={16} aria-hidden="true" /> Tamamlama oranı</span>
          <strong>%{Math.round((stats.rate ?? 0) * 100)}</strong>
          {delta !== null && (
            <small>
              {delta >= 0 ? <TrendingUp size={14} aria-hidden="true" /> : <TrendingDown size={14} aria-hidden="true" />}
              önceki 4 haftaya göre {delta >= 0 ? '+' : ''}{delta} puan
            </small>
          )}
        </article>
        <article className="stat">
          <span><Flame size={16} aria-hidden="true" /> Güncel seri</span>
          <strong>{stats.streak} gün</strong>
          <small>En uzun serin {stats.longest} gün</small>
        </article>
        <article className="stat">
          <span><ListChecks size={16} aria-hidden="true" /> Günlük ortalama</span>
          <strong>{stats.averagePerDay.toFixed(1).replace('.', ',')}</strong>
          <small>aktif gün başına görev</small>
        </article>
        <article className="stat">
          <span><Timer size={16} aria-hidden="true" /> Odak süresi</span>
          <strong>{formatDuration(stats.focusMinutes)}</strong>
          <small>son 4 haftada ölçülen</small>
        </article>
      </div>

      <div className="charts">
        <section className="chart-card">
          <h2>Tamamlanan görevler</h2>
          <p className="chart-sub">Her kare bir gün</p>
          <div className="calendar" role="img" aria-label={`Son 12 haftada günlük tamamlanan görevler. En yoğun gün ${gridMax} görev.`}>
            <div className="calendar-months" aria-hidden="true">
              <span />
              {monthLabels.map((label, i) => <span key={i}>{label}</span>)}
            </div>
            <div className="calendar-body">
              <div className="calendar-days" aria-hidden="true">
                {WEEKDAYS_SHORT.map((day, i) => <span key={day}>{i % 2 === 0 ? day : ''}</span>)}
              </div>
              {grid.map((week) => (
                <div key={week[0].date} className="calendar-week">
                  {week.map(({ date, count }) =>
                    count === null ? (
                      <span key={date} className="cell is-future" />
                    ) : (
                      <span
                        key={date}
                        className="cell"
                        style={{ background: heat(count, gridMax) }}
                        onMouseMove={(e) => showTip(e, `${formatShort(date)}: ${count} görev`)}
                        onMouseLeave={() => setTip(null)}
                      />
                    ),
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="scale" aria-hidden="true">
            <span>Az</span>
            {[0, 0.25, 0.5, 0.75, 1].map((step) => (
              <i key={step} style={{ background: heat(step, 1) }} />
            ))}
            <span>Çok</span>
          </div>
        </section>

        <section className="chart-card">
          <h2>Alan dağılımı</h2>
          <p className="chart-sub">Son 4 haftada tamamlananlar</p>
          <ul className="bars">
            {categories.map((category) => (
              <li key={category.id}>
                <div className="bar-label">
                  <span>{category.label}</span>
                  <span>{category.count} görev · %{Math.round(category.share * 100)}</span>
                </div>
                <div className="bar-track">
                  <span
                    style={{
                      width: `${(category.share / (categories[0].share || 1)) * 100}%`,
                      background: `var(--cat-${category.id})`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="chart-card">
        <h2>Ne zaman iş bitiriyorsun?</h2>
        <p className="chart-sub">Son 8 haftada gün ve saate göre tamamlanan görevler</p>
        <div className="matrix" role="img" aria-label="Gün ve saate göre tamamlanan görev sayısı. Tablo görünümü aşağıda.">
          <span />
          {HOUR_BLOCKS.map((block) => <span key={block.label} className="matrix-head">{block.label}</span>)}
          {matrix.map((row, day) => (
            <div key={day} className="matrix-row">
              <span className="matrix-day">{WEEKDAYS_SHORT[day]}</span>
              {row.map((value, block) => (
                <span
                  key={block}
                  className="matrix-cell"
                  style={{ background: heat(value, matrixMax) }}
                  onMouseMove={(e) => showTip(e, `${WEEKDAYS[day]} ${HOUR_BLOCKS[block].label}: ${value} görev`)}
                  onMouseLeave={() => setTip(null)}
                />
              ))}
            </div>
          ))}
        </div>
        <details className="data-table">
          <summary>Tablo olarak gör</summary>
          <table>
            <thead>
              <tr>
                <th scope="col">Gün</th>
                {HOUR_BLOCKS.map((block) => <th key={block.label} scope="col">{block.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {matrix.map((row, day) => (
                <tr key={day}>
                  <th scope="row">{WEEKDAYS[day]}</th>
                  {row.map((value, block) => <td key={block}>{value}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>

      {tip && (
        <div className="chart-tip" style={{ left: tip.x, top: tip.y }} aria-hidden="true">
          {tip.text}
        </div>
      )}
    </div>
  )
}
