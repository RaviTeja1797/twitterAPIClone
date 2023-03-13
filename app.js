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

const authenticateUser = (request, response, next) =>{
    console.log('Authenticate user')
    const authHeader = request.headers.authorization
    //console.log(request.headers)
    let jwtToken;

    if (authHeader!==undefined){
        jwtToken = authHeader.split(" ")[1];
    }
    if(jwtToken === undefined){ //if jwtToken is undefined, it means that authHeader is not provided on the request headers
        response.status(401);
        response.send('Invalid JWT Token')
    }else{
        //Received authorization header. Verify token and proceed to the path handler function
        jwt.verify(jwtToken, "The_Twitter", (error, payload)=>{
            if(error){
                //console.log(`Error ${error}`)
                response.status(401)
                response.send('Invalid JWT Token')
            }else{
                //console.log(payload.username)
                request.username = payload.username; //Upon successful jwt verification, adding username to the request object.
                //console.log(request);
                next() //Allowing the handler function
            }
        }
        )}

}

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

//test api for middleware function
expressAppInstance.get("/test-middleWare/", authenticateUser, (request, response)=>{
    console.log("test api block")
})


//getLatestTweetsOfFollowingUsersAPI | API-3 | get
expressAppInstance.get('/user/tweets/feed/', authenticateUser, async(request, response)=>{
  
  let {username}  = request;
  console.log(username)
  const getLatestTweetsQuery = `SELECT username, tweet, date_time as dateTime FROM
  user NATURAL JOIN tweet WHERE tweet.user_id IN(
      SELECT follower.following_user_id FROM follower INNER JOIN user ON follower.follower_user_id = user.user_id WHERE user.username LIKE "${username}"
  ) ORDER BY tweet.date_time DESC
  LIMIT 4`
  ;

  try{
    let tweetObjects = await databaseConnectionObject.all(getLatestTweetsQuery)
    response.send(tweetObjects)
  }catch(e){
    console.log(`Error message ${e}`)
  }
})