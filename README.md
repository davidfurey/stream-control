Stream control
==============

Application to automate Youtube live streams.  It will create and update Youtube live broadcasts based on data in Google Sheets,
and can also control OBS, GATO and Youtube based on a schedule or external events.

Additionally, provides manual controls to start/stop Youtube events without giving full control of Youtube console to your team.

Packaging
---------

Run `npm run package` to create a Debian package

Getting keys
------------

Build or install the project and run `auth-cli` (build) or `stream-control-auth` (installed) to authorize
the application to access Youtube, Google Sheets and Google Drive.


Dev setup
---------

* `npm install`
* `CONFIG_DIR=./dev-config/ npm run watch:server`
* `CONFIG_DIR=./dev-config/ npm run watch:client`
