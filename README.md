# Contratação de Terceirizados · Seteg

Sistema interno do Portal RH da Seteg para gerenciar a contratação de prestadores de serviço e despachantes terceirizados: solicitação pelo líder, elaboração do contrato pelo DP/RH, aprovação e assinatura, geração automática do documento legal, cadastro público (sem login) para o terceirizado preencher seus próprios dados, e relatório de contratos exportável em CSV e PDF.

## Stack

Aplicação estática (sem build, sem framework, sem backend próprio): HTML + CSS + JavaScript puro, com [Supabase](https://supabase.com) como banco de dados/API.

- `index.html` — aplicação principal (login + dashboard + contratos + terceirizados + avaliações + alertas)
- `cadastro.html` — formulário público, sem login, para o terceirizado preencher seus dados a partir de um link enviado pelo líder
- `script.js` — toda a lógica da aplicação principal
- `contrato_pj.js` — texto do modelo CNPJ do contrato (48 cláusulas + 4 anexos), carregado sob demanda
- `style.css` — estilos (tema escuro/claro)
- `config.js` — credenciais do Supabase (URL + chave publishable/anon)
- `images/` — logo, favicon, plano de fundo e timbrado usado no contrato gerado
- `doc/` — modelos do contrato em Word, de onde o texto gerado pelo sistema foi transcrito
- `migracao_*.sql` — migrações de schema a rodar no SQL Editor do Supabase antes de publicar o front

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

## Contrato gerado: dois modelos

O documento é montado a partir dos dados da solicitação e do cadastro do terceirizado, e existe em duas versões:

| Modelo | Quando | Onde mora o texto |
|---|---|---|
| **Padrão** | Sempre — pessoa física ou jurídica | `contrato_pj.js` (48 cláusulas + Anexos I a IV), montado por `montarContratoPJHTML()` |
| Anterior | Só quando o DP escolhe explicitamente | `montarContratoPFHTML()`, em `script.js` |

O modelo padrão vale para todo terceirizado, pessoa física ou jurídica — não há inferência pelo cadastro. O modelo anterior continua acessível no campo **Modelo do contrato a gerar** (bloco "Dados Completos do Terceirizado"), principalmente para regerar contratos antigos com o texto com que foram assinados.

**Ponto de atenção jurídica:** no modelo padrão a CONTRATADA é qualificada como pessoa jurídica ("devidamente inscrita no CNPJ sob o nº..."). Gerado para uma pessoa física, o documento sai com **razão social** e **CNPJ** em amarelo e essa frase precisa ser ajustada à mão no próprio documento — o texto não tem variante para pessoa física. Uma variante PF do modelo em Word resolveria isso na origem.

O modelo escolhido aparece no título do modal ("Contrato de Prestação de Serviços · modelo CNPJ / MEI"), para não ser preciso ler o documento inteiro para descobrir qual saiu.

Um documento já gerado é reaberto exatamente como foi salvo, para preservar as edições manuais do DP — inclusive quando o modelo mudou depois. Nesse caso aparece um aviso no topo do modal dizendo em que modelo ele foi gerado e qual os dados indicam agora, com a instrução de usar **Regerar**. O modelo do documento salvo é reconhecido pela quebra de página dos anexos, que só existe no modelo CNPJ.

Para os documentos que já existiam no modelo antigo, o botão **Atualizar p/ modelo atual** (cabeçalho da seção Contratos, só DP/RH e Gestão) descarta em lote o documento salvo desses contratos, para que sejam gerados no modelo atual na próxima vez que forem abertos. Ele age **apenas nos contratos cujo documento ainda está em elaboração** — Pendente, Em Elaboração, Aguardando Aprovação do Líder e Pendente de Ajuste. Contrato já aprovado ou assinado (Aguardando Assinaturas, Aguardando Pagamento, Aprovado, Finalizado) fica intocado de propósito: o documento salvo é o texto que as Partes acertaram, e reescrevê-lo apagaria essa prova. Reprovados e cancelados também ficam de fora, por não haver o que atualizar.

Os termos de pagamento saem da solicitação do líder: **Valor Total** + **Nº de Parcelas**. O valor de cada parcela é calculado (total ÷ parcelas) e o campo é somente leitura — assim os três números na tela nunca deixam de fechar entre si. No modelo de pessoa física, 1 parcela gera a cláusula de parcela única e 2 ou mais geram "em N (extenso) parcelas mensais de R$ X"; no modelo CNPJ o valor da parcela é o valor mensal, pago no dia 5 contra nota fiscal.

A forma de pagamento do cadastro do terceirizado (Pix / boleto / transferência) define só **como** se paga; **quantas vezes** é o campo de parcelas do contrato. Antes as duas coisas estavam no mesmo campo do cadastro, e um contrato com valor mensal saía como parcela única.

No campo **Escopo do Contrato**, a primeira linha entra na cláusula do objeto como a finalidade da atuação; cada linha seguinte vira uma alínea (a, b, c...) da lista de escopo.

O texto de `contrato_pj.js` foi extraído do `.docx` programaticamente para preservar a numeração automática das cláusulas do Word — as referências cruzadas do próprio contrato ("Cláusula 29ª", "Cláusulas 15ª e 16ª", "Cláusulas 3ª a 7ª") dependem dessa ordem. Ao receber uma revisão nova do modelo em Word, é mais seguro reextrair do que editar o arquivo à mão.

Campo sem dado sai destacado em amarelo no documento, para o DP completar antes de encaminhar.

O bloco de dados bancários da cláusula de pagamento imprime sempre as cinco linhas do modelo (Nome, Banco, Ag, CC, Pix), mesmo vazias — suprimir a linha esconderia que falta dado. Para os cadastros feitos antes dos campos separados existirem, `extrairDadosBancarios()` garimpa o texto livre de `t_dados_bancarios` para preencher essas linhas, priorizando precisão sobre cobertura (agência e conta só são aceitas quando o valor começa por dígito). Nesses casos o texto original é impresso logo abaixo, em amarelo, para o DP conferir a interpretação e reposicionar o que estiver fora de lugar.
