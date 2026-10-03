import { useStorage } from '@vueuse/core'
import { toast } from 'vue-sonner'
import { connectionStatus, resetStation, setConnected } from '@/entities/station'
import { BluettiSession, detectModel, NAME_PREFIXES, profileFor } from '@/shared/api/bluetti'

const SERVICE = 0xff00
const NOTIFY = 0xff01
const WRITE = 0xff02
const CHALLENGE_WAIT_MS = 4000
const HANDSHAKE_TIMEOUT_MS = 15000
const ADVERTISEMENT_WAIT_MS = 10000
const GATT_CONNECT_TIMEOUT_MS = 20000

let device: BluetoothDevice | null = null
// Cleared on an explicit disconnect, so a reload only reconnects if the user left it connected.
const rememberedId = useStorage('bcv-station-id', '')

export const bluetoothSupported = typeof navigator !== 'undefined' && 'bluetooth' in navigator

function timeout(ms: number, message: string): Promise<never> {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))
}

function onDisconnected() {
  device = null
  resetStation()
}

function reportFailure(e: unknown): void {
  const err = e as Error
  // Closing the device chooser is not an error worth reporting.
  if (err.name !== 'NotFoundError')
    toast.error('Connection failed', { description: err.message || String(e) })
  if (device?.gatt?.connected) device.gatt.disconnect()
  onDisconnected()
}

export async function connectStation(showAllDevices: boolean): Promise<void> {
  if (!bluetoothSupported) {
    toast.error('This browser has no Web Bluetooth', {
      description: 'Use Chrome or Edge on desktop or Android.',
    })
    return
  }
  try {
    connectionStatus.value = 'connecting'
    const picked = await navigator.bluetooth.requestDevice(
      showAllDevices
        ? { acceptAllDevices: true, optionalServices: [SERVICE] }
        : { filters: NAME_PREFIXES.map((namePrefix) => ({ namePrefix })), optionalServices: [SERVICE] },
    )
    await openSession(picked)
  } catch (e) {
    reportFailure(e)
  }
}

/** Resolves false if the station is not advertising, null if the browser cannot watch for it. */
async function waitForAdvertisement(target: BluetoothDevice, ms: number): Promise<boolean | null> {
  if (typeof target.watchAdvertisements !== 'function') return null
  const abort = new AbortController()
  try {
    const seen = new Promise<boolean>((resolve) => {
      target.addEventListener('advertisementreceived', () => resolve(true), {
        once: true,
        signal: abort.signal,
      })
      setTimeout(() => resolve(false), ms)
    })
    await target.watchAdvertisements({ signal: abort.signal })
    return await seen
  } catch {
    return null
  } finally {
    abort.abort()
  }
}

/** Reconnects to the station used before the page was reloaded, without the device chooser. */
export async function reconnectRememberedStation(): Promise<void> {
  if (!bluetoothSupported || !rememberedId.value || connectionStatus.value !== 'disconnected') return
  // Needs Chrome's persistent Bluetooth permissions; without them the chooser stays the only way in.
  if (typeof navigator.bluetooth.getDevices !== 'function') return
  connectionStatus.value = 'searching'
  try {
    const known = (await navigator.bluetooth.getDevices()).find((d) => d.id === rememberedId.value)
    if (!known || (await waitForAdvertisement(known, ADVERTISEMENT_WAIT_MS)) === false) {
      onDisconnected()
      return
    }
    connectionStatus.value = 'connecting'
    await openSession(known)
  } catch (e) {
    reportFailure(e)
  }
}

async function openSession(picked: BluetoothDevice): Promise<void> {
  device = picked
  picked.addEventListener('gattserverdisconnected', onDisconnected)
  if (!picked.gatt) throw new Error('The device has no GATT server')

  const server = await Promise.race([
    picked.gatt.connect(),
    timeout(GATT_CONNECT_TIMEOUT_MS, 'The station did not accept the connection'),
  ])
  const service = await server.getPrimaryService(SERVICE)
  const notifyChar = await service.getCharacteristic(NOTIFY)
  const writeChar = await service.getCharacteristic(WRITE)

  const withResponse = writeChar.properties.write
  const session = new BluettiSession((data) =>
    withResponse ? writeChar.writeValueWithResponse(data) : writeChar.writeValueWithoutResponse(data),
  )
  notifyChar.addEventListener('characteristicvaluechanged', (e) => {
    const v = (e.target as BluetoothRemoteGATTCharacteristic).value
    if (v) session.onNotify(new Uint8Array(v.buffer, v.byteOffset, v.byteLength).slice())
  })
  await notifyChar.startNotifications()

  // Newer firmware starts an encrypted key exchange right away; older stations speak plain Modbus.
  connectionStatus.value = 'waiting'
  const challenged = await Promise.race([
    session.challengeSeen.then(() => true),
    new Promise<boolean>((r) => setTimeout(() => r(false), CHALLENGE_WAIT_MS)),
  ])
  if (challenged) {
    connectionStatus.value = 'handshake'
    await Promise.race([
      session.ready,
      timeout(HANDSHAKE_TIMEOUT_MS, 'The station did not finish the key exchange'),
    ])
  } else {
    session.usePlain()
  }

  connectionStatus.value = 'detecting'
  const found = await detectModel(session)
  if (!found.protocol) throw new Error('The station does not answer register reads')
  const profile = profileFor(found.model ?? (found.raw || 'Unknown'), found.protocol)
  setConnected(session, found, profile)
  rememberedId.value = picked.id
  toast.success(`Connected to ${profile.model}`)
}

export function disconnectStation(): void {
  rememberedId.value = ''
  if (device?.gatt?.connected) device.gatt.disconnect()
  else onDisconnected()
}
