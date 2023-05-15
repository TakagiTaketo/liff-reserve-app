const express = require('express');
const app = express();
const line = require('@line/bot-sdk');
const PORT = process.env.PORT || 5000;
const {Client} = require('pg');

const connection = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
   });
   connection.connect();

const config = {
   channelAccessToken:process.env.ACCESS_TOKEN,
   channelSecret:process.env.CHANNEL_SECRET
};

const client = new line.Client(config);
connection.query(create_userTable)
.then(()=>{
    console.log('table users created successfully!!');
})
.catch(e=>console.log(e));
const create_reserveTable = {
    text:'CREATE TABLE IF NOT EXISTS reserves (id SERIAL NOT NULL, line_uid VARCHAR(255), reserve_date VARCHAR(255), reserve_time VARCHAR(255), created_at VARCHAR(255), updated_at VARCHAR(255), delete_flg SMALLINT);'
};

app
   .post('/hook',line.middleware(config),(req,res)=> lineBot(req,res))
   .listen(PORT,()=>console.log(`Listening on ${PORT}`));

