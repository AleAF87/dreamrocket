# dreamrocket

## Apresentação pública da Áurea Engenharia

Endereço de destino: https://dreamrocketadm.netlify.app/pagina_dev/aurea_engenharia

O projeto React original está em `aurea_engenharia/`. Seu conteúdo completo é
compilado em `dist/pagina_dev/aurea_engenharia/`, junto com o sistema Dream Rocket
em `dist/`. A página inicial da Áurea é pública e não importa a autenticação do
Dream Rocket. As rotas administrativas da Áurea mantêm a proteção original.

- `node scripts/build-netlify.mjs --install`: instala as dependências fixadas
  no lockfile, compila a Áurea e monta o diretório de publicação completo.
- `node scripts/build-netlify.mjs`: recompila usando as dependências já instaladas.
- `netlify.toml` configura o build e define `dist` como diretório de publicação.
- `_redirects` mantém a navegação e o acesso direto às subrotas da Áurea dentro
  de `/pagina_dev/aurea_engenharia`, sem redirecionar para o login do Dream Rocket.

O formulário e a administração usam o PocketBase original, configurado por
`VITE_POCKETBASE_URL`; o endereço público existente está definido no
`netlify.toml`. Não publicar a raiz do repositório: somente `dist`, que contém
os arquivos públicos e exclui fontes, `.env`, migrações e dependências.

Para publicar manualmente, autenticar com `netlify login`, vincular ao site
existente `dreamrocketadm` e usar `netlify deploy --prod --dir=dist --no-build`.
Para publicação pelo Git, manter o `netlify.toml` versionado junto com as fontes.

### Visualização com Live Server

Depois de compilar, também é possível abrir diretamente:
`http://127.0.0.1:5500/Github-Ale/dreamrocket/dist/pagina_dev/aurea_engenharia/index.html`.
O HTML calcula o diretório da página antes de carregar os arquivos; o roteador
reconhece tanto a pasta quanto `index.html`. Os mesmos arquivos funcionam no
caminho público do Netlify, inclusive ao acessar diretamente subrotas.
No Live Server, as subrotas administrativas dependem do suporte do servidor a
fallback de SPA; a página pública e seus links de seção funcionam diretamente.

## Acesso restrito

O login com Google exige registros já existentes em `login/{uid}` e
`usuarios/{uid}`, usando o UID autenticado pelo Firebase. O site não cria esses
registros e não altera status ou nível; atualiza somente `ultimoAcesso` após
validar o acesso. Cadastros incompletos também são bloqueados.

O status de `login/{uid}` tem prioridade sobre o de `usuarios/{uid}` e precisa
ser `ativo`. As páginas exigem nível 1; o nível ausente mantém o padrão legado 1.
Usuários rejeitados têm a sessão encerrada, inclusive ao restaurar uma sessão.

### Configuração necessária no Firebase

As regras informadas anteriormente permitiam leitura e escrita públicas na raiz.
O arquivo `database.rules.json` contém a substituição completa, ainda não publicada:

- Nega o acesso na raiz e a caminhos não utilizados pelo site.
- Permite ao usuário autenticado ler somente o próprio cadastro.
- Impede criação, exclusão e edição de cadastros pelo cliente, incluindo status
  e nível. Permite somente atualizar o próprio `ultimoAcesso` com o timestamp do
  servidor, após verificar a autorização.
- Libera `servicos`, `retiradas` e `contas_casa` apenas quando os dois cadastros
  já existem, o status está ativo e o nível é 1 (número ou texto `"1"`). Nível
  ausente mantém o padrão legado 1; outros formatos são recusados pelo servidor.

Para aplicar:

1. Conferir no console se cada usuário autorizado possui `login/{uid}` e
   `usuarios/{uid}`, com o UID do Firebase Authentication. Padronizar o status
   como `ativo` e o nível como número 1. Cadastros incompletos serão recusados.
2. Publicar o código atualizado do site antes das regras: a versão antiga
   tenta regravar o cadastro inteiro e será recusada pelas novas regras.
3. Em Firebase Console → projeto `dream-rocket` → Realtime Database → Regras,
   substituir todo o conteúdo por `database.rules.json` e clicar em Publicar.
4. Verificar login de um usuário existente, abertura das telas e gravação de
   uma movimentação; com uma conta nova, verificar que o acesso é negado e
   nenhum cadastro é criado no Realtime Database.

As permissões de administração do console continuam sendo o meio de manter os
cadastros. Não habilitar `.read` ou `.write` na raiz: permissões concedidas em
níveis superiores prevalecem sobre restrições abaixo. Usuários que já haviam
sido cadastrados pelo fluxo antigo continuam autorizados; revisar esses registros
no console e marcar os indesejados como `inativo` em `login/{uid}/status`.

Referência: https://firebase.google.com/docs/database/security

O popup Google ainda pode criar uma identidade no Firebase Authentication;
essa identidade, sem os cadastros autorizados no banco, é recusada pelo site.
Para impedir também a criação da identidade no servidor, avaliar uma função de
bloqueio `beforeCreate` do Identity Platform:
https://cloud.google.com/identity-platform/docs/blocking-functions

### Verificação local

Executar `node --test tests/auth.test.mjs` (Node.js 22 ou superior).
Os testes simulam Firebase e navegador; não verificam as regras em produção.
