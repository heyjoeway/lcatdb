#!/bin/bash
cd server
npm install
cd ../client
npm install
cd ..
ln -s ../client/build/www server/www
ln -s ../client/build/views server/views
ln -s ../client/build/emails server/emails