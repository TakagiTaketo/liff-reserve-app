// 予約ボタン押下
$(function () {
    $('form').submit(function () {
        let reserveDate = $("#date").val();
        let reserveTime = document.getElementsByName("time")[0].value;
        let username = $('#username').val();
        let birthday = $('#birthday_year').val() + '年' + $('#birthday_month').val() + '月' + $('#birthday_day').val() + '日';

        if (window.confirm(`この内容で予約します。よろしいですか？\n氏名：${username}\n生年月日：${birthday}\n予約日時：${reserveDate} ${reserveTime}\n`)) {
            // jsonDataを作成
            const jsonData = JSON.stringify({
                line_uid: line_uid,
                reserve_date: reserveDate,
                reserve_time: reserveTime
            });
            console.log(jsonData);
            // 予定検索
            fetch('/searchReserve', {
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
                                        sendText(msg);
                                        console.log(json.message);
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
        }
        return false;
    })
})

// 予約確認
function reserve_confirm() {
    location.href = '/confirm.html';
}

