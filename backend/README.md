# Hilfsmittelberater Backend

Backend service for automated blog article creation and deployment. Runs on port 3001 by default.

## Features

- 🚀 Fastify web server
- 🔄 Webhook integration with Pipedream
- 📝 Automated blog article generation
- 🗄️ Airtable integration for content review
- 🐙 GitHub API for automated deployments
- 🔒 Environment-based configuration

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Configure your `.env` file with actual values:
- GitHub personal access token
- Airtable API credentials
- Supabase credentials
- OpenAI API key
- Webhook secret

## Development

Run in development mode with auto-reload:
```bash
npm run dev
```

## Production

Start the production server:
```bash
npm start
```

## API Endpoints

- `GET /` - API information
- `GET /health` - Health check endpoint
- `POST /webhook` - Pipedream webhook receiver (coming soon)
- `POST /generate` - Article generation endpoint (coming soon)

## Deployment

This backend is designed to be deployed on Railway. Environment variables will be automatically injected by Railway.

## Directory Structure

```
backend/
├── src/
│   ├── index.js        # Main server file
│   ├── routes/         # API route handlers
│   ├── services/       # External service integrations
│   └── utils/          # Utility functions
├── .env.example        # Environment variable template
├── .gitignore
├── package.json
└── README.md
```
