# MinIO Setup (HR Backend)

## 1) Start MinIO locally

```bash
docker compose -f docker-compose.minio.yml up -d
```

MinIO API: `http://localhost:9000`  
MinIO Console: `http://localhost:9001`

Default credentials:
- User: `minioadmin`
- Password: `minioadmin`

## 2) Configure backend env

Set in `.env`:

```env
STORAGE_PROVIDER=minio
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=hr-management-files
```

## 3) Restart backend

```bash
npm run start:dev
```

On first upload, backend auto-creates the bucket if it does not exist.

## Notes

- Existing old records that point to local files are still read with local fallback.
- New document uploads/releases/verification files are stored in MinIO.

