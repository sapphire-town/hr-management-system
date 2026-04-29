# Full-Stack Deploy to ECR and EC2 (Backend + Frontend)

This guide deploys both services as Docker containers on one EC2 host.

## Prerequisites

- AWS CLI configured with permissions for ECR (`ecr:*`) and EC2 host login.
- Docker installed on your local machine and EC2 instance.
- Backend env file prepared (do not hardcode secrets in commands).

## 1) Set deployment variables (local machine)

```bash
export AWS_REGION="ap-south-1"
export AWS_ACCOUNT_ID="469049066557"

export BACKEND_REPO="cpb/hr-management-backend"
export FRONTEND_REPO="cpb/hr-management-frontend"

export IMAGE_TAG="$(git rev-parse --short HEAD)"

# Browser-visible API URL for frontend build
export NEXT_PUBLIC_API_URL="http://<EC2_PUBLIC_IP>:3001/api"
```

## 2) Create ECR repositories (one-time)

```bash
for REPO in "$BACKEND_REPO" "$FRONTEND_REPO"; do
  aws ecr describe-repositories \
    --region "$AWS_REGION" \
    --repository-names "$REPO" >/dev/null 2>&1 || \
  aws ecr create-repository \
    --region "$AWS_REGION" \
    --repository-name "$REPO"
done
```

## 3) Login Docker to ECR

```bash
aws ecr get-login-password --region "$AWS_REGION" | \
  docker login --username AWS --password-stdin \
  "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

docker buildx create --name hrbuilder --use >/dev/null 2>&1 || docker buildx use hrbuilder
```

## 4) Build and push backend image

From `backend/`:

```bash
docker buildx build \
  --platform linux/amd64 \
  -t "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$BACKEND_REPO:$IMAGE_TAG" \
  --push \
  .
```

## 5) Build and push frontend image

From `frontend/`:

```bash
docker buildx build \
  --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL" \
  -t "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$FRONTEND_REPO:$IMAGE_TAG" \
  --push \
  .
```

## 6) Deploy on EC2

SSH to EC2 and run:

```bash
AWS_REGION="ap-south-1"
AWS_ACCOUNT_ID="469049066557"
BACKEND_REPO="cpb/hr-management-backend"
FRONTEND_REPO="cpb/hr-management-frontend"
IMAGE_TAG="<same-tag-you-pushed>"

BACKEND_IMAGE="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$BACKEND_REPO:$IMAGE_TAG"
FRONTEND_IMAGE="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$FRONTEND_REPO:$IMAGE_TAG"

aws ecr get-login-password --region "$AWS_REGION" | \
  docker login --username AWS --password-stdin \
  "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

docker pull "$BACKEND_IMAGE"
docker pull "$FRONTEND_IMAGE"

docker network create hr-net || true

# Backend secrets file on EC2, example location:
# /opt/hr/.env.backend
# Include keys like DATABASE_URL, JWT_SECRET, AWS credentials/provider config, etc.

docker rm -f hr-backend hr-frontend || true

docker run -d \
  --name hr-backend \
  --restart unless-stopped \
  --network hr-net \
  --env-file /opt/hr/.env.backend \
  -p 3001:3001 \
  "$BACKEND_IMAGE"

docker run -d \
  --name hr-frontend \
  --restart unless-stopped \
  --network hr-net \
  -p 3000:3000 \
  "$FRONTEND_IMAGE"
```

## 7) Validate

```bash
docker ps
curl -f http://localhost:3001/api/health
curl -I http://localhost:3000
```

## 8) EC2 Security Group

- Allow inbound TCP `3000` (frontend).
- Allow inbound TCP `3001` only if backend must be public. Prefer private backend behind reverse proxy.

## Recommended production hardening

- Put Nginx or ALB in front of port 3000 with HTTPS.
- Keep backend private when possible.
- Store secrets in AWS SSM Parameter Store or Secrets Manager, not in source files.
- Use CloudWatch logs or a centralized logging driver for both containers.
