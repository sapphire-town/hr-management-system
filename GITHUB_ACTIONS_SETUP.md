# GitHub Actions CI/CD Setup

Your workflows are configured to use the `github-actions` IAM user you already have set up.

## 7 GitHub Secrets You Need to Add

Go to your GitHub repository → Settings → Secrets and variables → Actions → **New repository secret**

Add these 7 secrets:

| Secret Name | Value | Example |
|------------|-------|---------|
| `AWS_ACCOUNT_ID` | `469049066557` | `469049066557` |
| `AWS_ACCESS_KEY_ID` | From github-actions IAM user | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | From github-actions IAM user | (sensitive, 40 chars) |
| `EC2_HOST` | Your EC2 public IP or hostname | `52.123.45.67` |
| `EC2_USER` | SSH user for EC2 | `ubuntu` |
| `EC2_SSH_KEY` | Full PEM private key | (includes `-----BEGIN RSA PRIVATE KEY-----`) |
| `NEXT_PUBLIC_API_URL` | Backend API URL for frontend | `http://52.123.45.67:3001/api` |

## Getting AWS Credentials

1. Go to AWS Console → IAM → Users → **github-actions**
2. Click **Security credentials** tab
3. Under "Access keys" section, click **Create access key**
4. Select "Other" as use case
5. Copy the **Access Key ID** and **Secret Access Key**
6. Add them as GitHub Secrets `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`

## EC2 Setup (One-Time)

SSH to your EC2 instance and ensure:

```bash
# 1. Verify .env file exists in home directory with all variables
ls -la ~/.env

# If missing, create it:
cat > ~/.env <<EOF
DATABASE_URL="postgresql://neondb_owner:...:ep-mute-firefly-a1qb4w5s-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
JWT_SECRET="your-secret-key-here"
JWT_EXPIRATION="7d"
AWS_REGION="ap-south-1"
STORAGE_PROVIDER="s3"
S3_BUCKET="cpb-hr-files"
S3_REGION="ap-south-1"
EMAIL_PROVIDER="ses"
EMAIL_FROM="your_email@gmail.com"
FRONTEND_URL="https://your-frontend-domain.com"
FILE_UPLOAD_PATH="./uploads"
NODE_ENV="production"
PORT="3001"
EOF

chmod 600 ~/.env

# 2. Verify Docker is installed
docker --version

# 3. Create docker network for both services
docker network create hr-net || true
```

## Workflow Triggers

**Backend** deploys when:
- Push to `main` branch AND changes in `backend/**` paths
- Or manual trigger: GitHub repo → Actions → deploy-backend → Run workflow

**Frontend** deploys when:
- Push to `main` branch AND changes in `frontend/**` paths
- Or manual trigger: GitHub repo → Actions → deploy-frontend → Run workflow

## How the Workflows Work

1. **Detect change** → Push to `main` in `backend/` or `frontend/`
2. **Build** → `docker buildx build --push` to ECR (auto-authenticated with your github-actions IAM user)
3. **Deploy** → SSH to EC2 and `docker run` the new image
4. **Use .env** → Container loads variables from `~/.env` on EC2

## Verification Checklist

Before pushing code to trigger workflows:

- [ ] All 7 secrets added to GitHub repo
- [ ] `~/.env` exists on EC2 with all required variables
- [ ] Can SSH from local: `ssh -i /path/to/key.pem ubuntu@YOUR_EC2_IP "echo OK"`
- [ ] Docker running on EC2: `docker ps` shows existing containers
- [ ] Correct EC2_SSH_KEY secret (should include header like `-----BEGIN RSA PRIVATE KEY-----`)

## Test Deployment

Push a small change to test:

```bash
# Make a trivial change
echo "# test" >> README.md
git add README.md
git commit -m "test: trigger workflow"
git push origin main
```

Then watch the deployment:
1. GitHub repo → **Actions** tab
2. Click the latest workflow run
3. View logs in real-time as it builds and deploys

After ~5-10 minutes, check your EC2:
```bash
ssh -i /path/to/key.pem ubuntu@YOUR_EC2_IP
docker ps
docker logs -f hr-backend  # or hr-frontend
```

## Troubleshooting

### "AuthFailure" or AWS credentials error
- [ ] Verify `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are from the `github-actions` IAM user (not copy-pasted wrong)
- [ ] In AWS Console, confirm the access key hasn't been deactivated
- [ ] Try creating a **new** access key (delete the old one if it's very old)

### "Permission denied (publickey)" during SSH deploy
- [ ] Copy full PEM key including `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----` lines
- [ ] Verify `EC2_USER` matches your EC2 instance SSH user (usually `ubuntu`)
- [ ] Check EC2 security group allows inbound SSH (port 22), at least from GitHub Actions

### Container fails to start: "Image not found" or "docker: Error"
- [ ] Verify image was pushed to ECR (AWS Console → ECR → check image exists)
- [ ] Check ~/.env file permissions: `ls -la ~/.env` (should be `-rw-------`)
- [ ] SSH to EC2 and manually check: `docker pull 469049066557.dkr.ecr.ap-south-1.amazonaws.com/cpb/hr-management-backend:latest`

### Frontend shows "Cannot reach API"
- [ ] Verify `NEXT_PUBLIC_API_URL` secret matches where backend is deployed
- [ ] Remember: This URL is **embedded at build time**, so any change requires pushing a new commit
- [ ] Check backend container is running: `docker ps | grep hr-backend`

### "No space left on device" on EC2
- [ ] Stop containers: `docker stop hr-backend hr-frontend`
- [ ] Clean old images: `docker image prune -a --force`
- [ ] Check disk: `df -h`

## Manual Commands (if needed)

Deploy without relying on workflows:

```bash
# Build backend
cd backend
docker buildx build --platform linux/amd64 -t 469049066557.dkr.ecr.ap-south-1.amazonaws.com/cpb/hr-management-backend:manual-test --push .

# Build frontend
cd ../frontend
docker buildx build --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_API_URL="http://YOUR_EC2_IP:3001/api" \
  -t 469049066557.dkr.ecr.ap-south-1.amazonaws.com/cpb/hr-management-frontend:manual-test \
  --push .

# Then SSH to EC2 and redeploy (see DEPLOY_ECR_EC2_FULLSTACK.md for exact commands)
```

## Further Reading

- Backend deployment: See `backend/Dockerfile` and `DEPLOY_ECR_EC2_FULLSTACK.md`
- Frontend deployment: See `frontend/Dockerfile` and `frontend/DEPLOY_ECR_EC2.md`
