import line from '@line/bot-sdk';
import ClientPg from 'pg';
const { Client } = ClientPg;

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
    let year = today.getFullYear();
    let month = today.getMonth() + 1;
    let date = today.getDate();
    let date_after3days = date.setDate(date.getDate() + 3);
    let message = "";

    // 3日後の日付
    let reserve_date_after3days = year + '-' + month + '-' + date_after3days;

    // 検索クエリ
    const select_query = {
        text: `SELECT line_uid FROM reserves WHERE reserve_date='${reserve_date_after3days}' and delete_flg=0';`
    };
    connection.query(select_query)
        .then(data => {
            for (let i = 0; i < data.rows.length; i++) {
                message = `予約3日前になりました。\n予約日は${year}年${month}月${date_after3days}日\n${data.rows[i].reserve_time}\nです。\nよろしくお願いいたします。`;
                console.log('リマインドするline_uid:' + data.rows[i].line_uid);
                console.log('リマインドするMessage:' + message);
                sendMessage(message, data.rows[i].line_uid);
            }
            //console.log('リマインドするline_uid:' + dataList);
        })
        .catch(e => console.log(e))
        .finally(() => {
            connection.end;
        })
}