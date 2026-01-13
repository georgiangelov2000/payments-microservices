docker compose down
docker system prune -a
docker builder prune -a
docker volume prune -a
echo "All containers stopped and system cleaned up."
