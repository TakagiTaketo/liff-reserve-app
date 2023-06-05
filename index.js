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
  .post('/api', (req, res) => getUserInfo(req, res))  // LINEプロフィール取得
  .post('/insertReserve', (req, res) => insertReserve(req, res))  // 予約追加
  .post('/selectReserve', (req, res) => selectReserve(req, res))  // 予約重複チェック
  .post('/selectWeekReserve', (req, res) => selectWeekReserve(req, res)) // 予約カレンダー作成
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
              .catch(e => console.log(e))
              .finally(() => {
                connection.end;
              });
            console.log('response data:', json);
          }
        });
    })
    .catch(e => console.log(e));
};

// 予定を入れられるかどうか確認する。
const selectReserve = (req, res) => {
  const data = req.body;
  //const postData = `id_token=${data.id_token}&client_id=${process.env.LOGIN_CHANNEL_ID}`;
  console.log('reserve_date:' + data.reserve_date);
  console.log('reserve_time:' + data.reserve_time);
  //console.log('client_id:' + process.env.LOGIN_CHANNEL_ID);

  const reserve_date = data.reserve_date; //予約日
  const reserve_time = data.reserve_time; //予約時間
  const select_query = {
    text: `SELECT * FROM reserves WHERE reserve_date='${reserve_date}' and reserve_time='${reserve_time} and delete_flg=0';`
  };
  let reserve_flg = false;
  connection.query(select_query, function (error, results) {
    connection.end;
    if (error) throw error;

    // TODO line
    if (results.rows[0] != null) {
      reserve_flg = false;
      console.log('予約満席');
    } else if (results.rows[0] == null) {
      reserve_flg = true;
      console.log('予約空席');
    }
    res.status(200).send({ reserve_flg });
  })
};

// users,reservesテーブルに予定を追加する。
const insertReserve = (req, res) => {
  const data = req.body;

  // タイムスタンプ整形
  let created_at = '';
  let date = new Date(Date.now() + ((new Date().getTimezoneOffset() + (9 * 60)) * 60 * 1000));
  console.log('date:' + date);
  created_at = date.getFullYear() + '/' + ('0' + (date.getMonth() + 1)).slice(-2) + '/'
    + ('0' + date.getDate()).slice(-2) + ' ' + ('0' + date.getHours()).slice(-2) + ':'
    + ('0' + date.getMinutes()).slice(-2) + ':' + ('0' + date.getSeconds()).slice(-2);
  console.log('created_at:' + created_at);
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
      let message = '予約追加完了'
      res.status(200).send(message);
    })
    .catch(e => {
      console.log(e);
      res.status
    })
    .finally(() => {
      connection.end;
    });
}

// 予約カレンダー取得
const selectWeekReserve = (req, res) => {
  const select_query = {
    text: `SELECT reserve_date, reserve_time FROM reserves WHERE delete_flg=0;`
  };
  let jsonData = {};
  let json_data = {};
  connection.query(select_query)
    .then(data => {
      let reserve_date = '';
      let reserve_time = '';
      for (let i = 0; i < data.rows.length; i++) {
        jsonData['reserve_date'] = data.rows[i].reserve_date;
        jsonData['reserve_time'] = data.rows[i].reserve_time;
        json_data.push(JSON.stringify(jsonData));
        /*
        jsonData.push({
          reserve_date: reserve_date,
          reserve_time: reserve_time
        });
        */
      }
      //JSON.stringify(jsonData);

      console.log('jsonData:' + json_data);
      res.status(200).send([jsonData]);
    })
    .catch(e => console.log(e))
    .finally(() => {
      connection.end;
    });

}
  /*
connection.query(select_query, function (error, results) {
connection.end;
if (error) throw error;
let jsonData = '';
//console.log('results:' + results);
//numrows = results.length();
//numrows = results.size();
//console.log('numrows:' + numrows);
//let reserve_date = '';
//let reserve_time = '';
/*
let i = 0;
while (true) {
if (results.rows[i].reserve_date != null && results.rows[i].reserve_time != null) {
jsonData += JSON.stringify({
reserve_date: results.rows[0].reserve_date,
reserve_time: results.rows[0].reserve_time
})
} else {
break;
}
i++;
}
 
for (let i = 0; i < 6; i++) {
//reserve_date = results.rows[i].reserve_date;
//reserve_time = results.rows[i].reserve_time;

//console.log('reserve_date:' + reserve_date);
//console.log('reserve_time:' + reserve_time);
console.log('jsondata:' + jsonData + i);
}
 
//console.log('jsonData:' + jsonData);

res.status(200).send({ results.rows[0].reserve_date, results.rows[0].reserve_time });

})
}

/*
.set('views', path.join(__dirname, 'views'))
.set('view engine', 'ejs')
.get('/', (req, res) => res.render('pages/index'))
.get('/g/', (req, res) => res.json({ method: "こんにちは、getさん" }))
.post('/p/', (req, res) => res.json({ method: "こんにちは、postさん" }))
.post("/hook/", (req, res) => res.json({ test: "hook" }))
//.post('/hook',line.middleware(config),(req,res)=> lineBot(req,res))
.listen(PORT, () => console.log(`Listening on ${ PORT }`));

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
.listen(PORT, () => console.log(`Listening on ${ PORT } `));

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
text: `INSERT INTO users(line_uid, name, age) VALUES($1, $2, $3); `,
values: [ev.source.userId, profile.displayName, 33]
};
connection.query(insert_query)
.then(() => {
return client.replyMessage(ev.replyToken, {
"type": "text",
"text": `${ profile.displayName } さん、フォローありがとうございます\uDBC0\uDC04`
});
})
.catch(e => console.log(e));
}
*/