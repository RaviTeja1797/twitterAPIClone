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
        databaseConnectionObject = await open({
            filename : dbPath,
            driver: sqlite3.Database
        })
        expressAppInstance.listen(3000, ()=>{
            console.log('Database connection object received and Server initiated at 3000')
        })
    }catch(e){
        console.log(`Database error ${e.message}`)
    }
}

initializeDatabaseAndServer();



//registerUserAPI | API-1 | POST
expressAppInstance.post("/register/", async(request, response)=>{
    const{username, password, name, gender} = request.body;
    const passwordHash = await bcrypt.hash(password, 10);
    
    let userObject;

    const getUserQuery = `SELECT * FROM user WHERE username like "${username}"`;

    try{
        userObject = await databaseConnectionObject.get(getUserQuery);
    }catch(e){
        console.log(`Datebase error ${e.message}`)
    }

    if(userObject){
        //user already exists throw error
        response.status(400)
        response.send('User already exists')
        
    }else{
        //verify password and proceed to create an account
        if (password.length > 6){
            //proceed! Create a twitter account for the user
            const registerUserQuery = `INSERT INTO user(username, password, name, gender)
            VALUES("${username}", "${passwordHash}", "${name}", "${gender}");`;

            try{
                await databaseConnectionObject.run(registerUserQuery);
                response.send('User created successfully');
            }catch(e){
                console.log(`Database Error ${e.message}`);
            }

        }else{
            //Reject! Password Too short!
            response.status(400);
            response.send('Password is too short');
        }
    }

})

//loginUserAPI | API-2 | POST 

expressAppInstance.post("/login/", async(request, response)=>{
    const{username, password} = request.body;
    
    let userObject;
    const getUserQuery = `SELECT * FROM user WHERE username like "${username}"`;

    try{
        userObject = await databaseConnectionObject.get(getUserQuery);
    }catch(e){
        console.log(`Datebase error ${e.message}`)
    }

    if(userObject){
        //user exists check password
        const isPasswordValid = await bcrypt.compare(password, userObject.password)
        if(isPasswordValid){
            //Password matching. Generating JWT Token and sending in response.

            const payload = {
                username : username
            }

            const jwtToken = jwt.sign(payload, "The_Twitter");
            response.send({jwtToken})
            console.log(jwtToken)

        }else{
            //Invalid password. Reject login request.
            response.status(400)
            response.send('Invalid password')
        }
        
    }else{
        //user doesn't have a twitter account reject the login request
        response.status(400)
        response.send('Invalid user')
    }

})