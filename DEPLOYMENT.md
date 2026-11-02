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

## Option 2: Railway Deployment

### Prerequisites
- Railway account (free at https://railway.app)
- GitHub account connected to Railway

### Quick Deploy with Railway CLI

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login**
   ```bash
   railway login
   ```

3. **Initialize project**
   ```bash
   cd "C:\Users\arpan\Downloads\releasesentry ai"
   railway init
   ```

4. **Deploy**
   ```bash
   railway up
   ```

5. **Add environment variables in Railway dashboard**
   - Go to your Railway project
   - Click "Variables"
   - Add:
     - `FEATHERLESS_API_KEY`: Your Featherless API key (optional)
     - `AGENTIA_FORCE_DEMO`: `true`
     - `PORT`: Railway assigns automatically

### Deploy via Railway Dashboard

1. **Go to Railway Dashboard**
   - Visit https://railway.app
   - Click "New Project"

2. **Deploy from GitHub**
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Click "Deploy Now"

3. **Configure**
   - Build Command: `npm install --legacy-peer-deps && npm run build`
   - Start Command: `node dist/server.js`

4. **Add Environment Variables**
   - In the Variables tab, add:
     - `FEATHERLESS_API_KEY`: Your Featherless API key (optional)
     - `AGENTIA_FORCE_DEMO`: `true`

---

## Option 3: Render Deployment

### Prerequisites
- Render account (free at https://render.com)
- GitHub account connected to Render

### Deploy via Render Dashboard

1. **Create a new Web Service**
   - Go to https://render.com
   - Click "New +"
   - Select "Web Service"

2. **Connect Repository**
   - Connect your GitHub account
   - Select the repository: `Tanya-garg10/ReleaseSentry-AI-Intelligent-Release-Safety-Governance-for-Copado-Agentia`

3. **Configure Build Settings**
   - Name: `releasesentry-ai`
   - Region: Choose nearest region
   - Branch: `master`
   - Runtime: `Node`
   - Build Command: `npm install --legacy-peer-deps && npm run build`
   - Start Command: `node dist/server.js`

4. **Add Environment Variables**
   - In the "Environment" section, add:
     - `FEATHERLESS_API_KEY`: Your Featherless API key (optional)
     - `AGENTIA_FORCE_DEMO`: `true`
     - `PORT`: Render assigns automatically

5. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment to complete
   - Your app will be live at `https://your-service.onrender.com`

### Render-Specific Notes

- **Free Tier**: Render's free tier includes:
  - 750 hours/month of compute
  - Automatic HTTPS
  - Persistent disk (1GB)
- **Sleep Mode**: Free tier services sleep after 15 minutes of inactivity
- **Database**: SQLite database persists on Render's disk

---

## Option 4: Docker Deployment

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

## Option 5: Traditional Server Deployment

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

### Using Nginx as Reverse Proxy

1. **Install Nginx**
   ```bash
   sudo apt install nginx  # Ubuntu/Debian
   # or
   sudo yum install nginx  # CentOS/RHEL
   ```

2. **Create Nginx configuration**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. **Enable configuration**
   ```bash
   sudo ln -s /etc/nginx/sites-available/releasesentry /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

---

## Option 6: Kubernetes Deployment

### Create Kubernetes Manifests

1. **Create deployment.yaml**
   ```yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: releasesentry-ai
   spec:
     replicas: 2
     selector:
       matchLabels:
         app: releasesentry-ai
     template:
       metadata:
         labels:
           app: releasesentry-ai
       spec:
         containers:
         - name: releasesentry-ai
           image: your-registry/releasesentry-ai:latest
           ports:
           - containerPort: 3000
           env:
           - name: FEATHERLESS_API_KEY
             valueFrom:
               secretKeyRef:
                 name: releasesentry-secrets
                 key: featherless-api-key
           - name: AGENTIA_FORCE_DEMO
             value: "true"
           - name: PORT
             value: "3000"
           - name: NODE_ENV
             value: "production"
   ```

2. **Create service.yaml**
   ```yaml
   apiVersion: v1
   kind: Service
   metadata:
     name: releasesentry-ai
   spec:
     selector:
       app: releasesentry-ai
     ports:
     - protocol: TCP
       port: 80
       targetPort: 3000
     type: LoadBalancer
   ```

3. **Create secret.yaml**
   ```yaml
   apiVersion: v1
   kind: Secret
   metadata:
     name: releasesentry-secrets
   type: Opaque
   stringData:
     featherless-api-key: "your-api-key-here"
   ```

4. **Deploy to Kubernetes**
   ```bash
   kubectl apply -f secret.yaml
   kubectl apply -f deployment.yaml
   kubectl apply -f service.yaml
   ```

5. **Check deployment status**
   ```bash
   kubectl get pods
   kubectl get services
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

### Docker Health Check
The Docker container includes a built-in health check that tests the `/api/stats` endpoint every 30 seconds.

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

## Monitoring

### Using PM2 Monitoring
```bash
pm2 monit
```

### View Logs
```bash
pm2 logs releasesentry-ai
```

### Docker Logs
```bash
docker logs -f releasesentry-ai
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

## Scaling

### Horizontal Scaling
- Use a load balancer (Nginx, HAProxy, AWS ALB)
- Deploy multiple instances behind the load balancer
- Use a shared database (PostgreSQL instead of SQLite for production)

### Vertical Scaling
- Increase server resources (CPU, RAM)
- Optimize database queries
- Enable caching

---

## Cost Optimization

1. **Use free tiers** - Vercel, Railway, Render offer free tiers
2. **Scale down when not in use** - Use serverless functions
3. **Optimize images** - Use smaller Docker images
4. **CDN for static assets** - Serve static files via CDN

---

## Support

For deployment issues:
- Check the logs for error messages
- Verify environment variables are set correctly
- Ensure all dependencies are installed
- Review the troubleshooting section above

For more help, open an issue on GitHub.
