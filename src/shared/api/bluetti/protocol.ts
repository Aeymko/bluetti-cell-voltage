// Bluetti BLE protocol: Modbus over GATT, optionally wrapped in the V2 encrypted session.
// Key exchange ported from bluetti-bt-lib (MIT).

const LOCAL_AES_KEY = '459FC535808941F17091E0993EE3E93D'
const PEER_SIGNING_SPKI =
  '3059301306072a8648ce3d020106082a8648ce3d03010703420004A73ABF5D2232C8C1C72E68304343C272495E3A8FD6F30EA96DE2F4B3CE60B251EE21AC667CF8A71E18B46B664EAEFFE3C489F24F695B6411DB7E22CCC85A8594'
const LOCAL_SIGNING_JWK: JsonWebKey = {
  kty: 'EC',
  crv: 'P-256',
  ext: true,
  d: 'Txmhbj6Hvdm9JNPlSVuIBBURlDy8i5aa3pZB0PVq8zc',
  x: 'PynhuLKdhCK7sODwkADPLuKTHaE82sgSn4wJ3qwH9Rk',
  y: 'taxVCco_P1myNLd3eiMa5ZXKWqF0X9emK8TQIDcRfdE',
}
const KEX_MAGIC = 0x2a
const MSG_CHALLENGE = 1
const MSG_PEER_PUBKEY = 4
const MSG_PUBKEY_ACCEPTED = 6
const MAX_FRAME = 512

type Bytes = Uint8Array<ArrayBuffer>

const subtle = globalThis.crypto.subtle

export function fromHex(hex: string): Bytes {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}

function concat(...parts: Uint8Array[]): Bytes {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let off = 0
  for (const p of parts) {
    out.set(p, off)
    off += p.length
  }
  return out
}

export function md5(bytes: Uint8Array): Bytes {
  const S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21]
  const K = new Uint32Array(64)
  for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0
  const len = bytes.length
  const buf = new Uint8Array((((len + 8) >> 6) + 1) * 64)
  buf.set(bytes)
  buf[len] = 0x80
  const dv = new DataView(buf.buffer)
  dv.setUint32(buf.length - 8, (len * 8) >>> 0, true)
  dv.setUint32(buf.length - 4, Math.floor(len / 0x20000000), true)
  let a0 = 0x67452301
  let b0 = 0xefcdab89
  let c0 = 0x98badcfe
  let d0 = 0x10325476
  for (let off = 0; off < buf.length; off += 64) {
    let A = a0
    let B = b0
    let C = c0
    let D = d0
    for (let i = 0; i < 64; i++) {
      let F: number
      let g: number
      if (i < 16) {
        F = (B & C) | (~B & D)
        g = i
      } else if (i < 32) {
        F = (D & B) | (~D & C)
        g = (5 * i + 1) % 16
      } else if (i < 48) {
        F = B ^ C ^ D
        g = (3 * i + 5) % 16
      } else {
        F = C ^ (B | ~D)
        g = (7 * i) % 16
      }
      F = (F + A + K[i] + dv.getUint32(off + g * 4, true)) >>> 0
      A = D
      D = C
      C = B
      const s = S[(i >> 4) * 4 + (i % 4)]
      B = (B + ((F << s) | (F >>> (32 - s)))) >>> 0
    }
    a0 = (a0 + A) >>> 0
    b0 = (b0 + B) >>> 0
    c0 = (c0 + C) >>> 0
    d0 = (d0 + D) >>> 0
  }
  const out = new Uint8Array(16)
  const odv = new DataView(out.buffer)
  ;[a0, b0, c0, d0].forEach((v, i) => {
    odv.setUint32(i * 4, v, true)
  })
  return out
}

export function modbusCrc(bytes: Uint8Array): number {
  let crc = 0xffff
  for (const b of bytes) {
    crc ^= b
    for (let i = 0; i < 8; i++) crc = crc & 1 ? (crc >>> 1) ^ 0xa001 : crc >>> 1
  }
  return crc
}

function hexsum(bytes: Uint8Array): Bytes {
  const sum = bytes.reduce((n, b) => n + b, 0)
  return new Uint8Array([(sum >> 8) & 0xff, sum & 0xff])
}

function kexFrame(body: Uint8Array): Bytes {
  return concat(new Uint8Array([KEX_MAGIC, KEX_MAGIC]), body, hexsum(body))
}

function aesKey(raw: Bytes): Promise<CryptoKey> {
  return subtle.importKey('raw', raw, 'AES-CBC', false, ['encrypt', 'decrypt'])
}

// The station uses zero padding; WebCrypto always adds PKCS#7, so drop/forge the extra block.
async function aesEncrypt(key: CryptoKey, iv: Bytes, data: Uint8Array): Promise<Bytes> {
  const padded = new Uint8Array(Math.ceil(data.length / 16) * 16)
  padded.set(data)
  const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-CBC', iv }, key, padded))
  return ct.slice(0, padded.length)
}

async function aesDecrypt(key: CryptoKey, iv: Bytes, ct: Bytes): Promise<Bytes> {
  const last = ct.slice(ct.length - 16)
  const forged = new Uint8Array(
    await subtle.encrypt({ name: 'AES-CBC', iv: last }, key, new Uint8Array(16).fill(16)),
  )
  return new Uint8Array(await subtle.decrypt({ name: 'AES-CBC', iv }, key, concat(ct, forged.slice(0, 16))))
}

export class RegisterError extends Error {
  readonly rejected: boolean
  readonly timeout: boolean

  constructor(message: string, { rejected = false, timeout = false } = {}) {
    super(message)
    this.rejected = rejected
    this.timeout = timeout
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

type Writer = (data: Bytes) => Promise<void>

interface Pending {
  resolve: (msg: Bytes) => void
  reject: (err: unknown) => void
}

export interface SessionOptions {
  /** Overrides the station signing key; used by tests. */
  peerSigningSpki?: string
}

export class BluettiSession {
  readonly ready: Promise<void>
  readonly challengeSeen: Promise<void>

  private plain = false
  private unsecureIv: Bytes | null = null
  private unsecureKey: CryptoKey | null = null
  private secureKey: CryptoKey | null = null
  private peerKey: CryptoKey | null = null
  private myKeys: CryptoKeyPair | null = null
  private buffer: Bytes = new Uint8Array(0)
  private queue: Promise<void> = Promise.resolve()
  private pending: Pending | null = null
  private lock: Promise<unknown> = Promise.resolve()
  private quietUntil = 0
  private onReady!: () => void
  private onError!: (err: unknown) => void
  private onChallenge!: () => void
  private readonly peerSigningSpki: string

  constructor(
    private readonly write: Writer,
    options: SessionOptions = {},
  ) {
    this.peerSigningSpki = options.peerSigningSpki ?? PEER_SIGNING_SPKI
    this.ready = new Promise((resolve, reject) => {
      this.onReady = resolve
      this.onError = reject
    })
    this.ready.catch(() => {})
    this.challengeSeen = new Promise((resolve) => {
      this.onChallenge = resolve
    })
  }

  get encrypted(): boolean {
    return !this.plain
  }

  /** For stations that never start the key exchange. */
  usePlain(): void {
    this.plain = true
    this.onReady()
  }

  onNotify(data: Bytes): void {
    this.queue = this.queue.then(() => this.handle(data)).catch((e) => this.fail(e))
  }

  private fail(err: unknown): void {
    this.buffer = new Uint8Array(0)
    this.onError(err)
    if (this.pending) {
      this.pending.reject(err)
      this.pending = null
    }
  }

  private async handle(data: Bytes): Promise<void> {
    if (this.plain) {
      this.buffer = concat(this.buffer, data)
      while (this.buffer.length >= 3) {
        const total = this.buffer[1] & 0x80 ? 5 : 5 + this.buffer[2]
        if (this.buffer.length < total) return
        const msg = this.buffer.slice(0, total)
        this.buffer = this.buffer.slice(total)
        await this.handlePlain(msg)
      }
      return
    }
    if (data[0] === KEX_MAGIC && data[1] === KEX_MAGIC) {
      if (data[2] === MSG_CHALLENGE) {
        this.onChallenge()
        await this.answerChallenge(data.slice(4, -2))
      }
      return
    }
    if (!this.unsecureKey || !this.unsecureIv) return

    this.buffer = concat(this.buffer, data)
    while (this.buffer.length >= 2) {
      const dataLen = (this.buffer[0] << 8) | this.buffer[1]
      const header = this.secureKey ? 6 : 2
      const total = header + Math.ceil(dataLen / 16) * 16
      if (total > MAX_FRAME) throw new Error('Garbled frame from station')
      if (this.buffer.length < total) return
      const frame = this.buffer.slice(0, total)
      this.buffer = this.buffer.slice(total)

      const plain = this.secureKey
        ? await aesDecrypt(this.secureKey, md5(frame.slice(2, 6)), frame.slice(6))
        : await aesDecrypt(this.unsecureKey, this.unsecureIv, frame.slice(2))
      await this.handlePlain(plain.slice(0, dataLen))
    }
  }

  private async handlePlain(msg: Bytes): Promise<void> {
    if (msg[0] === KEX_MAGIC && msg[1] === KEX_MAGIC) {
      const body = msg.slice(4, -2)
      if (msg[2] === MSG_PEER_PUBKEY) await this.answerPeerPubkey(body)
      else if (msg[2] === MSG_PUBKEY_ACCEPTED) await this.finishKeyExchange(body)
      return
    }
    if (this.pending) {
      this.pending.resolve(msg)
      this.pending = null
    }
  }

  private async answerChallenge(challenge: Bytes): Promise<void> {
    const iv = md5(challenge.slice().reverse())
    const staticKey = fromHex(LOCAL_AES_KEY)
    this.unsecureIv = iv
    this.unsecureKey = await aesKey(iv.map((b, i) => b ^ staticKey[i]))
    await this.write(kexFrame(concat(new Uint8Array([0x02, 0x04]), iv.slice(8, 12))))
  }

  private async answerPeerPubkey(data: Bytes): Promise<void> {
    if (data.length !== 128) throw new Error('Unexpected peer key length')
    const iv = this.unsecureIv as Bytes
    const peerRaw = data.slice(0, 64)
    const verifyKey = await subtle.importKey(
      'spki',
      fromHex(this.peerSigningSpki),
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify'],
    )
    const ok = await subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      verifyKey,
      data.slice(64),
      concat(peerRaw, iv),
    )
    if (!ok) throw new Error('Station key signature is invalid')

    this.peerKey = await subtle.importKey(
      'raw',
      concat(new Uint8Array([4]), peerRaw),
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      [],
    )
    this.myKeys = (await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
      'deriveBits',
    ])) as CryptoKeyPair
    const myRaw = new Uint8Array(await subtle.exportKey('raw', this.myKeys.publicKey)).slice(1)

    const signKey = await subtle.importKey(
      'jwk',
      LOCAL_SIGNING_JWK,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign'],
    )
    const sig = new Uint8Array(
      await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, signKey, concat(myRaw, iv)),
    )

    const msg = kexFrame(concat(new Uint8Array([0x05, 0x80]), myRaw, sig))
    const ct = await aesEncrypt(this.unsecureKey as CryptoKey, iv, msg)
    await this.write(concat(new Uint8Array([msg.length >> 8, msg.length & 0xff]), ct))
  }

  private async finishKeyExchange(data: Bytes): Promise<void> {
    if (data.length !== 1 || data[0] !== 0) throw new Error('Station rejected the key exchange')
    if (!this.peerKey || !this.myKeys) throw new Error('Key exchange out of order')
    const shared = await subtle.deriveBits(
      { name: 'ECDH', public: this.peerKey },
      this.myKeys.privateKey,
      256,
    )
    this.secureKey = await aesKey(new Uint8Array(shared))
    this.onReady()
  }

  readRegisters(address: number, quantity: number, timeoutMs = 5000): Promise<number[]> {
    const run = async (): Promise<number[]> => {
      await this.ready
      const wait = this.quietUntil - Date.now()
      if (wait > 0) await sleep(wait)

      const cmd = new Uint8Array([1, 3, address >> 8, address & 0xff, quantity >> 8, quantity & 0xff, 0, 0])
      const crc = modbusCrc(cmd.slice(0, 6))
      cmd[6] = crc & 0xff
      cmd[7] = crc >> 8

      let frame: Bytes = cmd
      if (!this.plain) {
        const seed = globalThis.crypto.getRandomValues(new Uint8Array(4))
        const ct = await aesEncrypt(this.secureKey as CryptoKey, md5(seed), cmd)
        frame = concat(new Uint8Array([0, cmd.length]), seed, ct)
      }
      const response = new Promise<Bytes>((resolve, reject) => {
        const timer = setTimeout(() => {
          this.pending = null
          // A late reply must not be taken as the answer to the next request.
          this.quietUntil = Date.now() + 500
          if (this.plain) this.buffer = new Uint8Array(0)
          reject(new RegisterError(`Timeout reading register ${address}`, { timeout: true }))
        }, timeoutMs)
        this.pending = {
          resolve: (v) => {
            clearTimeout(timer)
            resolve(v)
          },
          reject: (e) => {
            clearTimeout(timer)
            reject(e)
          },
        }
      })
      await this.write(frame)
      const resp = await response

      const crcResp = modbusCrc(resp.slice(0, -2))
      if (resp[resp.length - 2] !== (crcResp & 0xff) || resp[resp.length - 1] !== crcResp >> 8) {
        throw new RegisterError(`Bad CRC reading register ${address}`)
      }
      if (resp[1] === 0x83) {
        throw new RegisterError(`Station rejected read of register ${address}`, { rejected: true })
      }
      if (resp[2] !== quantity * 2)
        throw new RegisterError(`Unexpected response size for register ${address}`)
      const words: number[] = []
      for (let i = 3; i + 1 < resp.length - 2; i += 2) words.push((resp[i] << 8) | resp[i + 1])
      return words
    }
    const result = this.lock.then(run)
    this.lock = result.catch(() => {})
    return result
  }
}
