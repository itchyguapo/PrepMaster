# PrepMaster Deployment Checklist

## Pre-Deployment ✅

- [x] Environment variables documented in `.env.example`
- [x] Debug console.log statements made conditional
- [x] Production build tested successfully
- [x] Rate limiting configured appropriately
- [x] CORS settings ready for production
- [x] Security headers configured in `netlify.toml`
- [x] README.md updated with deployment instructions
- [x] Package.json updated with proper name and description

## Required Environment Variables

Set these in your deployment platform:

```bash
# Database (Required)
DATABASE_URL=postgresql://user:password@host:5432/database

# Supabase Auth (Required)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Application (Required)
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://your-domain.com
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com

# Payments (Required for subscriptions)
PAYSTACK_SECRET_KEY=sk_live_your_secret_key
PAYSTACK_WEBHOOK_SECRET=your_webhook_secret

# Admin (Optional)
ADMIN_EMAILS=admin@example.com
```

## Deployment Options

### Option 1: Render (Recommended for Full-Stack)

1. **Create Web Service**
   - Go to [render.com](https://render.com)
   - Create new Web Service
   - Connect GitHub repository

2. **Configure Build**
   - Build Command: `npm run build`
   - Start Command: `npm start`
   - Environment: Node

3. **Add Environment Variables**
   - Add all variables from `.env.example`
   - Ensure `NODE_ENV=production`

4. **Deploy**
   - Click Deploy
   - Wait for build to complete

### Option 2: Railway

1. **Create Project**
   - Go to [railway.app](https://railway.app)
   - Create new project from GitHub

2. **Configure**
   - Build: `npm run build`
   - Start: `npm start`
   - Add environment variables

### Option 3: DigitalOcean App Platform

1. **Create App**
   - Go to DigitalOcean App Platform
   - Connect GitHub repository

2. **Configure**
   - Type: Web Service
   - Build: `npm run build`
   - Run: `npm start`

## Post-Deployment Checklist

- [ ] Verify homepage loads correctly
- [ ] Test user registration/login
- [ ] Test free practice test
- [ ] Test exam generation (Take Exam)
- [ ] Test Quick Test feature
- [ ] Verify payment integration (test mode first)
- [ ] Check admin panel access
- [ ] Verify database connectivity
- [ ] Test offline functionality
- [ ] Monitor error logs

## Database Setup

If using a new database:

```bash
# Push schema to database
npm run db:push

# Or run migrations
npm run db:migrate
```

## Paystack Webhook Setup

1. Go to Paystack Dashboard → Settings → Webhooks
2. Add webhook URL: `https://your-domain.com/api/payments/webhook`
3. Copy webhook secret to `PAYSTACK_WEBHOOK_SECRET`

## Monitoring

- Set up error tracking (Sentry, LogRocket, etc.)
- Configure uptime monitoring
- Set up database backups

## Security Notes

- Never commit `.env` file
- Rotate secrets periodically
- Enable HTTPS only
- Review CORS origins for production
- Monitor for suspicious activity

## Rollback Plan

If issues occur:
1. Revert to previous deployment
2. Check error logs
3. Verify environment variables
4. Test database connection

---

**Build Output:**
- Client: `dist/public/` (static files)
- Server: `dist/index.cjs` (Node.js server)

**Commands:**
- Development: `npm run dev`
- Production Build: `npm run build`
- Production Start: `npm start`
