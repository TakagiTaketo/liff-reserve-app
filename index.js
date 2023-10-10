import fetch from "node-fetch";
import express from "express";
const PORT = process.env.PORT || 5001;
//import ClientPg from "pg";
//const { Client } = ClientPg;
import pkg from 'pg';
const { Pool } = pkg;
import line from "@line/bot-sdk";
const TOKEN = process.env.ACCESS_TOKEN;
import https from "https";
import nodemailer_import from "nodemailer";
const nodemailer = nodemailer_import;

// Postgresへの接続
/*
const connection = new Client({
  connectionString: process.env.DATABASE_URL,
  /*
  password: process.env.DB_PASS,
  ssl:false
  
  ssl: {
    rejectUnauthorized: false,
  },
});
connection.connect();
*/
// Postgresへの接続プールの作成
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});
const config = {
  channelAccessToken: process.env.ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET_MessagingAPI,
};
const client = new line.Client(config);
//express
express()
  .use(express.static("public"))
  .use(express.json())
  .use(express.urlencoded({ extended: true }))
  .get("/", (req, res) => {
    res.sendStatus(200);
  })
  .post("/webhook", (req, res) => replyMessage(req, res)) // LINEBOT
  .post("/insertReserve", (req, res) => insertReserve(req, res)) // 予約追加
  .post("/selectWeekReserve", (req, res) => selectWeekReserve(req, res)) // 予約データ取得
  .post("/selectNoReserve", (req, res) => selectNoReserve(req, res)) // 予約不可データ取得
  .post("/selectConfirmReserve", (req, res) => selectConfirmReserve(req, res)) // 予約確認データ取得
  .post("/updateReserve", (req, res) => updateReserve(req, res)) // 予約の取消更新
  .post("/sendMail", (req, res) => sendEmail(req, res)) // メール送信
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

const replyMessage = (req, res) => {
  res.send("HTTP POST request sent to the webhook URL!");
  // ユーザーがボットにメッセージを送った場合、返信メッセージを送る
  let dataString = "";
  if (req.body.events[0].type === "message") {
    if (
      req.body.events[0].message.text.substring(0, 10) == "予約入力しました。"
    ) {
      // 文字列化したメッセージデータ
      dataString = JSON.stringify({
        replyToken: req.body.events[0].replyToken,
        messages: [
          {
            type: "text",
            text: "予約完了しました。",
          },
        ],
      });
    } else if (
      req.body.events[0].message.text.substring(0, 4) == "問診記入" &&
      req.body.events[0].message.text.substring(5, 10) != "お薬服用中"
    ) {
      // 文字列化したメッセージデータ
      dataString = JSON.stringify({
        replyToken: req.body.events[0].replyToken,
        messages: [
          {
            type: "text",
            text: "問診の記入ありがとうございました。",
          },
        ],
      });
    } else if (
      req.body.events[0].message.text.substring(0, 4) == "問診記入" &&
      req.body.events[0].message.text.substring(5, 10) == "お薬服用中"
    ) {
      // 文字列化したメッセージデータ
      dataString = JSON.stringify({
        replyToken: req.body.events[0].replyToken,
        messages: [
          {
            type: "text",
            text: "問診記入ありがとうございました。\nお薬を服用中の場合は保健指導を行うことは出来ません。",
          },
        ],
      });
    }
    // リクエストヘッダー
    const headers = {
      "Content-Type": "application/json",
      Authorization: "Bearer " + TOKEN,
    };

    // リクエストに渡すオプション
    const webhookOptions = {
      hostname: "api.line.me",
      path: "/v2/bot/message/reply",
      method: "POST",
      headers: headers,
      body: dataString,
    };

    // リクエストの定義
    const request = https.request(webhookOptions, (res) => {
      res.on("data", (d) => {
        process.stdout.write(d);
      });
    });

    // エラーをハンドル
    request.on("error", (err) => {
      console.error(err);
    });

    // データを送信
    request.write(dataString);
    request.end();
  }
};

// users,reservesテーブルに予定を追加する。
const insertReserve = async (req, res) => {
  const data = req.body;
  const idToken = data.idToken; // IDトークンを取得
  const client = await pool.connect();  // 接続を手動取得
  try {
    const userInfo = await verifyIdTokenAndGetUserInfo(idToken); // IDトークンを検証し、ユーザー情報を取得

    // タイムスタンプ整形
    let created_at = "";
    let date = new Date(
      Date.now() + (new Date().getTimezoneOffset() + 9 * 60) * 60 * 1000
    );

    created_at = date.getFullYear() + "/" + ("0" + (date.getMonth() + 1)).slice(-2) + "/" + ("0" + date.getDate()).slice(-2) +
      " " + ("0" + date.getHours()).slice(-2) + ":" + ("0" + date.getMinutes()).slice(-2) +
      ":" + ("0" + date.getSeconds()).slice(-2);

    // 予約フォームに登録済みかどうか確認する
    const check_query1 = {
      text: `SELECT * FROM reserves WHERE line_uid=$1 AND delete_flg=0;`,
      values: [userInfo.line_uid]
    };
    const existingReserve1 = await client.query(check_query1);
    if (existingReserve1.rowCount > 0) {
      // 既にその日時での予約が存在する場合
      res.status(400).send({ error: "面談の予約は初回のみ行うことができます。\n2回目以降の面談をご希望の場合はトークルームでその旨をお伝えください。"});
      console.log("面談の予約は初回のみ");
      return;
    }

    // 指定された日時での既存の予約を確認
    const check_query2 = {
      text: `SELECT * FROM reserves WHERE reserve_date = $1 AND reserve_time = $2 AND delete_flg = 0`,
      values: [data.reserve_date, data.reserve_time]
    };

    const existingReserve2 = await client.query(check_query2);
    if (existingReserve2.rowCount > 0) {
      // 既にその日時での予約が存在する場合
      res.status(400).send({ error: "選択していただいた日時は満席のため、予約出来ませんでした。\n最新の状態を確認するには更新してください。"});
      console.log("満席のため予約出来ませんでした");
      return;
    }

    // 予約不可日かどうかのチェックを行う。
    const check_query3 = {
      text: `SELECT * FROM no_reserves WHERE no_reserve_date=$1 and no_reserve_time=$2 and delete_flg=0;`,
      values: [data.reserve_date, data.reserve_time],
    };
    const existingReserve3 = await client.query(check_query3);
    if (existingReserve3.rowCount > 0) {
      // 予約不可日の場合
      res.status(400).send({ error: "選択していただいた日時は休診のため、予約出来ませんでした。\n最新の状態を確認するには更新してください。"});
      console.log("休診のため予約出来ませんでした。");
      return;
    }

    const insert_query = {
      text: `INSERT INTO reserves(line_uid, name, reserve_date, reserve_time, created_at, delete_flg, birthday) VALUES ($1, $2, $3, $4, $5, $6, $7);`,
      values: [userInfo.line_uid, data.name, data.reserve_date, data.reserve_time, created_at, 0, data.birthday]
    };

    await client.query(insert_query);
    await client.query('COMMIT'); // トランザクションの確定
    res.status(200).send({ msg: "予約追加完了" });
  } catch (e) {
    await client.query('ROLLBACK'); // エラーが発生した場合、トランザクションをロールバックする。
    console.error(e.message);
    res.status(500).send({ error: "何らかの問題が発生し、予約に失敗しました。\n一度アプリを閉じて再度お試しください。"});
  } finally {
    client.release(); // 接続をプールに返却する
  }
};

// 予約カレンダー取得
const selectWeekReserve = (req, res) => {
  const data = req.body;
  const startDate = data.startDate;
  const endDate = data.endDate;
  // SELECT文
  const select_query = {
    text: `SELECT name, reserve_date, reserve_time FROM reserves WHERE delete_flg=0 AND reserve_date BETWEEN $1 AND $2 ORDER BY reserve_date ASC, reserve_time ASC;`,
    values: [startDate, endDate]
  };
  let dataList = [];

  // SQL実行
  pool.query(select_query)
  .then((data) => {
      for (let i = 0; i < data.rows.length; i++) {
        let tmp_data = {};
        tmp_data.name = data.rows[i].name;
        tmp_data.reserve_date = data.rows[i].reserve_date;
        tmp_data.reserve_time = data.rows[i].reserve_time;
        dataList.push(tmp_data);
      }
      console.log("selectWeekReserve()のdataList" + JSON.stringify(dataList));
      res.status(200).send(JSON.stringify(dataList));
    })
    .catch((e) => {
      console.error(e.message);
      res.status(500).send({ error: "予約カレンダーの取得に失敗しました。\n一度アプリを閉じて再度開いてください。"});
    });
};

// 予約不可日の取得
const selectNoReserve = (req, res) => {
  const data = req.body;
  const startDate = data.startDate;
  const endDate = data.endDate;

  const select_query = {
    text: `SELECT name, no_reserve_date, no_reserve_time FROM no_reserves WHERE delete_flg=0 AND no_reserve_date BETWEEN $1 AND $2 ORDER BY no_reserve_date ASC, no_reserve_time ASC;`,
    values: [startDate, endDate]
  };
  let dataList = [];
  pool.query(select_query)
    .then((data) => {
      for (let i = 0; i < data.rows.length; i++) {
        let tmp_data = {};
        tmp_data.name = data.rows[i].name;
        tmp_data.no_reserve_date = data.rows[i].no_reserve_date;
        tmp_data.no_reserve_time = data.rows[i].no_reserve_time;
        dataList.push(tmp_data);
      }
      console.log("サーバーサイドselectNoReserve()のdataList:" + JSON.stringify(dataList));
      res.status(200).send(JSON.stringify(dataList));
    })
    .catch((e) => {
      console.error(e.message);
      res.status(500).send({ error: "休診カレンダーの取得に失敗しました。\n一度アプリを閉じて再度開いてください。"});
    });
};
// 予約確認データ取得
const selectConfirmReserve = async (req, res) => {
  const data = req.body;
  const idToken = data.idToken;

  try {
    const userInfo = await verifyIdTokenAndGetUserInfo(idToken); // IDトークンを検証し、ユーザー情報を取得

    const select_query = {
      text: `SELECT reserve_date, reserve_time FROM reserves WHERE line_uid = $1 AND delete_flg=0;`,
      values: [userInfo.line_uid],
    };
    let dataList = [];
    await pool.query(select_query)
      .then((data) => {
        for (let i = 0; i < data.rows.length; i++) {
          let tmp_data = {};
          tmp_data.reserve_date = data.rows[i].reserve_date;
          tmp_data.reserve_time = data.rows[i].reserve_time;
          dataList.push(tmp_data);
        }
        res.status(200).send(JSON.stringify(dataList));
      })
      .catch((e) => {
        console.error(e.message);
        res.status(500).send({ error: "予約データの取得に失敗しました。\n一度アプリを閉じて再度お試しください。"});
      });
  } catch (e) {
    console.error(e.message);
    res.status(500).send({ error: "何らかの問題が発生し、予約データの取得に失敗しました。\n一度アプリを閉じて再度お試しください。"});
  }
};

// 予約情報の削除更新
const updateReserve = async (req, res) => {
  const data = req.body;
  const idToken = data.idToken;

  try {
    const userInfo = await verifyIdTokenAndGetUserInfo(idToken); // IDトークンを検証し、ユーザー情報を取得

    // タイムスタンプ整形
    let updated_at = "";
    let date = new Date(Date.now() + (new Date().getTimezoneOffset() + 9 * 60) * 60 * 1000);
    updated_at = date.getFullYear() + "/" + ("0" + (date.getMonth() + 1)).slice(-2) +
      "/" + ("0" + date.getDate()).slice(-2) +
      " " + ("0" + date.getHours()).slice(-2) +
      ":" + ("0" + date.getMinutes()).slice(-2) +
      ":" + ("0" + date.getSeconds()).slice(-2);

    const line_uid = userInfo.line_uid;
    const reserve_date = data.reserve_date.substring(0, 4) +
      "-" + data.reserve_date.substring(5, 7) +
      "-" + data.reserve_date.substring(8, 10);
    const reserve_time = data.reserve_time;
    console.log("updateReserve()のline_uid:" + line_uid);
    console.log("updateReserve()のreserve_date:" + reserve_date);
    console.log("updateReserve()のreserve_time:" + reserve_time);
    const update_query = {
      text: `UPDATE reserves set updated_at=$1, delete_flg=1 WHERE line_uid=$2 AND reserve_date=$3 AND reserve_time=$4;`,
      values: [updated_at, line_uid, reserve_date, reserve_time]
    };

    await pool.query(update_query)
      .then(() => {
        res.status(200).send({ msg: "予約を取り消しました。" });
      })
      .catch((e) => {
        console.error(e.message);
        res.status(500).send({ error: "予約の取り消しに失敗しました。\n一度アプリを閉じて再度お試しください。"});
      });
  } catch (e) {
    console.log(e.message);
    res.status(500).send({ error: "予約の取り消しに失敗しました。\n一度アプリを閉じて再度お試しください。"});
  }
};

// メール送信
const sendEmail = async (req, res) => {
  console.log("サーバー側メール送信メソッドです。");
  const data = req.body;
  const idToken = data.idToken;

  try {
    const userInfo = await verifyIdTokenAndGetUserInfo(idToken); // IDトークンを検証し、ユーザー情報を取得

    // メールサーバーの設定
    const smtpConfig = {
      host: "smtp.lolipop.jp", // ロリポップのSMTPサーバー
      port: 587, // SMTPサーバーのポート
      secure: false, // SSL/TLSを使用しない場合はfalse
      auth: {
        user: "takagi_taketo@medi-brain.com", // 送信するメールアドレス
        pass: "Tak_tak221115", // パスワード
      },
    };

    // Nodemailerのトランスポートを作成
    const transporter = nodemailer.createTransport(smtpConfig);

    let mail_text = userInfo.line_uname + "　さんが面談予約しました。\n面談者名：" +
      data.reserve_name + "\n対象日時：" +
      data.reserve_date + "　" + data.reserve_time;
    // HTMLメールの本文に改行を反映
    let mail_html = mail_text.replace(/\n/g, "<br>");
    // メールの内容
    const mailOptions = {
      from: "takagi_taketo@medi-brain.com", // 送信者のメールアドレス
      to: 'hoken_moriguchi@medi-brain.com', // 受信者のメールアドレス
      subject: "【予約】守口　保健指導", // 件名
      text: mail_text, // テキスト本文
      html: "<p>" + mail_html + "</p>", // HTML本文
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error(error.message);
        res.status(500).send({ error: "メールの送信に失敗しました。" });
      } else {
        console.log("メールを送信しました。: " + info.response);
        res.status(200).send({ msg: "メールを送信しました。" });
      }
    });
  } catch (e) {
    console.error(e.message);
    res.status(500).send({ error: "メールの送信に失敗しました。" });
  }
};

// IDTokenから個人情報を取得する
const verifyIdTokenAndGetUserInfo = async (idToken) => {
  try {
    const response = await fetch("https://api.line.me/oauth2/v2.1/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `id_token=${idToken}&client_id=${process.env.LOGIN_CHANNEL_ID}`,
    });

    const data = await response.json();
    return {
      line_uid: data.sub,
      line_uname: data.name
    };
  } catch (e) {
    console.error(e.message);
    throw new Error("ユーザー情報の取得に失敗しました。");
  }
};
