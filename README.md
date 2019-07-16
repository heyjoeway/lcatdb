# Lake Champlain Anglers' Temperature Database (lcatdb)

lcatDB is an easy to use database for Lake Champlain citizen science observations. The site is designed to work on both desktop and mobile, taking advantage of each platform’s respective features.

This project has been put on hold due to time constraints brought on by other responsibilities.

## Cloning
```
git clone [repository url]
cd lcatdb
```

## Client

### Dependencies
- node.js
- npm
- cordova (optional, used for mobile builds)
- sass
- grunt-cli

### Building (Linux)
```
cd client
cp config.example.json config.json
(edit config.json with your preferences)
npm install
grunt
cd ..
```

## Server

### Dependencies
- node.js
- npm

### Setup (Linux)
```
cd server
ln -s ../client/build/www ./public
cp config.example.json config.json
(edit config.json with your preferences)
npm install
node main.js
```
