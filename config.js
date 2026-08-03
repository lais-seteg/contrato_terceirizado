// Credenciais do Supabase — chave PUBLISHABLE (anon), feita para ser pública.
// A segurança real do sistema vem das políticas RLS no banco (ver
// migracao_2026-08-03_seguranca_login_rpc.sql), não do sigilo desta chave.
//
// Este projeto é publicado direto deste repositório pelo Vercel/Netlify, sem
// etapa de build — por isso este arquivo FICA no Git (ver comentário no
// .gitignore). Se um dia o deploy passar a ter um passo de build, esses
// valores podem virar variáveis de ambiente reais e este arquivo passa a ser
// gerado automaticamente a partir de config.example.js.

window.SUPABASE_URL = 'https://hqyoszdilauarrhxpgjg.supabase.co';
window.SUPABASE_KEY = 'sb_publishable_4gHAO6N33CaLCKgVzPa6Dw_YMP5LXo4';
