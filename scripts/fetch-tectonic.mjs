import { createHash } from 'node:crypto';
import { access, chmod, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

const VERSION = '0.16.9';
const SHA256 = '60b13a0826ae7ad9ce34b4a2df06bff2cfcfa6dda8a915477c0cbb84e1a4a902';
const URL = `https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%40${VERSION}/tectonic-${VERSION}-x86_64-unknown-linux-musl.tar.gz`;
const targetDir = path.join(process.cwd(), 'vendor', 'tectonic', 'bin');
const target = path.join(targetDir, 'tectonic');
const cacheDir = path.join(process.cwd(), 'vendor', 'tectonic', 'cache');
const cacheMarker = path.join(cacheDir, '.boncv-warmed');
const warmupDir = path.join(process.cwd(), 'vendor', 'tectonic', 'warmup');

if (process.platform !== 'linux' || process.arch !== 'x64') process.exit(0);

await mkdir(targetDir, { recursive: true });
let hasBinary = true;
try { await access(target); } catch { hasBinary = false; }

if (!hasBinary) {
  const response = await fetch(URL);
  if (!response.ok) throw new Error(`Unable to download Tectonic: HTTP ${response.status}`);
  const archive = Buffer.from(await response.arrayBuffer());
  const actual = createHash('sha256').update(archive).digest('hex');
  if (actual !== SHA256) throw new Error(`Tectonic checksum mismatch: ${actual}`);
  const archivePath = path.join(targetDir, `tectonic-${VERSION}.tar.gz`);
  await writeFile(archivePath, archive);

  await new Promise((resolve, reject) => {
    const child = spawn('tar', ['-xzf', archivePath, '-C', targetDir], { stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`tar exited with ${code}`)));
  });
  await chmod(target, 0o755);
  await rm(archivePath, { force: true });
}

try { await access(cacheMarker); process.exit(0); } catch {}
await mkdir(cacheDir, { recursive: true });
await mkdir(warmupDir, { recursive: true });
const warmupSource = String.raw`\documentclass[UTF8,fontset=fandol,10pt,a4paper]{ctexart}
\usepackage{xcolor}
\usepackage{hyperref}
\usepackage{graphicx}
\begin{document}BonCV 中文字体与安全离线缓存。\end{document}`;
const warmupFile = path.join(warmupDir, 'warmup.tex');
await writeFile(warmupFile, warmupSource);
await new Promise((resolve, reject) => {
  const child = spawn(target, ['-X', 'compile', '--untrusted', '--outdir', warmupDir, warmupFile], {
    env: { ...process.env, TECTONIC_CACHE_DIR: cacheDir, TECTONIC_UNTRUSTED_MODE: '1' },
    stdio: 'inherit',
  });
  child.on('error', reject);
  child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`Tectonic warmup exited with ${code}`)));
});
await writeFile(cacheMarker, `${VERSION}\n`);
await rm(warmupDir, { recursive: true, force: true });
