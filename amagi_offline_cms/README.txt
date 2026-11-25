AMAGI OFFLINE CMS - DOCKER TRANSFER BUNDLE

CMS: http://localhost:8000 (host port 3000 is not used)
Centrifugo: host port 8001

FIRST RUN ON A DOCKER DESKTOP PC
1. Install and start Docker Desktop.
2. Extract this ZIP to a folder that will remain on the PC.
3. Open PowerShell in amagi_offline_cms and run .\setup-and-export.ps1
   The first setup downloads service images, builds the app, saves all images
   into offline-images.tar, and starts the services.
4. Open http://localhost:8000 and create the first account. It becomes admin.

AFTER RESTART
Enable Docker Desktop > Settings > General > Start Docker Desktop when you
sign in. Services use restart policies and return when Docker starts.
Do not run `docker compose down -v`; that removes saved CMS data.

MOVE THE RUNNABLE BUNDLE TO ANOTHER PC
Copy this entire folder, including offline-images.tar and the private .env.
On the destination PC, install/start Docker Desktop, open PowerShell here, and
run .\start.ps1. Then use http://localhost:8000.

Use .\stop.ps1 to stop while keeping the database and media volumes.
Change APP_PORT in .env if host port 8000 is occupied.

DATA AND SECRETS
PostgreSQL and SeaweedFS data are stored in Docker named volumes on each PC.
Copying this folder does not move existing records or uploaded media; use a
database/media backup and restore for that. Keep .env private; it has secrets.
