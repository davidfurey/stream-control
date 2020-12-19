Stream control
==============

Automatically start streaming based on events.  Also allow manual control of
starting/stopping Youtube events without giving full control of Youtube console

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
