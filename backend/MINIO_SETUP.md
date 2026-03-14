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
S3_AUTO_CREATE_BUCKET=true
```

## 3) Restart backend

```bash
npm run start:dev
```

On first upload, backend auto-creates the bucket if it does not exist.

## 4) Verify health endpoints

- `GET /api/health`
- `GET /api/health/storage`

Expected storage response should show:
- `"ok": true`
- `"provider": "minio/s3"` (when `STORAGE_PROVIDER=minio`)
- your configured bucket name

## AWS S3 note

For AWS S3, prefer:

```env
STORAGE_PROVIDER=s3
S3_REGION=us-east-1
S3_BUCKET=your-existing-bucket
S3_AUTO_CREATE_BUCKET=false
```

Create the bucket in AWS manually first. Do not rely on app startup to create it.
The app will not call `HeadBucket` or `CreateBucket` at runtime in this mode.

## Migrated File Flows

- Documents:
  - verification upload/view
  - released document download
  - generated template PDFs
- Reimbursements:
  - receipt upload/download
- Daily Reports:
  - attachment upload/download
- Settings:
  - company logo upload/serve

## Notes

- Existing old records that point to local files are still read with local fallback.
