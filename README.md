# encurta

Encurtador de links com painel de métricas: cole uma URL longa, receba um link curto e acompanhe os cliques por dia, de cada link ou de todos somados. O painel funciona em português e inglês.

<!-- Adicione aqui um print do painel: ![Painel](docs/painel.png) -->

## Arquitetura

Três serviços separados, orquestrados com Docker Compose:

```
navegador ──> frontend (nginx) ──/api/* e links curtos──> backend (Node + Express) ──> db (PostgreSQL)
                  │
                  └── serve o painel (HTML, CSS e JavaScript)
```

| Pasta | Serviço | Tecnologias |
| --- | --- | --- |
| `frontend/` | Painel web servido pelo nginx, que também repassa `/api` e os links curtos para o backend | HTML, CSS e JavaScript puro |
| `backend/` | API REST e redirecionamento | Node.js, Express, `pg` |
| `database/` | Esquema do banco (`init.sql`), aplicado na primeira inicialização | PostgreSQL 16 |

## Como rodar com Docker

Requer [Docker](https://docs.docker.com/get-docker/) com Docker Compose.

```bash
cp .env.example .env      # no Windows (PowerShell): Copy-Item .env.example .env
# edite o .env e troque POSTGRES_PASSWORD
docker compose up --build
```

Abra http://localhost:8080.

Comandos úteis:

```bash
docker compose up -d --build   # roda em segundo plano
docker compose logs -f backend # acompanha os logs da API
docker compose down            # para tudo (os dados do banco ficam guardados)
docker compose down -v         # para tudo e APAGA os dados do banco
```

### Variáveis (arquivo `.env`)

| Variável | Para que serve |
| --- | --- |
| `POSTGRES_PASSWORD` | Senha do banco (obrigatória). Definida na primeira criação do volume: se trocar depois, rode `docker compose down -v` |
| `WEB_PORT` | Porta do site no seu computador (padrão `8080`) |
| `BASE_URL` | Opcional. Endereço público usado nos links curtos; em branco, usa o endereço pelo qual o site foi aberto |

## API

| Método | Rota | O que faz |
| --- | --- | --- |
| `POST` | `/api/links` | Cria um link curto. Corpo: `{ "url": "https://..." }`. Se este visitante já encurtou a mesma URL, devolve o link existente (`existing: true`) em vez de criar outro |
| `GET` | `/api/links` | Lista os 50 links mais recentes do visitante, com total de cliques |
| `GET` | `/api/links/:code/stats` | Cliques por dia dos últimos 14 dias de um link do visitante |
| `GET` | `/api/stats` | Cliques por dia dos últimos 14 dias somando todos os links do visitante |
| `GET` | `/api/health` | Verifica se a API e o banco estão respondendo |
| `GET` | `/:code` | Redireciona (302) para a URL original e registra o clique |

Os erros da API trazem um `code` (como `invalid_url`), e o painel mostra o texto no idioma escolhido.

## Como funciona

- O código do link tem 6 caracteres gerados com `crypto.randomBytes`, sem caracteres ambíguos (`0`, `O`, `1`, `l`, `I`). Em caso de colisão, o servidor tenta outro código.
- **Visitante anônimo:** sem cadastro, cada navegador recebe um cookie com um identificador aleatório (UUID), e cada link guarda o seu dono. Cada pessoa vê só os próprios links e métricas; o link curto em si continua público para quem clicar.
- **Sem duplicação:** as URLs são normalizadas (`https://GLOBO.com` e `https://globo.com/` são a mesma) e o banco tem uma restrição única por visitante e URL. Encurtar de novo o mesmo endereço devolve o link que já existe.
- O redirecionamento usa 302 para que o navegador não guarde o destino em cache e todo clique seja contado.
- Cada clique guarda data, referrer e user agent na tabela `clicks`. As datas dos gráficos são em UTC.
- O nginx só encaminha ao backend o que não é arquivo do site, então qualquer endereço como `/aCRUvy` vira uma consulta a um link curto.
- Os ícones dos sites vêm do serviço de favicons do Google, consultado pelo navegador.

## Deploy

O projeto roda em qualquer máquina com Docker. A versão de demonstração roda numa VM gratuita (Always Free) da Oracle Cloud:

1. Crie a VM com Ubuntu, libere as portas 80 e 443 na Security List da rede e instale o Docker.
2. Copie o projeto para a VM, crie o `.env` (`POSTGRES_PASSWORD` e `WEB_PORT=80`) e rode `docker compose up -d --build`.
3. Em servidores pequenos (1 GB de memória), crie um swap de 2 GB. O `docker-compose.yml` já reduz o consumo de memória do Postgres.

## Roadmap

- [ ] Mais idiomas (espanhol, por exemplo)
- [ ] Testes automatizados da API
- [ ] Alias personalizado (`/meu-link`)
- [ ] Login com conta (hoje cada visitante é identificado por um cookie anônimo, e trocar de aparelho perde a lista)
- [ ] Limite de links por visitante
- [ ] Métricas por origem (referrer) e por dispositivo
- [ ] QR code para cada link
- [ ] Expiração e limite de cliques por link
- [ ] Rate limiting na criação de links
- [ ] Guardar os favicons no servidor, sem consultar o Google
- [ ] CI com GitHub Actions
- [ ] Domínio próprio com HTTPS

## Licença

MIT
