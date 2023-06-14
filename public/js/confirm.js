const liffId = '1661289930-qLmEmZ8w';
let line_uid = '';
let line_uname = '';
window.addEventListener("DOMContentLoaded", () => {
    // LIFF 初期化
    liff.init({
        liffId: liffId
    })
        .then(() => {
            checkLogin();
            const idtoken = liff.getIDToken();
            const jsonData = JSON.stringify({
                id_token: idtoken
            });
            // LINEプロフィール取得
            fetch('/api', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: jsonData,
                creadentials: 'same-origin'
            })
                .then(res => {
                    res.json()
                        .then(json => {
                            console.log('json:' + json);
                            line_uname = json.line_uname;
                            line_uid = json.line_uid;
                        })
                })
                .catch((err) => {
                    alert(err);
                })
        })
        .catch((err) => {
            alert(err);
        })
});
// 選択テーブル作成
window.onload = function () {
    // セッションから選択した予約でデータの日付を取得する
    let jsonData = sessionStorage.getItem('jsonData');
    jsonData = JSON.parse(jsonData);
    for (let i = 0; i < jsonData.length; i++) {
        let reserve_date = jsonData[i].reserve_date;
        let reserve_time = jsonData[i].reserve_time;
        line_uid = jsonData[i].line_uid;
        let head = document.getElementById('reserve_table_head');
        let body = document.getElementById('reserve_table_body')
        // テーブル作成
        let tr = document.createElement('tr');
        if (i == 0) {
            let th2 = document.createElement('th');
            let th3 = document.createElement('th');
            th2.setAttribute('colspan', 1);
            th3.setAttribute('colspan', 1);
            th2.style.width = '50%';
            th3.style.width = '50%';
            th2.textContent = '日付';
            th3.textContent = '開始時間';
            head.appendChild(th2);
            head.appendChild(th3);
        }
        // td
        let cell2 = document.createElement('td');
        cell2.setAttribute('name', 'date');
        let cell3 = document.createElement('td');
        cell3.setAttribute('name', 'start');
        let cellText2 = document.createTextNode(reserve_date);
        let cellText3 = document.createTextNode(reserve_time);
        cell2.appendChild(cellText2);
        cell3.appendChild(cellText3);
        tr.appendChild(cell2);
        tr.appendChild(cell3);
        body.appendChild(tr);
    }
}

// ログインチェック
function checkLogin() {
    // ログインチェック
    if (liff.isLoggedIn()) {
        //ログイン済
    } else {
        // 未ログイン
        let result = window.confirm("LINE Loginを行います。");
        if (result) {
            liff.login();
        }
    }
}

// 予約取消ボタン
function deleteReserve() {
    // セッションから選択した予約でデータの日付を取得する
    let jsonData = sessionStorage.getItem('jsonData');
    jsonData = JSON.parse(jsonData);

    // 取消
    fetch('/updateReserve', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify(jsonData)
    })
        .then((json) => {
            let msg = '予約を取り消しました。';
            console.log('msg:' + json.message);
            sendText(msg);
        })
        .catch((err) => {
            alert(err);
        })
        .finally(() => {
        })
}

function backDeleteReserve() {
    location.href = '/deleteReserve.html';
}

function sendText(msg) {
    liff.sendMessages([
        {
            'type': 'text',
            'text': msg
        }
    ]).then(function () {
        liff.closeWindow();
    }).catch(function (err) {
        alert('Failed to send message ' + err);
    });
}
