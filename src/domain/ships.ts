import type { GemiIstiqameti, GemiStatus } from '../data/mockData'

export const SHIP_STATUSES: readonly GemiStatus[] = ['Körpüdə', 'Lövbərdə', 'Yolda']
export const SHIP_DIRECTIONS: readonly GemiIstiqameti[] = ['Gələn', 'Gedən']

export const INCOMING_SHIP_STATUSES: readonly GemiStatus[] = ['Körpüdə', 'Lövbərdə', 'Yolda']
export const OUTGOING_SHIP_STATUSES: readonly GemiStatus[] = ['Körpüdə', 'Yolda']

export function getAvailableShipStatuses(direction?: GemiIstiqameti | 'Hamısı'): readonly GemiStatus[] {
  if (direction === 'Gedən') {
    return OUTGOING_SHIP_STATUSES
  }
  return INCOMING_SHIP_STATUSES
}

export function normalizeShipStatus(status: GemiStatus, direction: GemiIstiqameti): GemiStatus {
  if (direction === 'Gedən' && status === 'Lövbərdə') {
    return 'Körpüdə'
  }
  return status
}

export type ShipMovement = {
  status: GemiStatus
  istiqamet?: GemiIstiqameti
  menshe?: string
  teyinat?: string
}

const isAlatPort = (value = '') => {
  const normalized = value.toLocaleLowerCase('az')
  return normalized.includes('ələt')
    || normalized.includes('alat')
    || normalized.includes('bakı beynəlxalq dəniz')
}

/** Explicit direction is authoritative; route inference only supports legacy records. */
export function getShipDirection(ship: ShipMovement): GemiIstiqameti {
  if (ship.istiqamet) return ship.istiqamet
  if (isAlatPort(ship.teyinat)) return 'Gələn'
  return isAlatPort(ship.menshe) ? 'Gedən' : 'Gələn'
}

export function getShipOperationLabel(ship: ShipMovement) {
  const direction = getShipDirection(ship)
  if (ship.status === 'Körpüdə') {
    return direction === 'Gedən' ? 'Yüklənən gəmi' : 'Boşaldılan gəmi'
  }
  return `${ship.status} · ${direction}`
}

export function countShipsByMovement<T extends ShipMovement>(
  ships: readonly T[],
  status: GemiStatus,
  direction?: GemiIstiqameti,
) {
  return ships.filter(ship => (
    ship.status === status && (!direction || getShipDirection(ship) === direction)
  )).length
}

export function getShipMovementSummary<T extends ShipMovement>(ships: readonly T[]) {
  const byStatus = Object.fromEntries(SHIP_STATUSES.map(status => [
    status,
    {
      total: countShipsByMovement(ships, status),
      Gələn: countShipsByMovement(ships, status, 'Gələn'),
      Gedən: status === 'Lövbərdə' ? 0 : countShipsByMovement(ships, status, 'Gedən'),
    },
  ])) as Record<GemiStatus, { total: number; Gələn: number; Gedən: number }>

  return {
    total: SHIP_STATUSES.reduce((sum, status) => sum + byStatus[status].total, 0),
    Gələn: SHIP_STATUSES.reduce((sum, status) => sum + byStatus[status].Gələn, 0),
    Gedən: SHIP_STATUSES.reduce((sum, status) => sum + byStatus[status].Gedən, 0),
    byStatus,
    unloading: byStatus.Körpüdə.Gələn,
    loading: byStatus.Körpüdə.Gedən,
  }
}