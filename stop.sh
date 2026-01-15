#docker compose down
docker compose -f docker-compose.dev.yml -f docker-compose.yml down
docker system prune -a
docker builder prune -a
docker volume prune -a
echo "All containers stopped and system cleaned up."
