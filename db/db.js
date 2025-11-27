const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'FlickCine.sqlite');

const db = new Database(dbPath, { 
    verbose: console.log 
});

db.pragma('journal_mode = WAL');

module.exports = db;