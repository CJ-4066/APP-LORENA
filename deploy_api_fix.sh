export SSHPASS="Pr0j3ct00r1g1n@l"
export RSYNC_RSH="sshpass -e ssh -o StrictHostKeyChecking=accept-new"

function run_ssh() {
  sshpass -e ssh -o StrictHostKeyChecking=accept-new "$@"
}

echo "--- Fixing API Deploy ---"
DEPLOY_USER="root"
DEPLOY_HOST="187.127.248.226"
DEPLOY_PATH="/root/app-de-lorena/apps/api"
PM2_PROCESS_NAME="lo-renaciente-api"

rsync -az --delete apps/api/dist/ "$DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH/dist/"
rsync -az --delete apps/api/migrations/ "$DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH/migrations/"

run_ssh "$DEPLOY_USER@$DEPLOY_HOST" "pm2 delete 5 || pm2 delete lo-renaciente-api || true"
run_ssh "$DEPLOY_USER@$DEPLOY_HOST" "cd '$DEPLOY_PATH' && pm2 restart '$PM2_PROCESS_NAME' --update-env || pm2 start dist/index.js --name '$PM2_PROCESS_NAME' --update-env"
