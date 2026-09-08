// Configuração central do backend do On Doubt, Use Us :)
// O link da API é gerenciado apenas via código / variáveis de ambiente na IDE/Deploy.
// Quando hospedar no Render, cole a URL pública gerada aqui ou na variável NEXT_PUBLIC_API_URL da Vercel.
export const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8787';
