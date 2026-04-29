import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt)

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm'
  private cachedKey: Buffer | undefined

  constructor(private readonly configService: ConfigService) {}

  private async getKey(): Promise<Buffer> {
    if (this.cachedKey) return this.cachedKey
    const secret = this.configService.getOrThrow<string>('JWT_SECRET')
    this.cachedKey = (await scryptAsync(secret, 'devpulse-v1', 32)) as Buffer
    return this.cachedKey
  }

  async encrypt(plaintext: string): Promise<string> {
    const key = await this.getKey()
    const iv = randomBytes(12)
    const cipher = createCipheriv(this.algorithm, key, iv)
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    const authTag = cipher.getAuthTag()
    return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':')
  }

  async decrypt(ciphertext: string): Promise<string> {
    const key = await this.getKey()
    const parts = ciphertext.split(':')
    if (parts.length !== 3) throw new Error('Invalid ciphertext format')
    const [ivHex, authTagHex, encryptedHex] = parts as [string, string, string]
    const decipher = createDecipheriv(this.algorithm, key, Buffer.from(ivHex, 'hex'))
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedHex, 'hex')),
      decipher.final(),
    ])
    return decrypted.toString('utf8')
  }
}
