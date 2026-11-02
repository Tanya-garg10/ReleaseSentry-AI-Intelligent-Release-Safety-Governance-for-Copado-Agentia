# Deployment Guide

This guide covers multiple deployment options for ReleaseSentry AI.

---

## Option 1: Vercel Deployment (Recommended)

### Prerequisites
- A Vercel account (free at https://vercel.com)
- GitHub account connected to Vercel

### Quick Deploy with Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy from the project directory**
   ```bash
   cd "C:\Users\arpan\Downloads\releasesentry ai"
   vercel
   ```

4. **Follow the prompts:**
   - Set up and deploy? → **Yes**
   - Link to existing project? → **No**
   - Project name → **releasesentry-ai** (or your preferred name)
   - Directory → **.** (current directory)
   - Override settings? → **No**

5. **Add environment variables in Vercel dashboard:**
   - Go to https://vercel.com/dashboard
   - Select your project
   - Go to Settings → Environment Variables
   - Add:
     - `FEATHERLESS_API_KEY`: Your Featherless API key (optional)
     - `AGENTIA_FORCE_DEMO`: `true` (for demo mode)
     - `PORT`: `3000`

6. **Redeploy to apply environment variables**
   ```bash
   vercel --prod
   ```

### Deploy via Vercel Dashboard (No CLI)

1. **Go to Vercel Dashboard**
   - Visit https://vercel.com/dashboard
   - Click "Add New Project"

2. **Import from GitHub**
   - Select your repository: `Tanya-garg10/ReleaseSentry-AI-Intelligent-Release-Safety-Governance-for-Copado-Agentia`
   - Click "Import"

3. **Configure Project**
   - Framework Preset: **Other**
   - Root Directory: **./**
   - Build Command: `npm install --legacy-peer-deps && npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install --legacy-peer-deps`

4. **Add Environment Variables**
   - `FEATHERLESS_API_KEY`: Your Featherless API key (optional)
   - `AGENTIA_FORCE_DEMO`: `true`
   - `PORT`: `3000`

5. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Your app will be live at `https://your-project.vercel.app`

### Vercel-Specific Notes

- **Port Handling**: Vercel automatically assigns a port, no need to set `PORT` manually
- **Database**: SQLite database is reset on each deployment (use a persistent database for production)
- **File Storage**: The `data/` directory is not persisted across deployments
- **Environment Variables**: Changes require a redeploy to take effect
- **Free Tier**: Vercel's free tier includes:
  - 100GB bandwidth per month
  - Unlimited deployments
  - Automatic HTTPS
  - Global CDN

---

## Option 2: Docker Deployment

### Prerequisites
- Docker installed on your system
- Docker Compose (optional, for easier management)

### Quick Start with Docker Compose

1. **Create environment file**
   ```bash
   cp .env.example .env
   ```

2. **Edit .env with your configuration**
   ```ini
   FEATHERLESS_API_KEY=your_api_key_here
   AGENTIA_FORCE_DEMO=true
   PORT=3000
   ```

3. **Build and run with Docker Compose**
   ```bash
   docker-compose up -d --build
   ```

4. **Access the application**
   - Open http://localhost:3000

5. **View logs**
   ```bash
   docker-compose logs -f releasesentry
   ```

6. **Stop the application**
   ```bash
   docker-compose down
   ```

### Manual Docker Build

1. **Build the Docker image**
   ```bash
   docker build -t releasesentry-ai:latest .
   ```

2. **Run the container**
   ```bash
   docker run -d \
     -p 3000:3000 \
     -e FEATHERLESS_API_KEY=your_api_key \
     -e AGENTIA_FORCE_DEMO=true \
     -v $(pwd)/data:/app/data \
     --name releasesentry-ai \
     releasesentry-ai:latest
   ```

3. **View logs**
   ```bash
   docker logs -f releasesentry-ai
   ```

4. **Stop the container**
   ```bash
   docker stop releasesentry-ai
   docker rm releasesentry-ai
   ```

---

## Option 3: Traditional Server Deployment

### Prerequisites
- Node.js v20 or v22+
- NPM v9 or v10+
- Git

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/Tanya-garg10/ReleaseSentry-AI-Intelligent-Release-Safety-Governance-for-Copado-Agentia.git
   cd ReleaseSentry-AI-Intelligent-Release-Safety-Governance-for-Copado-Agentia
   ```

2. **Install dependencies**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Create environment file**
   ```bash
   cp .env.example .env
   ```

4. **Edit .env with your configuration**
   ```ini
   FEATHERLESS_API_KEY=your_api_key_here
   AGENTIA_FORCE_DEMO=true
   PORT=3000
   NODE_ENV=production
   ```

5. **Build the application**
   ```bash
   npm run build
   ```

6. **Start the application**
   ```bash
   npm start
   ```

7. **Run with PM2 (recommended for production)**
   ```bash
   npm install -g pm2
   pm2 start dist/server.js --name releasesentry-ai
   pm2 save
   pm2 startup
   ```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FEATHERLESS_API_KEY` | No | - | API key for Featherless AI (for AI Analyst feature) |
| `AGENTIA_FORCE_DEMO` | No | `true` | Force demo mode even if Agentia CLI is installed |
| `PORT` | No | `3000` | Port for the application to listen on |
| `NODE_ENV` | No | `development` | Environment mode (development/production) |
| `DISABLE_HMR` | No | `false` | Disable hot module replacement |

---

## Health Checks

### Manual Health Check
```bash
curl http://localhost:3000/api/stats
```

Expected response:
```json
{
  "totalReleases": 8,
  "safeReleases": 5,
  "blockedReleases": 2,
  "criticalRisks": 1,
  "pendingApprovals": 3,
  "recentActivityCount": 15,
  "skillExecutionCount": 8,
  "agentiaStatus": {...}
}
```

---

## Troubleshooting

### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill the process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

### Database Issues
The SQLite database is stored in the `data/` directory. If you encounter database issues:
```bash
# Reset to demo data
curl -X POST http://localhost:3000/api/system/reset-demo
```

### Build Failures
```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install --legacy-peer-deps

# Clear build cache
rm -rf dist
npm run build
```

### AI Analyst Not Working
- Ensure `FEATHERLESS_API_KEY` is set in environment variables
- If API key is missing, the system falls back to deterministic engine
- Check logs for API errors

---

## Security Considerations

1. **Never commit .env files** - Use environment variables in production
2. **Use HTTPS** - Configure SSL/TLS certificates for production
3. **Restrict API access** - Use authentication and rate limiting
4. **Regular updates** - Keep dependencies updated
5. **Database backups** - Back up SQLite database regularly
6. **Secrets management** - Use secret managers (AWS Secrets Manager, HashiCorp Vault)

---

## Support

For deployment issues:
- Check the logs for error messages
- Verify environment variables are set correctly
- Ensure all dependencies are installed
- Review the troubleshooting section above

For more help, open an issue on GitHub.
