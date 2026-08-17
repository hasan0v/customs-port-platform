import { useState, useEffect } from 'react'
import { Bell, Database, Save, User } from 'lucide-react'
import { toast } from 'sonner'
import { DEFAULT_NOTIFICATIONS, useAppStore } from '../store/useAppStore'
import { Button, Card, PageHeader } from '../components/UI'

const notificationsList = Object.keys(DEFAULT_NOTIFICATIONS)
const integrations = ['AIS gəmi şəbəkəsi', 'Liman Vahid Pəncərəsi', 'Gömrük GİB sistemi', 'Post qərar modulu']

export default function SettingsPage() {
  const { profile, notifications, saveSettings } = useAppStore()
  const [name, setName] = useState(profile.name)
  const [role, setRole] = useState(profile.role)
  const [email, setEmail] = useState(profile.email)
  const [notifDraft, setNotifDraft] = useState(notifications)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    setName(profile.name)
    setRole(profile.role)
    setEmail(profile.email)
    setNotifDraft(notifications)
    setDirty(false)
  }, [profile, notifications])

  const markDirty = () => setDirty(true)

  const handleSave = () => {
    const trimmedName = name.trim()
    const trimmedRole = role.trim()
    const trimmedEmail = email.trim()

    if (!trimmedName) {
      toast.error('Ad və soyad boş ola bilməz')
      return
    }
    if (!trimmedRole) {
      toast.error('Vəzifə boş ola bilməz')
      return
    }
    if (!trimmedEmail) {
      toast.error('E-poçt boş ola bilməz')
      return
    }

    saveSettings({
      profile: { name: trimmedName, role: trimmedRole, email: trimmedEmail },
      notifications: notifDraft,
    })
    setDirty(false)
    toast.success('Parametrlər yadda saxlanıldı')
  }

  const toggleNotification = (label: string) => {
    setNotifDraft(prev => ({ ...prev, [label]: !prev[label] }))
    markDirty()
  }

  return <>
    <PageHeader
      title="Parametrlər"
      action={
        <Button onClick={handleSave}>
          <Save /> Yadda saxla
        </Button>
      }
    />
    <section className="settings-grid">
      <Card hover={false}>
        <header><User /><h2>İstifadəçi profili</h2></header>
        <label>Ad və soyad<input value={name} onChange={e => { setName(e.target.value); markDirty() }} /></label>
        <label>Vəzifə<input value={role} onChange={e => { setRole(e.target.value); markDirty() }} /></label>
        <label>E-poçt<input type="email" value={email} onChange={e => { setEmail(e.target.value); markDirty() }} /></label>
        {dirty && <p className="settings-dirty-hint">Dəyişikliklər hələ yadda saxlanılmayıb</p>}
      </Card>

      <Card hover={false}>
        <header><Bell /><h2>Bildirişlər</h2></header>
        {notificationsList.map((label) => (
          <label key={label} className="toggle-row">
            <span>{label}</span>
            <input
              type="checkbox"
              checked={!!notifDraft[label]}
              onChange={() => toggleNotification(label)}
            />
            <i />
          </label>
        ))}
      </Card>

      <Card hover={false} className="settings-system-card">
        <header><Database /><h2>Sistem</h2></header>
        <h3>İnteqrasiyalar</h3>
        {integrations.map(item => (
          <div key={item} className="integration-row">
            <span><i />{item}</span>
            <b>Aktiv</b>
          </div>
        ))}
        <h3>Təhlükəsizlik</h3>
        <div className="security-info"><strong>İki mərhələli doğrulama</strong><span>Aktiv</span></div>
        <div className="security-info"><strong>Son giriş</strong><span>14.07.2026 · 09:42</span></div>
        <div className="security-info"><strong>Audit saxlama müddəti</strong><span>7 il</span></div>
      </Card>
    </section>
  </>
}
