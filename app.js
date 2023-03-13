const express = require("express");
const {open} = require('sqlite');
const sqlite3 = require('sqlite3');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

const expressAppInstance = express();
expressAppInstance.use(express.json());


const dbPath = path.join(__dirname, "twitterClone.db")
let databaseConnectionObject;

const initializeDatabaseAndServer = async()=>{
    try{
        await open({
            filename : dbPath,
            driver: sqlite3.Database
        })
        expressAppInstance.listen(3000, ()=>{
            console.log('Database connection object received and Server initiated at 3000')
        })
    }catch(e){
        console.log(`Database error ${e}`)
    }
}

initializeDatabaseAndServer();


