export SSHPASS="Pr0j3ct00r1g1n@l"
export RSYNC_RSH="sshpass -e ssh -o StrictHostKeyChecking=accept-new"

function run_ssh() {
  sshpass -e ssh -o StrictHostKeyChecking=accept-new "$@"
}

echo "--- Deploying API ---"
API_DIR="apps/api"
API_DIST_DIR="$API_DIR/dist"
API_MIGRATIONS_DIR="$API_DIR/migrations"
DEPLOY_USER="root"
DEPLOY_HOST="187.127.248.226"
DEPLOY_PATH="/var/www/lo-renaciente/api"
PM2_PROCESS_NAME="lo-renaciente-api"

npm run build --workspace @lo-renaciente/api
run_ssh "$DEPLOY_USER@$DEPLOY_HOST" "mkdir -p '$DEPLOY_PATH' '$DEPLOY_PATH/uploads' '$DEPLOY_PATH/migrations' '$DEPLOY_PATH/dist'"
rsync -az --delete "$API_DIST_DIR"/ "$DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH/dist/"
rsync -az --delete "$API_MIGRATIONS_DIR"/ "$DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH/migrations/"

run_ssh "$DEPLOY_USER@$DEPLOY_HOST" "cd '$DEPLOY_PATH' && pm2 restart '$PM2_PROCESS_NAME' --update-env || pm2 start dist/index.js --name '$PM2_PROCESS_NAME' --update-env"

echo "--- Deploying Web/Admin ---"
LANDING_DIR="webprincipal"
DIST_DIR="$LANDING_DIR/dist"
ADMIN_DIR="apps/admin"
ADMIN_DIST_DIR="$ADMIN_DIR/dist"
ADMIN_DEPLOY_PATH="/var/www/lo-renaciente/admin"
WEB_DEPLOY_PATH="/var/www/lo-renaciente/webprincipal"

npm run build --prefix "$LANDING_DIR"
npm run build --workspace @lo-renaciente/admin

run_ssh "$DEPLOY_USER@$DEPLOY_HOST" "mkdir -p '$WEB_DEPLOY_PATH' '$ADMIN_DEPLOY_PATH'"
rsync -az --delete "$DIST_DIR"/ "$DEPLOY_USER@$DEPLOY_HOST:$WEB_DEPLOY_PATH/"
rsync -az --delete "$ADMIN_DIST_DIR"/ "$DEPLOY_USER@$DEPLOY_HOST:$ADMIN_DEPLOY_PATH/"

echo "--- Deployment Complete ---"
