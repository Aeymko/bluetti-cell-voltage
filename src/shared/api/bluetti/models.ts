import { type BluettiSession, RegisterError } from './protocol'

const V2_MODELS = [
  'AC2A',
  'AC2P',
  'AC50B',
  'AC60',
  'AC60P',
  'AC70',
  'AC70P',
  'AC180',
  'AC180T',
  'AC180P',
  'AP300',
  'EL10',
  'EL30V2',
  'EL100V2',
  'EP600',
  'EP760',
  'EP800',
  'EP2000',
  'Handsfree 1',
  'PR30V2',
  'PR100V2',
]
const V1_MODELS = ['AC200L', 'AC200M', 'AC200PL', 'AC300', 'AC500', 'EB3A', 'EP500', 'EP500P']
export const KNOWN_MODELS = [...V2_MODELS, ...V1_MODELS]

/** Prefixes used to filter the Web Bluetooth device chooser. */
export const NAME_PREFIXES = ['AC', 'AP', 'EB', 'EL', 'EP', 'PR', 'Handsfree']

export type Protocol = 1 | 2
export type Chemistry = 'LiFePO4' | 'Li-ion' | 'unknown'

interface RegisterSpec {
  reg: number
}
interface BlockSpec {
  block: number
  index: number
}

export interface StationProfile {
  model: string
  protocol: Protocol
  verified: boolean
  chemistry: Chemistry
  cells: { countReg?: number; firstReg: number; maxCells?: number; scale: number }
  soc?: RegisterSpec
  current?: RegisterSpec
  mode?: BlockSpec
  snReg: number
  dumpEnd: number
}

type BaseProfile = Omit<StationProfile, 'model' | 'verified' | 'chemistry'>

const V2_BASE: BaseProfile = {
  protocol: 2,
  cells: { countReg: 6300, firstReg: 6302, scale: 1 },
  soc: { reg: 6113 },
  current: { reg: 6112 },
  // Register 24 alone is rejected by the AC70P; the 20..29 block works.
  mode: { block: 20, index: 4 },
  snReg: 116,
  dumpEnd: 20000,
}

const V1_BASE: BaseProfile = {
  protocol: 1,
  // Shows the pack currently selected on the station; selecting another pack needs a write.
  cells: { firstReg: 105, maxCells: 16, scale: 10 },
  soc: { reg: 43 },
  snReg: 17,
  dumpEnd: 8000,
}

const VERIFIED: Record<string, { chemistry: Chemistry }> = {
  AC70P: { chemistry: 'LiFePO4' },
}

const CHEMISTRY_RANGE: Record<Chemistry, { min: number; max: number }> = {
  LiFePO4: { min: 2500, max: 3650 },
  'Li-ion': { min: 3000, max: 4250 },
  unknown: { min: 2000, max: 4500 },
}

export function profileFor(model: string, protocol: Protocol): StationProfile {
  const verified = VERIFIED[model]
  return {
    ...(protocol === 1 ? V1_BASE : V2_BASE),
    model,
    verified: Boolean(verified),
    chemistry: verified?.chemistry ?? 'unknown',
  }
}

export function wordsToString(words: number[], swap: boolean): string {
  let s = ''
  for (const w of words) {
    for (const b of swap ? [w & 0xff, w >> 8] : [w >> 8, w & 0xff]) {
      if (b === 0) return s.trim()
      s += String.fromCharCode(b)
    }
  }
  return s.trim()
}

async function tryRead(
  session: BluettiSession,
  address: number,
  quantity: number,
  timeoutMs?: number,
): Promise<number[] | null> {
  try {
    return await session.readRegisters(address, quantity, timeoutMs)
  } catch (e) {
    if (e instanceof RegisterError && (e.rejected || e.timeout)) return null
    throw e
  }
}

export interface DetectedModel {
  model: string | null
  protocol: Protocol | null
  raw: string
}

/** V2 is checked first: some V2 stations fill the V1 type registers with garbage. */
export async function detectModel(session: BluettiSession): Promise<DetectedModel> {
  const v2 = await tryRead(session, 110, 6, 3000)
  const v2Name = v2 ? wordsToString(v2, true) : ''
  if (KNOWN_MODELS.includes(v2Name)) return { model: v2Name, protocol: 2, raw: v2Name }

  const v1 = await tryRead(session, 10, 6, 3000)
  const v1Name = v1 ? wordsToString(v1, false) : ''
  if (KNOWN_MODELS.includes(v1Name)) return { model: v1Name, protocol: 1, raw: v1Name }

  return { model: null, protocol: v2 ? 2 : v1 ? 1 : null, raw: v2Name || v1Name }
}

export interface Snapshot {
  ts: number
  model: string
  cells: number[]
  soc: number | null
  current: number | null
  mode: number | null
}

async function readCells(session: BluettiSession, profile: StationProfile): Promise<number[]> {
  const c = profile.cells
  let raw: number[]
  if (c.countReg !== undefined) {
    const [count] = await session.readRegisters(c.countReg, 1)
    if (!count || count > 32) throw new Error(`Unexpected cell count: ${count}`)
    raw = await session.readRegisters(c.firstReg, count)
  } else {
    raw = (await session.readRegisters(c.firstReg, c.maxCells ?? 16)).filter((v) => v > 0)
  }
  const cells = raw.map((v) => v * c.scale)
  const { min, max } = CHEMISTRY_RANGE[profile.chemistry]
  if (cells.length < 2 || cells.some((v) => v < min || v > max)) {
    throw new Error(`Cell voltages look wrong for this model: ${cells.join(' ')}`)
  }
  return cells
}

async function readOptional(
  session: BluettiSession,
  spec?: RegisterSpec | BlockSpec,
): Promise<number | null> {
  if (!spec) return null
  const words = 'block' in spec ? await tryRead(session, spec.block, 10) : await tryRead(session, spec.reg, 1)
  if (!words) return null
  return 'block' in spec ? words[spec.index] : words[0]
}

export async function readSnapshot(session: BluettiSession, profile: StationProfile): Promise<Snapshot> {
  const cells = await readCells(session, profile)
  const soc = await readOptional(session, profile.soc)
  const current = await readOptional(session, profile.current)
  const mode = await readOptional(session, profile.mode)
  return {
    ts: Date.now(),
    model: profile.model,
    cells,
    soc: soc !== null && soc <= 100 ? soc : null,
    current,
    mode,
  }
}

export type RegisterBlocks = Record<number, number[]>

/** Zeroes every occurrence of the serial number's 4-word sequence; returns where it was found. */
export function redactSerial(blocks: RegisterBlocks, snReg: number): number[] {
  const words = new Map<number, number>()
  for (const [addr, vals] of Object.entries(blocks)) {
    vals.forEach((v, i) => {
      words.set(Number(addr) + i, v)
    })
  }
  const sn = [0, 1, 2, 3].map((i) => words.get(snReg + i))
  const redacted: number[] = []
  if (sn.some((w) => w === undefined) || sn.every((w) => w === 0)) return redacted
  for (const addr of [...words.keys()].sort((a, b) => a - b)) {
    if (!sn.every((w, i) => words.get(addr + i) === w)) continue
    redacted.push(addr)
    for (let i = 0; i < 4; i++) {
      const a = addr + i
      const block = Math.floor(a / 10) * 10
      if (blocks[block]) blocks[block][a - block] = 0
    }
  }
  return redacted
}

export interface RegisterDump {
  format: 'bluetti-register-dump/1'
  createdAt: string
  model: string
  protocol: Protocol
  encrypted: boolean
  range: [number, number]
  stats: { read: number; rejected: number; timeouts: number }
  serialRedactedAt: number[]
  blocks: RegisterBlocks
}

export interface DumpOptions {
  onProgress?: (done: number, total: number) => void
  signal?: AbortSignal
  timeoutMs?: number
}

export async function dumpRegisters(
  session: BluettiSession,
  profile: StationProfile,
  { onProgress, signal, timeoutMs = 2000 }: DumpOptions = {},
): Promise<RegisterDump> {
  const blocks: RegisterBlocks = {}
  let rejected = 0
  let timeouts = 0
  let consecutiveTimeouts = 0
  const total = profile.dumpEnd / 10
  for (let i = 0; i < total; i++) {
    signal?.throwIfAborted()
    const addr = i * 10
    try {
      blocks[addr] = await session.readRegisters(addr, 10, timeoutMs)
      consecutiveTimeouts = 0
    } catch (e) {
      if (!(e instanceof RegisterError)) throw e
      if (e.rejected) rejected++
      else if (e.timeout) {
        timeouts++
        consecutiveTimeouts++
        if (consecutiveTimeouts >= 10) throw new Error(`Station stopped responding at register ${addr}`)
      } else throw e
    }
    onProgress?.(i + 1, total)
  }
  const serialRedactedAt = redactSerial(blocks, profile.snReg)
  return {
    format: 'bluetti-register-dump/1',
    createdAt: new Date().toISOString(),
    model: profile.model,
    protocol: profile.protocol,
    encrypted: session.encrypted,
    range: [0, profile.dumpEnd],
    stats: { read: Object.keys(blocks).length, rejected, timeouts },
    serialRedactedAt,
    blocks,
  }
}
