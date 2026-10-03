import * as nc from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { detectModel, profileFor, readSnapshot, redactSerial } from './models'
import { BluettiSession } from './protocol'

const LOCAL_AES_KEY = Buffer.from('459FC535808941F17091E0993EE3E93D', 'hex')
const L1_PUB = nc.createPublicKey({
  key: {
    kty: 'EC',
    crv: 'P-256',
    x: 'PynhuLKdhCK7sODwkADPLuKTHaE82sgSn4wJ3qwH9Rk',
    y: 'taxVCco_P1myNLd3eiMa5ZXKWqF0X9emK8TQIDcRfdE',
  },
  format: 'jwk',
})

const md5 = (b: Buffer) => nc.createHash('md5').update(b).digest()
const sum = (b: Buffer) => {
  const s = [...b].reduce((n, x) => n + x, 0)
  return Buffer.from([(s >> 8) & 0xff, s & 0xff])
}
const kex = (body: Buffer) => Buffer.concat([Buffer.from('**'), body, sum(body)])
const pad = (b: Buffer) => Buffer.concat([b, Buffer.alloc((16 - (b.length % 16)) % 16)])

function aes(dir: 'enc' | 'dec', key: Buffer, iv: Buffer, data: Buffer): Buffer {
  const algo = key.length === 32 ? 'aes-256-cbc' : 'aes-128-cbc'
  const c = dir === 'enc' ? nc.createCipheriv(algo, key, iv) : nc.createDecipheriv(algo, key, iv)
  c.setAutoPadding(false)
  return Buffer.concat([c.update(data), c.final()])
}

function crc(b: Uint8Array): number {
  let c = 0xffff
  for (const x of b) {
    c ^= x
    for (let i = 0; i < 8; i++) c = c & 1 ? (c >>> 1) ^ 0xa001 : c >>> 1
  }
  return c
}

type RegisterMap = (addr: number) => number | undefined

function modbusResponse(cmd: Buffer, registers: RegisterMap): Buffer {
  const c = crc(cmd.subarray(0, 6))
  if (cmd[6] !== (c & 0xff) || cmd[7] !== c >> 8) throw new Error('bad request crc')
  const addr = cmd.readUInt16BE(2)
  const n = cmd.readUInt16BE(4)
  const values = Array.from({ length: n }, (_, i) => registers(addr + i))
  const resp = values.some((v) => v === undefined)
    ? Buffer.from([1, 0x83, 2, 0, 0])
    : Buffer.concat([
        Buffer.from([1, 3, n * 2]),
        Buffer.from(values.flatMap((v = 0) => [v >> 8, v & 0xff])),
        Buffer.alloc(2),
      ])
  resp.writeUInt16LE(crc(resp.subarray(0, -2)), resp.length - 2)
  return resp
}

/** Emulates the station side with node:crypto. */
function createStation(registers: RegisterMap, { encrypted }: { encrypted: boolean }) {
  const k2 = nc.generateKeyPairSync('ec', { namedCurve: 'P-256' })
  const peerSigningSpki = k2.publicKey.export({ type: 'spki', format: 'der' }).toString('hex')
  const challenge = nc.randomBytes(4)
  const iv = md5(Buffer.from(challenge).reverse())
  const ukey = Buffer.from(iv.map((b, i) => b ^ LOCAL_AES_KEY[i]))
  const ecdh = nc.createECDH('prime256v1')
  ecdh.generateKeys()
  let secure: Buffer | null = null

  let session: BluettiSession
  const notify = (b: Buffer) => setImmediate(() => session.onNotify(new Uint8Array(b)))
  // Split notifications to exercise fragment buffering.
  const notifySplit = (b: Buffer) => {
    for (let i = 0; i < b.length; i += 20) notify(b.subarray(i, i + 20))
  }

  session = new BluettiSession(
    async (data) => {
      const buf = Buffer.from(data)
      if (!encrypted) {
        notifySplit(modbusResponse(buf, registers))
        return
      }
      if (buf[0] === 0x2a && buf[1] === 0x2a) {
        if (!buf.subarray(4, 8).equals(iv.subarray(8, 12))) throw new Error('bad challenge answer')
        const pub = ecdh.getPublicKey().subarray(1)
        const sig = nc.sign('sha256', Buffer.concat([pub, iv]), {
          key: k2.privateKey,
          dsaEncoding: 'ieee-p1363',
        })
        const msg = kex(Buffer.concat([Buffer.from([4, 0x80]), pub, sig]))
        notifySplit(
          Buffer.concat([Buffer.from([msg.length >> 8, msg.length & 0xff]), aes('enc', ukey, iv, pad(msg))]),
        )
        return
      }
      const len = (buf[0] << 8) | buf[1]
      if (!secure) {
        const msg = aes('dec', ukey, iv, buf.subarray(2)).subarray(0, len)
        const appPub = msg.subarray(4, 68)
        const sig = msg.subarray(68, 132)
        if (
          !nc.verify('sha256', Buffer.concat([appPub, iv]), { key: L1_PUB, dsaEncoding: 'ieee-p1363' }, sig)
        ) {
          throw new Error('app signature invalid')
        }
        secure = ecdh.computeSecret(Buffer.concat([Buffer.from([4]), appPub]))
        const ack = kex(Buffer.from([6, 1, 0]))
        notify(Buffer.concat([Buffer.from([0, ack.length]), aes('enc', ukey, iv, pad(ack))]))
        return
      }
      const cmd = aes('dec', secure, md5(buf.subarray(2, 6)), buf.subarray(6)).subarray(0, len)
      const resp = modbusResponse(cmd, registers)
      const seed = nc.randomBytes(4)
      notifySplit(
        Buffer.concat([
          Buffer.from([resp.length >> 8, resp.length & 0xff]),
          seed,
          aes('enc', secure, md5(seed), pad(resp)),
        ]),
      )
    },
    { peerSigningSpki },
  )

  if (encrypted) notify(kex(Buffer.concat([Buffer.from([1, 4]), challenge])))
  else session.usePlain()
  return session
}

function swapString(s: string, words: number): number[] {
  const bytes = [...Buffer.from(s.padEnd(words * 2, '\0'))]
  return Array.from({ length: words }, (_, i) => bytes[i * 2] | (bytes[i * 2 + 1] << 8))
}

const AC70P_CELLS = [3475, 3468, 3471, 3477, 3478, 3471, 3470, 3476, 3469, 3475]

function ac70pRegisters(): RegisterMap {
  const map = new Map<number, number>()
  swapString('AC70P', 6).forEach((w, i) => {
    map.set(110 + i, w)
  })
  ;[0x1234, 0x5678, 0x9abc, 0x0001].forEach((w, i) => {
    map.set(116 + i, w)
  })
  for (let a = 20; a < 30; a++) map.set(a, a === 24 ? 0 : 7)
  map.set(6300, AC70P_CELLS.length)
  AC70P_CELLS.forEach((v, i) => {
    map.set(6302 + i, v)
  })
  map.set(6112, 12)
  map.set(6113, 87)
  return (addr) => map.get(addr)
}

describe('BluettiSession', () => {
  it('reads registers over the encrypted V2 session', async () => {
    const session = createStation((a) => a & 0xffff, { encrypted: true })
    await session.ready
    const [a, b] = await Promise.all([session.readRegisters(6300, 12), session.readRegisters(6110, 8)])
    expect(a).toEqual(Array.from({ length: 12 }, (_, i) => 6300 + i))
    expect(b).toEqual(Array.from({ length: 8 }, (_, i) => 6110 + i))
    expect(session.encrypted).toBe(true)
  })

  it('reads registers over plain Modbus and reports rejected reads', async () => {
    const session = createStation((a) => (a < 1000 ? a : undefined), { encrypted: false })
    expect(await session.readRegisters(10, 6)).toEqual([10, 11, 12, 13, 14, 15])
    await expect(session.readRegisters(2000, 2)).rejects.toMatchObject({ rejected: true })
    expect(await session.readRegisters(990, 10)).toHaveLength(10)
    expect(session.encrypted).toBe(false)
  })
})

describe('station model', () => {
  it('detects an AC70P and reads a snapshot', async () => {
    const session = createStation(ac70pRegisters(), { encrypted: true })
    const detected = await detectModel(session)
    expect(detected).toEqual({ model: 'AC70P', protocol: 2, raw: 'AC70P' })
    const profile = profileFor('AC70P', 2)
    expect(profile.verified).toBe(true)
    const snap = await readSnapshot(session, profile)
    expect(snap).toMatchObject({ model: 'AC70P', cells: AC70P_CELLS, soc: 87, current: 12, mode: 0 })
  })

  it('redacts every copy of the serial number', () => {
    const sn = [0x1234, 0x5678, 0x9abc, 0x0001]
    const blocks: Record<number, number[]> = {
      110: [1, 2, 3, 4, 5, 6, ...sn],
      1100: [0, 0, 0, 0, 0, 0, 0, ...sn.slice(0, 3)],
      1110: [sn[3], 9, 9, 9, 9, 9, 9, 9, 9, 9],
    }
    expect(redactSerial(blocks, 116)).toEqual([116, 1107])
    expect(blocks[110].slice(6)).toEqual([0, 0, 0, 0])
    expect(blocks[1100].slice(7)).toEqual([0, 0, 0])
    expect(blocks[1110][0]).toBe(0)
  })
})
