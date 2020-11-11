FROM jrei/systemd-ubuntu:20.04
RUN apt-get update
COPY stream-control.deb stream-control.deb
RUN apt-get install ./stream-control.deb -y

