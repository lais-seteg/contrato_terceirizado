# Contratação de Terceirizados · Seteg

Sistema interno do Portal RH da Seteg para gerenciar a contratação de prestadores de serviço e despachantes terceirizados: solicitação pelo líder, elaboração do contrato pelo DP/RH, aprovação e assinatura, geração automática do documento legal, cadastro público (sem login) para o terceirizado preencher seus próprios dados, e relatório de contratos exportável em CSV e PDF.

## Stack

Aplicação estática (sem build, sem framework, sem backend próprio): HTML + CSS + JavaScript puro, com [Supabase](https://supabase.com) como banco de dados/API.

- `index.html` — aplicação principal (login + dashboard + contratos + terceirizados + avaliações + alertas)
- `cadastro.html` — formulário público, sem login, para o terceirizado preencher seus dados a partir de um link enviado pelo líder
- `script.js` — toda a lógica da aplicação principal
- `style.css` — estilos (tema escuro/claro)
- `config.js` — credenciais do Supabase (URL + chave publishable/anon)
- `images/` — logo, favicon, plano de fundo e timbrado usado no contrato gerado

O schema do banco (tabelas, RLS, função de login) já está aplicado no projeto Supabase em produção — não fica versionado aqui (era só um script de setup de uso único, sem mais função depois de aplicado).

## Configuração

1. Aponte para um projeto [Supabase](https://supabase.com) já com o schema deste app (tabelas `usuarios`/`contratos`/`terceirizados`/`avaliacoes`/`auditoria`/`login_attempts`, Supabase Auth configurado, RLS e as funções `obter_email_login()`/`validar_link_contrato()`/`enviar_cadastro_terceirizado()` — ver "Segurança"). Recriar isso do zero exige um script próprio de schema, que não está neste repositório.
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

- **Login via Supabase Auth real** (migração 2026-08): o código de acesso continua sendo o único campo pedido na tela, mas por baixo dos panos o app resolve um e-mail sintético a partir do código (RPC `obter_email_login()`, `SECURITY DEFINER`, com o mesmo limite de tentativas por IP de antes) e autentica de fato via `signInWithPassword` — a senha (o próprio código) fica protegida pelo Supabase Auth (bcrypt+salt), não mais por um hash SHA-256 comparado manualmente.
- **RLS por perfil, imposta no banco**: `contratos`, `terceirizados` e `avaliacoes` exigem `authenticated` (JWT do Supabase Auth) para qualquer operação — a chave `anon` sozinha não lê nem grava mais nada nessas tabelas. As regras de quem pode criar/editar/excluir (que antes só existiam no JavaScript) agora são impostas por policies no Postgres.
- **Cadastro externo (`cadastro.html`, sem login)** continua usando a chave `anon`, mas a validação do link (token/expiração/uso único) acontece dentro do banco, via as funções `SECURITY DEFINER` `validar_link_contrato()`/`enviar_cadastro_terceirizado()` — não existe mais cadastro sem link vinculado a uma solicitação real.
- A tabela `auditoria` é somente-inserção (append-only) — não pode ser alterada/apagada pela API.
- O SDK do Supabase é carregado via CDN com versão travada + [SRI](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity) (`integrity=`), protegendo contra adulteração do arquivo na CDN.
- **Risco residual conhecido:** a leitura (`SELECT`) de `contratos`/`terceirizados`/`avaliacoes` continua ampla entre os 3 perfis autenticados (preserva funcionalidades como busca de terceirizado por CPF) — um `solicitante` autenticado ainda consegue ler campos sensíveis de terceirizados (RG, dados bancários) via API direta, mesmo que a tela já esconda isso na exibição. Antes exigia só a chave `anon` (pública); agora exige ser um dos usuários autenticados de fato. Fechar esse ponto por completo exigiria uma view/coluna separada por perfil.

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
