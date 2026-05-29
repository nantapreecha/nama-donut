#!/bin/sh
node node_modules/prisma/build/index.js db push
node prisma/seed.mjs
node server.js
