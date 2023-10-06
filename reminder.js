import line from '@line/bot-sdk';
import ClientPg from 'pg';
const { Client } = ClientPg;
import dotenv from "dotenv";
const env = dotenv.config();

// Postgresへの接続
const connection = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
    ssl: {
        rejectUnauthorized: false
    }
});
connection.connect(function (err) {
    if (err) {
        console.error('error connecting:' + err.stack);
        return;
    }
    console.log('connected as id' + connection.threadId);
});

const config = {
    channelAccessToken: process.env.ACCESS_TOKEN,
    channelSecret: process.env.CHANNEL_SECRET_MessagingAPI
};

// APIコールのためのクライアントインスタンスを作成
const bot = new line.Client(config);

main();

//メッセージを送る処理
function sendMessage(message, line_uid) {
    console.log("message:" + message);
    bot.pushMessage(line_uid, {  //送りたい相手のUserID
        type: "text",
        text: message
    })

}

function main() {
    //現在日付の取得
    let today = new Date();
    console.log('今日の日付:' + today);

    let year = today.getFullYear();
    let month = today.getMonth() + 1;
    today.setDate(today.getDate() + 3); // +3日する
    let date_after3days = today.getDate();
    console.log('3日後の日付:' + today);

    let reserve_date_after3days = year + '-' + month.toString().padStart(2, "0") + '-' + date_after3days.toString().padStart(2, "0");
    console.log('3日後の日付（整形後）:' + reserve_date_after3days);

    let message = "";

    // 検索クエリ(line_uid:medibrainはリマインドしない)
    const select_query = {
        text: `SELECT line_uid, reserve_time FROM reserves WHERE reserve_date=$1 and delete_flg=0 and line_uid!='medibrain';`,
        values: [reserve_date_after3days]
    };
    connection.query(select_query)
        .then(data => {
            for (let item of data.rows) {
                message = `予約3日前になりました。\n予約日時は\n${year}年${month}月${date_after3days}日 ${item.reserve_time}\nです。\nよろしくお願いいたします。`;
                sendMessage(message, item.line_uid);
            }
        })
        .catch(e => console.log('error:' + e))
        .finally(() => {
            connection.end();
        })
}