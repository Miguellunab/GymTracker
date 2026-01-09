Write-Host "Iniciando configuración de GymTracker..." -ForegroundColor Cyan

# Instalar dependencias
Write-Host "Instalando dependencias (npm install)..." -ForegroundColor Yellow
npm install

# Generar cliente Prisma
Write-Host "Generando cliente Prisma..." -ForegroundColor Yellow
npx prisma generate

# Iniciar servidor de desarrollo
Write-Host "Iniciando servidor (npm run dev)..." -ForegroundColor Green
npm run dev
