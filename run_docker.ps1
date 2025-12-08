# Stop and remove existing container if it exists
docker rm -f walking-tracker 2> $null

# Build the image
Write-Host "Building Docker image..."
docker build -t walking-tracker .

# Run the container
# Note: If your DATABASE_URL uses 'localhost', you may need to change it to 'host.docker.internal'
# to access the database running on your host machine.
Write-Host "Starting container..."
docker run -p 3000:3000 --env-file .env --name walking-tracker walking-tracker
