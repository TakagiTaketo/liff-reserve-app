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

let dialog = document.querySelector('dialog');
let btn_open = $('#reserve_button');
let dialog_reserve = $('#dialog_reserve');
let dialog_close = $('#dialog_close');
// 予約ボタン押下
$(function () {
    $('form').submit(function () {
        $('#dialog_username').text($('#username').val());
        $('#dialog_birthday').text($('#birthday_year').val() + '年' + $('#birthday_month').val() + '月' + $('#birthday_day').val() + '日');
        $('#dialog_reserve_date').text($('#date').val() + ' ' + $('select[name="time"]').val());
        dialog.showModal();
    });
});

// ダイアログの「予約」ボタン押下時
function click_dialog_reserve() {
    // jsonDataを作成
    const jsonData = JSON.stringify({
        line_uid: line_uid,
        name: $("#dialog_username").text(),
        reserve_date: $("#date").val(),
        reserve_time: $('select[name="time"]').val()
    });
    console.log('予約ダイアログのjsonData:' + jsonData);

    // let reserveDate = $("#date").val();
    // let reserveTime = document.getElementsByName("time")[0].value;
    // let username = $('#username').val();
    // let birthday = $('#birthday_year').val() + '年' + $('#birthday_month').val() + '月' + $('#birthday_day').val() + '日';

    // 予定検索
    fetch('/selectReserve', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: jsonData,
        credentials: 'same-origin'
    })
        .then(res => {
            res.json()
                .then(json => {
                    console.log('json:' + json);
                    if (json.reserve_flg) {
                        // 空席
                        fetch('/insertReserve', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: jsonData,
                            creadentials: 'same-origin'
                        })
                            .then(json => {
                                //let msg = '新規予約' + '\n' + reserveDate + '\n' + reserveTime.toString() + '\n' + '氏名：' + username + '\n' + '生年月日：' + birthday;
                                let msg = '予約入力しました。'
                                console.log(json.message);
                                sendText(msg);
                            })
                    } else {
                        // 満席
                        alert('選択していただいた日時は満席（予約不可）か休診のため、予約出来ませんでした。\n最新の状態を確認するには更新ボタンを押してください。');
                    }
                })
        })
        .catch((err) => {
            alert(err);
        })

    return false;
}
// ダイアログの閉じるボタン押下時
function click_dialog_close() {
    dialog.close();
    return false;
}

// 予約確認
function reserve_confirm() {
    location.href = '/deleteReserve.html';
}
