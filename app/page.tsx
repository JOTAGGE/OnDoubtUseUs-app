'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  Download,
  ExternalLink,
  FileAudio2,
  FileVideo2,
  FolderOpen,
  HardDrive,
  Info,
  Link2,
  ListVideo,
  Loader2,
  Moon,
  Music2,
  Play,
  RefreshCw,
  Settings2,
  ShieldCheck,
  StopCircle,
  Sun,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BACKEND_URL } from '@/lib/config';

type MediaItem = {
  id: string;
  title: string;
  duration: number;
  durationText: string;
  thumbnail: string;
  uploader: string;
  url: string;
};

type Analysis = {
  title: string;
  channel: string;
  isPlaylist: boolean;
  items: MediaItem[];
  outputRoot: string;
};

type ServerHealth = {
  ok: boolean;
  name: string;
  version: string;
  outputRoot: string;
  ytDlpReady: boolean;
  ffmpegReady: boolean;
};

function safeThumbnail(url: string, id: string): string {
  if (!url || typeof url !== 'string' || !url.startsWith('https://')) {
    return `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
  }
  try {
    const u = new URL(url);
    if (u.hostname === 'i.ytimg.com' || u.hostname === 'img.youtube.com' || u.hostname.endsWith('.ggpht.com')) {
      return u.toString();
    }
  } catch {
    // fallback
  }
  return `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
}

type Language = 'pt' | 'en';

const translations = {
  pt: {
    appKicker: 'BLUE LAB // SISTEMA DE UTILITÁRIOS',
    appSub: 'On Doubt, Use Us :)',
    versionBadge: 'v1.2.0 ACTIVE',
    serverOnline: 'MOTOR ONLINE',
    serverChecking: 'VERIFICANDO...',
    serverOffline: 'MOTOR OFFLINE',
    serverWarning: 'Serviço local desconectado em',
    serverWarningAction: 'Execute "npm run dev:server" no terminal para iniciar o motor local.',
    serverWarningHttps: 'Aviso de Conteúdo Misto: Você está em HTTPS (Vercel). Os navegadores bloqueiam conexões para http://127.0.0.1. Execute localmente com "npm run dev" ou configure uma API HTTPS em Ajustes (⚙️).',
    serverReconnect: 'Reconectar',

    inputLabel: 'ENTRADA DE MÍDIA // YOUTUBE LINK OU PLAYLIST',
    inputPlaceholder: 'Cole a URL do vídeo ou playlist (ex: youtube.com/watch?v=...)',
    pasteBtn: 'Colar',
    analyzeBtn: 'Analisar',
    analyzingBtn: 'Analisando…',

    modeLabel: 'MODO DE EXTRAÇÃO',
    modeVideo: 'Vídeo',
    modeAudio: 'Áudio',
    formatLabel: 'RESOLUÇÃO & CODEC',

    storageLabel: 'ESTRUTURA DE ARMAZENAMENTO',
    organizeLabel: 'Organizar em pastas',
    organizeSub: 'Subpastas por Canal / Playlist',
    extrasLabel: 'Salvar extras',
    extrasSub: 'Capa da mídia + JSON de metadados',

    queueTitle: 'FILA DE MÍDIAS',
    emptyQueueTitle: 'NENHUMA MÍDIA EM ANÁLISE',
    emptyQueueSub: 'Insira qualquer link do YouTube acima para inspecionar resoluções e faixas de áudio.',
    selectAll: 'SELECIONAR TODOS',
    deselectAll: 'DESMARCAR TODOS',
    itemsSelected: 'selecionados',
    itemCount: 'item',
    itemsCount: 'itens',

    statsSummary: 'RESUMO DA OPERAÇÃO',
    statsTotalSize: 'Tamanho Estimado',
    statsQuality: 'Formato de Saída',
    statsEngine: 'Motor Local',

    btnDownload: 'Executar Download',
    btnDirectStream: 'Stream Direto',
    btnCancel: 'Interromper Operação',
    downloadingState: 'Baixando mídias…',
    downloadCancelled: 'Operação interrompida pelo usuário.',
    downloadDone: 'Concluído com sucesso! Salvo em',

    feedbackTitle: 'SISTEMA DE EXTRAÇÃO // FEEDBACK DE DOWNLOAD',
    feedbackActiveLabel: 'PROCESSANDO AGORA',
    feedbackDoneLabel: 'OPERACAO FINALIZADA COM SUCESSO',
    feedbackDismiss: 'Dispensar',
    feedbackCancelled: 'Operação interrompida pelo usuário.',
    badgeDownloading: 'BAIXANDO',
    badgeSaved: 'SALVO',

    manifestoBtn: 'Manifesto',
    manifestoTitle: 'ON DOUBT, USE US :) // MANIFESTO',
    manifestoSubtitle: 'A ferramenta certa para quando todo o resto parece duvidoso.',
    manifestoBody1: 'O ODUU nasceu de uma irritação genuína com a internet contemporânea: sites de download repletos de anúncios maliciosos, instaladores com lixo empacotado, assinaturas artificiais e bloqueios.',
    manifestoBody2: 'A filosofia da Blue Lab é simples: encontrar atrito, entender a causa e construir algo limpo, confiável e transparente. O ODUU é uma ferramenta de propósito puro — direto ao ponto, gratuita, com processamento local na sua máquina e sem intermediários.',
    manifestoRules: [
      { tag: '01 / LIVRE', text: 'Gratuito para sempre. Sem planos pagos para desbloquear funções reais.' },
      { tag: '02 / LOCAL', text: 'Local-first. O processamento pesado roda diretamente no seu computador com yt-dlp e ffmpeg.' },
      { tag: '03 / LIMPO', text: 'Sem rastreadores invasivos, sem anúncios, sem anúncios disfarçados de botões de download.' },
      { tag: '04 / DIRETO', text: 'Cole o link, escolha o formato e salve. Engenharia com propósito.' },
    ],

    diagTitle: 'Status do Sistema & Ajustes',
    diagDesc: 'Diagnóstico da infraestrutura de download e serviços locais.',
    diagApiUrl: 'Endpoint da API:',
    diagConnection: 'Conexão:',
    diagYtDlp: 'Motor yt-dlp:',
    diagFfmpeg: 'Conversor ffmpeg:',
    diagReady: 'Ativo e Operacional',
    diagLocalFolder: 'Diretório Local de Destino:',
    diagSaveUrl: 'Salvar',
    diagResetUrl: 'Restaurar Padrão',
  },
  en: {
    appKicker: 'BLUE LAB // UTILITIES SYSTEM',
    appSub: 'On Doubt, Use Us :)',
    versionBadge: 'v1.2.0 ACTIVE',
    serverOnline: 'ENGINE ONLINE',
    serverChecking: 'CHECKING...',
    serverOffline: 'ENGINE OFFLINE',
    serverWarning: 'Local backend disconnected at',
    serverWarningAction: 'Run "npm run dev:server" in terminal to launch the local engine.',
    serverWarningHttps: 'Mixed Content Notice: You are accessing via HTTPS (Vercel). Browsers block local http://127.0.0.1 requests. Run locally with "npm run dev" or connect an HTTPS cloud backend in Settings (⚙️).',
    serverReconnect: 'Reconnect',

    inputLabel: 'MEDIA INGESTION // YOUTUBE LINK OR PLAYLIST',
    inputPlaceholder: 'Paste YouTube video or playlist URL (e.g. youtube.com/watch?v=...)',
    pasteBtn: 'Paste',
    analyzeBtn: 'Analyze',
    analyzingBtn: 'Analyzing…',

    modeLabel: 'EXTRACTION MODE',
    modeVideo: 'Video',
    modeAudio: 'Audio',
    formatLabel: 'RESOLUTION & CODEC',

    storageLabel: 'STORAGE STRUCTURE',
    organizeLabel: 'Organize in folders',
    organizeSub: 'Subdirectories by Channel / Playlist',
    extrasLabel: 'Save extras',
    extrasSub: 'Media thumbnail + JSON metadata',

    queueTitle: 'MEDIA QUEUE',
    emptyQueueTitle: 'NO MEDIA INGESTED',
    emptyQueueSub: 'Paste any YouTube link above to analyze available streams and audio tracks.',
    selectAll: 'SELECT ALL',
    deselectAll: 'DESELECT ALL',
    itemsSelected: 'selected',
    itemCount: 'item',
    itemsCount: 'items',

    statsSummary: 'OPERATION SUMMARY',
    statsTotalSize: 'Estimated Size',
    statsQuality: 'Output Format',
    statsEngine: 'Local Engine',

    btnDownload: 'Execute Download',
    btnDirectStream: 'Direct Stream',
    btnCancel: 'Abort Operation',
    downloadingState: 'Downloading media…',
    downloadCancelled: 'Operation cancelled by user.',
    downloadDone: 'Completed successfully! Saved to',

    feedbackTitle: 'EXTRACTION SYSTEM // REAL-TIME DOWNLOAD FEEDBACK',
    feedbackActiveLabel: 'PROCESSING NOW',
    feedbackDoneLabel: 'OPERATION COMPLETED SUCCESSFULLY',
    feedbackDismiss: 'Dismiss',
    feedbackCancelled: 'Operation aborted by user.',
    badgeDownloading: 'DOWNLOADING',
    badgeSaved: 'SAVED',

    manifestoBtn: 'Manifesto',
    manifestoTitle: 'ON DOUBT, USE US :) // MANIFESTO',
    manifestoSubtitle: 'The right utility when every other tool feels dubious.',
    manifestoBody1: 'ODUU was born from genuine friction with modern web utilities: scammy websites, intrusive ads, fake download buttons, bundled malware and paywalls.',
    manifestoBody2: 'Blue Lab philosophy is straightforward: find friction, understand root causes, and engineer a clean, robust, and transparent solution. ODUU is built for people who value speed, privacy, and craft.',
    manifestoRules: [
      { tag: '01 / FREE', text: 'Forever free. No artificial limits or premium unlocks.' },
      { tag: '02 / LOCAL', text: 'Local-first. Processing runs directly on your machine via yt-dlp and ffmpeg.' },
      { tag: '03 / CLEAN', text: 'No trackers, no surveillance, no deceptive user interfaces.' },
      { tag: '04 / DIRECT', text: 'Paste link, pick format, save locally. Purpose-built engineering.' },
    ],

    diagTitle: 'System Status & Settings',
    diagDesc: 'Engine diagnostics and execution runtime environment.',
    diagApiUrl: 'API Endpoint:',
    diagConnection: 'Connection:',
    diagYtDlp: 'yt-dlp Engine:',
    diagFfmpeg: 'ffmpeg Converter:',
    diagReady: 'Integrated & Ready',
    diagLocalFolder: 'Local Output Directory:',
    diagSaveUrl: 'Save',
    diagResetUrl: 'Reset Default',
  },
};

export default function Home() {
  const [lang, setLang] = useState<Language>('pt');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const [url, setUrl] = useState('');
  const [mode, setMode] = useState('video');
  const [quality, setQuality] = useState('1080p · MP4');
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [organize, setOrganize] = useState(true);
  const [saveExtras, setSaveExtras] = useState(true);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [serverInfo, setServerInfo] = useState<ServerHealth | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [manifestoOpen, setManifestoOpen] = useState(false);
  const [isHttpsOnClient, setIsHttpsOnClient] = useState(false);
  const apiUrl = BACKEND_URL;

  // Estados dedicados de feedback de download em tempo real
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [activeItemTitle, setActiveItemTitle] = useState<string | null>(null);
  const [activeItemIndex, setActiveItemIndex] = useState<number>(0);
  const [totalItemsToDownload, setTotalItemsToDownload] = useState<number>(0);
  const [completedItemIds, setCompletedItemIds] = useState<string[]>([]);
  const [showFeedbackBar, setShowFeedbackBar] = useState<boolean>(false);
  const [downloadCompleted, setDownloadCompleted] = useState<boolean>(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const t = translations[lang];
  const totalEstMB = useMemo(() => selected.length * (mode === 'video' ? 84 : 12), [selected, mode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
          setIsHttpsOnClient(true);
        }

        const savedLang = localStorage.getItem('oduu_lang') as Language | null;
        if (savedLang && (savedLang === 'pt' || savedLang === 'en')) {
          setLang(savedLang);
        }
        const savedTheme = localStorage.getItem('oduu_theme') as 'dark' | 'light' | null;
        if (savedTheme) {
          setTheme(savedTheme);
          document.documentElement.classList.toggle('dark', savedTheme === 'dark');
        } else {
          document.documentElement.classList.add('dark');
        }
      } catch {
        // Ignora erro
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  function toggleLanguage(newLang: Language) {
    setLang(newLang);
    try {
      localStorage.setItem('oduu_lang', newLang);
    } catch {
      // Ignora erro
    }
  }

  function toggleTheme() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
    try {
      localStorage.setItem('oduu_theme', nextTheme);
    } catch {
      // Ignora erro
    }
  }

  async function checkServerHealth(targetUrl = apiUrl) {
    try {
      const res = await fetch(`${targetUrl}/api/health`, { cache: 'no-store' });
      if (res.ok) {
        const data = (await res.json()) as ServerHealth;
        setServerStatus('online');
        setServerInfo(data);
      } else {
        setServerStatus('offline');
      }
    } catch {
      setServerStatus('offline');
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void checkServerHealth(apiUrl);
    }, 0);
    const interval = setInterval(() => {
      void checkServerHealth(apiUrl);
    }, 15000);

    const handleFocus = () => {
      void checkServerHealth(apiUrl);
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleFocus);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleFocus);
    };
  }, [apiUrl]);

  function getFriendlyError(cause: unknown): string {
    const raw = cause instanceof Error ? cause.message : 'Falha de comunicação com o serviço local.';
    if (raw.includes('Failed to fetch') || raw.includes('NetworkError') || raw.includes('Load failed')) {
      if (typeof window !== 'undefined' && window.location.protocol === 'https:' && apiUrl.includes('127.0.0.1')) {
        return lang === 'pt'
          ? 'Aviso: Acessando via HTTPS na Vercel. Conexões para http://127.0.0.1 são bloqueadas pelo navegador. Execute "npm run dev" e acerte em http://localhost:3000 ou configure um backend na nuvem.'
          : 'Notice: Accessing via HTTPS on Vercel. Browser security blocks local http://127.0.0.1. Run locally at http://localhost:3000 or point to a cloud backend.';
      }
      return lang === 'pt'
        ? `Motor local offline em ${apiUrl}. Execute "npm run dev:server" no terminal.`
        : `Local engine offline at ${apiUrl}. Run "npm run dev:server" in terminal.`;
    }
    return raw;
  }

  async function analyzeUrl(value = url) {
    if (!value.trim()) return;
    setAnalyzing(true);
    setError('');
    setAnalysis(null);
    setProgress(0);
    setStatus(lang === 'pt' ? 'Consultando streams…' : 'Querying streams…');

    try {
      const response = await fetch(`${apiUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: value.trim() }),
      });
      const data = (await response.json()) as Analysis & { error?: string };
      if (!response.ok) throw new Error(data.error || 'Falha ao analisar a URL informada.');
      setAnalysis(data);
      setSelected(data.items.map((item: MediaItem) => item.id));
      setStatus(
        `${data.items.length} ${
          data.items.length === 1 ? t.itemCount : t.itemsCount
        }`
      );
      setServerStatus('online');
    } catch (cause) {
      setError(getFriendlyError(cause));
      setStatus('');
    } finally {
      setAnalyzing(false);
    }
  }

  function toggleItem(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function cancelDownload() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setDownloading(false);
    setActiveItemId(null);
    setStatus(t.feedbackCancelled);
  }

  async function startDownload() {
    if (!selected.length || !analysis) return;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const items = analysis.items.filter((item) => selected.includes(item.id));
    setDownloading(true);
    setShowFeedbackBar(true);
    setDownloadCompleted(false);
    setProgress(0);
    setError('');
    setCompletedItemIds([]);
    setTotalItemsToDownload(items.length);
    setActiveItemIndex(1);
    setActiveItemId(items[0]?.id || null);
    setActiveItemTitle(items[0]?.title || null);
    setStatus(lang === 'pt' ? 'Iniciando processamento...' : 'Initializing process...');

    try {
      const isRemote = !apiUrl.includes('127.0.0.1') && !apiUrl.includes('localhost');

      if (isRemote) {
        let succeeded = 0;
        for (let i = 0; i < items.length; i++) {
          if (controller.signal.aborted) break;
          const item = items[i];
          const itemNumber = i + 1;
          const ext = mode === 'audio'
            ? (quality.includes('M4A') ? 'm4a' : quality.includes('FLAC') ? 'flac' : 'mp3')
            : (quality.includes('WEBM') ? 'webm' : 'mp4');

          setActiveItemIndex(itemNumber);
          setActiveItemId(item.id);
          setActiveItemTitle(item.title);
          setStatus(
            lang === 'pt'
              ? `[${itemNumber}/${items.length}] Transmitindo: ${item.title}…`
              : `[${itemNumber}/${items.length}] Streaming: ${item.title}…`
          );
          setProgress(Math.round(((itemNumber - 1) / items.length) * 100));

          try {
            const streamUrl = `${apiUrl}/api/stream?url=${encodeURIComponent(item.url)}&type=${mode}&quality=${encodeURIComponent(
              quality
            )}&title=${encodeURIComponent(item.title)}`;

            const streamRes = await fetch(streamUrl, {
              signal: controller.signal,
            });

            if (!streamRes.ok) {
              let errorMsg = `Erro ${streamRes.status}`;
              try {
                const errData = (await streamRes.json()) as { error?: string };
                errorMsg = errData.error || errorMsg;
              } catch {
                // fallback
              }
              setError(`Item ${itemNumber}: ${errorMsg}`);
              continue;
            }

            const blob = await streamRes.blob();
            if (!blob.size) throw new Error('O servidor retornou um arquivo vazio.');
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = blobUrl;
            a.download = `${item.title.replace(/[\\/:*?"<>|]/g, '_')}.${ext}`;
            document.body.appendChild(a);
            a.click();
            succeeded += 1;
            setCompletedItemIds((prev) => [...prev, item.id]);
            setTimeout(() => {
              document.body.removeChild(a);
              window.URL.revokeObjectURL(blobUrl);
            }, 1000);

            setProgress(Math.round((itemNumber / items.length) * 100));
          } catch (itemErr) {
            if (controller.signal.aborted) break;
            setError(`Item ${itemNumber}: ${itemErr instanceof Error ? itemErr.message : 'Falha no download'}`);
          }
        }

        if (!controller.signal.aborted) {
          setProgress(100);
          setDownloadCompleted(true);
          setActiveItemId(null);
          setStatus(
            lang === 'pt'
              ? `${succeeded}/${items.length} transferidos com sucesso para o navegador.`
              : `${succeeded}/${items.length} successfully transferred to browser.`
          );
        }
        setDownloading(false);
        abortControllerRef.current = null;
        return;
      }

      const response = await fetch(`${apiUrl}/api/download`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          type: mode,
          quality,
          saveExtras,
          organize,
          channel: analysis.channel,
          playlist: analysis.isPlaylist ? analysis.title : 'Downloads',
        }),
      });

      if (!response.ok || !response.body) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || 'O download não pôde ser iniciado.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let pending = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        pending += decoder.decode(value, { stream: true });
        const lines = pending.split('\n');
        pending = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            const event = JSON.parse(line);
            if (event.type === 'start') {
              setTotalItemsToDownload(event.total);
              setStatus(`${lang === 'pt' ? 'Destino:' : 'Target:'} ${event.folder}`);
            }
            if (event.type === 'progress') {
              setProgress(event.overall);
              setActiveItemIndex(event.item);
              if (event.itemId) {
                setActiveItemId(event.itemId);
                const found = items.find((i) => i.id === event.itemId);
                if (found) setActiveItemTitle(found.title);
              } else if (items[event.item - 1]) {
                setActiveItemId(items[event.item - 1].id);
                setActiveItemTitle(items[event.item - 1].title);
              }
              setStatus(`${lang === 'pt' ? 'Processando' : 'Processing'} ${event.item}/${items.length}…`);
            }
            if (event.type === 'item-error') {
              setError(`Item ${event.item}: ${event.message}`);
            }
            if (event.type === 'complete') {
              setProgress(100);
              setDownloadCompleted(true);
              setActiveItemId(null);
              setCompletedItemIds(items.map((i) => i.id));
              setStatus(
                event.failed
                  ? `${event.succeeded}/${items.length} ${lang === 'pt' ? 'salvos; houve falhas.' : 'saved with errors.'}`
                  : `${t.downloadDone} ${event.folder}`
              );
            }
            if (event.type === 'fatal-error') throw new Error(event.message);
          }
        }
      }
    } catch (cause) {
      if (controller.signal.aborted) {
        setStatus(t.downloadCancelled);
      } else {
        setError(getFriendlyError(cause));
      }
    } finally {
      setDownloading(false);
      abortControllerRef.current = null;
    }
  }

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text);
        void analyzeUrl(text);
      }
    } catch {
      inputRef.current?.focus();
    }
  }

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-150 ${theme === 'dark' ? 'bg-[#0a0a0a] text-[#f6f6f3]' : 'bg-[#f6f6f3] text-[#0a0a0a]'}`}>
      {/* Top Application Bar - Blue Lab Technical Header */}
      <header className={`sticky top-0 z-30 border-b backdrop-blur-md transition-colors ${theme === 'dark' ? 'border-white/10 bg-[#0a0a0a]/95' : 'border-black/10 bg-[#f6f6f3]/95'}`}>
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand Mark */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center bg-[#1749e8] text-white font-mono font-bold text-sm select-none">
                :)
              </span>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold tracking-tighter text-[15px] leading-tight">
                    ODUU
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 border border-current opacity-70 tracking-widest leading-none uppercase">
                    APP
                  </span>
                </div>
                <span className={`text-[10px] font-mono uppercase tracking-wider ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  Blue Lab Systems
                </span>
              </div>
            </div>
          </div>

          {/* Center Connection Indicator (Desktop) */}
          <div className="hidden md:flex items-center gap-2 text-xs font-mono">
            <div className="flex items-center gap-1.5 px-2.5 py-1 border border-current/20 bg-current/5">
              <span
                className={`h-2 w-2 rounded-full ${
                  serverStatus === 'online'
                    ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]'
                    : serverStatus === 'checking'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-rose-500'
                }`}
              />
              <span className="font-semibold text-[11px] tracking-wider">
                {serverStatus === 'online'
                  ? t.serverOnline
                  : serverStatus === 'checking'
                  ? t.serverChecking
                  : t.serverOffline}
              </span>
            </div>
            {serverInfo?.outputRoot && (
              <span className={`text-[11px] truncate max-w-xs ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500'}`}>
                DIR: {serverInfo.outputRoot}
              </span>
            )}
          </div>

          {/* Right Controls: Manifesto, Language, Theme, Settings */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Manifesto Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setManifestoOpen(true)}
              className={`h-8 px-2.5 text-xs font-mono font-semibold tracking-wider uppercase border ${
                theme === 'dark'
                  ? 'border-white/10 bg-white/5 text-zinc-300 hover:bg-[#1749e8] hover:text-white hover:border-[#1749e8]'
                  : 'border-black/15 bg-white text-zinc-700 hover:bg-[#1749e8] hover:text-white hover:border-[#1749e8]'
              }`}
            >
              <Info className="h-3.5 w-3.5 mr-1" />
              <span className="hidden sm:inline">{t.manifestoBtn}</span>
            </Button>

            {/* Language Selector (Blue Lab Style) */}
            <div className={`inline-flex items-center border p-0.5 text-xs font-mono font-semibold ${theme === 'dark' ? 'border-white/15 bg-white/5' : 'border-black/15 bg-black/5'}`}>
              <button
                type="button"
                onClick={() => toggleLanguage('pt')}
                className={`px-2 py-0.5 transition-colors ${
                  lang === 'pt'
                    ? 'bg-[#1749e8] text-white font-bold'
                    : theme === 'dark'
                    ? 'text-zinc-400 hover:text-white'
                    : 'text-zinc-600 hover:text-black'
                }`}
              >
                PT
              </button>
              <span className="text-[10px] opacity-30 px-0.5">/</span>
              <button
                type="button"
                onClick={() => toggleLanguage('en')}
                className={`px-2 py-0.5 transition-colors ${
                  lang === 'en'
                    ? 'bg-[#1749e8] text-white font-bold'
                    : theme === 'dark'
                    ? 'text-zinc-400 hover:text-white'
                    : 'text-zinc-600 hover:text-black'
                }`}
              >
                EN
              </button>
            </div>

            {/* Theme Toggle */}
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              className={`h-8 w-8 border ${theme === 'dark' ? 'border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10' : 'border-black/15 bg-white text-zinc-700 hover:bg-zinc-100'}`}
              aria-label="Alternar tema"
            >
              {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </Button>

            {/* System Status / Settings */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              className={`h-8 w-8 border ${theme === 'dark' ? 'border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10' : 'border-black/15 bg-white text-zinc-700 hover:bg-zinc-100'}`}
              aria-label="Ajustes do Sistema"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Offline Alert Strip */}
      {serverStatus === 'offline' && (
        <div className={`border-b px-4 py-2 text-xs font-mono ${theme === 'dark' ? 'border-rose-500/30 bg-rose-500/10 text-rose-300' : 'border-rose-500/30 bg-rose-50 text-rose-900'}`}>
          <div className="w-full max-w-[1400px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
              <span>
                {isHttpsOnClient && apiUrl.includes('127.0.0.1') ? (
                  t.serverWarningHttps
                ) : (
                  <>
                    {t.serverWarning} <code className="px-1 py-0.5 bg-black/20 font-bold">{apiUrl}</code>. {t.serverWarningAction}
                  </>
                )}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void checkServerHealth()}
              className="h-6 text-[11px] font-mono border-rose-500/40 hover:bg-rose-500/20"
            >
              <RefreshCw className="mr-1 h-3 w-3" />
              {t.serverReconnect}
            </Button>
          </div>
        </div>
      )}

      {/* Main App Workspace */}
      <main className="flex-1 w-full max-w-[1400px] mx-auto p-4 sm:p-6 pb-28 md:pb-8 flex flex-col gap-6">
        {/* Top Ingestion Console */}
        <section className={`border p-4 sm:p-5 transition-colors ${theme === 'dark' ? 'border-white/10 bg-[#111114]' : 'border-black/15 bg-white'}`}>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold tracking-wider text-[#1749e8] uppercase">
                {t.inputLabel}
              </span>
              <button
                type="button"
                onClick={() => void handlePaste()}
                className={`text-xs font-mono flex items-center gap-1.5 hover:text-[#1749e8] transition-colors ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}
              >
                <Copy className="h-3.5 w-3.5" />
                <span>{t.pasteBtn}</span>
              </button>
            </div>

            {/* Input & Action */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Link2 className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`} />
                <Input
                  ref={inputRef}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && analyzeUrl()}
                  placeholder={t.inputPlaceholder}
                  className={`h-11 pl-10 pr-4 font-mono text-xs sm:text-sm rounded-none border transition-all ${
                    theme === 'dark'
                      ? 'border-white/15 bg-black/40 text-white placeholder:text-zinc-600 focus-visible:border-[#1749e8]'
                      : 'border-black/15 bg-[#f6f6f3] text-black placeholder:text-zinc-500 focus-visible:border-[#1749e8]'
                  }`}
                />
              </div>
              <Button
                onClick={() => analyzeUrl()}
                disabled={!url.trim() || analyzing}
                className="h-11 px-6 rounded-none bg-[#1749e8] text-white font-mono text-xs uppercase tracking-wider font-bold hover:bg-[#1238b8] disabled:opacity-40 transition-all shrink-0"
              >
                {analyzing ? t.analyzingBtn : t.analyzeBtn}
              </Button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 text-xs font-mono border border-rose-500/30 bg-rose-500/10 text-rose-400">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                <span className="break-all">{error}</span>
              </div>
            )}

            {/* Extraction Config Bar */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t ${theme === 'dark' ? 'border-white/10' : 'border-black/10'}`}>
              {/* Mode */}
              <div>
                <span className={`block text-[11px] font-mono uppercase tracking-wider font-bold mb-1.5 ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  {t.modeLabel}
                </span>
                <Tabs
                  value={mode}
                  onValueChange={(val) => {
                    setMode(val);
                    setQuality(val === 'video' ? '1080p · MP4' : '320 kbps · MP3');
                  }}
                >
                  <TabsList className={`grid h-10 w-full grid-cols-2 rounded-none p-0.5 border ${theme === 'dark' ? 'border-white/10 bg-black/40' : 'border-black/15 bg-black/5'}`}>
                    <TabsTrigger
                      value="video"
                      className="gap-2 rounded-none text-xs font-mono data-[state=active]:bg-[#1749e8] data-[state=active]:text-white transition-all font-semibold"
                    >
                      <FileVideo2 className="h-3.5 w-3.5" />
                      {t.modeVideo}
                    </TabsTrigger>
                    <TabsTrigger
                      value="audio"
                      className="gap-2 rounded-none text-xs font-mono data-[state=active]:bg-[#1749e8] data-[state=active]:text-white transition-all font-semibold"
                    >
                      <FileAudio2 className="h-3.5 w-3.5" />
                      {t.modeAudio}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Quality */}
              <div>
                <span className={`block text-[11px] font-mono uppercase tracking-wider font-bold mb-1.5 ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  {t.formatLabel}
                </span>
                <Select value={quality} onValueChange={(v) => v && setQuality(v)}>
                  <SelectTrigger className={`h-10 w-full rounded-none px-3 font-mono text-xs border ${theme === 'dark' ? 'border-white/15 bg-black/40 text-white' : 'border-black/15 bg-[#f6f6f3] text-black'}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={`border rounded-none ${theme === 'dark' ? 'border-white/15 bg-[#16161a] text-white' : 'border-black/15 bg-white text-black'}`}>
                    {mode === 'video' ? (
                      <>
                        <SelectItem value="2160p · MP4" className="font-mono text-xs">2160p (4K UHD) · MP4</SelectItem>
                        <SelectItem value="1080p · MP4" className="font-mono text-xs">1080p (Full HD) · MP4</SelectItem>
                        <SelectItem value="720p · MP4" className="font-mono text-xs">720p (HD) · MP4</SelectItem>
                        <SelectItem value="1080p · WEBM" className="font-mono text-xs">1080p (Original) · WEBM</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="320 kbps · MP3" className="font-mono text-xs">320 kbps (High Quality) · MP3</SelectItem>
                        <SelectItem value="256 kbps · M4A" className="font-mono text-xs">256 kbps (AAC Apple) · M4A</SelectItem>
                        <SelectItem value="Lossless · FLAC" className="font-mono text-xs">Lossless Studio · FLAC</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Organize in Folders */}
              <div className="flex items-center justify-between p-2.5 border border-current/10">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <FolderOpen className="h-4 w-4 text-[#1749e8] shrink-0" />
                  <div className="truncate">
                    <p className="text-xs font-semibold">{t.organizeLabel}</p>
                    <p className={`text-[10px] font-mono truncate ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500'}`}>{t.organizeSub}</p>
                  </div>
                </div>
                <Switch checked={organize} onCheckedChange={setOrganize} className="data-[state=checked]:bg-[#1749e8]" />
              </div>

              {/* Save Extras */}
              <div className="flex items-center justify-between p-2.5 border border-current/10">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <Music2 className="h-4 w-4 text-[#1749e8] shrink-0" />
                  <div className="truncate">
                    <p className="text-xs font-semibold">{t.extrasLabel}</p>
                    <p className={`text-[10px] font-mono truncate ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500'}`}>{t.extrasSub}</p>
                  </div>
                </div>
                <Switch checked={saveExtras} onCheckedChange={setSaveExtras} className="data-[state=checked]:bg-[#1749e8]" />
              </div>
            </div>
          </div>
        </section>

        {/* Content Section: Media List & Action Dock */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
          {/* Media Queue View */}
          <div className="min-w-0">
            {analysis ? (
              <div className={`border transition-colors ${theme === 'dark' ? 'border-white/10 bg-[#111114]' : 'border-black/15 bg-white'}`}>
                {/* Queue Header */}
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b ${theme === 'dark' ? 'border-white/10' : 'border-black/10'}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="grid h-9 w-9 shrink-0 place-items-center bg-[#1749e8]/10 text-[#1749e8] border border-[#1749e8]/20">
                      <ListVideo className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate font-bold tracking-tight text-sm sm:text-base">{analysis.title}</h3>
                      <p className={`text-xs font-mono ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        {analysis.channel} {'//'} {analysis.items.length} {analysis.items.length === 1 ? t.itemCount : t.itemsCount}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setSelected(selected.length === analysis.items.length ? [] : analysis.items.map((i) => i.id))
                    }
                    className="text-xs font-mono font-bold text-[#1749e8] hover:underline self-start sm:self-auto tracking-wider uppercase"
                  >
                    {selected.length === analysis.items.length ? t.deselectAll : t.selectAll}
                  </button>
                </div>

                {/* Items List */}
                <div className={`divide-y max-h-[580px] overflow-y-auto ${theme === 'dark' ? 'divide-white/5' : 'divide-black/10'}`}>
                  {analysis.items.map((item, index) => {
                    const isItemDownloading = downloading && activeItemId === item.id;
                    const isItemCompleted = completedItemIds.includes(item.id);

                    return (
                      <div
                        key={item.id}
                        className={`group flex items-center justify-between gap-3 p-3 sm:p-4 transition-all ${
                          isItemDownloading
                            ? 'border-l-4 border-l-[#1749e8] bg-[#1749e8]/10'
                            : isItemCompleted
                            ? 'border-l-4 border-l-emerald-500 bg-emerald-500/5'
                            : theme === 'dark' ? 'hover:bg-white/[0.03]' : 'hover:bg-black/[0.02]'
                        }`}
                      >
                        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                          <Checkbox
                            checked={selected.includes(item.id)}
                            onCheckedChange={() => toggleItem(item.id)}
                            className="rounded-none border-zinc-500 data-[state=checked]:border-[#1749e8] data-[state=checked]:bg-[#1749e8]"
                          />
                          <div className="relative h-12 w-20 sm:h-14 sm:w-24 shrink-0 overflow-hidden bg-black/60 border border-current/10">
                            <Image
                              src={safeThumbnail(item.thumbnail, item.id)}
                              alt=""
                              width={96}
                              height={56}
                              unoptimized
                              className="h-full w-full object-cover"
                            />
                            <span className="absolute inset-0 grid place-items-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                              <Play className="h-4 w-4 fill-white text-white" />
                            </span>
                            {item.durationText && (
                              <span className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.5 text-[9px] font-mono font-medium text-white">
                                {item.durationText}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1 pr-2">
                            <p className="truncate text-xs sm:text-sm font-medium">{item.title}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className={`text-[11px] font-mono ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                #{String(index + 1).padStart(2, '0')} {'//'} {mode === 'video' ? quality : `AUDIO // ${quality}`}
                              </span>
                              {isItemDownloading && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-[#1749e8] bg-[#1749e8]/15 px-1.5 py-0.5 border border-[#1749e8]/30 animate-pulse">
                                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                  {t.badgeDownloading}
                                </span>
                              )}
                              {isItemCompleted && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 border border-emerald-500/30">
                                  <Check className="h-2.5 w-2.5" />
                                  {t.badgeSaved}
                                </span>
                              )}
                            </div>
                          </div>
                        </label>

                        {/* Direct stream button */}
                        <a
                          href={`${apiUrl}/api/stream?url=${encodeURIComponent(item.url)}&type=${mode}&quality=${encodeURIComponent(
                            quality
                          )}&title=${encodeURIComponent(item.title)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={t.btnDirectStream}
                          className={`inline-flex h-8 items-center gap-1 px-2.5 text-xs font-mono border transition-colors shrink-0 ${
                            theme === 'dark'
                              ? 'border-white/10 bg-white/5 text-zinc-300 hover:bg-[#1749e8] hover:text-white hover:border-[#1749e8]'
                              : 'border-black/15 bg-[#f6f6f3] text-zinc-700 hover:bg-[#1749e8] hover:text-white hover:border-[#1749e8]'
                          }`}
                        >
                          <Download className="h-3 w-3" />
                          <span className="hidden sm:inline">Stream</span>
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className={`grid place-items-center border border-dashed py-20 px-6 text-center ${theme === 'dark' ? 'border-white/15 bg-[#111114]/40' : 'border-black/15 bg-white'}`}>
                <div className="grid h-12 w-12 place-items-center border border-current/20 bg-current/5 text-[#1749e8] mb-3">
                  <Link2 className="h-5 w-5" />
                </div>
                <p className="font-mono text-xs sm:text-sm font-bold tracking-wider uppercase">{t.emptyQueueTitle}</p>
                <p className={`mt-1.5 text-xs font-mono max-w-sm ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500'}`}>
                  {t.emptyQueueSub}
                </p>
              </div>
            )}
          </div>

          {/* Operation Action Dock (Desktop Side Panel) */}
          <aside className="space-y-4">
            <div className={`border p-5 ${theme === 'dark' ? 'border-white/10 bg-[#111114]' : 'border-black/15 bg-white'}`}>
              <div className="flex items-center justify-between pb-3 border-b border-inherit mb-4">
                <span className="text-xs font-mono font-bold tracking-wider text-[#1749e8] uppercase">
                  {t.statsSummary}
                </span>
                <HardDrive className="h-4 w-4 text-[#1749e8]" />
              </div>

              {/* Data Table */}
              <div className="space-y-2.5 text-xs font-mono">
                <div className="flex justify-between">
                  <span className={theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}>Itens Selecionados</span>
                  <span className="font-bold">{selected.length} {selected.length === 1 ? t.itemCount : t.itemsCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className={theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}>{t.statsQuality}</span>
                  <span className="font-bold">{quality}</span>
                </div>
                <div className="flex justify-between">
                  <span className={theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}>{t.statsTotalSize}</span>
                  <span className="font-bold text-[#1749e8]">~{totalEstMB} MB</span>
                </div>
                <div className="flex justify-between">
                  <span className={theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}>{t.statsEngine}</span>
                  <span className="font-bold">yt-dlp v2025</span>
                </div>
              </div>

              {/* Real-time Progress & Status */}
              {(progress > 0 || status) && (
                <div className={`mt-4 p-3 border font-mono ${theme === 'dark' ? 'border-white/10 bg-black/40' : 'border-black/10 bg-[#f6f6f3]'}`}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="truncate pr-2 font-medium">{status}</span>
                    {progress > 0 && <span className="font-bold text-[#1749e8]">{progress}%</span>}
                  </div>
                  {progress > 0 && <Progress value={progress} className="h-1.5 rounded-none [&>div]:bg-[#1749e8]" />}
                  <p className={`mt-2 flex items-center gap-1 text-[10px] truncate ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500'}`}>
                    <Clock3 className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      {progress === 100
                        ? 'Done!'
                        : serverInfo?.outputRoot
                        ? `Destino: ${serverInfo.outputRoot}`
                        : 'Executando processamento local'}
                    </span>
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-5">
                {downloading ? (
                  <Button
                    onClick={cancelDownload}
                    variant="destructive"
                    className="w-full h-11 rounded-none font-mono text-xs uppercase tracking-wider font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors"
                  >
                    <StopCircle className="mr-2 h-4 w-4" />
                    {t.btnCancel}
                  </Button>
                ) : (
                  <Button
                    onClick={startDownload}
                    disabled={!analysis || !selected.length || serverStatus === 'offline'}
                    className="w-full h-11 rounded-none font-mono text-xs uppercase tracking-wider font-bold bg-[#1749e8] hover:bg-[#1238b8] text-white disabled:opacity-30 shadow-[0_4px_16px_rgba(23,73,232,0.25)] transition-all"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {t.btnDownload} {selected.length ? `(${selected.length})` : ''}
                  </Button>
                )}
              </div>

              <div className={`mt-4 pt-3 border-t flex items-center gap-2 text-[11px] font-mono ${theme === 'dark' ? 'border-white/10 text-zinc-500' : 'border-black/10 text-zinc-500'}`}>
                <ShieldCheck className="h-3.5 w-3.5 text-[#1749e8] shrink-0" />
                <span>Zero anúncios. Código auditável.</span>
              </div>
            </div>

            {/* Quick Links / Documentation */}
            <div className={`p-4 border text-xs font-mono space-y-2 ${theme === 'dark' ? 'border-white/10 bg-[#111114]' : 'border-black/15 bg-white'}`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-400">BLUE LAB LAB-04</span>
                <a
                  href="https://bluelabhub.vercel.app/projects"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[#1749e8] hover:underline"
                >
                  bluelab.dev <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <p className={`text-[11px] leading-relaxed ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500'}`}>
                Sistemas digitais de longo alcance e utilitários abertos.
              </p>
            </div>
          </aside>
        </div>
      </main>

      {/* Real-time Download Feedback Dock */}
      {showFeedbackBar && (
        <div
          className={`fixed bottom-0 left-0 right-0 z-50 border-t transition-all duration-300 shadow-2xl backdrop-blur-xl ${
            theme === 'dark'
              ? 'border-[#1749e8]/50 bg-[#070709]/95 text-white'
              : 'border-[#1749e8] bg-[#f6f6f3]/95 text-black shadow-[0_-8px_32px_rgba(23,73,232,0.15)]'
          }`}
        >
          {/* Top Progress Electric Line */}
          <div className="w-full h-1.5 bg-black/20 overflow-hidden relative">
            <div
              className={`h-full transition-all duration-300 ${
                downloadCompleted
                  ? 'bg-emerald-500'
                  : 'bg-[#1749e8] shadow-[0_0_12px_rgba(23,73,232,0.8)]'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="w-full max-w-[1400px] mx-auto p-4 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
            {/* Left info: Status, Item atual e detalhes */}
            <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
              <div className="pt-0.5 sm:pt-0 shrink-0">
                {downloading ? (
                  <span className="grid h-8 w-8 place-items-center bg-[#1749e8] text-white animate-pulse">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </span>
                ) : downloadCompleted ? (
                  <span className="grid h-8 w-8 place-items-center bg-emerald-500 text-white">
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                ) : (
                  <span className="grid h-8 w-8 place-items-center bg-amber-500 text-white">
                    <AlertCircle className="h-4 w-4" />
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#1749e8] border border-current px-1.5 py-0.2">
                    {downloading
                      ? t.feedbackActiveLabel
                      : downloadCompleted
                      ? t.feedbackDoneLabel
                      : 'STATUS'}
                  </span>
                  {totalItemsToDownload > 0 && (
                    <span className="font-mono text-xs font-bold">
                      [{String(activeItemIndex || 1).padStart(2, '0')} / {String(totalItemsToDownload).padStart(2, '0')}]
                    </span>
                  )}
                  <span className="font-mono text-[11px] opacity-60 truncate">
                    {quality}
                  </span>
                </div>

                <p className="font-semibold text-xs sm:text-sm truncate mt-0.5">
                  {activeItemTitle || status || 'Processando mídias…'}
                </p>

                <p className={`text-[11px] font-mono truncate mt-0.5 ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  {status}
                </p>
              </div>
            </div>

            {/* Right: Percentual e Botão de Ação */}
            <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-current/10">
              <div className="flex items-baseline gap-1.5 font-mono">
                <span className="text-2xl sm:text-3xl font-black text-[#1749e8] tracking-tighter">
                  {progress}%
                </span>
                <span className="text-[10px] uppercase opacity-70">
                  {downloading ? 'concluído' : 'total'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {downloading ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={cancelDownload}
                    className="h-9 px-4 rounded-none font-mono text-xs uppercase tracking-wider font-bold bg-rose-600 hover:bg-rose-700 text-white"
                  >
                    <StopCircle className="h-3.5 w-3.5 mr-1.5" />
                    {t.btnCancel}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => setShowFeedbackBar(false)}
                    className="h-9 px-4 rounded-none font-mono text-xs uppercase tracking-wider font-bold bg-[#1749e8] hover:bg-[#1238b8] text-white"
                  >
                    <Check className="h-3.5 w-3.5 mr-1.5" />
                    {t.feedbackDismiss}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer Minimalista de Aplicação */}
      <footer className={`border-t py-4 text-xs font-mono transition-colors ${theme === 'dark' ? 'border-white/10 bg-[#070709] text-zinc-500' : 'border-black/10 bg-[#ebebe7] text-zinc-600'}`}>
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground">ODUU :)</span>
            <span>{'//'}</span>
            <span>BLUE LAB UTILITY CONSOLE</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <button onClick={() => setManifestoOpen(true)} className="hover:text-[#1749e8]">
              {t.manifestoBtn}
            </button>
            <span>/</span>
            <a href="https://github.com/JOTAGGE" target="_blank" rel="noopener noreferrer" className="hover:text-[#1749e8]">
              GitHub
            </a>
            <span>/</span>
            <button onClick={() => setSettingsOpen(true)} className="hover:text-[#1749e8]">
              Status
            </button>
          </div>
        </div>
      </footer>

      {/* Modal: Manifesto & Filosofia */}
      <Dialog open={manifestoOpen} onOpenChange={setManifestoOpen}>
        <DialogContent className={`border max-w-lg p-6 font-sans ${theme === 'dark' ? 'border-white/15 bg-[#111114] text-white' : 'border-black/20 bg-white text-black'}`}>
          <DialogHeader className="pb-3 border-b border-inherit">
            <div className="flex items-center justify-between">
              <DialogTitle className="font-mono text-sm font-bold tracking-wider uppercase text-[#1749e8]">
                {t.manifestoTitle}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs font-mono mt-1 opacity-70">
              {t.manifestoSubtitle}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm leading-relaxed my-3">
            <p>{t.manifestoBody1}</p>
            <p>{t.manifestoBody2}</p>

            <div className="grid gap-2.5 pt-2">
              {t.manifestoRules.map((rule, idx) => (
                <div key={idx} className="p-2.5 border border-current/10 font-mono text-xs">
                  <span className="text-[#1749e8] font-bold mr-2">{rule.tag}:</span>
                  <span className="opacity-90">{rule.text}</span>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Diagnóstico & Configurações */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className={`border max-w-md p-6 font-mono text-xs ${theme === 'dark' ? 'border-white/15 bg-[#111114] text-white' : 'border-black/20 bg-white text-black'}`}>
          <DialogHeader className="pb-3 border-b border-inherit">
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <span className="text-[#1749e8]">:)</span>
              {t.diagTitle}
            </DialogTitle>
            <DialogDescription className="text-xs opacity-70">
              {t.diagDesc}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-4">
            <div className="p-3 border border-current/10 space-y-2">
              <div className="flex justify-between">
                <span className="opacity-70">{t.diagApiUrl}</span>
                <span className="font-bold text-[#1749e8]">{apiUrl}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-inherit">
                <span className="opacity-70">{t.diagConnection}</span>
                <span className="flex items-center gap-1.5 font-bold">
                  {serverStatus === 'online' ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-emerald-500">ONLINE</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3.5 w-3.5 text-rose-500" />
                      <span className="text-rose-500">OFFLINE</span>
                    </>
                  )}
                </span>
              </div>
            </div>

            <div className="p-3 border border-current/10 space-y-2">
              <div className="flex justify-between">
                <span className="opacity-70">{t.diagYtDlp}</span>
                <span className="font-bold text-emerald-500">{t.diagReady}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-70">{t.diagFfmpeg}</span>
                <span className="font-bold text-emerald-500">{t.diagReady}</span>
              </div>
              <div className="pt-2 border-t border-inherit">
                <span className="block text-[10px] opacity-70 mb-0.5 uppercase">
                  {t.diagLocalFolder}
                </span>
                <span className="break-all font-semibold">
                  {serverInfo?.outputRoot || '~/Downloads/On Doubt Use Us'}
                </span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
