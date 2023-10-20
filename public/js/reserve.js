const liffId = '1660856020-lm6XRQgz';

window.addEventListener("DOMContentLoaded", () => {

    // LIFF 初期化
    liff.init({
        liffId: liffId
    })
        .then(() => {
            // ログインしてなければログインさせる
            checkLogin();
        })
        .catch((err) => {
            let dialog_error = document.getElementById('dialog_error'); // エラーメッセージダイアログ
            let dialog_error_msg = document.getElementById('dialog_error_msg'); // エラーメッセージ内容
            dialog_error_msg.innerText = 'LIFFの初期化に失敗しました。';
            dialog_error.showModal();
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
// 予約ボタン押下
$(function () {
    $('form').submit(function () {
        $('#dialog_username').text($('#username').val());
        $('#dialog_birthday').text($('#birthday_year').val() + '年' + $('#birthday_month').val() + '月' + $('#birthday_day').val() + '日');
        $('#dialog_reserve_date').text($('#date').val().substring(0, 4) + '/' + $('#date').val().substring(5, 7) + '/' + $('#date').val().substring(8, 10) + ' ' + $('select[name="time"]').val());
        dialog.showModal();
    });
});

// ダイアログの「予約」ボタン押下時
async function click_dialog_reserve() {
    // jsonDataを作成
    const idToken = liff.getIDToken();
    const jsonData = JSON.stringify({
        idToken: idToken,
        name: $("#dialog_username").text(),
        reserve_date: $("#date").val(),
        reserve_time: $('select[name="time"]').val(),
        birthday: $('#birthday_year').val() + '-' + $('#birthday_month').val().toString().padStart(2, "0") + '-' + $('#birthday_day').val().toString().padStart(2, "0")
    });

    console.log('予約ダイアログのjsonData:' + jsonData);

    // 選択した日付の生成
    let selectedDate = new Date($("#date").val() + "T" + $('select[name="time"]').val() + ":00.000+09:00");
    console.log("面談日に選択した日時：" + selectedDate);
    // 現在の日付と時刻の取得（時分秒を無視するために日付のみを使用）
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    console.log("今日の日付：" + currentDate);
    // 予約日が過去日付の場合のチェック
    if (selectedDate < currentDate) {
        let dialog_error = document.getElementById('dialog_error'); // エラーメッセージダイアログ
        let dialog_error_msg = document.getElementById('dialog_error_msg'); // エラーメッセージ内容
        dialog_error_msg.innerText = '過去の日時は予約出来ません。';
        dialog_error.showModal();
        return false;
    }

    // 予定検索
    await fetch('/insertReserve', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: jsonData,
        creadentials: 'same-origin'
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
            console.log(data.msg);
            // メール送信処理
            sendEmail($("#dialog_username").text(), $("#date").val(), $('select[name="time"]').val());
            let msg = '予約入力しました。'
            sendText(msg);
        })
        .catch(error => {
            // ネットワークエラーやサーバーからのエラーレスポンスを処理
            console.error(error.error);
            if (error.error) {
                let dialog_error = document.getElementById('dialog_error'); // エラーメッセージダイアログ
                let dialog_error_msg = document.getElementById('dialog_error_msg'); // エラーメッセージ内容
                dialog_error_msg.innerText = error.error;
                dialog_error.showModal();
            }
        })
    
    return false;
}
// ダイアログの閉じるボタン押下時、開いているダイアログを全て閉じる。
function click_dialog_close() {
    let dialogs = document.querySelectorAll('dialog');
    for (let item of dialogs) {
        item.close();
    }
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

// メール送信を行う
async function sendEmail(reserve_name, reserve_date, reserve_time) {
    const idToken = liff.getIDToken();
    const jsonData = JSON.stringify({
      reserve_name: reserve_name,
      idToken: idToken,
      reserve_date: reserve_date,
      reserve_time: reserve_time,
    });
    console.log("クライアント側のメール送信メソッドです。");
    await fetch('/sendMail', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: jsonData,
    })
      .then(res => {
        // レスポンスのステータスコードをチェック
        if(!res.ok){
            // サーバーからのエラーレスポンスを処理
            return res.json().then(error => Promise.reject(error));
        }
        // ステータスコードが OK の場合、レスポンスをJSONとして解析
        return res.json();
    })
      .then(data => {
        console.log(data.msg);
      })
      .catch(error => {
        console.error('メール送信時にエラーが発生しました。:', error);
      });
  }