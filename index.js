import fetch from 'node-fetch';
import express from 'express';
const PORT = process.env.PORT || 5001
import ClientPg from 'pg';
const { Client } = ClientPg;
import line from '@line/bot-sdk';
const TOKEN = process.env.ACCESS_TOKEN;
import https from 'https';

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
  channelSecret: process.env.CHANNEL_SECRET_MessagingAPI
};
const client = new line.Client(config);
//express
express()
  .use(express.static('public'))
  .use(express.json())
  .use(express.urlencoded({ extended: true }))
  .get('/', (req, res) => { res.sendStatus(200); })
  .post('/api', (req, res) => getUserInfo(req, res))  // LINEプロフィール取得
  .post("/webhook", (req, res) => replyMessage(req, res)) // LINEBOT
  .post('/insertReserve', (req, res) => insertReserve(req, res))  // 予約追加
  .post('/selectReserve', (req, res) => selectReserve(req, res))  // 予約重複チェック
  .post('/selectWeekReserve', (req, res) => selectWeekReserve(req, res)) // 予約データ取得
  .post('/selectNoReserve', (req, res) => selectNoReserve(req, res)) // 予約不可データ取得
  .post('/selectConfirmReserve', (req, res) => selectConfirmReserve(req, res)) // 予約確認データ取得
  .post('/updateReserve', (req, res) => updateReserve(req, res)) // 予約の取消更新
  .listen(PORT, () => console.log(`Listening on ${PORT}`))

const replyMessage = (req, res) => {
  res.send("HTTP POST request sent to the webhook URL!")
  // ユーザーがボットにメッセージを送った場合、返信メッセージを送る
  let dataString = '';
  if (req.body.events[0].type === "message") {
    if (req.body.events[0].message.text.substring(0, 10) == "予約入力しました。") {
      // 文字列化したメッセージデータ
      dataString = JSON.stringify({
        replyToken: req.body.events[0].replyToken,
        messages: [
          {
            "type": "text",
            "text": "予約完了しました。"
          }
        ]
      })
    } else if (req.body.events[0].message.text.substring(0, 4) == "問診記入"
      && req.body.events[0].message.text.substring(5, 10) != "お薬服用中") {
      // 文字列化したメッセージデータ
      dataString = JSON.stringify({
        replyToken: req.body.events[0].replyToken,
        messages: [
          {
            "type": "text",
            "text": "問診の記入ありがとうございました。"
          }
        ]
      })
    } else if (req.body.events[0].message.text.substring(0, 4) == "問診記入"
      && req.body.events[0].message.text.substring(5, 10) == "お薬服用中") {
      // 文字列化したメッセージデータ
      dataString = JSON.stringify({
        replyToken: req.body.events[0].replyToken,
        messages: [
          {
            "type": "text",
            "text": "問診記入ありがとうございます。\nお薬を服用中の場合は保健指導を行うことは出来ません。"
          }
        ]
      })
    }
    // リクエストヘッダー
    const headers = {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + TOKEN
    }

    // リクエストに渡すオプション
    const webhookOptions = {
      "hostname": "api.line.me",
      "path": "/v2/bot/message/reply",
      "method": "POST",
      "headers": headers,
      "body": dataString
    }

    // リクエストの定義
    const request = https.request(webhookOptions, (res) => {
      res.on("data", (d) => {
        process.stdout.write(d)
      })
    })

    // エラーをハンドル
    request.on("error", (err) => {
      console.error(err)
    })

    // データを送信
    request.write(dataString)
    request.end()
  }
}

// LINEプロフィールの取得
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
          /*
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
                req.connection.end;
              });
            console.log('response data:', json);
          }
          */
          const line_uname = json.name;
          const line_uid = json.sub;
          res.status(200).send({ line_uname, line_uid });
        })
        .catch(e => console.log(e))
        .finally(() => req.connection.end);
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
    text: `SELECT * FROM reserves WHERE reserve_date='${reserve_date}' and reserve_time='${reserve_time}' and delete_flg=0;`
  };
  let reserve_flg = false;
  connection.query(select_query)
    .then(data => {
      console.log("data.rows.length:" + data.rows.length);
      if (data.rows.length > 0) {
        console.log('予約満席');
        reserve_flg = false;
      } else {
        // 予約不可日のチェックを行う。
        const select_query2 = {
          text: `SELECT * FROM no_reserves WHERE no_reserve_date='${reserve_date}' and no_reserve_time='${reserve_time}' and delete_flg=0;`
        };
        connection.query(select_query2)
          .then(data => {
            if (data.rows.length > 0) {
              console.log('予約満席');
              reserve_flg = false;
            } else {
              console.log('予約空席');
              reserve_flg = true;
            }
            res.status(200).send({ reserve_flg });
          })
          .catch(e => console.log(e));
      }
    })
    .catch(e => console.log(e))
    .finally(() => {
      req.connection.end;
    });
  /*
    connection.query(select_query, function (error, results) {
      req.connection.end;
      if (error) throw error;
  
      if (results.rows[0].id != null) {
        reserve_flg = false;
        console.log('予約満席');
      } else if (results.rows[0].id == null) {
        reserve_flg = true;
        console.log('予約空席');
      }
      res.status(200).send({ reserve_flg });
    })
    */
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
  console.log('name:', data.name);
  console.log('reserve_date:', data.reserve_date);
  console.log('reserve_time:', data.reserve_time);
  console.log('created_at:', created_at);
  console.log('birthday:', data.birthday);
  const insert_query = {
    text: `INSERT INTO reserves(line_uid, name, reserve_date, reserve_time, created_at, delete_flg, birthday) VALUES ($1, $2, $3, $4, $5, $6, $7);`,
    values: [data.line_uid, data.name, data.reserve_date, data.reserve_time, created_at, 0, data.birthday]
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
      req.connection.end;
    });
}

// 予約カレンダー取得
const selectWeekReserve = (req, res) => {
  const data = req.body;
  console.log('data:' + data);
  const startDate = data.startDate;
  const endDate = data.endDate;
  console.log('selectWeekREserve()のstartDate:' + startDate);
  console.log('selectWeekREserve()のendDate:' + endDate);
  // SELECT文
  const select_query = {
    text: `SELECT name, reserve_date, reserve_time FROM reserves WHERE delete_flg=0 AND reserve_date BETWEEN '${startDate}' AND '${endDate}' ORDER BY reserve_date ASC, reserve_time ASC;`
  };
  let dataList = [];

  // SQL実行
  connection.query(select_query)
    .then(data => {
      for (let i = 0; i < data.rows.length; i++) {
        let tmp_data = {};
        tmp_data.name = data.rows[i].name;
        tmp_data.reserve_date = data.rows[i].reserve_date;
        tmp_data.reserve_time = data.rows[i].reserve_time;
        dataList.push(tmp_data);
      }
      console.log('サーバーサイドselectWeekReserve()のdataList' + JSON.stringify(dataList));
      res.status(200).send((JSON.stringify(dataList)));
    })
    .catch(e => console.log(e))
    .finally(() => {
      req.connection.end;
    });
};

// 予約不可日の取得
const selectNoReserve = (req, res) => {
  const data = req.body;
  const startDate = data.startDate;
  const endDate = data.endDate;
  console.log('selectNoReserve()のstartDate:' + startDate);
  console.log('selectNoReserve()のendDate:' + endDate);

  const select_query = {
    text: `SELECT name, no_reserve_date, no_reserve_time FROM no_reserves WHERE delete_flg=0 AND no_reserve_date BETWEEN '${startDate}' AND '${endDate}' ORDER BY no_reserve_date ASC, no_reserve_time ASC;`
  };
  let dataList = [];
  connection.query(select_query)
    .then(data => {
      for (let i = 0; i < data.rows.length; i++) {
        let tmp_data = {};
        tmp_data.name = data.rows[i].name;
        tmp_data.no_reserve_date = data.rows[i].no_reserve_date;
        tmp_data.no_reserve_time = data.rows[i].no_reserve_time;
        dataList.push(tmp_data);
      }
      console.log('サーバーサイドselectNoReserve()のdataList:' + JSON.stringify(dataList));
      res.status(200).send((JSON.stringify(dataList)));
    })
    .catch(e => console.log(e))
    .finally(() => {
      req.connection.end;
    });
}
// 予約確認データ取得
const selectConfirmReserve = (req, res) => {
  const data = req.body;
  const line_uid = data.line_uid;

  console.log('selectConfirmReserve()のline_uid:' + line_uid);

  const select_query = {
    text: `SELECT reserve_date, reserve_time FROM reserves WHERE line_uid = '${line_uid}' AND delete_flg=0;`
  };
  let dataList = [];
  connection.query(select_query)
    .then(data => {
      for (let i = 0; i < data.rows.length; i++) {
        let tmp_data = {};
        tmp_data.reserve_date = data.rows[i].reserve_date;
        tmp_data.reserve_time = data.rows[i].reserve_time;
        dataList.push(tmp_data);
      }
      console.log('サーバーサイドselectConfirmReserve()のdataList:' + JSON.stringify(dataList));
      res.status(200).send((JSON.stringify(dataList)));
    })
    .catch(e => console.log(e))
    .finally(() => {
      req.connection.end;
    });

}

// 予約情報の削除更新
const updateReserve = (req, res) => {
  const data = req.body;
  // タイムスタンプ整形
  let updated_at = '';
  let date = new Date(Date.now() + ((new Date().getTimezoneOffset() + (9 * 60)) * 60 * 1000));
  updated_at = date.getFullYear() + '/' + ('0' + (date.getMonth() + 1)).slice(-2) + '/'
    + ('0' + date.getDate()).slice(-2) + ' ' + ('0' + date.getHours()).slice(-2) + ':'
    + ('0' + date.getMinutes()).slice(-2) + ':' + ('0' + date.getSeconds()).slice(-2);

  let message = '';
  for (let i = 0; i < data.length; i++) {
    const line_uid = data[i].line_uid;
    const reserve_date = data[i].reserve_date.substring(0, 4) + '-' + data[i].reserve_date.substring(5, 7) + '-' + data[i].reserve_date.substring(8, 10);
    const reserve_time = data[i].reserve_time;
    console.log('updateReserve()のline_uid:' + line_uid);
    console.log('updateReserve()のreserve_date:' + reserve_date);
    console.log('updateReserve()のreserve_time:' + reserve_time);
    const update_query = {
      text: `UPDATE reserves set updated_at='${updated_at}', delete_flg=1 WHERE line_uid='${line_uid}' AND reserve_date='${reserve_date}' AND reserve_time='${reserve_time}';`
    };
    connection.query(update_query)
      .then(() => {
        message = '取消完了';
      })
      .catch(e => {
        console.log(e);
        message = '取消完了'
        res.send(503).send(message);
      })
  }
  res.status(200).send(message);
  req.connection.end;
  console.log('取消SQL終了');
  console.log('レスポンス返しました');
  /*
  let dataList = [];
  connection.query(select_query)
    .then(data => {
      for (let i = 0; i < data.rows.length; i++) {
        let tmp_data = {};
        tmp_data.reserve_date = data.rows[i].reserve_date;
        tmp_data.reserve_time = data.rows[i].reserve_time;
        dataList.push(tmp_data);
      }
      console.log('サーバーサイドselectConfirmReserve()のdataList:' + JSON.stringify(dataList));
      res.status(200).send((JSON.stringify(dataList)));
    })
    .catch(e => console.log(e))
    .finally(() => {
      connection.end;
    });
*/
}
