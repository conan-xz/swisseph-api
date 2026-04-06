## swisseph-api

Swisseph API is an free and opensorce backend for getting Swisseph calculations online.

## Installation

Clone project then run:

> npm install

to install all dependencies.

## Usage

To run the API server:

> npm start

Access to server by URL: http://localhost:3000.

## API Endpoints

### Health Check
- **GET** `/api/health` - Health check endpoint
- **GET** `/api/polling` - Polling service status

### WeChat API
- **POST** `/api/wechat/code2session` - Exchange WeChat code for session (openid, session_key)
  - Body: `{ "code": "wx_login_code" }`

### Auth API
- **POST** `/api/auth/login` - Exchange WeChat code for session and issue backend token
  - Body: `{ "code": "wx_login_code" }`
- **GET** `/api/auth/me` - Get current user profile
  - Header: `Authorization: Bearer <token>`

### Synastry API
- **POST** `/api/synastry/invites` - Create a synastry invite
  - Header: `Authorization: Bearer <token>`
- **GET** `/api/synastry/invites/:code` - Fetch invite preview and status
- **POST** `/api/synastry/invites/:code/accept` - Accept invite and generate shared synastry report
  - Header: `Authorization: Bearer <token>`
- **GET** `/api/synastry/reports/:id` - Fetch a shared synastry report
  - Header: `Authorization: Bearer <token>`
- **GET** `/api/synastry/my/invites` - List my created invites
  - Header: `Authorization: Bearer <token>`
- **GET** `/api/synastry/my/reports` - List my shared reports
  - Header: `Authorization: Bearer <token>`

### DashScope API (Qwen)
- **POST** `/api/analyze` - Call DashScope API for text analysis
  - Body: `{ "prompt": "your prompt text" }`
  - Query params (optional):
    - `model` - Model name (default: qwen-max)
    - `resultFormat` - Result format (default: message)

  **Example:**
  ```bash
  # Basic usage
  curl -X POST http://localhost:3000/api/analyze \
    -H "Content-Type: application/json" \
    -d '{ "prompt": "你好，Qwen3-Max！" }'

  # With custom model
  curl -X POST http://localhost:3000/api/analyze?model=qwen-plus \
    -H "Content-Type: application/json" \
    -d '{ "prompt": "写一首诗" }'
  ```

## WebSocket API

The server also provides WebSocket API at `/ws` path.

### Supported message types:
- `swisseph` - Swiss Ephemeris calculations
- `amap` - AMap (Gaode Maps) geocoding
- `wechat` - WeChat API calls
- `dashscope` - DashScope (Qwen) AI text generation

**DashScope WebSocket Example:**
```javascript
const ws = new WebSocket('ws://localhost:3000/ws');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'dashscope',
    data: [
      {
        func: 'generateText',
        args: ['你好，Qwen3-Max！']
      }
    ]
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'dashscope result') {
    console.log(data.result);
  }
};
```

## Environment Variables

Required environment variables:
- `DASHSCOPE_API_KEY` - DashScope API key (required for `/api/analyze`)
- `DASHSCOPE_MODEL` - DashScope model name (default: qwen-max, optional)
- `WECHAT_APP_ID` - WeChat App ID (optional)
- `WECHAT_APP_SECRET` - WeChat App Secret (optional)
- `AMAP_KEY` - AMap API key (optional)
- `SWISSEPH_EPHEMERIS_PATH` - Swiss Ephemeris data path (optional)
- `AUTH_TOKEN_SECRET` - Backend auth token signing secret (required for auth-protected APIs)
- `AUTH_TOKEN_TTL_SEC` - Backend auth token TTL in seconds (default: 604800)
- `DATABASE_URL` - PostgreSQL connection string for invite/report persistence
- `PGHOST` / `PGPORT` / `PGDATABASE` / `PGUSER` / `PGPASSWORD` - PostgreSQL discrete config if `DATABASE_URL` is not used
- `PGSSL` - Whether to enable PostgreSQL SSL (`true` or `false`)
- `PORT` - Server port (default: 3000)

### TLS/HTTPS Configuration

To enable HTTPS support, set the following environment variables:

- `SSL_ENABLED=true` - Enable HTTPS server (default: false, uses HTTP)
- `SSL_CERT_PATH` - Path to SSL certificate file (default: `./certs/astrology.work_bundle.crt`)
- `SSL_KEY_PATH` - Path to SSL private key file (default: `./certs/astrology.work.key`)

**Certificate Setup:**

1. Create a `certs/` directory in the project root:
   ```bash
   mkdir certs
   ```

2. Place your certificate files in the `certs/` directory:
   - `astrology.work_bundle.crt` - Server certificate (including full chain)
   - `astrology.work.key` - Private key

3. Start the server with HTTPS:
   ```bash
   SSL_ENABLED=true npm start
   # Access via https://localhost:3000
   ```

**Note:**
- The `.key` file is sensitive and should NOT be committed to Git (already in `.gitignore`)
- `.bundle.crt` should contain the full certificate chain (server cert + intermediate certs)
- WebSocket connections must use `wss://` when HTTPS is enabled

## Docker Usage

```bash
docker build -t swisseph-api:latest .

docker run -d --name swisseph-api \
  -p 3000:3000 \
  -e DASHSCOPE_API_KEY=your-api-key \
  -e DASHSCOPE_MODEL=qwen-max \
  -e WECHAT_APP_ID=xxx \
  -e WECHAT_APP_SECRET=xxx \
  -e AUTH_TOKEN_SECRET=replace-with-random-secret \
  -e DATABASE_URL=postgres://postgres:postgres@postgres:5432/swisseph_api \
  swisseph-api:latest
```

## Docker Compose with PostgreSQL

1. Copy `.env.example` to `.env` and fill in the secrets.
2. Start the full stack:

```bash
docker compose up -d --build
```

This starts:
- `swisseph-api` application container
- `postgres` database container

The application bootstraps the required tables automatically on startup.

## Status

Project is under development.


## docker build
docker build -t swisseph-api:latest .

## docker run
docker run -d --name swisseph-api \
  -p 3000:3000 \
  -v $(pwd)/certs:/app/certs \
  -e SSL_ENABLED=true \
  -e WECHAT_APP_ID=xxx \
  -e WECHAT_APP_SECRET=xxx \
  -e DASHSCOPE_API_KEY=sk-xxx \
  -e DASHSCOPE_MODEL=qwen-max \
  swisseph-api:latest
