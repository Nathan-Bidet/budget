# Image Caddy custom : le Caddyfile est copié dans l'image au lieu d'être
# monté depuis l'hôte (les bind-mounts de fichier posent problème avec
# le déploiement Git de Portainer). Contexte de build = racine du repo.
FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
