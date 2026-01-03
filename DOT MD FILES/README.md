# PrepMaster - CBT Exam Preparation Platform

A comprehensive Computer-Based Test (CBT) preparation platform for Nigerian students preparing for WAEC, JAMB, and other standardized exams.

## Features

- 🎯 **Practice Tests** - Generate randomized practice exams from real past questions
- 📊 **Performance Analytics** - Track progress with detailed statistics and insights
- 🏆 **Gamification** - Streaks, achievements, and leaderboards to keep students motivated
- 📱 **Offline Support** - Download exams for offline practice
- 💳 **Subscription Plans** - Basic, Standard, and Premium tiers with different features
- 🔐 **Secure Authentication** - Powered by Supabase Auth

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, TailwindCSS, shadcn/ui
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Supabase Auth
- **Payments**: Paystack

## Prerequisites

- Node.js 20+
- PostgreSQL database
- Supabase project (for authentication)
- Paystack account (for payments)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd PrepMaster-by-BIG-MACHINE-ENT
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up the database**
   ```bash
   npm run db:push
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

## Environment Variables

See `.env.example` for all required and optional environment variables.

### Required Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |

### Optional Variables

| Variable | Description |
|----------|-------------|
| `PAYSTACK_SECRET_KEY` | Paystack secret key for payments |
| `ADMIN_EMAILS` | Comma-separated list of admin emails |
| `ALLOWED_ORIGINS` | CORS allowed origins |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run db:push` | Push schema changes to database |
| `npm run db:migrate` | Run database migrations |

## Project Structure

```
├── client/               # React frontend
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── contexts/     # React contexts
│   │   ├── hooks/        # Custom hooks
│   │   ├── lib/          # Utility functions
│   │   └── pages/        # Page components
├── server/               # Express backend
│   ├── config/           # Configuration
│   ├── middleware/       # Express middleware
│   ├── routes/           # API routes
│   └── utils/            # Server utilities
├── shared/               # Shared code (schema, types)
└── migrations/           # Database migrations
```

## Deployment

### Render (Recommended for Full-Stack)

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set build command: `npm run build`
4. Set start command: `npm start`
5. Add environment variables
6. Deploy!

### Netlify (Frontend Only)

For frontend-only deployment with a separate backend:

1. Connect your GitHub repository
2. Build settings are configured in `netlify.toml`
3. Add environment variables in Netlify dashboard
4. Deploy!

### Environment Setup for Production

Ensure these are set in production:

```bash
NODE_ENV=production
DATABASE_URL=<your-production-database-url>
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
ALLOWED_ORIGINS=https://your-domain.com
FRONTEND_URL=https://your-domain.com
```

## API Rate Limits

| Endpoint | Limit |
|----------|-------|
| General API | 1000 requests / 15 min |
| Authentication | 20 requests / min |
| Practice Tests | 50 tests / 5 min |
| Exam Generation | 100 exams / hour |

## Subscription Plans

| Feature | Basic | Standard | Premium |
|---------|-------|----------|---------|
| Exam Bodies | 1 | All | All |
| Daily Exams | 1 | 3 | Unlimited |
| Explanations | Basic | Detailed | Detailed |
| Analytics | Basic | Advanced | Advanced |
| Offline Mode | ❌ | ✅ | ✅ |

## License

MIT License - See LICENSE file for details.

## Support

For support, email support@prepmaster.com or open an issue on GitHub.
