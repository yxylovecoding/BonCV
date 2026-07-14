import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function run(command: string, args: string[], cwd: string, timeoutMs = 30_000) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: {
        ...process.env,
        TECTONIC_UNTRUSTED_MODE: '1',
        TECTONIC_CACHE_DIR: process.env.TECTONIC_CACHE_DIR || path.join(process.cwd(), 'vendor', 'tectonic', 'cache'),
        SOURCE_DATE_EPOCH: '1710000000',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += String(chunk); });
    child.stderr.on('data', (chunk) => { stderr += String(chunk); });
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('TeX compilation timed out')); }, timeoutMs);
    child.on('error', (error) => { clearTimeout(timer); reject(error); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error((stderr || stdout || `TeX exited with ${code}`).slice(-4000)));
    });
  });
}

async function exists(location: string) {
  try { await fs.access(location); return true; } catch { return false; }
}

function approximatePageCount(pdf: Buffer) {
  const matches = pdf.toString('latin1').match(/\/Type\s*\/Page\b/g);
  return matches?.length ?? null;
}

function pageCountFromLog(log: string) {
  const match = log.match(/\((\d+) pages?\)/);
  return match ? Number(match[1]) : null;
}

export async function compileTex(tex: string, photo?: { content: Buffer; filename: string }) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'boncv-'));
  const input = path.join(directory, 'resume.tex');
  await fs.writeFile(input, tex);
  if (photo) await fs.writeFile(path.join(directory, photo.filename), photo.content);
  let engine = 'tectonic';
  try {
    const vendor = path.join(process.cwd(), 'vendor', 'tectonic', 'bin', 'tectonic');
    const tectonic = process.env.TECTONIC_BIN || ((await exists(vendor)) ? vendor : 'tectonic');
    const bundle = process.env.TECTONIC_BUNDLE || path.join(process.cwd(), 'vendor', 'tectonic', 'bundle', 'default.ttb');
    const cache = process.env.TECTONIC_CACHE_DIR || path.join(process.cwd(), 'vendor', 'tectonic', 'cache');
    const args = ['-X', 'compile', '--untrusted', '--keep-logs', '--outdir', directory];
    if (await exists(bundle)) args.push('--bundle', bundle);
    if (await exists(cache)) args.push('--only-cached');
    args.push(input);
    try {
      if (!process.env.VERCEL && process.env.NODE_ENV !== 'production') throw new Error('use local XeTeX in development');
      await run(tectonic, args, directory);
    } catch (error) {
      if (process.env.VERCEL || process.env.NODE_ENV === 'production') throw error;
      engine = 'xelatex';
      await run(process.env.XELATEX_BIN || 'xelatex', ['-no-shell-escape', '-interaction=nonstopmode', '-halt-on-error', `-output-directory=${directory}`, input], directory);
    }
    const pdf = await fs.readFile(path.join(directory, 'resume.pdf'));
    const log = await fs.readFile(path.join(directory, 'resume.log'), 'utf8').catch(() => '');
    return { pdf, log, pageCount: approximatePageCount(pdf) ?? pageCountFromLog(log), engine };
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}
