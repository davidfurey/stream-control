#!/bin/bash

sudo docker stop stream-control-test-container
sudo docker rm stream-control-test-container
cp ../dist/stream-control*.deb stream-control.deb
sudo docker build -t stream-control-test .
sudo docker run -d --name stream-control-test-container --tmpfs /tmp --tmpfs /run --tmpfs /run/lock -v /sys/fs/cgroup:/sys/fs/cgroup:ro stream-control-test
sudo docker exec -it stream-control-test-container /bin/bash
