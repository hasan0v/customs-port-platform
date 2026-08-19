/**
 * Gəmi manifesti sənədi (IMO FAL paketi).
 *
 * Limana gələn manifest skan edilmiş PDF olur: General Declaration (FAL 1),
 * Cargo Declaration, Crew/Passenger List və sonda tır sətirlərinin cədvəli.
 * Skanın mətn qatı olmadığına görə sətirlər avtomatik oxunmur — sənəd qeydə
 * alınır, başlıq məlumatları isə operator tərəfindən doldurulur.
 */

export type ManifestHeader = {
  /** Səfər nömrəsi — General Declaration / Ships Stores sənədindəki «Voyage №» */
  voyageNo: string
  master: string
  agent: string
  portLoading: string
  portDischarge: string
  arrivalDate: string
  /** Qoşqulu avtomaşın sayı */
  vehicleCount: string
  /** Ayrıca qoşqu sayı */
  trailerCount: string
  /** Boş gələn vahidlərin sayı */
  emptyCount: string
  totalGrossKg: string
}

export type ManifestDocument = {
  id: string
  shipId: string
  fileName: string
  size: number
  uploadedAt: string
  /** Sessiya daxilində yaradılan object URL — backend olmadığına görə saxlanılmır. */
  url: string
  pageCount?: number
  header: ManifestHeader
}

export const emptyManifestHeader: ManifestHeader = {
  voyageNo: '',
  master: '',
  agent: '',
  portLoading: '',
  portDischarge: '',
  arrivalDate: '',
  vehicleCount: '',
  trailerCount: '',
  emptyCount: '',
  totalGrossKg: '',
}

export const MAX_MANIFEST_BYTES = 30 * 1024 * 1024

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export type ManifestReadResult =
  | { ok: true; pageCount?: number }
  | { ok: false; error: string }

/**
 * Faylın həqiqətən PDF olduğunu yoxlayır (uzantıya deyil, `%PDF-` imzasına görə)
 * və mümkünsə səhifə sayını oxuyur.
 */
export async function inspectManifestFile(file: File): Promise<ManifestReadResult> {
  if (file.size === 0) {
    return { ok: false, error: 'Fayl boşdur' }
  }
  if (file.size > MAX_MANIFEST_BYTES) {
    return { ok: false, error: `Fayl ${formatFileSize(MAX_MANIFEST_BYTES)} həddini aşır (${formatFileSize(file.size)})` }
  }

  let buffer: ArrayBuffer
  try {
    buffer = await file.arrayBuffer()
  } catch {
    return { ok: false, error: 'Fayl oxunmadı' }
  }

  const bytes = new Uint8Array(buffer)
  const signature = String.fromCharCode(...bytes.slice(0, 5))
  if (signature !== '%PDF-') {
    return { ok: false, error: 'Yalnız PDF sənədi qəbul olunur (fayl PDF imzası daşımır)' }
  }

  return { ok: true, pageCount: countPdfPages(bytes) }
}

/**
 * Sıxılmamış PDF-lərdə səhifə sayını `/Type /Pages … /Count N` qovşağından oxuyur.
 * Obyekt axınları sıxılıbsa tapılmır — bu halda sayı göstərilmir.
 */
function countPdfPages(bytes: Uint8Array): number | undefined {
  let raw = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    raw += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }

  const counts = [...raw.matchAll(/\/Type\s*\/Pages\b[^>]*?\/Count\s+(\d+)/g)]
    .map(match => Number(match[1]))
    .filter(value => Number.isFinite(value) && value > 0)
  if (counts.length > 0) return Math.max(...counts)

  const pageObjects = raw.match(/\/Type\s*\/Page[^s]/g)
  return pageObjects ? pageObjects.length : undefined
}
