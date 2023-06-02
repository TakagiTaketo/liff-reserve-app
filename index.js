import fetch from 'node-fetch';
import express from 'express';
const PORT = process.env.PORT || 5001
import ClientPg from 'pg';
const { Client } = ClientPg;
/*
const express = require('express');
//const { Client } = require('pg');
const line = require('@line/bot-sdk');
const PORT = process.env.PORT || 5000
*/

// Postgresへの接続
const connection = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});
connection.connect();

const config = {
  channelAccessToken: process.env.ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
};

//express
express()
  .use(express.static('public'))
  .use(express.json())
  .use(express.urlencoded({ extended: true }))
  .post('/api', (req, res) => getUserInfo(req, res))
  .post('/insertReserve', (req, res) => insertReserve(req, res))
  .post('/searchReserve', (req, res) => searchReserve(req, res))
  .listen(PORT, () => console.log(`Listening on ${PORT}`))

const getUserInfo = (req, res) => {
  const data = req.body;
  const postData = `id_token=${data.id_token}&client_id=${process.env.LOGIN_CHANNEL_ID}`;
  console.log('id_token:' + data.id_token);
  console.log('client_id:' + process.env.LOGIN_CHANNEL_ID);
  fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: postData
  })
    .then(response => {
      response.json()
        .then(json => {
          console.log('response data:', json);
          if (json) {
            //Postgresからデータを取得する処理
            const lineId = json.sub; //sub:line_uid
            const select_query = {
              text: `SELECT * FROM users WHERE line_uid='${lineId}';`
            };

            connection.query(select_query)
              .then(data => {
                console.log('data.rows[0]:', data.rows[0]);
                const line_uname = data.rows[0].line_uname;
                const line_uid = data.rows[0].line_uid;
                res.status(200).send({ line_uname, line_uid });
              })
              .catch(e => console.log(e));
            console.log('response data:', json);
          }
        });
    })
    .catch(e => console.log(e));
}
// 予定を入れられるかどうか確認する。
const searchReserve = (req, res) => {
  const data = req.body;
  //const postData = `id_token=${data.id_token}&client_id=${process.env.LOGIN_CHANNEL_ID}`;
  console.log('reserve_date:' + data.reserve_date);
  console.log('reserve_time:' + data.reserve_time);
  //console.log('client_id:' + process.env.LOGIN_CHANNEL_ID);

  const reserve_date = data.reserve_date; //予約日
  const reserve_time = data.reserve_time; //予約時間
  const select_query = {
    text: `SELECT * FROM reserves WHERE reserve_date='${reserve_date}' and reserve_time='${reserve_time}';`
  };
  let reserve_flg = false;
  connection.query(select_query)
    .then((data) => {
      if (data.length == 0) {
        reserve_flg = true;
        console.log('予約空席');
      } else if (data.length > 0 || data == null) {
        reserve_flg = false;
        console.log('予約満席');
      }
      res.status(200).send({ reserve_flg });
    })
    .catch(e => {
      console.log(e);
    });
};

// users,reservesテーブルに予定を追加する。
const insertReserve = (req, res) => {
  const data = req.body;

  // タイムスタンプ整形
  let created_at = '';
  let date = new Date().toLocaleString({ timeZone: 'Asia/Tokyo' });
  date.add
  created_at = date.getFullYear() + '/' + ('0' + (date.getMonth() + 1)).slice(-2) + '/'
    + ('0' + date.getDate()).slice(-2) + ' ' + ('0' + date.getHours()).slice(-2) + ':'
    + ('0' + date.getMinutes()).slice(-2) + ':' + ('0' + date.getSeconds()).slice(-2);

  console.log('line_uid:', data.line_uid);
  console.log('reserve_date:', data.reserve_date);
  console.log('reserve_time:', data.reserve_time);
  console.log('created_at:', created_at);
  const insert_query = {
    text: `INSERT INTO reserves(line_uid, reserve_date, reserve_time, created_at, delete_flg) VALUES ($1, $2, $3, $4, $5);`,
    values: [data.line_uid, data.reserve_date, data.reserve_time, created_at, 0]
  };

  connection.query(insert_query)
    .then(() => {
      console.log('予約追加完了');
    })
    .catch(e => {
      console.log(e);
    });
}

/*
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .get('/g/', (req, res) => res.json({ method: "こんにちは、getさん" }))
  .post('/p/', (req, res) => res.json({ method: "こんにちは、postさん" }))
  .post("/hook/", (req, res) => res.json({ test: "hook" }))
  //.post('/hook',line.middleware(config),(req,res)=> lineBot(req,res))
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

//usersテーブル作成クエリ
const create_query = {
  text: 'CREATE TABLE IF NOT EXISTS users (id SERIAL NOT NULL, line_uid VARCHAR(50), name VARCHAR(20), age SMALLINT);'
};

//CREATEクエリ実行
connection.query(create_query)
  .then(() => console.log('usersテーブル作成成功！！'))
  .catch(e => console.log(e))

const client = new line.Client(config);
app
  .post('/hook', line.middleware(config), (req, res) => lineBot(req, res))
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

const lineBot = (req, res) => {
  res.status(200).end();
  const events = req.body.events;
  const promises = [];
  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    switch (ev.type) {
      case 'follow':
        promises.push(greeting_follow(ev));
        break;
    }
  }
  Promise
    .all(promises)
    .then(console.log('all promises passed'))
    .catch(e => console.error(e.stack));
}

//フォローしたら挨拶を返す関数
const greeting_follow = async (ev) => {
  const profile = await client.getProfile(ev.source.userId);
  const insert_query = {
    text: `INSERT INTO users (line_uid,name,age) VALUES($1,$2,$3);`,
    values: [ev.source.userId, profile.displayName, 33]
  };
  connection.query(insert_query)
    .then(() => {
      return client.replyMessage(ev.replyToken, {
        "type": "text",
        "text": `${profile.displayName}さん、フォローありがとうございます\uDBC0\uDC04`
      });
    })
    .catch(e => console.log(e));
}
*/