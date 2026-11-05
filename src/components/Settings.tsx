import { Check, Download, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { exportData, importData, setTheme, startEmpty, useStore } from '../lib/store'
import { THEMES, type ThemeId } from '../lib/themes'

/** Rendered under its own data-theme, so it uses the theme's real tokens. */
function ThemePreview({ id }: { id: ThemeId }) {
  return (
    <div className="theme-preview" data-theme={id} aria-hidden="true">
      <svg viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="32" className="preview-ring" />
        <path d="M 40 8 A 32 32 0 0 1 72 40" className="preview-arc" style={{ stroke: 'var(--accent)' }} />
        <path d="M 62.6 62.6 A 32 32 0 0 1 40 72" className="preview-arc" style={{ stroke: 'var(--cat-saglik)' }} />
        <path d="M 8 40 A 32 32 0 0 1 17.4 17.4" className="preview-arc" style={{ stroke: 'var(--cat-is)' }} />
      </svg>
      <div className="preview-copy">
        <strong>Aa</strong>
        <span className="preview-line" />
        <span className="preview-line short" />
        <span className="preview-button" />
      </div>
    </div>
  )
}

export function Settings() {
  const { tasks, theme } = useStore()
  const file = useRef<HTMLInputElement>(null)
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="page settings">
      <header className="page-head">
        <div>
          <p className="eyebrow">Tercihlerin</p>
          <h1>Ayarlar</h1>
        </div>
      </header>

      <section aria-labelledby="theme-title">
        <h2 id="theme-title">Tema</h2>
        <p className="settings-note">Seçimin hemen uygulanır ve bu tarayıcıda hatırlanır.</p>
        <div className="theme-grid" role="radiogroup" aria-labelledby="theme-title">
          {THEMES.map(({ id, name, description, mode }) => (
            <label key={id} className={`theme-card ${theme === id ? 'is-on' : ''}`}>
              <input
                type="radio"
                name="theme"
                className="sr-only"
                checked={theme === id}
                onChange={() => setTheme(id)}
              />
              <ThemePreview id={id} />
              <span className="theme-caption">
                <span>
                  <strong>{name}</strong>
                  <small>{mode} · {description}</small>
                </span>
                {theme === id && (
                  <span className="theme-check">
                    <Check size={15} strokeWidth={3} aria-hidden="true" />
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>
      </section>

      <section aria-labelledby="data-title">
        <h2 id="data-title">Verilerim</h2>
        <p className="settings-note">
          {tasks.length} görev yalnızca bu tarayıcıda duruyor. Tarayıcı verilerini temizlersen silinir, bu yüzden ara sıra yedek al.
        </p>
        <div className="data-actions">
          <button className="btn ghost" onClick={exportData}>
            <Download size={16} aria-hidden="true" /> Yedeği indir
          </button>
          <button className="btn ghost" onClick={() => file.current?.click()}>
            <Upload size={16} aria-hidden="true" /> Yedekten yükle
          </button>
          <input
            ref={file}
            className="sr-only"
            type="file"
            accept="application/json"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              const selected = e.target.files?.[0]
              e.target.value = ''
              if (selected) void importData(selected)
            }}
          />
          {confirming ? (
            <button
              className="btn danger"
              onClick={() => {
                startEmpty()
                setConfirming(false)
              }}
            >
              <Trash2 size={16} aria-hidden="true" /> Evet, {tasks.length} görevi sil
            </button>
          ) : (
            <button className="btn danger" onClick={() => setConfirming(true)}>
              <Trash2 size={16} aria-hidden="true" /> Tümünü sil
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
