#!/bin/sh
set -e
node env-replace.js
exec node server.js
