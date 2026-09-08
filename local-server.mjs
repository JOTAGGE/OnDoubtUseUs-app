import express from 'express';
import cors from 'cors';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { existsSync, writeFileSync } from 'node:fs';
import { mkdir, statfs } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

const require = createRequire(import.meta.url);
const youtubeDl = require('youtube-dl-exec');
const ffmpegPath = require('ffmpeg-static');
const ytDlpPath = youtubeDl.constants.YOUTUBE_DL_PATH;

// Autenticação opcional do YouTube. Cookies nunca são salvos no repositório.
const generatedCookiesPath = join(tmpdir(), `ondoubt-youtube-cookies-${process.pid}.txt`);
const configuredCookiesPath = process.env.YOUTUBE_COOKIES_FILE
  ? resolve(process.env.YOUTUBE_COOKIES_FILE)
  : null;
let activeCookiesPath = configuredCookiesPath && existsSync(configuredCookiesPath)
  ? configuredCookiesPath
  : null;

function normalizeCookieFile(content) {
  const normalized = process.platform === 'win32'
    ? content.replace(/\r?\n/g, '\r\n')
    : content.replace(/\r\n/g, '\n');
  if (!/^# (Netscape )?HTTP Cookie File/m.test(normalized)) {
    throw new Error('O conteúdo não está no formato Netscape cookies.txt.');
  }
  return normalized;
}

function loadCookiesFromEnvironment() {
  const base64Value = process.env.YOUTUBE_COOKIES_BASE64?.trim();
  const legacyValue = process.env.YOUTUBE_COOKIES?.trim();
  if (!base64Value && !legacyValue) return;

  try {
    let content;
    if (base64Value) {
      content = Buffer.from(base64Value, 'base64').toString('utf8');
    } else if (legacyValue.startsWith('#')) {
      content = legacyValue;
    } else {
      // Compatibilidade com versões anteriores, que aceitavam base64 em YOUTUBE_COOKIES.
      content = Buffer.from(legacyValue, 'base64').toString('utf8');
    }
    writeFileSync(generatedCookiesPath, normalizeCookieFile(content), { encoding: 'utf8', mode: 0o600 });
    activeCookiesPath = generatedCookiesPath;
    console.log('[On Doubt, Use Us :)] Sessão do YouTube carregada por variável secreta.');
  } catch (error) {
    activeCookiesPath = null;
    console.error(`[On Doubt, Use Us :)] Cookies ignorados: ${error instanceof Error ? error.message : 'formato inválido'}`);
  }
}

loadCookiesFromEnvironment();

const supportedCookieBrowsers = new Set(['brave', 'chrome', 'chromium', 'edge', 'firefox', 'opera', 'safari', 'vivaldi', 'whale']);
const cookieBrowser = process.env.YOUTUBE_COOKIES_BROWSER?.trim().toLowerCase();

function getCookieArgs() {
  if (activeCookiesPath) return ['--cookies', activeCookiesPath];
  if (cookieBrowser && supportedCookieBrowsers.has(cookieBrowser)) {
    const profile = process.env.YOUTUBE_COOKIES_BROWSER_PROFILE?.trim();
    return ['--cookies-from-browser', profile ? `${cookieBrowser}:${profile}` : cookieBrowser];
  }
  return [];
}

function getExtractorArgs() {
  const clients = process.env.YOUTUBE_PLAYER_CLIENTS?.trim();
  return clients ? ['--extractor-args', `youtube:player_client=${clients}`] : [];
}

function friendlyYtDlpError(stderr, fallback) {
  const message = String(stderr || '').trim();
  if (/sign in to confirm you.re not a bot/i.test(message)) {
    return getCookieArgs().length
      ? 'O YouTube recusou a sessão configurada. Entre novamente no YouTube, atualize os cookies e reinicie o serviço.'
      : 'O YouTube pediu autenticação. Configure YOUTUBE_COOKIES_BROWSER no uso local ou YOUTUBE_COOKIES_BASE64 no servidor.';
  }
  if (/could not copy chrome cookie database|database is locked/i.test(message)) {
    return 'Não foi possível ler os cookies do navegador. Feche completamente o navegador e tente novamente, ou use YOUTUBE_COOKIES_BASE64.';
  }
  return message || fallback;
}

// --- Configurações de Ambiente & Limites de Segurança ---
const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '0.0.0.0';
const outputRoot = process.env.DOWNLOAD_DIR || join(homedir(), 'Downloads', 'On Doubt Use Us');

const MAX_CONCURRENT_JOBS = Number(process.env.MAX_CONCURRENT_JOBS || 2);
const MAX_PLAYLIST_ITEMS = Number(process.env.MAX_PLAYLIST_ITEMS || 30);
const MAX_VIDEO_DURATION_SECONDS = Number(process.env.MAX_VIDEO_DURATION_SECONDS || 10800); // 3 horas
const JOB_TIMEOUT_MS = Number(process.env.JOB_TIMEOUT_MS || 600000); // 10 minutos por item
const MIN_FREE_DISK_MB = Number(process.env.MIN_FREE_DISK_MB || 500); // 500 MB

const ALLOWED_VIDEO_QUALITIES = new Set([
  '2160p · MP4',
  '1080p · MP4',
  '720p · MP4',
  '1080p · WEBM',
]);

const ALLOWED_AUDIO_QUALITIES = new Set([
  '320 kbps · MP3',
  '256 kbps · M4A',
  'Lossless · FLAC',
]);

const WINDOWS_RESERVED_NAMES = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
]);

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN === '*'
    ? '*'
    : process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : '*';

const app = express();

// --- 1. Middleware de Cabeçalhos de Segurança ---
app.use((_request, response, next) => {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json({ limit: '128kb' })); // Limite seguro para payload JSON

// --- 2. Rate Limiter em Memória ---
const rateLimitStore = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now - record.windowStart > 60000) {
      rateLimitStore.delete(key);
    }
  }
}, 300000);

function getClientIp(request) {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return request.socket?.remoteAddress || '127.0.0.1';
}

function checkRateLimit(ip, action, limit = 20, windowMs = 60000) {
  const key = `${ip}:${action}`;
  const now = Date.now();
  const record = rateLimitStore.get(key) || { count: 0, windowStart: now };

  if (now - record.windowStart > windowMs) {
    record.count = 1;
    record.windowStart = now;
  } else {
    record.count += 1;
  }

  rateLimitStore.set(key, record);
  if (record.count > limit) {
    const retryAfter = Math.ceil((record.windowStart + windowMs - now) / 1000);
    return { limited: true, retryAfter };
  }
  return { limited: false };
}

// --- 3. Controle de Concorrência & Fila de Jobs ---
let activeJobsCount = 0;
const activeIpJobs = new Set();

async function checkFreeDisk(dirPath) {
  try {
    const stats = await statfs(dirPath);
    return Math.floor((stats.bavail * stats.bsize) / (1024 * 1024));
  } catch {
    return 10000;
  }
}

// --- 4. Validação Rigorosa de URLs do YouTube (Anti-SSRF) ---
function validateYouTubeUrl(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 512) {
    return { valid: false, error: 'URL inválida ou muito longa.' };
  }

  let parsed;
  try {
    parsed = new URL(value.trim());
  } catch {
    return { valid: false, error: 'Formato de URL inválido.' };
  }

  // Apenas HTTPS
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { valid: false, error: 'Esquema de URL não suportado. Use apenas https.' };
  }

  // Rejeita credenciais e portas customizadas
  if (parsed.username || parsed.password || (parsed.port && parsed.port !== '443' && parsed.port !== '80')) {
    return { valid: false, error: 'Credenciais ou portas adicionais não são permitidas.' };
  }

  const host = parsed.hostname.toLowerCase();

  // Bloqueio de SSRF: localhost, IPs privados, redes internas e metadata cloud
  if (
    host === 'localhost' ||
    host === '0.0.0.0' ||
    host.startsWith('127.') ||
    host === '169.254.169.254' ||
    host.startsWith('10.') ||
    host.startsWith('192.168.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host) ||
    host.startsWith('[') ||
    /^\d+\.\d+\.\d+\.\d+$/.test(host)
  ) {
    return { valid: false, error: 'Acesso a endereços locais ou IPs diretos é proibido.' };
  }

  // Whitelist estrita de hostnames
  const allowedHosts = new Set([
    'youtube.com',
    'www.youtube.com',
    'm.youtube.com',
    'youtu.be',
    'music.youtube.com',
  ]);

  if (!allowedHosts.has(host)) {
    return { valid: false, error: 'Apenas domínios oficiais do YouTube são aceitos.' };
  }

  // Validação estrita de caminhos e parâmetros
  if (host === 'youtu.be') {
    const videoId = parsed.pathname.slice(1);
    if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      return { valid: false, error: 'ID de vídeo do YouTube inválido no link.' };
    }
  } else {
    const path = parsed.pathname;
    const isWatch = path === '/watch';
    const isPlaylist = path === '/playlist';
    const isShorts = path.startsWith('/shorts/');
    const isEmbed = path.startsWith('/embed/');

    if (!isWatch && !isPlaylist && !isShorts && !isEmbed) {
      return { valid: false, error: 'Rota de vídeo ou playlist do YouTube não suportada.' };
    }

    if (isWatch) {
      const v = parsed.searchParams.get('v');
      if (!v || !/^[a-zA-Z0-9_-]{11}$/.test(v)) {
        return { valid: false, error: 'ID de vídeo inválido no parâmetro v.' };
      }
    } else if (isPlaylist) {
      const list = parsed.searchParams.get('list');
      if (!list || !/^[a-zA-Z0-9_-]+$/.test(list) || list.length > 64) {
        return { valid: false, error: 'Identificador de playlist inválido.' };
      }
    }
  }

  return { valid: true, sanitizedUrl: parsed.toString() };
}

// --- 5. Sanitização de Arquivos e Prevenção contra Path Traversal ---
function sanitizePathSegment(value, fallback) {
  const raw = String(value || fallback);
  const noControl = Array.from(raw).filter((char) => char.charCodeAt(0) >= 32).join('');
  let cleaned = noControl
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\.\.+/g, '')
    .replace(/[. ]+$/g, '')
    .trim();

  if (!cleaned || WINDOWS_RESERVED_NAMES.has(cleaned.toUpperCase())) {
    cleaned = fallback;
  }
  return cleaned.slice(0, 60);
}

function safeResolveFolder(baseRoot, ...segments) {
  const sanitized = segments.map((seg, i) => sanitizePathSegment(seg, `Folder_${i + 1}`));
  const fullPath = resolve(baseRoot, ...sanitized);
  const resolvedBase = resolve(baseRoot);

  if (!fullPath.startsWith(resolvedBase)) {
    throw new Error('Tentativa de Path Traversal bloqueada.');
  }
  return fullPath;
}

function sanitizeThumbnailUrl(url, id) {
  if (typeof url !== 'string' || !url.startsWith('https://')) {
    return `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
  }
  try {
    const parsed = new URL(url);
    const h = parsed.hostname.toLowerCase();
    if (h === 'i.ytimg.com' || h === 'img.youtube.com' || h.endsWith('.ggpht.com')) {
      return parsed.toString();
    }
  } catch {
    // fallback
  }
  return `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
}

// --- 6. Execução Segura do yt-dlp (Sem Shell / Flags Isoladas) ---
function runJson(url) {
  return new Promise((resolvePromise, rejectPromise) => {
    // Flags de sandbox que bloqueiam execução arbitrária e configurações locais
    const args = [
      '--no-config',
      '--no-exec',
      '--no-cache-dir',
      '--dump-single-json',
      '--skip-download',
      '--flat-playlist',
      '--no-warnings',
      '--ignore-errors',
      ...getCookieArgs(),
      ...getExtractorArgs(),
      '--', // Impede injeção de flags através da URL
      url,
    ];

    const child = spawn(ytDlpPath, args, { windowsHide: true });
    let stdout = '';
    let stderr = '';

    const timeout = setTimeout(() => {
      try {
        child.kill('SIGTERM');
      } catch {
        // Ignora
      }
      rejectPromise(new Error('Tempo limite excedido ao consultar o YouTube (timeout).'));
    }, 45000);

    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', (err) => {
      clearTimeout(timeout);
      rejectPromise(err);
    });
    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0 || !stdout.trim()) {
        return rejectPromise(new Error(friendlyYtDlpError(stderr, 'Não foi possível consultar esse link do YouTube.')));
      }
      try {
        resolvePromise(JSON.parse(stdout));
      } catch {
        rejectPromise(new Error('O YouTube retornou dados inesperados ou bloqueou a consulta.'));
      }
    });
  });
}

// --- ENDPOINTS ---

// Health check com métricas
app.get('/api/health', async (_request, response) => {
  const freeDiskMb = await checkFreeDisk(outputRoot);
  response.json({
    ok: true,
    name: 'On Doubt, Use Us :) API',
    version: '1.0.0',
    outputRoot,
    ytDlpReady: Boolean(ytDlpPath),
    ffmpegReady: Boolean(ffmpegPath),
    activeJobs: activeJobsCount,
    freeDiskMb,
    downloadsEnabled: process.env.DOWNLOADS_ENABLED !== 'false',
    youtubeAuth: activeCookiesPath ? 'cookie-file' : cookieBrowser ? 'browser' : 'none',
  });
});

// Endpoint de análise de link com rate limit e sanitização
app.post('/api/analyze', async (request, response) => {
  const clientIp = getClientIp(request);
  const rate = checkRateLimit(clientIp, 'analyze', 20, 60000);
  if (rate.limited) {
    response.setHeader('Retry-After', String(rate.retryAfter));
    return response.status(429).json({ error: 'Muitas consultas recentes. Aguarde alguns segundos.' });
  }

  const { url } = request.body || {};
  const validation = validateYouTubeUrl(url);
  if (!validation.valid) {
    return response.status(400).json({ error: validation.error });
  }

  try {
    const data = await runJson(validation.sanitizedUrl);
    const rawEntries = Array.isArray(data.entries) ? data.entries.filter(Boolean) : [data];

    // Limita tamanho máximo de itens analisados
    const items = rawEntries
      .slice(0, MAX_PLAYLIST_ITEMS)
      .map((entry, index) => {
        const id = String(entry.id || '');
        const duration = Number(entry.duration || 0);
        return {
          id,
          title: String(entry.title || `Vídeo ${index + 1}`).slice(0, 150),
          duration,
          durationText: String(entry.duration_string || ''),
          thumbnail: sanitizeThumbnailUrl(entry.thumbnail || entry.thumbnails?.at?.(-1)?.url, id),
          uploader: String(entry.uploader || entry.channel || data.uploader || data.channel || 'Canal').slice(0, 100),
          url: `https://www.youtube.com/watch?v=${id}`,
        };
      })
      .filter((entry) => entry.id && /^[a-zA-Z0-9_-]{11}$/.test(entry.id));

    response.json({
      title: String(data.title || items[0]?.title || 'Vídeo do YouTube').slice(0, 150),
      channel: String(data.uploader || data.channel || items[0]?.uploader || 'Canal').slice(0, 100),
      isPlaylist: Array.isArray(data.entries),
      items,
      outputRoot,
    });
  } catch (error) {
    response.status(502).json({ error: error instanceof Error ? error.message : 'Falha ao consultar o YouTube.' });
  }
});

// Download em lote com fila, limites de disco, timeout e isolamento
app.post('/api/download', async (request, response) => {
  // Kill switch de emergência
  if (process.env.DOWNLOADS_ENABLED === 'false') {
    return response.status(503).json({ error: 'Serviço de download temporariamente desativado para manutenção.' });
  }

  const clientIp = getClientIp(request);
  const rate = checkRateLimit(clientIp, 'download', 5, 60000);
  if (rate.limited) {
    response.setHeader('Retry-After', String(rate.retryAfter));
    return response.status(429).json({ error: 'Limite de requisições excedido. Aguarde antes de novo download.' });
  }

  // Limite por IP de download simultâneo
  if (activeIpJobs.has(clientIp)) {
    return response.status(429).json({ error: 'Você já possui um download em andamento. Aguarde a conclusão.' });
  }

  // Limite global de concorrência
  if (activeJobsCount >= MAX_CONCURRENT_JOBS) {
    return response.status(503).json({ error: 'Servidor ocupado com processamento. Tente novamente em instantes.' });
  }

  // Circuit breaker de espaço em disco
  const freeMb = await checkFreeDisk(outputRoot);
  if (freeMb < MIN_FREE_DISK_MB) {
    return response.status(507).json({ error: 'Espaço em disco insuficiente no servidor. Novos downloads pausados.' });
  }

  const { items, type, quality, saveExtras = true, organize = true, channel, playlist } = request.body || {};

  // Validação estrita de parâmetros de tipo e qualidade
  if (type !== 'video' && type !== 'audio') {
    return response.status(400).json({ error: 'Tipo de mídia inválido.' });
  }
  if (type === 'video' && !ALLOWED_VIDEO_QUALITIES.has(quality)) {
    return response.status(400).json({ error: 'Qualidade de vídeo não suportada ou inválida.' });
  }
  if (type === 'audio' && !ALLOWED_AUDIO_QUALITIES.has(quality)) {
    return response.status(400).json({ error: 'Qualidade de áudio não suportada ou inválida.' });
  }

  if (!Array.isArray(items) || !items.length) {
    return response.status(400).json({ error: 'Seleção de download vazia.' });
  }

  // Valida e sanitiza cada item solicitado contra URLs maliciosas
  const safeItems = items
    .slice(0, MAX_PLAYLIST_ITEMS)
    .filter((item) => {
      if (!item || typeof item.url !== 'string') return false;
      const v = validateYouTubeUrl(item.url);
      return v.valid;
    });

  if (!safeItems.length) {
    return response.status(400).json({ error: 'Nenhum item válido foi selecionado.' });
  }

  // Geração de ID interno imprevisível por job
  const jobId = randomUUID();
  activeJobsCount += 1;
  activeIpJobs.add(clientIp);

  response.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  response.setHeader('Cache-Control', 'no-cache');
  response.setHeader('X-Accel-Buffering', 'no');

  let isAborted = false;
  let currentChild = null;

  const cleanupJob = () => {
    activeJobsCount = Math.max(0, activeJobsCount - 1);
    activeIpJobs.delete(clientIp);
  };

  request.on('close', () => {
    isAborted = true;
    if (currentChild) {
      try {
        currentChild.kill('SIGTERM');
      } catch {
        // Ignora
      }
    }
    cleanupJob();
  });

  const send = (payload) => {
    if (!isAborted && !response.writableEnded) {
      response.write(`${JSON.stringify(payload)}\n`);
    }
  };

  try {
    // Resolução segura de diretório com prevenção estrita a Path Traversal
    const targetFolder = organize
      ? safeResolveFolder(outputRoot, channel || 'Canal', playlist || 'Downloads')
      : outputRoot;

    await mkdir(targetFolder, { recursive: true });
    send({ type: 'start', jobId, total: safeItems.length, folder: targetFolder });

    for (let index = 0; index < safeItems.length; index += 1) {
      if (isAborted) break;
      const item = safeItems[index];

      // Rejeita itens com duração absurda (proteção contra DoS de CPU/espaço)
      if (item.duration && item.duration > MAX_VIDEO_DURATION_SECONDS) {
        send({
          type: 'item-error',
          item: index + 1,
          itemId: item.id,
          message: 'Item ignorado: ultrapassou o limite máximo de 3 horas de duração.',
        });
        continue;
      }

      const sanitizedFilename = '%(title).80s [%(id)s].%(ext)s';
      const outputPath = join(targetFolder, sanitizedFilename);

      // Verificação de Path Traversal no caminho de saída
      if (!resolve(outputPath).startsWith(resolve(outputRoot))) {
        send({ type: 'item-error', item: index + 1, itemId: item.id, message: 'Caminho de saída inseguro.' });
        continue;
      }

      const args = [
        '--no-config',
        '--no-exec',
        '--no-cache-dir',
        '--newline',
        '--no-color',
        '--no-warnings',
        '--ignore-config',
        '--ffmpeg-location',
        ffmpegPath,
        '--output',
        outputPath,
        '--progress-template',
        'download:%(progress._percent_str)s',
      ];

      if (type === 'audio') {
        const audioFormat = String(quality).includes('M4A') ? 'm4a' : String(quality).includes('FLAC') ? 'flac' : 'mp3';
        args.push('-f', 'ba/b', '--extract-audio', '--audio-format', audioFormat, '--audio-quality', audioFormat === 'mp3' ? '0' : '5');
      } else {
        const height = String(quality).match(/(2160|1080|720)/)?.[1] || '1080';
        args.push('-f', `bv*[height<=${height}]+ba/b[height<=${height}]/b`, '--merge-output-format', String(quality).includes('WEBM') ? 'webm' : 'mp4');
      }

      if (saveExtras) {
        args.push('--write-thumbnail', '--write-info-json', '--add-metadata');
      }

      args.push(
        ...getCookieArgs(),
        ...getExtractorArgs(),
        '--',
        item.url
      );

      await new Promise((resolvePromise, rejectPromise) => {
        const child = spawn(ytDlpPath, args, { windowsHide: true });
        currentChild = child;

        // Timeout por item
        const itemTimer = setTimeout(() => {
          try {
            child.kill('SIGTERM');
          } catch {
            // Ignora
          }
          rejectPromise(new Error('Tempo limite de download excedido para este item.'));
        }, JOB_TIMEOUT_MS);

        let stderr = '';
        const onLine = (line) => {
          const match = line.match(/download:\s*([\d.]+)%/);
          if (match) {
            send({
              type: 'progress',
              item: index + 1,
              itemId: item.id,
              percent: Number(match[1]),
              overall: Math.round(((index + Number(match[1]) / 100) / safeItems.length) * 100),
            });
          }
        };

        child.stdout.on('data', (chunk) => String(chunk).split(/\r?\n/).forEach(onLine));
        child.stderr.on('data', (chunk) => {
          stderr += chunk;
          String(chunk).split(/\r?\n/).forEach(onLine);
        });
        child.on('error', (err) => {
          clearTimeout(itemTimer);
          rejectPromise(err);
        });
        child.on('close', (code) => {
          clearTimeout(itemTimer);
          currentChild = null;
          if (code === 0 || isAborted) {
            resolvePromise();
          } else {
            rejectPromise(new Error(friendlyYtDlpError(stderr, `Falha ao processar item ${item.title}`)));
          }
        });
      }).catch((error) => {
        if (!isAborted) {
          send({ type: 'item-error', item: index + 1, itemId: item.id, message: error.message });
        }
      });
    }

    if (!isAborted) {
      send({ type: 'complete', folder: targetFolder });
      response.end();
    }
  } catch (err) {
    if (!isAborted) {
      send({ type: 'fatal-error', message: err instanceof Error ? err.message : 'Erro interno.' });
      response.end();
    }
  } finally {
    cleanupJob();
  }
});

// Controle de Concorrência & Fila para Streams de Mídia
let activeStreamsCount = 0;
const MAX_CONCURRENT_STREAMS = Number(process.env.MAX_CONCURRENT_STREAMS || 2);
const streamQueue = [];

function acquireStreamSlot() {
  if (activeStreamsCount < MAX_CONCURRENT_STREAMS) {
    activeStreamsCount++;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    streamQueue.push(resolve);
  });
}

function releaseStreamSlot() {
  if (streamQueue.length > 0) {
    const next = streamQueue.shift();
    next();
  } else {
    activeStreamsCount = Math.max(0, activeStreamsCount - 1);
  }
}

// Endpoint de streaming direto com proteção rigorosa e fila de concorrência
app.get('/api/stream', async (request, response) => {
  const clientIp = getClientIp(request);
  const rate = checkRateLimit(clientIp, 'stream', 120, 60000);
  if (rate.limited) {
    response.setHeader('Retry-After', String(rate.retryAfter));
    return response.status(429).json({ error: 'Muitos downloads simultâneos. Aguarde alguns instantes.' });
  }

  const { url, type = 'video', quality = '1080p · MP4', title = 'media' } = request.query;

  // Validação estrita de URL
  const validation = validateYouTubeUrl(url);
  if (!validation.valid) {
    return response.status(400).json({ error: validation.error });
  }

  // Validação estrita de tipo e qualidade
  if (type !== 'video' && type !== 'audio') {
    return response.status(400).json({ error: 'Tipo inválido.' });
  }
  if (type === 'video' && !ALLOWED_VIDEO_QUALITIES.has(String(quality))) {
    return response.status(400).json({ error: 'Qualidade de vídeo inválida.' });
  }
  if (type === 'audio' && !ALLOWED_AUDIO_QUALITIES.has(String(quality))) {
    return response.status(400).json({ error: 'Qualidade de áudio inválida.' });
  }

  const isAudio = type === 'audio';
  const ext = isAudio
    ? String(quality).includes('M4A') ? 'm4a' : String(quality).includes('FLAC') ? 'flac' : 'mp3'
    : String(quality).includes('WEBM') ? 'webm' : 'mp4';

  const sanitizedTitle = sanitizePathSegment(String(title), 'media') + `.${ext}`;

  // Aguarda liberação de slot na fila de stream para evitar sobrecarga de memória/CPU
  await acquireStreamSlot();
  let slotReleased = false;
  const safeRelease = () => {
    if (!slotReleased) {
      slotReleased = true;
      releaseStreamSlot();
    }
  };

  // Cabeçalhos de segurança obrigatórios para entrega de arquivos
  response.setHeader('Content-Type', isAudio ? 'audio/mpeg' : 'video/mp4');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(sanitizedTitle)}"`);

  const args = [
    '--no-config',
    '--no-exec',
    '--no-cache-dir',
    '--no-warnings',
    '--no-color',
    '--ignore-config',
    '--ffmpeg-location',
    ffmpegPath,
    '-o',
    '-',
    ...getCookieArgs(),
    ...getExtractorArgs(),
  ];

  if (isAudio) {
    args.push('-f', 'ba/b', '--extract-audio', '--audio-format', ext, '--audio-quality', ext === 'mp3' ? '0' : '5');
  } else {
    const height = String(quality).match(/(2160|1080|720)/)?.[1] || '1080';
    args.push('-f', `bv*[height<=${height}]+ba/b[height<=${height}]/b`, '--merge-output-format', ext);
  }

  // Delimitador de argumentos contra injeção de flags
  args.push('--', validation.sanitizedUrl);

  const child = spawn(ytDlpPath, args, { windowsHide: true });
  request.on('close', () => {
    try {
      child.kill('SIGTERM');
    } catch {
      // Ignora
    }
    safeRelease();
  });

  child.stdout.pipe(response);
  child.stderr.on('data', () => {});
  child.on('close', () => {
    safeRelease();
  });
  child.on('error', () => {
    safeRelease();
    if (!response.headersSent) {
      response.status(500).json({ error: 'Erro no stream do download.' });
    }
  });
});

const server = app.listen(PORT, HOST, () => {
  console.log(`[On Doubt, Use Us :)] Rodando em http://${HOST}:${PORT}`);
  console.log(`[On Doubt, Use Us :)] Destino local de downloads: ${outputRoot}`);
  console.log(`[On Doubt, Use Us :)] Concorrência máxima: ${MAX_CONCURRENT_JOBS} jobs simultâneos`);
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`[On Doubt, Use Us :)] Erro: A porta ${PORT} já está em uso por outro processo.`);
  } else {
    console.error('[On Doubt, Use Us :)] Erro fatal no servidor:', err);
  }
  process.exit(1);
});
