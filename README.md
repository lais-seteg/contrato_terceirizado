# Contratação de Terceirizados · Seteg

Sistema interno do Portal RH da Seteg para gerenciar a contratação de prestadores de serviço e despachantes terceirizados: solicitação pelo líder, elaboração do contrato pelo DP/RH, aprovação e assinatura, geração automática do documento legal, e cadastro público (sem login) para o terceirizado preencher seus próprios dados.

## Stack

Aplicação estática (sem build, sem framework, sem backend próprio): HTML + CSS + JavaScript puro, com [Supabase](https://supabase.com) como banco de dados/API.

- `index.html` — aplicação principal (login + dashboard + contratos + terceirizados + avaliações + alertas)
- `cadastro.html` — formulário público, sem login, para o terceirizado preencher seus dados a partir de um link enviado pelo líder
- `script.js` — toda a lógica da aplicação principal
- `style.css` — estilos (tema escuro/claro)
- `config.js` — credenciais do Supabase (URL + chave publishable/anon)
- `images/` — logo, favicon, plano de fundo e timbrado usado no contrato gerado
- `supabase_setup_completo_2026-07-31.sql` — script para (re)criar o banco do zero (tabelas, RLS, função de login, seed de usuários)

## Configuração

1. Crie um projeto no [Supabase](https://supabase.com) e rode `supabase_setup_completo_2026-07-31.sql` inteiro no SQL Editor (isso recria as tabelas do zero — **destrutivo**, veja o aviso no topo do arquivo. Já inclui a função de login segura, não precisa de nenhuma migração à parte).
2. Copie `config.example.js` para `config.js` e preencha com a URL do projeto e a chave `anon`/`publishable` (Supabase Dashboard → Project Settings → API).
3. Abra `index.html` num servidor estático (ou publique — ver "Deploy" abaixo).

## Deploy

Publicado via [Vercel](https://vercel.com), conectado diretamente a este repositório no GitHub — cada push na branch principal é publicado automaticamente, sem etapa de build. Por isso `config.js` fica versionado no repositório (é a chave *publishable* do Supabase, feita para ser pública — ver seção "Segurança"). Os headers de segurança HTTP (`vercel.json`) também são aplicados automaticamente pelo Vercel nesse fluxo.

## Perfis de acesso

| Perfil | Quem | O que faz |
|---|---|---|
| `solicitante` | Líderes de projeto/área | Cria solicitações de contrato (só Nome/CPF/Telefone do terceirizado), acompanha e aprova o contrato quando o DP encaminha |
| `gestao-pessoas` | DP / Gestão de Pessoas | Elabora o contrato, gera o documento, encaminha para o líder, confirma assinatura |
| `gestao` | Gestão | Acompanha solicitações já criadas, aprova/reprova, não cria contrato novo |

Login é por código de acesso (sem e-mail/senha tradicional) — ver "Segurança".

## Segurança

- O login não faz mais leitura direta da tabela `usuarios` pela chave `anon` — passa por uma função `autenticar_usuario()` no Postgres (`SECURITY DEFINER`, definida em `supabase_setup_completo_2026-07-31.sql`) que nunca expõe o hash do código e aplica limite de tentativas por IP.
- A tabela `auditoria` é somente-inserção (append-only) para a chave `anon` — não pode ser alterada/apagada pela API.
- O SDK do Supabase é carregado via CDN com versão travada + [SRI](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity) (`integrity=`), protegendo contra adulteração do arquivo na CDN.
- **Risco residual conhecido:** como o app não usa autenticação real do Supabase (Supabase Auth), as tabelas `contratos`, `terceirizados` e `avaliacoes` ainda aceitam leitura/escrita da chave `anon` sem verificação de identidade a nível de banco — o controle de quem pode editar/excluir existe hoje só na interface, não no banco. Fechar esse ponto por completo exigiria migrar o login para Supabase Auth.

## Fluxo do contrato

```
Pendente (líder cria, só Nome/CPF/Telefone)
  → Em Elaboração (automático, quando o terceirizado responde ao link)
  → Aguardando Aprovação do Líder (DP gera o documento e encaminha)
  → Aguardando Assinaturas (líder aprova)
  → Finalizado (DP confirma que coletou as assinaturas)

Ramos: Reprovado · Pendente de Ajuste · Cancelado
```

O financeiro não participa do fluxo do sistema — a assinatura já finaliza o contrato.
