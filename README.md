# PrepMaster - CBT Exam Preparation Platform

A comprehensive Computer-Based Test (CBT) exam preparation platform designed for Nigerian students preparing for JAMB, WAEC, NECO, and other standardized examinations.

## Features

- 📚 **Exam Practice** - Practice with real exam-style questions
- 📊 **Performance Tracking** - Monitor your progress and identify weak areas
- 🎯 **Subject-Based Learning** - Study by subject or exam body
- 💳 **Subscription Management** - Flexible payment plans via Paystack
- 👩‍🏫 **Tutor Portal** - For educators to create and manage content
- 🔐 **Secure Authentication** - Powered by Supabase Auth

## Tech Stack

- **Frontend**: React, TypeScript, Vite, TailwindCSS, Radix UI
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth
- **Payments**: Paystack
- **Deployment**: Render

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database (Supabase recommended)
- Paystack account for payments

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/itchyguapo/PrepMaster.git
   cd PrepMaster
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Configure environment variables in `.env` (see below)

5. Run database migrations:
   ```bash
   npm run db:migrate
   ```

6. Start development server:
   ```bash
   npm run dev
   ```

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `VITE_SUPABASE_URL` | Supabase project URL | ✅ |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | ✅ |
| `PAYSTACK_SECRET_KEY` | Paystack secret key | ✅ |
| `PAYSTACK_WEBHOOK_SECRET` | Paystack webhook secret | ✅ |
| `FRONTEND_URL` | Your frontend URL | ✅ |
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated) | ✅ |
| `ADMIN_EMAILS` | Admin email addresses (comma-separated) | ⚪ |
| `SESSION_SECRET` | Session encryption key | ⚪ |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run db:push` | Push schema changes to database |
| `npm run db:migrate` | Run database migrations |
| `npm run check` | Type check the codebase |

## Deployment to Render

### Using Render Dashboard

1. Create a new **Web Service** on Render
2. Connect your GitHub repository
3. Configure:
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: Node
4. Add all required environment variables
5. Deploy

### Using render.yaml (Blueprint)

1. Push the `render.yaml` file to your repo
2. In Render, go to **Blueprints** → **New Blueprint Instance**
3. Connect your repository
4. Configure environment variables marked as `sync: false`
5. Deploy

## Health Check

The application exposes a health check endpoint:

```
GET /api/health
```

Returns:
```json
{
  "status": "ok",
  "timestamp": "2025-01-04T06:00:00.000Z",
  "uptime": 12345.67,
  "environment": "production",
  "checks": {
    "database": "ok"
  }
}
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

For support, contact the development team or open an issue on GitHub.
