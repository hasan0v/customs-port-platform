import { create } from 'zustand'
import { gemiler, avtomobiller, beyannameler, postQerarlar } from '../data/mockData'

type Profile = {
  name: string
  role: string
  email: string
}

export type NotificationPrefs = Record<string, boolean>

export type SavedRegistration = {
  id: string
  savedAt: string
  shipId: string
  shipName: string
  plate: string
  declarationKod: string
  malAdi?: string
  ceki?: string
  qeydeAlınma?: string
  buraxilis?: string
  riskVerdict: 'green' | 'red'
  riskReasons: string[]
  /** Gözləmədədirsə: Fiziki yoxlama / X ray / Kinoloji və s. */
  manualRoute?: string | null
  waitReasons?: string[]
  roadTaxes: string[]
  permits: string[]
  transport: Record<string, string>
  status: 'Təsdiqləndi' | 'Buraxıldı' | 'Gözləmədə' | 'İmtina' | string
  operator: string
  postKod: string
}

type AppState = {
  dark: boolean
  sidebarOpen: boolean
  commandOpen: boolean
  ships: typeof gemiler
  vehicles: typeof avtomobiller
  declarations: typeof beyannameler
  postDecisions: typeof postQerarlar
  registrations: SavedRegistration[]
  profile: Profile
  notifications: NotificationPrefs
  toggleDark: () => void
  setSidebarOpen: (open: boolean) => void
  setCommandOpen: (open: boolean) => void
  addShip: (ship: (typeof gemiler)[number]) => void
  updateShip: (id: string, patch: Partial<(typeof gemiler)[number]>) => void
  updateVehicle: (nomre: string, patch: Partial<(typeof avtomobiller)[number] & { waitReason?: string }>) => void
  addDeclaration: (declaration: (typeof beyannameler)[number]) => void
  updateDeclaration: (kod: string, patch: Partial<(typeof beyannameler)[number]>) => void
  addPostDecision: (decision: (typeof postQerarlar)[number]) => void
  addRegistration: (record: SavedRegistration) => void
  updateProfile: (profile: Partial<Profile>) => void
  updateNotifications: (prefs: NotificationPrefs) => void
  saveSettings: (payload: { profile?: Partial<Profile>; notifications?: NotificationPrefs }) => void
}

const REG_STORAGE_KEY = 'vglp-registrations'
const PROFILE_STORAGE_KEY = 'vglp-profile'
const NOTIF_STORAGE_KEY = 'vglp-notifications'

const DEFAULT_PROFILE: Profile = {
  name: 'Ali Həsənov',
  role: 'Şöbə rəhbəri',
  email: 'ali@customs.gov.az',
}

export const DEFAULT_NOTIFICATIONS: NotificationPrefs = {
  'Yeni gəmi yaxınlaşanda': true,
  'Riskli bəyannamə aşkar ediləndə': true,
  'Post qərarı gözləmədə qalanda': true,
  'Həftəlik analitika hesabatı': false,
}

function loadRegistrations(): SavedRegistration[] {
  try {
    const raw = localStorage.getItem(REG_STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as SavedRegistration[]
  } catch {
    return []
  }
}

function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY)
    if (!raw) return DEFAULT_PROFILE
    const parsed = JSON.parse(raw) as Partial<Profile>
    return {
      name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name : DEFAULT_PROFILE.name,
      role: typeof parsed.role === 'string' && parsed.role.trim() ? parsed.role : DEFAULT_PROFILE.role,
      email: typeof parsed.email === 'string' && parsed.email.trim() ? parsed.email : DEFAULT_PROFILE.email,
    }
  } catch {
    return DEFAULT_PROFILE
  }
}

function loadNotifications(): NotificationPrefs {
  try {
    const raw = localStorage.getItem(NOTIF_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_NOTIFICATIONS }
    const parsed = JSON.parse(raw) as NotificationPrefs
    return { ...DEFAULT_NOTIFICATIONS, ...parsed }
  } catch {
    return { ...DEFAULT_NOTIFICATIONS }
  }
}

function persistProfile(profile: Profile) {
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile))
}

function persistNotifications(prefs: NotificationPrefs) {
  localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(prefs))
}

export const useAppStore = create<AppState>((set) => ({
  dark: localStorage.getItem('vglp-theme') === 'dark',
  sidebarOpen: false,
  commandOpen: false,
  ships: gemiler,
  vehicles: avtomobiller,
  declarations: beyannameler,
  postDecisions: postQerarlar,
  registrations: loadRegistrations(),
  profile: loadProfile(),
  notifications: loadNotifications(),
  toggleDark: () => set((state) => {
    const dark = !state.dark
    localStorage.setItem('vglp-theme', dark ? 'dark' : 'light')
    return { dark }
  }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  addShip: (ship) => set((state) => ({ ships: [ship, ...state.ships] })),
  updateShip: (id, patch) => set((state) => ({
    ships: state.ships.map(ship => ship.id === id ? { ...ship, ...patch } : ship) as typeof gemiler,
  })),
  updateVehicle: (nomre, patch) => set((state) => ({
    vehicles: state.vehicles.map(v => v.nomre === nomre ? { ...v, ...patch } : v) as typeof avtomobiller,
  })),
  addDeclaration: (declaration) => set((state) => ({ declarations: [declaration, ...state.declarations] })),
  updateDeclaration: (kod, patch) => set((state) => ({
    declarations: state.declarations.map(d => d.kod === kod ? { ...d, ...patch } : d) as typeof beyannameler,
  })),
  addPostDecision: (decision) => set((state) => ({ postDecisions: [decision, ...state.postDecisions] })),
  addRegistration: (record) => set((state) => {
    const registrations = [record, ...state.registrations]
    localStorage.setItem(REG_STORAGE_KEY, JSON.stringify(registrations))
    return { registrations }
  }),
  updateProfile: (newProfile) => set((state) => {
    const profile = { ...state.profile, ...newProfile }
    persistProfile(profile)
    return { profile }
  }),
  updateNotifications: (prefs) => set(() => {
    const notifications = { ...DEFAULT_NOTIFICATIONS, ...prefs }
    persistNotifications(notifications)
    return { notifications }
  }),
  saveSettings: ({ profile: profilePatch, notifications: notifPatch }) => set((state) => {
    const next: Partial<AppState> = {}
    if (profilePatch) {
      const profile = { ...state.profile, ...profilePatch }
      persistProfile(profile)
      next.profile = profile
    }
    if (notifPatch) {
      const notifications = { ...state.notifications, ...notifPatch }
      persistNotifications(notifications)
      next.notifications = notifications
    }
    return next
  }),
}))

export default useAppStore

