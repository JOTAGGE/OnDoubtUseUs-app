// Configuração central do backend do On Doubt, Use Us :)
// O link da API é gerenciado apenas via código / variáveis de ambiente na IDE/Deploy.
// Quando hospedar no Render, cole a URL pública gerada aqui ou na variável NEXT_PUBLIC_API_URL da Vercel.
export const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' &&
  // Se estiver no Capacitor nativo mobile, usar a API remota oficial no Render
  !((window as any).Capacitor?.isNativePlatform?.() || navigator.userAgent.includes('Capacitor')) &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? window.location.origin.includes('8787')
      ? window.location.origin
      : 'http://127.0.0.1:8787'
    : 'https://on-doubt-use-us-api.onrender.com');

