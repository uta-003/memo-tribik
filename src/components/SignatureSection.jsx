import Icon from './icons.jsx'

const GROUPS = [
  { key: 'pemohon', label: 'Pemohon' },
  { key: 'mengetahui', label: 'Mengetahui' },
  { key: 'menyetujui', label: 'Menyetujui' },
]

export default function SignatureSection({
  signatures,
  onChange,
  city,
  onCityChange,
  tanggalText,
}) {
  const update = (group, index, field, value) => {
    onChange({
      ...signatures,
      [group]: signatures[group].map((m, i) =>
        i === index ? { ...m, [field]: value } : m,
      ),
    })
  }

  return (
    <section className="card signature-card">
      <div className="sig-date">
        <input
          className="sig-city"
          value={city}
          onChange={(e) => onCityChange(e.target.value)}
          aria-label="Kota"
        />
        <span>, {tanggalText}</span>
      </div>

      <div className="signature-grid">
        {GROUPS.map((g) => (
          <div className="sig-group" key={g.key}>
            <span className={`sig-label sig-${g.key}`}>{g.label}</span>
            <div className={`sig-members${signatures[g.key].length > 1 ? ' two' : ''}`}>
              {signatures[g.key].map((m, i) => (
                <div className="sig-member" key={i}>
                  <div className="sig-space">
                    <Icon name="pen" size={16} />
                    <span>Tanda tangan</span>
                  </div>
                  <input
                    className="sig-name"
                    value={m.nama}
                    onChange={(e) => update(g.key, i, 'nama', e.target.value)}
                    placeholder="Nama"
                  />
                  <input
                    className="sig-jabatan"
                    value={m.jabatan}
                    onChange={(e) => update(g.key, i, 'jabatan', e.target.value)}
                    placeholder="Jabatan"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
