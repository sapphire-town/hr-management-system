# Frontend Deployment to ECR and EC2

This guide builds the Next.js frontend Docker image, pushes it to ECR, and runs it on an EC2 instance.

## 1) Set variables

Run locally (where you build/push image):

```bash
export AWS_REGION="ap-south-1"
export AWS_ACCOUNT_ID="469049066557"
export ECR_REPO_NAME="cpb/hr-management-frontend"
export IMAGE_TAG="$(git rev-parse --short HEAD)"

# Public API base URL used by frontend browser code (embedded at build time)
export NEXT_PUBLIC_API_URL="http://<EC2_PUBLIC_IP>:3001/api"
```

## 2) Create ECR repo (one-time)

```bash
aws ecr describe-repositories \
  --region "$AWS_REGION" \
  --repository-names "$ECR_REPO_NAME" >/dev/null 2>&1 || \
aws ecr create-repository \
  --region "$AWS_REGION" \
  --repository-name "$ECR_REPO_NAME"
```

## 3) Build and push image

From `frontend/`:

```bash
aws ecr get-login-password --region "$AWS_REGION" | \
  docker login --username AWS --password-stdin \
  "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

docker buildx create --name hrbuilder --use >/dev/null 2>&1 || docker buildx use hrbuilder

docker buildx build \
  --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL" \
  -t "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO_NAME:$IMAGE_TAG" \
  --push \
  .
```

## 4) Deploy on EC2

SSH into EC2 and run:

```bash
AWS_REGION="ap-south-1"
AWS_ACCOUNT_ID="469049066557"
ECR_REPO_NAME="cpb/hr-management-frontend"
IMAGE_TAG="<same-tag-you-pushed>"
IMAGE_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO_NAME:$IMAGE_TAG"

aws ecr get-login-password --region "$AWS_REGION" | \
  docker login --username AWS --password-stdin \
  "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

docker pull "$IMAGE_URI"

docker rm -f hr-frontend || true

docker run -d \
  --name hr-frontend \
  --restart unless-stopped \
  -p 3000:3000 \
  "$IMAGE_URI"
```

## 5) Open security group

Allow inbound TCP on port `3000` from your allowed CIDRs or from your reverse proxy/load balancer.

## 6) Verify

```bash
docker ps | grep hr-frontend
curl -I http://localhost:3000
```

## Notes

- If backend URL changes, rebuild frontend image with a new `NEXT_PUBLIC_API_URL` build arg.
- For production domains, place Nginx/ALB in front of port 3000 and terminate TLS there.
