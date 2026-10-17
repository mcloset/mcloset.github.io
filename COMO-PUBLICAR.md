# Como colocar o Meu Closet no ar (GitHub Pages) e instalar no iPhone

O GitHub só guarda o **programa**. Suas fotos e dados ficam **somente no seu aparelho**.

## 1. Criar a conta (uma vez só)
1. Entre em **github.com** e clique em **Sign up**.
2. Escolha um nome de usuário. Ele vai aparecer no endereço do app, então prefira algo simples, por exemplo `maiolini`.

## 2. Criar o repositório
1. Já logada, clique no **+** (canto superior direito) e depois em **New repository**.
2. Em **Repository name**, escreva `meu-closet`.
3. Marque **Public**. O GitHub Pages grátis exige repositório público, mas lá só fica o código; nenhuma foto sua vai para o GitHub.
4. Clique em **Create repository**.

## 3. Enviar os arquivos
1. Na página do repositório novo, clique no link **uploading an existing file**.
2. Abra no computador a pasta `meu-closet`.
3. Selecione **tudo o que está dentro dela**: `index.html`, `admin.html`, `avisos.json`, `sw.js`, `manifest.webmanifest` e as pastas `css`, `js` e `icons`.
4. Arraste para a página do GitHub. As pastas precisam ir junto.
5. Desça a página e clique em **Commit changes**.

## 4. Ligar o site
1. No repositório, abra **Settings → Pages**.
2. Em **Branch**, escolha `main` e a pasta `/ (root)`. Clique em **Save**.
3. Espere 1 ou 2 minutos e atualize a página. Vai aparecer o endereço, algo como:
   `https://SEU-USUARIO.github.io/meu-closet/`

## 5. Instalar no iPhone (e no iPad)
1. Abra o endereço no **Safari**.
2. Toque em **Compartilhar** (o quadrado com a seta) e depois em **Adicionar à Tela de Início**.
3. A partir daí, use **sempre pelo ícone**. Os dados do ícone e os do Safari ficam separados.
4. Depois de abrir pelo ícone uma vez, o app funciona até sem internet.

## Backup (muito importante)
- Vá em **Hub Pessoal → Backup e dados → Fazer backup agora** e salve em **Arquivos → iCloud Drive**.
- Para levar tudo para o iPad ou o computador: abra o app lá e use **Importar backup**.
- O app lembra você de fazer backup (a cada 7 dias, dá para mudar).

## Compartilhar com outras pessoas
- Quem também quiser usar o app abre o mesmo endereço e instala do mesmo jeito. Cada pessoa tem o próprio app, com os próprios dados.
- Para trocar closets: **Hub Pessoal → Compartilhar closets → Enviar**. Mande o arquivo pelo WhatsApp ou AirDrop. Quem recebe abre em **Compartilhar closets → Abrir arquivo recebido**.

## Contador de uso (GoatCounter)
1. Crie uma conta grátis em **goatcounter.com** e escolha um código (ex.: `meucloset`). Seu painel fica em `https://meucloset.goatcounter.com`.
2. Me passe o código, ou coloque você mesma no arquivo `js/config.js`, na linha `goatcounter: ''` (fica `goatcounter: 'meucloset'`), e envie esse arquivo para o GitHub.
3. A contagem só começa com o app publicado (endereço `https://`). Ela mostra quantas vezes o app é aberto e instalado, nunca quem é a pessoa nem o closet dela. Cada pessoa pode desligar em **Hub Pessoal → Sobre e privacidade**.

## Painel administrativo
Abra `https://SEU-USUARIO.github.io/meu-closet/admin.html` (dá para salvar nos favoritos). Por ele você:
- **manda recados** para quem usa o app (aparecem uma vez para cada pessoa);
- **tira o app do ar** com uma mensagem (as pessoas ainda conseguem fazer backup) e coloca de volta;
- **pede para todo mundo atualizar** para a versão nova;
- abre as estatísticas e as configurações do GitHub.

Toda mudança do painel vira um texto que você cola no arquivo `avisos.json` do GitHub (o painel abre o arquivo certo). Qualquer pessoa pode abrir o painel, mas só quem entra na sua conta do GitHub consegue publicar.

## Quando eu mandar uma versão nova
1. No GitHub, entre no repositório e envie os arquivos alterados do mesmo jeito (**Add file → Upload files**).
2. Quem abrir o app com internet recebe a versão nova sozinho. Para avisar todo mundo na hora, use **Pedir para atualizar** no painel, com o número da versão nova.
3. Os dados de ninguém são apagados numa atualização.
