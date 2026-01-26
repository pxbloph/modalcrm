---
description: Deploy completo na VPS (Backend 3500, Frontend 3600, Prisma 5.21.0)
---

# Workflow de Deploy MBForms

Siga estes passos para atualizar a aplicação na VPS sem erros.

## 1. Atualizar Código
```bash
cd /var/www/modalcrm
git fetch --all
git reset --hard origin/main
```

## 2. Backend (Porta 3500)
```bash
cd backend
npm install
npx prisma generate
npx prisma db push --accept-data-loss
npm run build
pm2 delete modal-backend
PORT=3500 pm2 start dist/src/main.js --name modal-backend
```

## 3. Frontend (Porta 3600)
```bash
cd ../frontend
npm install
npm run build
pm2 delete modal-frontend
pm2 start "npm start -- -p 3600" --name modal-frontend
```

## 4. Finalizar
```bash
pm2 save
pm2 list
```
