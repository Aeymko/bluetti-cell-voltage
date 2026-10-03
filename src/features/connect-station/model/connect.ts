import { toast } from 'vue-sonner'
import { connectionStatus, resetStation, setConnected } from '@/entities/station'
import { BluettiSession, detectModel, NAME_PREFIXES, profileFor } from '@/shared/api/bluetti'

const SERVICE = 0xff00
const NOTIFY = 0xff01
const WRITE = 0xff02
const CHALLENGE_WAIT_MS = 4000
const HANDSHAKE_TIMEOUT_MS = 15000

let device: BluetoothDevice | null = null

export const bluetoothSupported = typeof navigator !== 'undefined' && 'bluetooth' in navigator

function timeout(ms: number, message: string): Promise<never> {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))
}

function onDisconnected() {
  device = null
  resetStation()
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
    device = picked
    picked.addEventListener('gattserverdisconnected', onDisconnected)
    if (!picked.gatt) throw new Error('The device has no GATT server')

    const server = await picked.gatt.connect()
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
    toast.success(`Connected to ${profile.model}`)
  } catch (e) {
    const err = e as Error
    // Closing the device chooser is not an error worth reporting.
    if (err.name !== 'NotFoundError')
      toast.error('Connection failed', { description: err.message || String(e) })
    if (device?.gatt?.connected) device.gatt.disconnect()
    onDisconnected()
  }
}

export function disconnectStation(): void {
  if (device?.gatt?.connected) device.gatt.disconnect()
  else onDisconnected()
}
