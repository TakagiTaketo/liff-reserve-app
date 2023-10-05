const liffId = '1660856020-lm6XRQgz';
let dialog_ok = document.getElementById('dialog_ok');
let dialog_ok_msg = document.getElementById('dialog_ok_msg');

window.addEventListener("DOMContentLoaded", () => {
    // LIFF 初期化
    liff.init({
        liffId: liffId
    })
        .then(() => {
            checkLogin();
        })
        .catch((err) => {
            alert('LIFF初期化に失敗しました。\n' + err);
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
    let session_jsonData = JSON.parse(sessionStorage.getItem('jsonData'));
    const idToken = liff.getIDToken();
    const jsonData = JSON.stringify({
        reserve_date: session_jsonData[0].reserve_date,
        reserve_time: session_jsonData[0].reserve_time,
        idToken: idToken
    });

    // 取消
    fetch('/updateReserve', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'same-origin',
        body: jsonData
    })
        .then(response => {
            // レスポンスのステータスコードをチェック
            if (!response.ok) {
                // サーバーからのエラーレスポンスを処理
                return response.json().then(error => Promise.reject(error));
            }
            // ステータスコードが OK の場合、レスポンスをJSONとして解析
            return response.json();
        })
        .then(data => {
            dialog_ok_msg.innerText = data;
            dialog_ok.showModal();
        })
        .catch(error => {
            dialog_ok_msg.innerText = '予約の取消に失敗しました。：' + error.error;
            dialog_ok.showModal();
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
        alert('メッセージの送信に失敗しました。\n ' + err);
    });
}

// ダイアログの閉じるボタン押下時、開いているダイアログを全て閉じる。
function click_dialog_close() {
    let dialogs = document.querySelectorAll('dialog');
    for (let item of dialogs) {
        item.close();
    }
    liff.closeWindow();
    return false;
}
