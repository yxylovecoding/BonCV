import { del, get, put } from '@vercel/blob';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const LOCAL_ARTIFACT_ROOT = path.join(process.cwd(), 'output');

export async function saveArtifact(relativePath: string, content: string | Buffer, contentType: string) {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(relativePath, content, { access: 'private', contentType, addRandomSuffix: false });
    return blob.url;
  }
  const outputPath = path.join(LOCAL_ARTIFACT_ROOT, relativePath);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, content);
  return `local:${relativePath}`;
}

export async function readArtifact(location: string) {
  if (location.startsWith('https://')) {
    const result = await get(location, { access: 'private' });
    if (!result?.stream || result.statusCode !== 200) throw new Error('artifact not found');
    return { stream: result.stream, contentType: result.blob.contentType };
  }
  if (!location.startsWith('local:')) throw new Error('invalid artifact location');
  const relativePath = location.slice('local:'.length);
  if (!relativePath || relativePath.includes('..') || path.isAbsolute(relativePath)) throw new Error('invalid artifact location');
  const buffer = await fs.readFile(path.join(LOCAL_ARTIFACT_ROOT, relativePath));
  return { stream: new Blob([new Uint8Array(buffer)]).stream(), contentType: undefined };
}

export async function deleteArtifact(location: string) {
  if (location.startsWith('https://')) {
    await del(location);
    return;
  }
  if (!location.startsWith('local:')) throw new Error('invalid artifact location');
  const relativePath = location.slice('local:'.length);
  if (!relativePath || relativePath.includes('..') || path.isAbsolute(relativePath)) throw new Error('invalid artifact location');
  await fs.rm(path.join(LOCAL_ARTIFACT_ROOT, relativePath), { force: true });
}
