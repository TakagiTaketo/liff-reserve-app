const liffId = '1660856020-lm6XRQgz';
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

window.addEventListener('load', function () {
    // 生年月日プルダウンの生成
    setpull_birthday_year();
    setpull_birthday_month();
    setpull_birthday_day();
})
let dialog = document.getElementById('dialog_reserve');
//let dialog = document.querySelector('dialog');
// let btn_open = $('#reserve_button');
// let dialog_reserve = $('#dialog_reserve');
// let dialog_close = $('#dialog_close');
// 予約ボタン押下
$(function () {
    $('form').submit(function () {
        $('#dialog_username').text($('#username').val());
        $('#dialog_birthday').text($('#birthday_year').val() + '年' + $('#birthday_month').val() + '月' + $('#birthday_day').val() + '日');
        $('#dialog_reserve_date').text($('#date').val().substring(0, 4) + '/' + $('#date').val().substring(5, 7) + '/' + $('#date').val().substring(8, 10) + ' ' + $('select[name="time"]').val());
        // 生年月日がありえない値の場合、アラートを出す。
        let today = new Date();
        if (parseInt($('#birthday_year').val(), 10) < (today.getFullYear() - 150)
            || parseInt($('#birthday_year').val(), 10) > today.getFullYear()
            || parseInt($('#birthday_month').val(), 10) < 1
            || parseInt($('#birthday_month').val(), 10) > 12
            || parseInt($('#birthday_day').val(), 10) < 1
            || parseInt($('#birthday_day').val(), 10) > 31) {
            alert('生年月日(西暦)を正しく入力してください。');
        } else {
            dialog.showModal();
        }
    });
});

// ダイアログの「予約」ボタン押下時
function click_dialog_reserve() {
    // jsonDataを作成
    const jsonData = JSON.stringify({
        line_uid: line_uid,
        name: $("#dialog_username").text(),
        reserve_date: $("#date").val(),
        reserve_time: $('select[name="time"]').val(),
        birthday: $('#birthday_year').val() + '-' + $('#birthday_month').val().toString().padStart(2, "0") + '-' + $('#birthday_day').val().toString().padStart(2, "0")
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
                        let dialog_error = document.getElementById('dialog_error');
                        let dialog_error_msg = document.getElementById('dialog_error_msg');
                        dialog_error_msg.textContent = '選択していただいた日時は満席（予約不可）か休診のため、予約出来ませんでした。\n最新の状態を確認するには更新してください。';
                        dialog_error.showModal();
                        //alert('選択していただいた日時は満席（予約不可）か休診のため、予約出来ませんでした。\n最新の状態を確認するには更新ボタンを押してください。');
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

// 生年月日プルダウン生成(年)
function setpull_birthday_year() {
    const select_year = document.getElementById('birthday_year');

    // 年プルダウンを生成
    for (let i = 1900; i <= 2023; i++) {
        let option = document.createElement('option');
        option.value = i;
        option.text = i;
        select_year.appendChild(option);
    }
}
// 生年月日プルダウン生成(月)
function setpull_birthday_month() {
    const select_month = document.getElementById('birthday_month');

    // 月プルダウンを生成
    for (let i = 1; i <= 12; i++) {
        let option = document.createElement('option');
        option.value = i;
        option.text = i;
        select_month.appendChild(option);
    }

}

// 生年月日プルダウン生成（日）
function setpull_birthday_day() {
    const select_year = document.getElementById('birthday_year');
    const select_month = document.getElementById('birthday_month');
    const select_day = document.getElementById('birthday_day');
    // 日プルダウンを生成

    //日の選択肢を空にする
    let children = select_day.children;
    while (children.length) {
        children[0].remove();
    }
    // 日を生成(動的に変える)
    if (select_year.value !== '' && select_month.value !== '') {
        const last_day = new Date(select_year.value, select_month.value, 0).getDate();

        for (i = 1; i <= last_day; i++) {
            let option = document.createElement('option');
            option.value = i;
            option.text = i;
            select_day.appendChild(option);
        }
    }
}

// 生年月日プルダウンの年、月が変更された時、日のプルダウンを再生成する。
function change_birthday_pull() {
    setpull_birthday_day();
}