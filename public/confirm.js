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
                            select_reserves();
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

// 予約情報取得
async function select_reserves() {
    // jsonDataを作成
    const jsonData = JSON.stringify({
        line_uid: line_uid
    });
    console.log('select_reserves()のline_uid:' + line_uid);
    // DBから予約情報を取得
    const res = await fetch('/selectConfirmReserve', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: jsonData,
        credentials: 'same-origin'

    })
        .catch((err) => console.error(`予約情報が取得できませんでした：${err}`));
    console.log('selectWeekReserveのresponse:' + res);
    const json = await res.json();
    console.log('selectConfirmReserveのjson' + json);
    // 配列dataListに結果を格納
    let dateList = [];
    for (var i in json) {
        let reserve_date = json[i].reserve_date;
        let reserve_time = json[i].reserve_time;
        let date = new Date(reserve_date.substring(0, 10) + 'T' + reserve_time + ':00');
        dateList.push(date);
    }
    console.log('dataList:' + dateList);
    // dataListを日付順にソート
    let result = dateList.sort(function (a, b) {
        return (a < b) ? -1 : 1;
    });
    console.log('result:' + result);

    // resultの数分テーブルを生成する。
    for (var i in result) {
        let table = document.getElementById('reserve_table');
        let head = document.getElementById('reserve_table_head');

        // 整形
        let year = result[i].getFullYear();
        let month = result[i].getMonth() + 1;
        let day = result[i].getDate();
        let hour = result[i].getHours();
        let minute = result[i].getMinutes();
        minute = minute.toString().padStart(2, '0');

        // チェックボックス作成
        let p = document.createElement('p');
        let input = document.createElement('input');
        input.setAttribute("name", "checkbox");
        input.setAttribute("required", true);
        input.type = "checkbox";
        input.value = i;
        p.appendChild(input);
        // テーブル作成
        let tr = document.createElement('tr');
        if (i == 0) {
            let th = document.createElement('th');
            let th2 = document.createElement('th');
            let th3 = document.createElement('th');
            th.setAttribute('colspan', 1);
            th2.setAttribute('colspan', 1);
            th3.setAttribute('colspan', 1);
            th.style.width = '15%';
            th2.style.width = '50%';
            th3.style.width = '35%';
            th.textContent = '選択';
            th2.textContent = '日付';
            th3.textContent = '開始時間';
            head.appendChild(th);
            head.appendChild(th2);
            head.appendChild(th3);
        }
        // td
        let cell = document.createElement('td');
        let cell2 = document.createElement('td');
        cell2.setAttribute('name', 'date');
        let cell3 = document.createElement('td');
        cell3.setAttribute('name', 'start');
        let cellText2 = document.createTextNode(year + '年' + ('00' + month).slice(-2) + '月' + ('00' + day).slice(-2) + '日');
        let cellText3 = document.createTextNode(hour + ':' + minute);
        let input2 = document.createElement('input');
        input2.setAttribute('hidden', true);
        input2.setAttribute('name', 'hidden_date');
        cellText4 = document.createTextNode(year + '-' + ('00' + month).slice(-2) + '-' + ('00' + day).slice(-2) + '\n' + hour + ':' + minute);
        cell.appendChild(p);
        cell2.appendChild(cellText2);
        cell3.appendChild(cellText3);
        input2.appendChild(cellText4);
        tr.appendChild(cell);
        tr.appendChild(cell2);
        tr.appendChild(cell3);
        tr.appendChild(input2);
        table.appendChild(tr);
    }

    // 予約情報が存在しない時
    let reserve_delete_button = document.getElementById('reserve_delete_button');
    if (result.length == 0) {
        let text = document.getElementById('no_reserve_text');
        text.textContent = "予約情報がありません。";
        reserve_delete_button.setAttribute('disabled', true);
    } else {
        reserve_delete_button.removeAttribute('disabled');
    }
}

// 予約取消ボタン
$(function () {
    $('form').submit(function () {
        let reserveDate = document.getElementsByName('checkbox');
        let dateList = document.getElementsByName('date');
        let startList = document.getElementsByName('start');
        let hiddenDateList = document.getElementsByName('hidden_date');
        let confirm_date = '';
        let checked_date = '';

        for (let i = 0; i < reserveDate.length; i++) {
            if (reserveDate[i].checked) {
                confirm_date = dateList[i].innerText + startList[i].innerText;
                checked_date = hiddenDateList[i].innerText;
                break;
            }
        }
        if (window.confirm(`下記予定を取り消します。\nよろしいですか？\n${confirm_date}`)) {
            let msg = '予約取消' + "\n" + checked_date;
            sendText(msg);
        }
        return false;
    })
})
