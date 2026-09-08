# 🛡️ Política e Auditoria de Segurança — On Doubt, Use Us :)

> Este documento detalha a arquitetura de segurança, defesas ativas contra abuso, mitigação de vulnerabilidades (P0, P1, P2) e orientações operacionais para o deploy de produção do **On Doubt, Use Us :)**.

---

## 📋 Matriz de Mitigações de Segurança

### 1. P0 — Bloqueio de Abuso e Proteção contra SSRF
| Ameaça | Vetor de Ataque | Mitigação Implementada | Status |
| :--- | :--- | :--- | :--- |
| **SSRF (Server-Side Request Forgery)** | URLs apontando para `localhost`, `127.0.0.1`, IPs privados (`10.x`, `192.168.x`, `172.16-31.x`) ou metadata cloud (`169.254.169.254`). | Parser canônico com whitelist estrita de hostnames (`youtube.com`, `www.youtube.com`, `m.youtube.com`, `youtu.be`, `music.youtube.com`), rejeição de qualquer IP numérico ou resolvedor customizado. | ✅ Ativo |
| **URL Spoofing & Auth Bypass** | URLs maliciosas com credenciais embutidas (`user:pass@...`) ou portas adicionais (`:8080`). | Validador rejeita qualquer URL com `parsed.username`, `parsed.password` ou portas fora do padrão 443/80. | ✅ Ativo |
| **Esquemas Perigosos** | `file://`, `ftp://`, `data:`, `javascript:`. | Apenas o protocolo estrito `https:` é aceito pelo servidor. | ✅ Ativo |
| **Command Injection (yt-dlp)** | URLs iniciando com `-` ou `--` interpretadas como flags de linha de comando. | 1. Execução via `spawn()` com array de argumentos sem shell (`windowsHide: true`).<br>2. Inserção obrigatória do delimitador `--` imediatamente antes da URL do usuário.<br>3. Flags de isolamento forçadas: `--no-exec`, `--no-config`, `--no-cache-dir`. | ✅ Ativo |
| **Injeção de Argumentos Arbitrários** | Modificação de flags como `--audio-format` ou `--format`. | Whitelist estrita para formatos e qualidades (`ALLOWED_VIDEO_QUALITIES`, `ALLOWED_AUDIO_QUALITIES`). Qualquer valor fora do enum é rejeitado com HTTP 400. | ✅ Ativo |

---

### 2. P0 — Limites de Recursos e Proteção contra DoS
| Proteção | Limite Configurado | Comportamento em Caso de Violação |
| :--- | :--- | :--- |
| **Concorrência Global de Jobs** | Máximo **2 downloads/conversões simultâneas** (`MAX_CONCURRENT_JOBS`). | Retorna HTTP 503 com mensagem amigável solicitando aguardar liberação de recursos. |
| **Concorrência por IP** | Máximo **1 download ativo por IP**. | Retorna HTTP 429 avisando que o IP já possui download em andamento. |
| **Rate Limiting em Memória** | 20 consultas de análise/min e 5 downloads/min por IP. | Retorna HTTP 429 com cabeçalho `Retry-After`. |
| **Limite de Itens por Playlist** | Máximo **30 itens** (`MAX_PLAYLIST_ITEMS`). | Fatiamento automático dos primeiros 30 itens para proteger memória e disco. |
| **Duração Máxima de Vídeo** | Máximo **3 horas** (10.800 segundos). | Itens que ultrapassam o limite são ignorados e sinalizados na lista de download. |
| **Timeout de Subprocesso** | Máximo **10 minutos por item** (`JOB_TIMEOUT_MS`). | Subprocesso é abortado com `SIGTERM` caso o download fique travado. |
| **Circuit Breaker de Espaço em Disco** | Mínimo **500 MB livres** (`MIN_FREE_DISK_MB`). | Verificação nativa com `fs.statfs`. Se o disco estiver abaixo de 500 MB, novos downloads são bloqueados com HTTP 507 (*Insufficient Storage*). |
| **Kill Switch de Emergência** | Variável `DOWNLOADS_ENABLED=false`. | Permite pausar instantaneamente a funcionalidade de download sem derrubar a interface. |

---

### 3. P0 — Filesystem & Path Traversal
- **Identificador Criptográfico:** Cada job recebe um identificador único `jobId` gerado via `crypto.randomUUID()`.
- **Sanitização de Pastas e Nomes de Arquivos:**
  - Remoção de sequências de path traversal (`..`, `../`, `..\`).
  - Bloqueio de nomes de dispositivos reservados do Windows: `CON`, `PRN`, `AUX`, `NUL`, `COM1-9`, `LPT1-9`.
  - Remoção de caracteres de controle e truncamento em 60 caracteres.
- **Validação com `path.resolve`:**
  - Todo caminho de pasta destino gerado é validado antes de ser criado:
    ```js
    const resolved = path.resolve(folder);
    if (!resolved.startsWith(path.resolve(outputRoot))) {
      throw new Error('Tentativa de Path Traversal bloqueada.');
    }
    ```

---

### 4. P0 — Sanitização de Dados do YouTube e XSS
- **Metadados Externos como Dados Não-Confiáveis:**
  - Títulos, nomes de canais e durações são renderizados como texto puro em JSX pelo React, evitando qualquer interpolação perigosa ou `dangerouslySetInnerHTML`.
- **Sanitização de Thumbnails:**
  - URLs de capas são filtradas por uma whitelist restrita (`i.ytimg.com`, `img.youtube.com`, `*.ggpht.com`). Qualquer thumbnail de domínio desconhecido ou esquema inseguro é descartada e substituída por placeholder oficial seguro.
- **Cabeçalhos HTTP de Segurança:**
  - `X-Content-Type-Options: nosniff` aplicado em todas as rotas e streams.
  - `X-Frame-Options: DENY` impedindo clickjacking.
  - `Content-Disposition: attachment; filename="..."` com codificação RFC segura para arquivos baixados.

---

### 5. P0 / P1 — Isolamento de Container (Docker)
- **Execução Não-Root:** O container executa sob o usuário `appuser` (UID 10001, GID 10001), sem privilégios de superusuário.
- **Permissões Mínimas:** Apenas o diretório `/app/downloads` possui permissão de escrita. O restante da aplicação opera como somente leitura.
- **Isolamento de Host:** Sem acesso a Docker socket, chaves SSH do host ou arquivos `.env` confidenciais.

---

### 6. P1 / P2 — Privacidade e Retenção
- **Zero Rastreamento de Cookies:** A aplicação não armazena cookies de sessão de terceiros nem credenciais do YouTube.
- **Limpeza de Processos:** Aborto em tempo real de downloads caso a conexão do cliente caia (`request.on('close')`), evitando desperdício de dados e arquivos residuais órfãos.
- **Logs Sanitizados:** Os logs registram apenas o `jobId`, duração, status e mensagens de erro sanitizadas, sem expor stack traces ou dados sensíveis ao usuário final.

---

## 🚀 Checklist para Deploy em Produção

Antes de disponibilizar publicamente:
1. **Reverse Proxy (Nginx / Cloudflare):**
   - Ative proteção DDoS e limitação de taxa no proxy reverso.
   - Integre **Cloudflare Turnstile** caso identifique automação maliciosa ou abusos de scraping.
2. **Variáveis de Ambiente de Produção:**
   - Configure `HOST=0.0.0.0` no container e restrinja `CORS_ORIGIN` estritamente ao domínio do frontend (ex: `https://ondoubtuseus.com`).
3. **Limites do Host:**
   - Ao rodar em Docker, defina cotas de recursos:
     ```bash
     docker run -d --cpus="1.5" --memory="2g" --pids-limit 100 ...
     ```
4. **Monitoramento e Alertas:**
   - Monitore a métrica `/api/health` para acompanhar jobs ativos e o espaço livre em disco (`freeDiskMb`).

---

## ⚖️ Canal de Contato e Abuso (Takedown)

Se você é detentor de direitos ou identificou qualquer uso inadequado da ferramenta, entre em contato através do repositório oficial ou envie e-mail para:  
📧 **contato@bluelab.dev** / **jg.barros.dsantos@gmail.com**
