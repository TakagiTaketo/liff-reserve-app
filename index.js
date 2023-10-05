import fetch from "node-fetch";
import express from "express";
const PORT = process.env.PORT || 5001;
import ClientPg from "pg";
const { Client } = ClientPg;
import line from "@line/bot-sdk";
const TOKEN = process.env.ACCESS_TOKEN;
import https from "https";
import nodemailer_import from "nodemailer";
const nodemailer = nodemailer_import;

// Postgresへの接続
const connection = new Client({
  connectionString: process.env.DATABASE_URL,
  /*
  password: process.env.DB_PASS,
  ssl:false
  */
  ssl: {
    rejectUnauthorized: false,
  },
});
connection.connect();

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
  .post("/selectReserve", (req, res) => selectReserve(req, res)) // 予約重複チェック
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

// 予定を入れられるかどうか確認する。
const selectReserve = async (req, res) => {
  const data = req.body;
  const idToken = data.idToken;
  console.log("reserve_date:" + data.reserve_date);
  console.log("reserve_time:" + data.reserve_time);

  try {
    let reserve_result = "";
    const userInfo = await verifyIdTokenAndGetUserInfo(idToken); // IDトークンを検証し、ユーザー情報を取得
    // 予約フォームに登録済みかどうか確認する
    const select_query = {
      text: `SELECT * FROM reserves WHERE line_uid=$1 AND delete_flg=0;`,
      values: [userInfo.line_uid],
    };
    connection
      .query(select_query)
      .then((data) => {
        if (data.rows.length > 0) {
          console.log("初回面談登録済み");
          reserve_result = "登録済み";
          res.status(200).send({ reserve_result });
        }
      })
      .catch((e) => console.log(e));

    const reserve_date = data.reserve_date; //予約日
    const reserve_time = data.reserve_time; //予約時間
    const select_query2 = {
      text: `SELECT * FROM reserves WHERE reserve_date=$1 and reserve_time=$2 and delete_flg=0;`,
      values: [reserve_date, reserve_time],
    };

    connection
      .query(select_query2)
      .then((data) => {
        console.log("data.rows.length:" + data.rows.length);
        if (data.rows.length > 0) {
          console.log("予約満席");
          reserve_result = "満席";
          res.status(200).send({ reserve_result });
        } else {
          // 予約不可日のチェックを行う。
          const select_query3 = {
            text: `SELECT * FROM no_reserves WHERE no_reserve_date=$1 and no_reserve_time=$2 and delete_flg=0;`,
            values: [reserve_date, reserve_time],
          };
          connection
            .query(select_query3)
            .then((data) => {
              if (data.rows.length > 0) {
                console.log("予約満席");
                reserve_result = "満席";
              } else {
                console.log("予約空席");
                reserve_result = "空席";
              }
              res.status(200).send({ reserve_result });
            })
            .catch((e) => console.log(e));
        }
      })
      .catch((e) => {
        console.log(e);
      })
      .finally(() => {
        connection.end;
      });
  } catch (e) {
    console.log(e);
    res.status(500).send({ error: "Server error" });
  }
};

// users,reservesテーブルに予定を追加する。
const insertReserve = async (req, res) => {
  const data = req.body;
  const idToken = data.idToken; // IDトークンを取得
  try {
    const userInfo = await verifyIdTokenAndGetUserInfo(idToken); // IDトークンを検証し、ユーザー情報を取得
    console.log("insertReserveのuserInfo:" + userInfo);
    // タイムスタンプ整形
    let created_at = "";
    let date = new Date(
      Date.now() + (new Date().getTimezoneOffset() + 9 * 60) * 60 * 1000
    );
    console.log("date:" + date);
    created_at = date.getFullYear() + "/" + ("0" + (date.getMonth() + 1)).slice(-2) + "/" + ("0" + date.getDate()).slice(-2) + " " +
      ("0" + date.getHours()).slice(-2) + ":" + ("0" + date.getMinutes()).slice(-2) + ":" + ("0" + date.getSeconds()).slice(-2);
    console.log("created_at:" + created_at);
    console.log("line_uid:", userInfo.line_uid);
    console.log("name:", data.name);
    console.log("reserve_date:", data.reserve_date);
    console.log("reserve_time:", data.reserve_time);
    console.log("created_at:", created_at);
    console.log("birthday:", data.birthday);
    const insert_query = {
      text: `INSERT INTO reserves(line_uid, name, reserve_date, reserve_time, created_at, delete_flg, birthday) VALUES ($1, $2, $3, $4, $5, $6, $7);`,
      values: [
        userInfo.line_uid,
        data.name,
        data.reserve_date,
        data.reserve_time,
        created_at,
        0,
        data.birthday,
      ],
    };

    connection
      .query(insert_query)
      .then(() => {
        let message = "予約追加完了";
        res.status(200).send({ message });
      })
      .catch((e) => {
        console.log(e);
        res.status(500).send({ error: e.message });
      })
      .finally(() => {
        connection.end;
      });
  } catch (e) {
    console.log(e);
    res.status(500).send({ error: "Server error" });
  }
};

// 予約カレンダー取得
const selectWeekReserve = (req, res) => {
  const data = req.body;
  const startDate = data.startDate;
  const endDate = data.endDate;
  console.log("selectWeekREserve()のstartDate:" + startDate);
  console.log("selectWeekREserve()のendDate:" + endDate);
  // SELECT文
  const select_query = {
    text: `SELECT name, reserve_date, reserve_time FROM reserves WHERE delete_flg=0 AND reserve_date BETWEEN $1 AND $2 ORDER BY reserve_date ASC, reserve_time ASC;`,
    values: [startDate, endDate],
  };
  let dataList = [];

  // SQL実行
  connection
    .query(select_query)
    .then((data) => {
      for (let i = 0; i < data.rows.length; i++) {
        let tmp_data = {};
        tmp_data.name = data.rows[i].name;
        tmp_data.reserve_date = data.rows[i].reserve_date;
        tmp_data.reserve_time = data.rows[i].reserve_time;
        dataList.push(tmp_data);
      }
      console.log(
        "サーバーサイドselectWeekReserve()のdataList" + JSON.stringify(dataList)
      );
      res.status(200).send(JSON.stringify(dataList));
    })
    .catch((e) => {
      console.log(e);
      res.status(500).send({ error: e.message });
    })
    .finally(() => {
      connection.end;
    });
};

// 予約不可日の取得
const selectNoReserve = (req, res) => {
  const data = req.body;
  const startDate = data.startDate;
  const endDate = data.endDate;
  console.log("selectNoReserve()のstartDate:" + startDate);
  console.log("selectNoReserve()のendDate:" + endDate);

  const select_query = {
    text: `SELECT name, no_reserve_date, no_reserve_time FROM no_reserves WHERE delete_flg=0 AND no_reserve_date BETWEEN $1 AND $2 ORDER BY no_reserve_date ASC, no_reserve_time ASC;`,
    values: [startDate, endDate],
  };
  let dataList = [];
  connection
    .query(select_query)
    .then((data) => {
      for (let i = 0; i < data.rows.length; i++) {
        let tmp_data = {};
        tmp_data.name = data.rows[i].name;
        tmp_data.no_reserve_date = data.rows[i].no_reserve_date;
        tmp_data.no_reserve_time = data.rows[i].no_reserve_time;
        dataList.push(tmp_data);
      }
      console.log(
        "サーバーサイドselectNoReserve()のdataList:" + JSON.stringify(dataList)
      );
      res.status(200).send(JSON.stringify(dataList));
    })
    .catch((e) => {
      console.log(e);
      res.status(500).send({ error: e.message });
    })
    .finally(() => {
      connection.end;
    });
};
// 予約確認データ取得
const selectConfirmReserve = async (req, res) => {
  const data = req.body;
  const idToken = data.idToken;

  try {
    const userInfo = await verifyIdTokenAndGetUserInfo(idToken); // IDトークンを検証し、ユーザー情報を取得
    console.log('selectConfirmReserveのline_uid：' + userInfo.line_uid);
    const select_query = {
      text: `SELECT reserve_date, reserve_time FROM reserves WHERE line_uid = $1 AND delete_flg=0;`,
      values: [userInfo.line_uid]
    };
    let dataList = [];
    connection.query(select_query)
      .then((data) => {
        for (let i = 0; i < data.rows.length; i++) {
          let tmp_data = {};
          tmp_data.reserve_date = data.rows[i].reserve_date;
          tmp_data.reserve_time = data.rows[i].reserve_time;
          dataList.push(tmp_data);
        }
        console.log("サーバーサイドselectConfirmReserve()のdataList:" + JSON.stringify(dataList));
        res.status(200).send(JSON.stringify(dataList));
      })
      .catch((e) => {
        console.log(e);
        res.status(500).send({ error: e.message });
      })
      .finally(() => {
        connection.end;
      });
  } catch (e) {
    console.log(e);
    res.status(500).send({ error: e.message });
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
    let date = new Date(
      Date.now() + (new Date().getTimezoneOffset() + 9 * 60) * 60 * 1000
    );
    updated_at =
      date.getFullYear() + "/" + ("0" + (date.getMonth() + 1)).slice(-2) + "/" + ("0" + date.getDate()).slice(-2) + " " +
      ("0" + date.getHours()).slice(-2) + ":" + ("0" + date.getMinutes()).slice(-2) + ":" + ("0" + date.getSeconds()).slice(-2);

    let message = "";
    const line_uid = userInfo.line_uid;
    const reserve_date = data.reserve_date.substring(0, 4) + "-" +
      data.reserve_date.substring(5, 7) + "-" +
      data.reserve_date.substring(8, 10);
    const reserve_time = data.reserve_time;
    console.log("updateReserve()のline_uid:" + line_uid);
    console.log("updateReserve()のreserve_date:" + reserve_date);
    console.log("updateReserve()のreserve_time:" + reserve_time);
    const update_query = {
      text: `UPDATE reserves set updated_at=$1, delete_flg=1 WHERE line_uid=$2 AND reserve_date=$3 AND reserve_time=$4;`,
      values: [updated_at, line_uid, reserve_date, reserve_time],
    };

    await connection
      .query(update_query)
      .then(() => {
        res.status(200).send("予約を取り消しました。");
      })
      .catch((e) => {
        console.log(e);
        res.status(500).send({ error: e });
      });
  } catch (e) {
    console.log(e);
    res.status(500).send({ error: e });
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
        user: "takagi_taketo@medi-brain.com", // あなたのメールアドレス
        pass: "Tak_tak221115", // あなたのメールアカウントのパスワード
      },
    };

    // Nodemailerのトランスポートを作成
    const transporter = nodemailer.createTransport(smtpConfig);

    let mail_text = userInfo.line_uname + "　さんが面談予約しました。\n面談者名：" + data.reserve_name + "\n対象日時：" + data.reserve_date + "　" + data.reserve_time;
    // HTMLメールの本文に改行を反映
    let mail_html = mail_text.replace(/\n/g, "<br>");
    // メールの内容
    const mailOptions = {
      from: "takagi_taketo@medi-brain.com", // 送信者のアドレス
      //to: 'hoken_moriguchi@medi-brain.com', // 受信者のアドレス
      to: "takagi_taketo@medi-brain.com",
      subject: "【予約】守口　保健指導", // 件名
      text: mail_text, // テキスト本文
      html: "<p>" + mail_html + "</p>", // HTML本文
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
        res.status(500).send("メールの送信に失敗しました。");
      } else {
        console.log("メールを送信しました。: " + info.response);
        res.status(200).send("メールを送信しました。");
      }
    });
  } catch (e) {
    console.log(e);
    res.status(500).send({ error: "Server error" });
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
      line_uname: data.name,
    };
  } catch (e) {
    console.error(e);
    throw new Error("Failed to verify ID token or fetch user info");
  }
};
