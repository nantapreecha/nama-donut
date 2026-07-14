#!/bin/sh
node prisma/merge-stock-rounds.mjs
node node_modules/prisma/build/index.js db push --accept-data-loss
node prisma/seed.mjs
node server.js
