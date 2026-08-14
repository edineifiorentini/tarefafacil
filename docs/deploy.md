# Deploy — Vercel + Supabase

Guia para colocar o TarefaFácil em produção. O código já está pronto (build,
typecheck e lint limpos). Os passos abaixo são de configuração — quem executa
o login/deploy é você (envolve contas e credenciais).

## 0. Pré-requisitos

- Projeto **Supabase** (pode ser o mesmo do dev — as migrations 0001→0012 já
  estarão aplicadas; se criar um projeto novo, aplique todas na ordem).
- **OAuth client** do Google (o mesmo já usado) com a Calendar API ativa.
- Conta na **Vercel**.

## 1. Subir o código

**Opção A — Vercel CLI** (mais direto):

```bash
npm i -g vercel
vercel        # login no navegador + cria o projeto (primeiro deploy = preview)
vercel --prod # publica em produção
```

**Opção B — GitHub + Vercel**: crie um repositório, faça `git push`, e no painel
da Vercel clique em _New Project_ e importe o repositório. Cada push publica.

> A Vercel detecta Next.js automaticamente. Não há `vercel.json` — build
> padrão `next build`, Node ≥ 20 (fixado em `package.json`).

## 2. Variáveis de ambiente (Vercel → Settings → Environment Variables)

Use os mesmos nomes do [`.env.example`](../.env.example). As sensíveis ficam
só no servidor (não use prefixo `NEXT_PUBLIC` nelas):

| Variável                               | Valor em produção                                          |
| -------------------------------------- | ---------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | URL do projeto Supabase                                    |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | chave publishable                                          |
| `SUPABASE_SECRET_KEY`                  | chave secreta (servidor)                                   |
| `NEXT_PUBLIC_APP_URL`                  | `https://SEU-DOMINIO`                                      |
| `GOOGLE_CLIENT_ID`                     | client id do OAuth                                         |
| `GOOGLE_CLIENT_SECRET`                 | client secret (servidor)                                   |
| `GOOGLE_REDIRECT_URI`                  | `https://SEU-DOMINIO/api/gcal/callback`                    |
| `GOOGLE_WEBHOOK_URL`                   | `https://SEU-DOMINIO/api/gcal/webhook` (liga o tempo real) |

> **Ovo e galinha:** o domínio só existe depois do 1º deploy. Faça um deploy,
> anote a URL (`https://xxx.vercel.app` ou seu domínio), preencha as variáveis
> que dependem dela e **faça um novo deploy**.

## 3. Google Cloud (APIs & Services → Credentials → seu OAuth client)

- Em **Authorized redirect URIs**, adicione (mantendo as de dev):
  - `https://SEU-DOMINIO/api/gcal/callback`
  - a URL de callback do Supabase (ver passo 4) já deve estar lá.
- **OAuth consent screen**: enquanto estiver em _Testing_, só e-mails na lista
  de test users conseguem conectar. Para liberar geral, publique o app (os
  escopos de calendar são sensíveis e podem exigir verificação do Google).

## 4. Supabase (Auth → URL Configuration)

- **Site URL**: `https://SEU-DOMINIO`
- **Redirect URLs**: adicione `https://SEU-DOMINIO/**`
- Confirme que o provider Google continua habilitado (Auth → Providers).

## 5. Depois do deploy — conferir

- Login (magic link e Google) redireciona de volta ao app.
- Conectar Google Agenda em **Configurações** (usa `GOOGLE_REDIRECT_URI`).
- Com `GOOGLE_WEBHOOK_URL` setado, a sincronização de entrada passa a ser em
  tempo real (webhook `events.watch`); sem ele, continua por polling de 60s.

## Follow-ups de produção (não bloqueiam o deploy)

- **Renovação do canal `events.watch`** antes do TTL (hoje é criado no connect;
  falta um cron de renovação) — ver `lib/gcal/watch.ts`.
- **Limpeza de anexos órfãos** após 30 dias (design 10.4) — cron a criar.
- **E-mail real de convite** (hoje o convite é por link).
