#!/bin/bash

echo "🧹 Nettoyage..."
docker compose down -v

echo "📁 Création des dossiers..."
#mkdir -p sessions logs

echo "🔐 Configuration des permissions..."
#chmod -R 777 sessions logs

echo "🏗️ Build de l'image..."
docker compose build --no-cache

echo "🚀 Démarrage du service..."
docker compose up -d

echo "📋 Affichage des logs..."
docker compose logs -f wwebjs-bot