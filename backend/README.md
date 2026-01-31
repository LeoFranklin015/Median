# Backend Server

Express + TypeScript backend server with nodemon for hot reloading.

## Setup

Install dependencies:
```bash
bun install
```

## Development

Run the development server with hot reloading:
```bash
bun run dev
```

The server will start on `http://localhost:3001`

## Available Endpoints

- `GET /` - Welcome message
- `GET /health` - Health check endpoint

## Scripts

- `bun run dev` - Start development server with nodemon
- `bun run build` - Build TypeScript to JavaScript
- `bun run start` - Run production build
- `bun run clean` - Remove dist folder

## Environment Variables

Copy `.env.example` to `.env` and configure:

- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)
