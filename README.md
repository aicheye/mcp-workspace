# Horizon

An MCP server that connects AI assistants to your university's D2L Brightspace and Piazza. Sign up once, then use Claude, Poke, or any MCP client to check grades, assignments, deadlines, course content, and Piazza posts — all from your AI assistant.

## What it does

Horizon exposes your D2L and Piazza data as MCP tools:

- **get_my_courses** — list all enrolled courses
- **get_my_grades** — check grades for any course
- **get_assignments** / **get_assignment_submissions** — assignments, due dates, submission status
- **get_upcoming_due_dates** — deadlines within a time window
- **get_course_content** — syllabus, modules, lecture materials
- **get_announcements** — instructor posts and updates
- **download_file** / **read_file** — download and read course PDFs
- **piazza_search** / **piazza_get_posts** — search and browse Piazza
- **notes_search** / **semantic_search_notes** — semantic search over uploaded course notes
- **tasks_list** / **plan_week** — task tracking and weekly study plans
- **sync_all** — sync all assignments as tasks from every enrolled course

## Architecture

```
MCP Client (Claude, Poke, etc.)
    |
    | HTTPS + Streamable HTTP
    v
Go Gateway (auth, rate limiting, metrics)
    |
    | HTTP proxy
    v
Node.js MCP Server (tools, D2L API, Piazza API)
    |
    +---> Supabase (users, tasks, notes, embeddings)
    +---> D2L Brightspace API (session cookies)
    +---> Piazza API (SSO cookies)
    +---> S3 (browser state persistence)
    +---> OpenAI (embeddings for semantic search)
```

## Structure

```
d2l-mcp/
  gateway/         Go reverse proxy — JWT/API key auth, rate limiting, Prometheus
  src/             Node.js MCP server
    api/           REST routes (onboarding, file upload, push notifications)
    browser/       Playwright browser sessions for D2L login via VNC
    jobs/          Background session refresh scheduler
    study/         Study tools (notes, tasks, Piazza sync, semantic search)
    public/        Onboarding page
  scripts/         Deployment scripts
study-mcp-app/     React Native companion app (Expo)
supabase/          Database migrations
```

## Self-hosting

Two deployment options: **local** (single-user, Docker Compose, no cloud accounts) or **cloud** (multi-user, AWS ECS + Supabase).

---

### Local self-hosting

The `local/` directory contains everything needed to run a self-contained single-user instance.

#### Prerequisites

- Docker and Docker Compose
- A D2L Brightspace account
- OpenAI API key (optional — only needed for semantic search)

#### 1. Configure

```bash
cd local
cp .env.example .env
```

Edit `.env` and fill in:

```dotenv
D2L_HOST=learn.yourschool.edu
D2L_USERNAME=your_username
D2L_PASSWORD=your_password

# Generate a random bearer token — this is what your MCP client will use
MCP_TOKEN=$(openssl rand -hex 32)

# Internal database password
DB_PASSWORD=$(openssl rand -hex 16)

# Optional: for semantic search over notes
OPENAI_API_KEY=sk-...
```

#### 2. Start

```bash
docker compose up
```

The first start builds the image from source and initialises the database. On startup the logs will print your endpoint and token:

```
=========================================
 Horizon MCP — Local Mode
 Endpoint : http://localhost:4100/mcp
 Token    : <your MCP_TOKEN>
=========================================
```

#### 3. Connect your MCP client

Use the endpoint and token from the startup logs:

| Setting | Value |
|---------|-------|
| URL | `http://localhost:4100/mcp` |
| Auth | `Authorization: Bearer <MCP_TOKEN>` |

Example for Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "horizon": {
      "url": "http://localhost:4100/mcp",
      "headers": {
        "Authorization": "Bearer <your-MCP_TOKEN>"
      }
    }
  }
}
```

#### 4. Upload notes

Drop PDF or DOCX files into `local/notes/` and they will be chunked and embedded automatically within 5 seconds. Use subdirectories as course IDs:

```
local/notes/CS451/lecture1.pdf     → course "CS451"
local/notes/MATH119/cheatsheet.pdf → course "MATH119"
local/notes/syllabus.pdf           → course "default"
``` 

Processed files are moved to `processed/` inside their directory. Use `notes_search` or `semantic_search_notes` in your MCP client to query them.

#### 5. Expose via a subdomain (optional)

If you want to access the server from outside localhost (e.g., `mcp.yourdomain.com`), run the container on a server and add a reverse proxy entry. The MCP server runs on port 4100, so it won't conflict with any existing website on ports 80/443.

**Using Caddy:**

**Step 1** — install Caddy and add this to `/etc/caddy/Caddyfile`:

```
mcp.yourdomain.com {
    reverse_proxy 127.0.0.1:4100 {
        flush_interval -1
        transport http {
            read_timeout 3600s
        }
    }
}
```

`flush_interval -1` disables buffering, which is required for MCP streaming. Caddy automatically provisions and renews a Let's Encrypt certificate.

**Step 2** — reload Caddy:

```bash
sudo systemctl reload caddy
```

**Step 3** — set `API_HOST=mcp.yourdomain.com` in your `.env` (affects Duo re-auth URLs in tool responses) and update your MCP client URL to `https://mcp.yourdomain.com/mcp`.

---

### Cloud self-hosting (AWS + Supabase)

#### Prerequisites

- Node.js 20+, Go 1.22+, Docker
- Supabase project (free tier works)
- AWS account (ECS Fargate, S3, Secrets Manager)
- OpenAI API key (for semantic search embeddings)
- A D2L Brightspace instance you have access to

#### 1. Clone and configure

```bash
git clone https://github.com/hamzaammar/horizon.git
cd horizon/d2l-mcp
cp .env.template .env
# Fill in your credentials
```

#### 2. Run the database migrations

Run each SQL file in `src/study/db/migrations/` in your Supabase SQL editor, in order.

#### 3. Local development

```bash
npm install
npm run build
npm start
# Server runs at http://localhost:3000/mcp
```

#### 4. Deploy to AWS

```bash
# Copy task-definition.example.json to task-definition.json
# Replace all <PLACEHOLDER> values with your AWS account details
bash scripts/deploy-to-ecs.sh
```

See `task-definition.example.json` for the full ECS Fargate configuration.

#### 5. Connect your MCP client

Point any MCP client at your server:

| Setting | Value |
|---------|-------|
| URL | `https://your-domain.com/mcp` |
| Auth | `Authorization: Bearer <your-api-key>` |

Generate an API key from the onboard page or via `POST /api/api-keys`.

## Authentication

Horizon supports three auth methods:

- **API keys** (`hzn_...`) — never expire, best for MCP clients like Poke
- **Supabase JWTs** — standard access tokens, expire in 1 hour
- **Refresh tokens** — auto-exchanged for fresh JWTs by the gateway

D2L sessions are refreshed automatically in the background using saved browser state from S3. If the ADFS session expires (typically after 30-90 days), the user gets a push notification to re-authenticate via the onboard page.

## License

MIT
