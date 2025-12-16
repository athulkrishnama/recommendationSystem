# MCP Client and Server

This project contains both the MCP server and client for the recommendation system.

## Architecture

- **Server** (`/server`): MCP server with tools and resources for recommendations
- **Client** (`/client`): MCP client that orchestrates recommendation workflows

## Quick Start

### 1. Install Dependencies

**Server:**

```bash
cd server
npm install express
npm install -D @types/express
```

**Client:**

```bash
cd client
npm install
```

### 2. Configure Environment

Edit `client/.env`:

```env
GEMINI_API_KEY=your_actual_api_key_here
MCP_SERVER_URL=http://localhost:3000/mcp
TEST_PROFILE_ID=your_test_profile_id
```

### 3. Run the System

**Terminal 1 - Start Server (HTTP mode):**

```bash
cd server
set TRANSPORT=http
npm run dev
```

**Terminal 2 - Run Client:**

```bash
cd client
npm run dev
```

## How It Works

1. **Client** calls MCP server via HTTP (JSON-RPC 2.0)
2. **Server** executes tools:
   - `search_profiles` - Find customer
   - `match_items` - Score and match products
   - `draft_recommendation` - Create personalized text
   - `generate_message` - Format for channel
3. **Client** displays final formatted message

## MCP Tools

- `search_profiles` - Search by email, ID, or name
- `filter_profiles` - Filter by any field
- `search_item` - Find item by ID
- `filter_items` - Filter items by fields
- `match_items` - Match items to profile with scoring
- `draft_recommendation` - Generate recommendation narrative
- `generate_message` - Format for email/whatsapp/call

## Configuration

All business logic is configuration-driven:

- `server/src/config/matching.yaml` - Matching rules and scoring
- `server/src/config/templates.yaml` - Message templates
- `server/src/config/profile.yaml` - Profile schema
- `server/src/config/item.yaml` - Item schema
