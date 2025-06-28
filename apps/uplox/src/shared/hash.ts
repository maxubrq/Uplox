import { createHash } from 'blake3-wasm'
import { sha256 } from 'crypto-hash'
export async function hash(file: File, algorithm: 'sha256' | 'blake3'): Promise<string> {
  if (algorithm === 'blake3') {
    const hash = createHash()
    const buffer = await file.arrayBuffer()
    hash.update(buffer)
    return hash.digest('hex')
  } else {
    const buffer = await file.arrayBuffer()
    return await sha256(buffer)
  }
}
