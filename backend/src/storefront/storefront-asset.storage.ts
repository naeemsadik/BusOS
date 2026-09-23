import { BadRequestException, Injectable } from '@nestjs/common';
import { mkdir, readFile, rename, unlink, writeFile } from 'fs/promises';
import { dirname, extname, resolve, sep } from 'path';
import { randomUUID } from 'crypto';

type ImageInfo = { mimeType: 'image/jpeg' | 'image/png' | 'image/webp'; extension: '.jpg' | '.png' | '.webp'; width: number; height: number };

@Injectable()
export class StorefrontAssetStorage {
  private readonly root = resolve(process.env.STOREFRONT_UPLOAD_DIR || resolve(process.cwd(), 'uploads', 'storefront'));

  inspect(buffer: Buffer): ImageInfo {
    let info: ImageInfo | null = null;
    if (buffer.length >= 24 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
      info = { mimeType: 'image/png', extension: '.png', width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
    } else if (buffer.length >= 30 && buffer[0] === 0xff && buffer[1] === 0xd8) {
      let offset = 2;
      while (offset + 9 < buffer.length) {
        if (buffer[offset] !== 0xff) { offset += 1; continue; }
        const marker = buffer[offset + 1];
        if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
          info = { mimeType: 'image/jpeg', extension: '.jpg', height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) }; break;
        }
        const length = buffer.readUInt16BE(offset + 2); if (length < 2) break; offset += length + 2;
      }
    } else if (buffer.length >= 30 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
      const chunk = buffer.toString('ascii', 12, 16);
      if (chunk === 'VP8X') info = { mimeType: 'image/webp', extension: '.webp', width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3) };
      else if (chunk === 'VP8 ' && buffer.length >= 30) info = { mimeType: 'image/webp', extension: '.webp', width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
      else if (chunk === 'VP8L' && buffer.length >= 25 && buffer[20] === 0x2f) {
        const bits = buffer.readUInt32LE(21); info = { mimeType: 'image/webp', extension: '.webp', width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
      }
    }
    if (!info || info.width < 1 || info.height < 1 || info.width > 10000 || info.height > 10000 || info.width * info.height > 40_000_000) throw new BadRequestException('The file is not a supported JPEG, PNG, or WebP image');
    return info;
  }

  async write(organizationId: string, buffer: Buffer, extension: ImageInfo['extension']) {
    const storageKey = `${organizationId}/${randomUUID()}${extension}`;
    const target = this.safePath(storageKey); const temporary = `${target}.tmp`;
    await mkdir(dirname(target), { recursive: true });
    await writeFile(temporary, buffer, { flag: 'wx' });
    await rename(temporary, target);
    return storageKey;
  }
  async read(storageKey: string) { return readFile(this.safePath(storageKey)); }
  async remove(storageKey: string) { try { await unlink(this.safePath(storageKey)); } catch (error: any) { if (error?.code !== 'ENOENT') throw error; } }
  private safePath(storageKey: string) {
    if (storageKey.includes('..') || extname(storageKey) === '') throw new BadRequestException('Invalid asset key');
    const result = resolve(this.root, storageKey);
    if (result !== this.root && !result.startsWith(`${this.root}${sep}`)) throw new BadRequestException('Invalid asset path');
    return result;
  }
}
