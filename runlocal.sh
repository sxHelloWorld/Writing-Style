#!/bin/bash
set -e

imageName=ws
containerName=ws-container

docker build -t $imageName -f Dockerfile  .

echo Delete old container...
docker rm -f $containerName || true

echo Run new container...
docker run -d -p 80:80 --name $containerName $imageName
