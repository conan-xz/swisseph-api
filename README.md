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
  swisseph-api:latest
```

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
