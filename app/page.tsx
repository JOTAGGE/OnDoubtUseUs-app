'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowDown,
  CheckCircle2,
  Clock3,
  Copy,
  Download,
  ExternalLink,
  FileAudio2,
  FileVideo2,
  FolderOpen,
  HardDrive,
  Link2,
  ListVideo,
  Moon,
  Music2,
  Play,
  RefreshCw,
  Settings2,
  ShieldCheck,
  StopCircle,
  Sun,
  Terminal,
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

const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8787';

const translations = {
  en: {
    heroKicker: 'BLUE LAB EXPERIMENTAL UTILITY // 2026',
    heroTitle: 'On Doubt, Use Us :)',
    heroTagline: 'Forever free. Unlimited. No ads. No nonsense.',
    heroSubtitle:
      'A clean and simple media downloader built for people who just want things to work.',
    heroSoftwareBy: 'Software by Blue Lab.',
    heroCtaDownload: 'Start Download',
    heroCtaGithub: 'View on GitHub',
    
    serverOnline: 'SERVER ONLINE',
    serverChecking: 'CHECKING...',
    serverOffline: 'SERVER OFFLINE',
    serverWarning: 'Local backend service is unreachable at',
    serverWarningAction: 'Run "npm run dev" or "npm run dev:server" in terminal.',
    serverReconnect: 'Reconnect',

    toolBadge: 'ODUU // UTILITY CONSOLE v1.0.0',
    toolHeadline: 'PASTE LINK. CHOOSE QUALITY. SAVE LOCALLY.',
    inputPlaceholder: 'youtube.com/watch?v=... or playlist?list=...',
    analyzeBtn: 'Analyze Link',
    analyzingBtn: 'Analyzing…',
    pasteBtn: 'Paste',
    
    modeTitle: 'MODE',
    modeVideo: 'Video',
    modeAudio: 'Audio',
    formatTitle: 'QUALITY & CODEC',

    optionsTitle: 'STORAGE OPTIONS',
    organizeLabel: 'Organize in folders',
    organizeSub: 'Channel / Playlist structure',
    extrasLabel: 'Save extras',
    extrasSub: 'Thumbnail + Info JSON metadata',

    statsSelected: 'Selected',
    statsFormat: 'Format',
    statsEstSize: 'Estimated size',
    statsItems: 'items',
    statsItem: 'item',

    btnDownload: 'Download',
    btnDirectStream: 'Direct Browser Download',
    btnCancel: 'Abort Download',
    downloadingState: 'Downloading…',
    downloadCancelled: 'Download cancelled by user.',
    downloadDone: 'Completed! Saved to',

    emptyPlaceholderTitle: 'Your media list will appear here',
    emptyPlaceholderSub: 'Paste any YouTube video or playlist link above to inspect items.',
    selectAll: 'Select all',
    deselectAll: 'Deselect all',

    diagTitle: 'Diagnostics & Settings',
    diagDesc: 'Runtime environment information and local service state.',
    diagApiUrl: 'Backend API URL:',
    diagConnection: 'Connection Status:',
    diagYtDlp: 'yt-dlp Engine:',
    diagFfmpeg: 'ffmpeg Converter:',
    diagReady: 'Integrated & Ready',
    diagLocalFolder: 'Local output directory:',

    ideaKicker: '01 / THE IDEA',
    ideaHeading: 'Why does this exist?',
    ideaP1: 'It started with a very simple problem.',
    ideaP2: 'I wanted to save a few videos to watch offline.',
    ideaP3: 'So I searched for a downloader.',
    ideaP4:
      'And then came the usual experience: suspicious websites, intrusive ads, fake download buttons, bundled installers, limitations, subscriptions, pop-ups and tools I simply didn’t trust.',
    ideaP5: 'At some point the question stopped being: “Which downloader should I use?” and became:',
    ideaP6: '“Why don’t I just build one?”',
    ideaP7: 'Less than an hour later, the first version of On Doubt, Use Us :) existed.',

    philosophyKicker: '02 / THE PHILOSOPHY',
    philosophyHeading: 'The idea is stupidly simple.',
    philosophySub:
      'A utility should be useful. It shouldn’t fight the user, sell their attention or intentionally make simple things complicated.',
    philItems: [
      {
        title: 'Free forever.',
        desc: 'No premium tier required to unlock the actual tool.',
      },
      {
        title: 'No artificial limits.',
        desc: 'Use the software when you need it without daily quotas.',
      },
      {
        title: 'No ads.',
        desc: 'The interface belongs to the product, not advertisers.',
      },
      {
        title: 'No shady installers.',
        desc: 'No bundled junk, fake buttons or intentionally confusing flows.',
      },
      {
        title: 'Local-first.',
        desc: 'Whenever possible, the work happens directly on your machine.',
      },
      {
        title: 'Simple by design.',
        desc: 'Paste. Choose. Download. As straightforward as software should be.',
      },
    ],

    whatKicker: '03 / WHAT IT DOES',
    whatHeading: 'One tool. The useful stuff.',
    whatSub: 'Download media for offline use through a clean desktop and web experience.',
    features: [
      {
        title: 'Video',
        desc: 'Choose the quality you need up to 4K and save it locally.',
      },
      {
        title: 'Audio',
        desc: 'Extract high-fidelity audio (MP3, AAC, FLAC) when that’s all you want.',
      },
      {
        title: 'Playlists',
        desc: 'Handle multiple items without downloading them one by one.',
      },
      {
        title: 'Offline library',
        desc: 'Keep the things you want available even when your connection isn’t.',
      },
      {
        title: 'Transparent workflow',
        desc: 'You know what the application is doing and where your files are going.',
      },
    ],

    originKicker: '04 / ORIGIN & STORY',
    originHeading: 'Built because I needed it.',
    originP1: 'On Doubt, Use Us wasn’t born from a brainstorming session looking for “startup ideas.”',
    originP2: 'It came from an actual inconvenience: No internet. Content I wanted offline. Tools I didn’t trust. So I built the tool I wanted to find.',
    originP3:
      'That philosophy is also part of Blue Lab: find friction, understand it, build something better. Sometimes the best product idea isn’t hidden in a market report. Sometimes it’s the thing that annoyed you fifteen minutes ago.',

    brandKicker: '05 / BRAND MOMENT',
    brandTitle: 'On Doubt, Use Us :)',
    brandSubtitle: 'The name is the promise.',
    brandQuestions: [
      'Too many tabs open?',
      'Every website looks suspicious?',
      'Not sure which tool to trust?',
    ],
    brandAnswer: 'On Doubt, Use Us :)',

    blueLabKicker: '06 / BLUE LAB',
    blueLabHeading: 'A Blue Lab software.',
    blueLabDesc:
      'Blue Lab is an experimental technology and digital product studio focused on turning ideas, problems and curiosity into functional software.',
    blueLabSteps: 'Explore → Build → Test → Learn → Ship.',

    footerDisclaimer:
      'On Doubt, Use Us is designed for downloading content you own, have permission to download, or that is otherwise available for lawful offline use. Please respect creators, platforms and applicable rights.',
    footerCopyright: 'On Doubt, Use Us :) — Software by Blue Lab.',
  },
  pt: {
    heroKicker: 'UTILITÁRIO EXPERIMENTAL BLUE LAB // 2026',
    heroTitle: 'On Doubt, Use Us :)',
    heroTagline: 'Sempre gratuito. Sem limites. Sem anúncios. Sem enrolação.',
    heroSubtitle:
      'Um baixador de mídia limpo e direto feito para quem só quer que as coisas funcionem.',
    heroSoftwareBy: 'Software por Blue Lab.',
    heroCtaDownload: 'Iniciar Download',
    heroCtaGithub: 'Ver no GitHub',

    serverOnline: 'SERVIDOR ONLINE',
    serverChecking: 'VERIFICANDO...',
    serverOffline: 'SERVIDOR OFFLINE',
    serverWarning: 'O serviço local não foi detectado em',
    serverWarningAction: 'Execute "npm run dev" ou "npm run dev:server" no terminal.',
    serverReconnect: 'Reconectar',

    toolBadge: 'ODUU // CONSOLE DE UTILITÁRIO v1.0.0',
    toolHeadline: 'COLE O LINK. ESCOLHA O FORMATO. SALVE LOCALMENTE.',
    inputPlaceholder: 'youtube.com/watch?v=... ou playlist?list=...',
    analyzeBtn: 'Analisar link',
    analyzingBtn: 'Analisando…',
    pasteBtn: 'Colar',

    modeTitle: 'MODO',
    modeVideo: 'Vídeo',
    modeAudio: 'Áudio',
    formatTitle: 'QUALIDADE & FORMATO',

    optionsTitle: 'OPÇÕES DE ARMAZENAMENTO',
    organizeLabel: 'Organizar em pastas',
    organizeSub: 'Estrutura Canal / Playlist',
    extrasLabel: 'Salvar extras',
    extrasSub: 'Capa + metadados em JSON',

    statsSelected: 'Selecionados',
    statsFormat: 'Formato',
    statsEstSize: 'Tamanho estimado',
    statsItems: 'itens',
    statsItem: 'item',

    btnDownload: 'Baixar',
    btnDirectStream: 'Download direto no navegador',
    btnCancel: 'Interromper Download',
    downloadingState: 'Baixando…',
    downloadCancelled: 'Download cancelado pelo usuário.',
    downloadDone: 'Concluído com sucesso! Salvo em',

    emptyPlaceholderTitle: 'Sua lista de vídeos aparecerá aqui',
    emptyPlaceholderSub: 'Cole o link de qualquer vídeo ou playlist do YouTube acima.',
    selectAll: 'Selecionar todos',
    deselectAll: 'Desmarcar todos',

    diagTitle: 'Diagnóstico & Configurações',
    diagDesc: 'Informações do ambiente de execução e serviço local.',
    diagApiUrl: 'URL da API Backend:',
    diagConnection: 'Status da Conexão:',
    diagYtDlp: 'Motor yt-dlp:',
    diagFfmpeg: 'Conversor ffmpeg:',
    diagReady: 'Integrado & Pronto',
    diagLocalFolder: 'Pasta local de destino:',

    ideaKicker: '01 / A IDEIA',
    ideaHeading: 'Por que isso existe?',
    ideaP1: 'Tudo começou com um problema extremamente simples.',
    ideaP2: 'Eu queria salvar alguns vídeos para assistir offline.',
    ideaP3: 'Então procurei por um baixador na internet.',
    ideaP4:
      'E veio a experiência de sempre: sites suspeitos, anúncios invasivos, botões falsos de download, instaladores cheios de lixo, limites diários, planos pagos, pop-ups e ferramentas nas quais eu simplesmente não confiava.',
    ideaP5: 'A certa altura a pergunta deixou de ser “Qual baixador devo usar?” e passou a ser:',
    ideaP6: '“Por que eu não construo um?”',
    ideaP7: 'Menos de uma hora depois, nascia a primeira versão do On Doubt, Use Us :).',

    philosophyKicker: '02 / A FILOSOFIA',
    philosophyHeading: 'A ideia é estúpidamente simples.',
    philosophySub:
      'Um utilitário deve ser útil. Não deve brigar com o usuário, vender sua atenção nem tornar coisas simples desnecessariamente complicadas.',
    philItems: [
      {
        title: 'Gratuito para sempre.',
        desc: 'Nenhum plano pago necessário para desbloquear a ferramenta real.',
      },
      {
        title: 'Sem limites artificiais.',
        desc: 'Use o software quando precisar, sem limites diários de download.',
      },
      {
        title: 'Sem anúncios.',
        desc: 'A interface pertence ao produto, não a anunciantes.',
      },
      {
        title: 'Sem instaladores suspeitos.',
        desc: 'Sem lixo empacotado, sem botões falsos nem fluxos confusos de propósito.',
      },
      {
        title: 'Local-first.',
        desc: 'Sempre que possível, todo o processamento acontece direto na sua máquina.',
      },
      {
        title: 'Simples por design.',
        desc: 'Cole. Escolha. Baixe. Direto ao ponto, como todo software deveria ser.',
      },
    ],

    whatKicker: '03 / O QUE ELE FAZ',
    whatHeading: 'Uma única ferramenta. O que realmente importa.',
    whatSub: 'Baixe mídias para uso offline através de uma experiência limpa no desktop e na web.',
    features: [
      {
        title: 'Vídeo',
        desc: 'Escolha a resolução necessária até 4K e salve no seu disco.',
      },
      {
        title: 'Áudio',
        desc: 'Extraia áudio em alta fidelidade (MP3, AAC, FLAC) quando precisar apenas do som.',
      },
      {
        title: 'Playlists',
        desc: 'Processe múltiplos itens sem ter que baixar um por um manualmente.',
      },
      {
        title: 'Biblioteca Offline',
        desc: 'Mantenha seus conteúdos disponíveis mesmo quando a conexão cair.',
      },
      {
        title: 'Fluxo Transparente',
        desc: 'Você sabe exatamente o que a aplicação está fazendo e onde seus arquivos estão salvos.',
      },
    ],

    originKicker: '04 / ORIGEM & HISTÓRIA',
    originHeading: 'Construído porque eu precisava.',
    originP1: 'O On Doubt, Use Us não nasceu de uma sessão de brainstorming buscando “ideias de startup”.',
    originP2: 'Veio de um inconveniente real: sem internet, conteúdos que eu queria offline e ferramentas nas quais não confiava. Então construí a ferramenta que eu queria ter encontrado.',
    originP3:
      'Essa filosofia é a essência do Blue Lab: encontrar atrito, entendê-lo e construir algo melhor. Às vezes a melhor ideia de produto não está em um relatório de mercado. Às vezes é a coisa que te irritou quinze minutos atrás.',

    brandKicker: '05 / MOMENTO DA MARCA',
    brandTitle: 'On Doubt, Use Us :)',
    brandSubtitle: 'O nome é a própria promessa.',
    brandQuestions: [
      'Abas demais abertas?',
      'Todo site parece suspeito?',
      'Sem saber em qual ferramenta confiar?',
    ],
    brandAnswer: 'On Doubt, Use Us :)',

    blueLabKicker: '06 / BLUE LAB',
    blueLabHeading: 'Um software Blue Lab.',
    blueLabDesc:
      'Blue Lab é um estúdio de tecnologia experimental e produtos digitais focado em transformar ideias, problemas e curiosidade em software funcional.',
    blueLabSteps: 'Explorar → Construir → Testar → Aprender → Entregar.',

    footerDisclaimer:
      'On Doubt, Use Us é projetado para o download de conteúdos próprios, com autorização de download ou sob licenças de domínio público. Respeite os criadores, plataformas e os direitos legais aplicáveis.',
    footerCopyright: 'On Doubt, Use Us :) — Software por Blue Lab.',
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

  const abortControllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const t = translations[lang];
  const total = useMemo(() => selected.length * (mode === 'video' ? 84 : 12), [selected, mode]);

  // Carrega idioma e tema salvos
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
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
        // Ignora erro de localStorage
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

  async function checkServerHealth() {
    try {
      const res = await fetch(`${API}/api/health`, { cache: 'no-store' });
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
      void checkServerHealth();
    }, 0);
    const interval = setInterval(() => {
      void checkServerHealth();
    }, 20000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  async function analyzeUrl(value = url) {
    if (!value.trim()) return;
    setAnalyzing(true);
    setError('');
    setAnalysis(null);
    setProgress(0);
    setStatus(lang === 'pt' ? 'Consultando YouTube…' : 'Querying YouTube…');

    try {
      const response = await fetch(`${API}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: value.trim() }),
      });
      const data = (await response.json()) as Analysis & { error?: string };
      if (!response.ok) throw new Error(data.error || 'Falha ao analisar o link.');
      setAnalysis(data);
      setSelected(data.items.map((item: MediaItem) => item.id));
      setStatus(
        `${data.items.length} ${
          data.items.length === 1 ? t.statsItem : t.statsItems
        }`
      );
      setServerStatus('online');
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Falha de conexão com o backend de download.'
      );
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
    setStatus(t.downloadCancelled);
  }

  async function startDownload() {
    if (!selected.length || !analysis) return;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setDownloading(true);
    setProgress(0);
    setError('');
    setStatus(lang === 'pt' ? 'Preparando arquivos…' : 'Preparing files…');

    try {
      const items = analysis.items.filter((item) => selected.includes(item.id));
      const response = await fetch(`${API}/api/download`, {
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
              setStatus(`${lang === 'pt' ? 'Salvando em' : 'Saving to'} ${event.folder}`);
            }
            if (event.type === 'progress') {
              setProgress(event.overall);
              setStatus(`${lang === 'pt' ? 'Baixando' : 'Downloading'} ${event.item}/${items.length}…`);
            }
            if (event.type === 'item-error') {
              setError(`Item ${event.item}: ${event.message}`);
            }
            if (event.type === 'complete') {
              setProgress(100);
              setStatus(`${t.downloadDone} ${event.folder}`);
            }
          }
        }
      }
    } catch (cause) {
      if (controller.signal.aborted) {
        setStatus(t.downloadCancelled);
      } else {
        setError(cause instanceof Error ? cause.message : 'Falha durante o download.');
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

  function scrollToTool() {
    const el = document.getElementById('downloader-tool');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 400);
    }
  }

  return (
    <div className={`min-h-screen font-sans ${theme === 'dark' ? 'bg-[#0a0a0c] text-[#f4f4f5]' : 'bg-[#fafafa] text-[#09090b]'}`}>
      {/* Top Technical Bar */}
      <div className={`border-b text-[11px] font-mono tracking-wider py-1.5 px-5 sm:px-8 ${theme === 'dark' ? 'border-white/10 bg-[#070709] text-white/50' : 'border-zinc-200 bg-zinc-100 text-zinc-500'}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-bold text-[#0055ff]">
              <span>:)</span>
              <span className="hidden sm:inline">BLUE LAB LAB-04 // ODUU</span>
            </span>
            <span className="hidden md:inline text-zinc-500">|</span>
            <span className="hidden md:inline">SYSTEM: ACTIVE</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  serverStatus === 'online'
                    ? 'bg-emerald-500 animate-pulse'
                    : serverStatus === 'checking'
                    ? 'bg-amber-400'
                    : 'bg-rose-500'
                }`}
              />
              <span className="text-[10px]">
                {serverStatus === 'online'
                  ? t.serverOnline
                  : serverStatus === 'checking'
                  ? t.serverChecking
                  : t.serverOffline}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className={`sticky top-0 z-40 border-b backdrop-blur-md transition-colors ${theme === 'dark' ? 'border-white/10 bg-[#0a0a0c]/90' : 'border-zinc-200 bg-[#fafafa]/90'}`}>
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-3.5 group">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#0055ff] text-white font-mono font-bold text-xl shadow-[0_0_24px_rgba(0,85,255,0.35)] transition-transform group-hover:scale-105">
              :)
            </span>
            <div>
              <p className="text-[17px] font-bold tracking-tight leading-none">
                On Doubt, Use Us <span className="text-[#0055ff]">:)</span>
              </p>
              <p className={`mt-1 text-[11px] font-mono ${theme === 'dark' ? 'text-white/40' : 'text-zinc-500'}`}>
                software by blue lab
              </p>
            </div>
          </Link>

          {/* Controls: Language, Theme, Settings */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Language toggle Blue Lab style */}
            <div className={`flex items-center rounded-lg border px-1 py-0.5 text-xs font-mono font-semibold ${theme === 'dark' ? 'border-white/10 bg-white/5' : 'border-zinc-200 bg-zinc-100'}`}>
              <button
                type="button"
                onClick={() => toggleLanguage('pt')}
                className={`px-2 py-1 rounded transition-colors ${
                  lang === 'pt'
                    ? 'bg-[#0055ff] text-white font-bold'
                    : theme === 'dark'
                    ? 'text-white/60 hover:text-white'
                    : 'text-zinc-600 hover:text-black'
                }`}
              >
                PT
              </button>
              <span className={`px-0.5 ${theme === 'dark' ? 'text-white/20' : 'text-zinc-300'}`}>/</span>
              <button
                type="button"
                onClick={() => toggleLanguage('en')}
                className={`px-2 py-1 rounded transition-colors ${
                  lang === 'en'
                    ? 'bg-[#0055ff] text-white font-bold'
                    : theme === 'dark'
                    ? 'text-white/60 hover:text-white'
                    : 'text-zinc-600 hover:text-black'
                }`}
              >
                EN
              </button>
            </div>

            {/* Dark / Light Toggle */}
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              className={`h-9 w-9 rounded-lg border ${theme === 'dark' ? 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10' : 'border-zinc-200 bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}`}
              aria-label="Alternar modo claro / escuro"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {/* Settings & Diagnosis */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              className={`h-9 w-9 rounded-lg border ${theme === 'dark' ? 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10' : 'border-zinc-200 bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}`}
              aria-label="Configurações"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Server Offline Alert Banner */}
      {serverStatus === 'offline' && (
        <div className={`border-b px-5 py-3 text-xs font-mono ${theme === 'dark' ? 'border-amber-500/30 bg-amber-500/10 text-amber-200' : 'border-amber-500/40 bg-amber-50 text-amber-900'}`}>
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
              <span>
                {t.serverWarning} <code className="px-1.5 py-0.5 rounded bg-black/20 font-bold">{API}</code>. {t.serverWarningAction}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void checkServerHealth()}
              className="h-7 text-xs border-amber-500/40 hover:bg-amber-500/20"
            >
              <RefreshCw className="mr-1.5 h-3 w-3" />
              {t.serverReconnect}
            </Button>
          </div>
        </div>
      )}

      {/* HERO SECTION */}
      <section className="mx-auto max-w-7xl px-5 pt-16 pb-12 sm:px-8 lg:pt-24 lg:pb-16 border-b border-inherit">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-md border border-[#0055ff]/30 bg-[#0055ff]/10 px-2.5 py-1 text-[11px] font-mono font-semibold tracking-wider text-[#0055ff] mb-6">
            <Terminal className="h-3 w-3" />
            {t.heroKicker}
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl leading-[1.05]">
            On Doubt, Use Us <span className="text-[#0055ff]">:)</span>
          </h1>

          <p className="mt-4 text-xl sm:text-2xl font-semibold tracking-tight text-[#0055ff]">
            {t.heroTagline}
          </p>

          <p className={`mt-5 text-base sm:text-lg leading-relaxed max-w-2xl ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>
            {t.heroSubtitle}
          </p>

          <p className={`mt-2 text-xs font-mono uppercase tracking-widest ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>
            {t.heroSoftwareBy}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button
              onClick={scrollToTool}
              className="h-12 px-7 rounded-xl bg-[#0055ff] font-semibold text-white shadow-[0_0_30px_rgba(0,85,255,0.4)] hover:bg-[#0047d6] transition-all"
            >
              <ArrowDown className="mr-2 h-4 w-4" />
              {t.heroCtaDownload}
            </Button>

            <a
              href="https://github.com/JOTAGGE"
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex h-12 items-center gap-2 rounded-xl border px-6 text-sm font-semibold transition-colors ${
                theme === 'dark'
                  ? 'border-white/10 bg-white/5 text-white hover:bg-white/10'
                  : 'border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-100 shadow-sm'
              }`}
            >
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              {t.heroCtaGithub}
            </a>
          </div>
        </div>
      </section>

      {/* THE APP / UTILITY CONSOLE */}
      <section id="downloader-tool" className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:py-16">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[11px] font-mono tracking-widest text-[#0055ff] uppercase font-bold">
              {t.toolBadge}
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">
              {t.toolHeadline}
            </h2>
          </div>
          <div className={`text-xs font-mono ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>
            DESTINATION: ~/Downloads/On Doubt Use Us
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Main Console Workspace */}
          <div className="min-w-0 space-y-6">
            {/* Input Box */}
            <div className={`rounded-2xl border p-5 sm:p-6 shadow-xl transition-colors ${theme === 'dark' ? 'border-white/10 bg-[#101014]' : 'border-zinc-200 bg-white'}`}>
              <div className="flex items-center justify-between mb-3">
                <label htmlFor="media-url" className="text-xs font-mono font-semibold uppercase tracking-wider text-[#0055ff]">
                  URL / PLAYLIST
                </label>
                <button
                  onClick={() => void handlePaste()}
                  className={`text-xs font-mono flex items-center gap-1 hover:text-[#0055ff] transition-colors ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}
                >
                  <Copy className="h-3 w-3" />
                  {t.pasteBtn}
                </button>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Link2 className={`absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`} />
                  <Input
                    ref={inputRef}
                    id="media-url"
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    onKeyDown={(event) => event.key === 'Enter' && analyzeUrl()}
                    placeholder={t.inputPlaceholder}
                    className={`h-12 rounded-xl pl-11 font-mono text-sm transition-all focus-visible:border-[#0055ff] focus-visible:ring-[#0055ff]/20 ${
                      theme === 'dark'
                        ? 'border-white/10 bg-black/40 text-white placeholder:text-zinc-600'
                        : 'border-zinc-200 bg-zinc-50 text-zinc-900 placeholder:text-zinc-400'
                    }`}
                  />
                </div>
                <Button
                  onClick={() => analyzeUrl()}
                  disabled={!url.trim() || analyzing}
                  className="h-12 rounded-xl bg-[#0055ff] px-6 font-semibold text-white hover:bg-[#0047d6] disabled:opacity-40 transition-all"
                >
                  {analyzing ? t.analyzingBtn : t.analyzeBtn}
                </Button>
              </div>

              {error && (
                <div className="mt-3.5 flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-400 font-mono">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Mode & Quality Selectors */}
              <div className={`mt-6 grid gap-5 border-t pt-5 sm:grid-cols-2 ${theme === 'dark' ? 'border-white/10' : 'border-zinc-100'}`}>
                <div>
                  <span className={`block text-xs font-mono font-semibold uppercase mb-2 ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    {t.modeTitle}
                  </span>
                  <Tabs
                    value={mode}
                    onValueChange={(value) => {
                      setMode(value);
                      setQuality(value === 'video' ? '1080p · MP4' : '320 kbps · MP3');
                    }}
                  >
                    <TabsList className={`grid h-11 w-full grid-cols-2 rounded-xl p-1 ${theme === 'dark' ? 'bg-black/40' : 'bg-zinc-100'}`}>
                      <TabsTrigger
                        value="video"
                        className="gap-2 rounded-lg text-xs font-medium data-[state=active]:bg-[#0055ff] data-[state=active]:text-white transition-all"
                      >
                        <FileVideo2 className="h-3.5 w-3.5" />
                        {t.modeVideo}
                      </TabsTrigger>
                      <TabsTrigger
                        value="audio"
                        className="gap-2 rounded-lg text-xs font-medium data-[state=active]:bg-[#0055ff] data-[state=active]:text-white transition-all"
                      >
                        <FileAudio2 className="h-3.5 w-3.5" />
                        {t.modeAudio}
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                <div>
                  <span className={`block text-xs font-mono font-semibold uppercase mb-2 ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    {t.formatTitle}
                  </span>
                  <Select value={quality} onValueChange={(value) => value && setQuality(value)}>
                    <SelectTrigger className={`h-11 w-full rounded-xl px-4 font-mono text-xs ${theme === 'dark' ? 'border-white/10 bg-black/40 text-white' : 'border-zinc-200 bg-zinc-50 text-zinc-900'}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={`border ${theme === 'dark' ? 'border-white/10 bg-[#16161c] text-white' : 'border-zinc-200 bg-white text-zinc-900'}`}>
                      {mode === 'video' ? (
                        <>
                          <SelectItem value="2160p · MP4">2160p (4K UHD) · MP4</SelectItem>
                          <SelectItem value="1080p · MP4">1080p (Full HD) · MP4</SelectItem>
                          <SelectItem value="720p · MP4">720p (HD) · MP4</SelectItem>
                          <SelectItem value="1080p · WEBM">1080p (Original) · WEBM</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="320 kbps · MP3">320 kbps (High Quality) · MP3</SelectItem>
                          <SelectItem value="256 kbps · M4A">256 kbps (AAC Apple) · M4A</SelectItem>
                          <SelectItem value="Lossless · FLAC">Lossless Studio · FLAC</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Media Items List or Empty Slate */}
            {analysis ? (
              <div className={`overflow-hidden rounded-2xl border ${theme === 'dark' ? 'border-white/10 bg-[#101014]' : 'border-zinc-200 bg-white shadow-sm'}`}>
                <div className={`flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 ${theme === 'dark' ? 'border-white/10' : 'border-zinc-100'}`}>
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0055ff]/10 text-[#0055ff]">
                      <ListVideo className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate font-bold tracking-tight text-base">{analysis.title}</h3>
                      <p className={`text-xs font-mono mt-0.5 ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        {analysis.channel} · {analysis.items.length} {analysis.items.length === 1 ? t.statsItem : t.statsItems}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setSelected(selected.length === analysis.items.length ? [] : analysis.items.map((i) => i.id))
                    }
                    className="text-left text-xs font-mono font-semibold text-[#0055ff] hover:underline"
                  >
                    {selected.length === analysis.items.length ? t.deselectAll : t.selectAll}
                  </button>
                </div>

                <div className={`divide-y ${theme === 'dark' ? 'divide-white/5' : 'divide-zinc-100'}`}>
                  {analysis.items.map((item, index) => (
                    <div
                      key={item.id}
                      className={`group flex items-center justify-between gap-3 p-4 transition-colors sm:gap-4 sm:px-6 ${theme === 'dark' ? 'hover:bg-white/[0.02]' : 'hover:bg-zinc-50'}`}
                    >
                      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 sm:gap-4">
                        <Checkbox
                          checked={selected.includes(item.id)}
                          onCheckedChange={() => toggleItem(item.id)}
                          className="border-zinc-500 data-[state=checked]:border-[#0055ff] data-[state=checked]:bg-[#0055ff]"
                        />
                        <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
                          <Image src={safeThumbnail(item.thumbnail, item.id)} alt="" width={96} height={56} unoptimized className="h-full w-full object-cover" />
                          <span className="absolute inset-0 grid place-items-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                            <Play className="h-4 w-4 fill-white text-white" />
                          </span>
                          {item.durationText && (
                            <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1.5 py-0.5 text-[9px] font-mono font-medium text-white">
                              {item.durationText}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{item.title}</p>
                          <p className={`mt-1 text-xs font-mono ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            {String(index + 1).padStart(2, '0')} · {mode === 'video' ? quality : `AUDIO · ${quality}`}
                          </p>
                        </div>
                      </label>

                      {/* Direct browser download */}
                      <a
                        href={`${API}/api/stream?url=${encodeURIComponent(item.url)}&type=${mode}&quality=${encodeURIComponent(
                          quality
                        )}&title=${encodeURIComponent(item.title)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={t.btnDirectStream}
                        className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-mono transition-colors ${
                          theme === 'dark'
                            ? 'border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white'
                            : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100'
                        }`}
                      >
                        <Download className="h-3 w-3 text-[#0055ff]" />
                        <span className="hidden sm:inline">Stream</span>
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className={`grid place-items-center rounded-2xl border border-dashed py-16 px-6 text-center ${theme === 'dark' ? 'border-white/10 bg-[#101014]/40' : 'border-zinc-200 bg-zinc-50'}`}>
                <span className={`mb-3 grid h-12 w-12 place-items-center rounded-2xl text-[#0055ff] ${theme === 'dark' ? 'bg-white/5' : 'bg-zinc-200/60'}`}>
                  <Link2 className="h-6 w-6" />
                </span>
                <p className="font-semibold">{t.emptyPlaceholderTitle}</p>
                <p className={`mt-1 text-xs font-mono max-w-sm ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  {t.emptyPlaceholderSub}
                </p>
              </div>
            )}
          </div>

          {/* Action Sidebar */}
          <aside>
            <div className={`rounded-2xl border p-5 sm:p-6 lg:sticky lg:top-28 shadow-xl ${theme === 'dark' ? 'border-white/10 bg-[#101014]' : 'border-zinc-200 bg-white'}`}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-[#0055ff]">
                  {t.optionsTitle}
                </h3>
                <HardDrive className="h-4 w-4 text-[#0055ff]" />
              </div>

              <div className="space-y-3">
                <div className={`flex items-center justify-between rounded-xl p-3.5 border ${theme === 'dark' ? 'border-white/5 bg-black/40' : 'border-zinc-100 bg-zinc-50'}`}>
                  <div className="flex items-center gap-3">
                    <FolderOpen className="h-4 w-4 text-[#0055ff]" />
                    <div>
                      <p className="text-xs font-semibold">{t.organizeLabel}</p>
                      <p className={`text-[10px] font-mono ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>{t.organizeSub}</p>
                    </div>
                  </div>
                  <Switch checked={organize} onCheckedChange={setOrganize} className="data-[state=checked]:bg-[#0055ff]" />
                </div>

                <div className={`flex items-center justify-between rounded-xl p-3.5 border ${theme === 'dark' ? 'border-white/5 bg-black/40' : 'border-zinc-100 bg-zinc-50'}`}>
                  <div className="flex items-center gap-3">
                    <Music2 className="h-4 w-4 text-[#0055ff]" />
                    <div>
                      <p className="text-xs font-semibold">{t.extrasLabel}</p>
                      <p className={`text-[10px] font-mono ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>{t.extrasSub}</p>
                    </div>
                  </div>
                  <Switch checked={saveExtras} onCheckedChange={setSaveExtras} className="data-[state=checked]:bg-[#0055ff]" />
                </div>
              </div>

              <div className={`my-5 border-t ${theme === 'dark' ? 'border-white/10' : 'border-zinc-100'}`} />

              <dl className="space-y-2.5 text-xs font-mono">
                <div className="flex justify-between">
                  <dt className={theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}>{t.statsSelected}</dt>
                  <dd className="font-bold">{selected.length} {t.statsItems}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className={theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}>{t.statsFormat}</dt>
                  <dd className="font-bold">{quality.split(' · ')[1]}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className={theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}>{t.statsEstSize}</dt>
                  <dd className="font-bold text-[#0055ff]">~{total} MB</dd>
                </div>
              </dl>

              {/* Progress and status */}
              {(progress > 0 || status) && (
                <div className={`mt-5 rounded-xl border p-3.5 font-mono ${theme === 'dark' ? 'border-white/10 bg-black/40' : 'border-zinc-100 bg-zinc-50'}`}>
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="truncate pr-2 font-medium">{status}</span>
                    {progress > 0 && <span className="font-bold text-[#0055ff]">{progress}%</span>}
                  </div>
                  {progress > 0 && <Progress value={progress} className="h-1.5 [&>div]:bg-[#0055ff]" />}
                  <p className={`mt-2 flex items-center gap-1.5 text-[10px] truncate ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    <Clock3 className="h-3 w-3 shrink-0" />
                    <span>
                      {progress === 100
                        ? 'Done!'
                        : serverInfo?.outputRoot
                        ? `Path: ${serverInfo.outputRoot}`
                        : 'Processing with yt-dlp'}
                    </span>
                  </p>
                </div>
              )}

              {/* Download / Cancel Buttons */}
              {downloading ? (
                <Button
                  onClick={cancelDownload}
                  variant="destructive"
                  className="mt-5 h-12 w-full rounded-xl font-semibold bg-rose-600 hover:bg-rose-700 text-white"
                >
                  <StopCircle className="mr-2 h-4 w-4" />
                  {t.btnCancel}
                </Button>
              ) : (
                <Button
                  onClick={startDownload}
                  disabled={!analysis || !selected.length || serverStatus === 'offline'}
                  className="mt-5 h-12 w-full rounded-xl bg-[#0055ff] font-semibold text-white shadow-[0_0_24px_rgba(0,85,255,0.3)] hover:bg-[#0047d6] disabled:opacity-30 transition-all"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {t.btnDownload} {selected.length ? `(${selected.length})` : ''}
                </Button>
              )}

              <p className={`mt-4 flex items-start gap-2 text-[11px] leading-relaxed ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0055ff]" />
                Free forever. No telemetry. No ads.
              </p>
            </div>
          </aside>
        </div>
      </section>

      {/* 01 / THE IDEA */}
      <section className={`border-t py-16 sm:py-24 ${theme === 'dark' ? 'border-white/10' : 'border-zinc-200'}`}>
        <div className="mx-auto max-w-4xl px-5 sm:px-8">
          <span className="text-xs font-mono font-bold tracking-widest text-[#0055ff] uppercase">
            {t.ideaKicker}
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight mt-2 mb-8">
            {t.ideaHeading}
          </h2>

          <div className={`space-y-4 text-lg sm:text-xl font-medium leading-relaxed ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}`}>
            <p>{t.ideaP1}</p>
            <p>{t.ideaP2}</p>
            <p>{t.ideaP3}</p>
            <p className={`p-4 rounded-xl border text-base ${theme === 'dark' ? 'border-white/10 bg-white/5 text-zinc-300' : 'border-zinc-200 bg-zinc-100 text-zinc-800'}`}>
              {t.ideaP4}
            </p>
            <p>{t.ideaP5}</p>
            <p className="text-2xl sm:text-3xl font-bold text-[#0055ff] tracking-tight">
              {t.ideaP6}
            </p>
            <p className={`text-base font-mono mt-4 ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {t.ideaP7}
            </p>
          </div>
        </div>
      </section>

      {/* 02 / THE PHILOSOPHY */}
      <section className={`border-t py-16 sm:py-24 ${theme === 'dark' ? 'border-white/10 bg-[#070709]' : 'border-zinc-200 bg-zinc-50'}`}>
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <span className="text-xs font-mono font-bold tracking-widest text-[#0055ff] uppercase">
            {t.philosophyKicker}
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight mt-2 mb-4">
            {t.philosophyHeading}
          </h2>
          <p className={`text-base sm:text-lg max-w-2xl mb-12 ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>
            {t.philosophySub}
          </p>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {t.philItems.map((item, idx) => (
              <div
                key={idx}
                className={`rounded-2xl border p-6 transition-all hover:border-[#0055ff]/50 ${theme === 'dark' ? 'border-white/10 bg-[#101014]' : 'border-zinc-200 bg-white shadow-sm'}`}
              >
                <div className="text-xs font-mono font-bold text-[#0055ff] mb-2">
                  0{idx + 1} {'//'} RULE
                </div>
                <h4 className="text-lg font-bold tracking-tight mb-2">{item.title}</h4>
                <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 03 / WHAT IT DOES */}
      <section className={`border-t py-16 sm:py-24 ${theme === 'dark' ? 'border-white/10' : 'border-zinc-200'}`}>
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <span className="text-xs font-mono font-bold tracking-widest text-[#0055ff] uppercase">
            {t.whatKicker}
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight mt-2 mb-3">
            {t.whatHeading}
          </h2>
          <p className={`text-base sm:text-lg max-w-2xl mb-12 ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>
            {t.whatSub}
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {t.features.map((feat, idx) => (
              <div
                key={idx}
                className={`group rounded-2xl border p-6 transition-all hover:border-[#0055ff] ${
                  theme === 'dark' ? 'border-white/10 bg-white/[0.02]' : 'border-zinc-200 bg-white shadow-sm'
                }`}
              >
                <div className="text-xs font-mono text-[#0055ff] font-bold mb-3">
                  FEAT-0{idx + 1}
                </div>
                <h4 className="text-lg font-bold mb-1.5">{feat.title}</h4>
                <p className={`text-xs sm:text-sm leading-relaxed ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  {feat.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 04 / ORIGIN / PRODUCT STORY */}
      <section className={`border-t py-16 sm:py-24 ${theme === 'dark' ? 'border-white/10 bg-[#070709]' : 'border-zinc-200 bg-zinc-50'}`}>
        <div className="mx-auto max-w-4xl px-5 sm:px-8">
          <span className="text-xs font-mono font-bold tracking-widest text-[#0055ff] uppercase">
            {t.originKicker}
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight mt-2 mb-8">
            {t.originHeading}
          </h2>

          <div className={`space-y-6 text-base sm:text-lg leading-relaxed ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}`}>
            <p className="font-semibold text-xl text-[#0055ff]">
              {t.originP1}
            </p>
            <p>{t.originP2}</p>
            <blockquote className={`border-l-4 border-[#0055ff] pl-5 italic font-medium ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>
              {t.originP3}
            </blockquote>
          </div>
        </div>
      </section>

      {/* 05 / BRAND MOMENT */}
      <section className="border-t border-inherit py-20 sm:py-28 text-center bg-gradient-to-b from-transparent to-[#0055ff]/5">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <span className="text-xs font-mono font-bold tracking-widest text-[#0055ff] uppercase">
            {t.brandKicker}
          </span>
          <h2 className="text-4xl sm:text-6xl font-black tracking-tight mt-3 mb-4">
            On Doubt, Use Us <span className="text-[#0055ff]">:)</span>
          </h2>
          <p className="text-lg font-mono font-bold text-[#0055ff] uppercase tracking-wider mb-8">
            {t.brandSubtitle}
          </p>

          <div className={`space-y-2 text-base sm:text-lg font-mono ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>
            {t.brandQuestions.map((q, idx) => (
              <p key={idx}>{q}</p>
            ))}
          </div>

          <div className="mt-8 inline-block">
            <span className="inline-flex items-center gap-3 rounded-2xl bg-[#0055ff] px-8 py-4 text-xl sm:text-2xl font-black text-white shadow-[0_0_40px_rgba(0,85,255,0.45)]">
              <span>:)</span>
              <span>{t.brandAnswer}</span>
            </span>
          </div>
        </div>
      </section>

      {/* 06 / BLUE LAB SECTION */}
      <section className={`border-t py-16 sm:py-24 ${theme === 'dark' ? 'border-white/10 bg-[#0a0a0e]' : 'border-zinc-200 bg-white'}`}>
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div>
              <span className="text-xs font-mono font-bold tracking-widest text-[#0055ff] uppercase">
                {t.blueLabKicker}
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-1 mb-3">
                {t.blueLabHeading}
              </h2>
              <p className={`text-sm sm:text-base max-w-xl leading-relaxed ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>
                {t.blueLabDesc}
              </p>
            </div>

            <div className="rounded-2xl border p-6 border-[#0055ff]/30 bg-[#0055ff]/5 min-w-[280px]">
              <span className="text-[11px] font-mono uppercase tracking-widest text-[#0055ff] font-bold block mb-2">
                LAB WORKFLOW
              </span>
              <p className="font-mono text-sm sm:text-base font-bold text-[#0055ff]">
                {t.blueLabSteps}
              </p>
              <a
                href="https://bluelabhub.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-mono font-semibold hover:underline"
              >
                bluelabhub.vercel.app <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER & DISCLAIMER */}
      <footer className={`border-t py-12 text-xs font-mono ${theme === 'dark' ? 'border-white/10 bg-[#070709] text-zinc-500' : 'border-zinc-200 bg-zinc-100 text-zinc-600'}`}>
        <div className="mx-auto max-w-7xl px-5 sm:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#0055ff] text-white font-mono font-bold text-sm">
                :)
              </span>
              <span className="font-bold text-sm tracking-tight text-foreground">
                On Doubt, Use Us :)
              </span>
            </div>
            <div className="flex items-center gap-4">
              <a href="https://github.com/JOTAGGE" target="_blank" rel="noopener noreferrer" className="hover:text-[#0055ff]">
                GitHub
              </a>
              <span>/</span>
              <a href="https://bluelabhub.vercel.app" target="_blank" rel="noopener noreferrer" className="hover:text-[#0055ff]">
                Blue Lab
              </a>
              <span>/</span>
              <button onClick={() => setSettingsOpen(true)} className="hover:text-[#0055ff]">
                Status
              </button>
            </div>
          </div>

          <p className="leading-relaxed max-w-4xl text-[11px] opacity-80">
            {t.footerDisclaimer}
          </p>

          <div className="pt-4 border-t border-inherit flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[10px] opacity-70">
            <span>{t.footerCopyright}</span>
            <span>EXPLORE → BUILD → TEST → LEARN → SHIP</span>
          </div>
        </div>
      </footer>

      {/* Diagnostics / Settings Modal */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className={`border text-sm font-mono sm:max-w-md ${theme === 'dark' ? 'border-white/10 bg-[#141418] text-white' : 'border-zinc-200 bg-white text-zinc-900'}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <span className="text-[#0055ff]">:)</span>
              {t.diagTitle}
            </DialogTitle>
            <DialogDescription className={`text-xs ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {t.diagDesc}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-3">
            <div className={`rounded-xl border p-3.5 space-y-2 ${theme === 'dark' ? 'border-white/5 bg-black/40' : 'border-zinc-100 bg-zinc-50'}`}>
              <div className="flex items-center justify-between text-xs">
                <span className={theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}>{t.diagApiUrl}</span>
                <span className="font-mono text-xs font-bold text-[#0055ff]">{API}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className={theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}>{t.diagConnection}</span>
                <span className="flex items-center gap-1.5 font-bold">
                  {serverStatus === 'online' ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400">ONLINE</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3.5 w-3.5 text-rose-400" />
                      <span className="text-rose-400">OFFLINE</span>
                    </>
                  )}
                </span>
              </div>
            </div>

            <div className={`rounded-xl border p-3.5 space-y-2 ${theme === 'dark' ? 'border-white/5 bg-black/40' : 'border-zinc-100 bg-zinc-50'}`}>
              <div className="flex items-center justify-between text-xs">
                <span className={theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}>{t.diagYtDlp}</span>
                <span className="text-xs font-bold text-emerald-400">{t.diagReady}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className={theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}>{t.diagFfmpeg}</span>
                <span className="text-xs font-bold text-emerald-400">{t.diagReady}</span>
              </div>
              <div className={`pt-2 border-t text-[11px] ${theme === 'dark' ? 'border-white/5' : 'border-zinc-200'}`}>
                <span className={`block text-[10px] uppercase mb-1 ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  {t.diagLocalFolder}
                </span>
                <span className="font-mono text-xs break-all font-semibold">
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
