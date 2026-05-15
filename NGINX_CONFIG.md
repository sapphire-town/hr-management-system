# Nginx Configuration for HR Management System

Add this to your nginx configuration (typically `/etc/nginx/sites-available/` or `/etc/nginx/conf.d/`):

```nginx
# Backend API - hr-api.careerplanb.in
server {
    server_name hr-api.careerplanb.in;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/hr-api.careerplanb.in/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/hr-api.careerplanb.in/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}

server {
    if ($host = hr-api.careerplanb.in) {
        return 301 https://$host$request_uri;
    }
    listen 80;
    server_name hr-api.careerplanb.in;
    return 404;
}

# Frontend - hr.careerplanb.in
server {
    server_name hr.careerplanb.in;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Connection "upgrade";
        proxy_set_header Upgrade $http_upgrade;
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/hr.careerplanb.in/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/hr.careerplanb.in/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}

server {
    if ($host = hr.careerplanb.in) {
        return 301 https://$host$request_uri;
    }
    listen 80;
    server_name hr.careerplanb.in;
    return 404;
}
```

## Setup Steps

1. **Create SSL certificates** (if not already done):
```bash
# For backend API
sudo certbot certonly --nginx -d hr-api.careerplanb.in

# For frontend
sudo certbot certonly --nginx -d hr.careerplanb.in
```

2. **Add the config above** to your nginx sites

3. **Test and reload**:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Important Configuration Details

- **Frontend**: `http://localhost:3000` (Next.js app)
- **Backend API**: `http://localhost:3001/api` (NestJS backend)
- **Frontend will call**: `https://hr-api.careerplanb.in` (via NEXT_PUBLIC_API_URL)
- **Connection upgrade** headers added for Next.js WebSocket support

## Next Steps

Update your GitHub secret `NEXT_PUBLIC_API_URL` to:
```
https://hr-api.careerplanb.in
```

This way, the frontend build will embed the correct production API URL, and all API calls from the browser will go through nginx → localhost:3001.
