// 予約ボタン押下
$(function () {
    $('form').submit(function () {
        let reserveDate = $("#date").val();
        let reserveTime = document.getElementsByName("time")[0].value;
        let username = $('#username').val();
        let birthday = $('#birthday_year').val() + '年' + $('#birthday_month').val() + '月' + $('#birthday_day').val() + '日';

        if (window.confirm(`この内容で予約します。よろしいですか？\n氏名：${username}\n生年月日：${birthday}\n予約日時：${reserveDate} ${reserveTime}\n`)) {
            let msg = '新規予約' + '\n' + reserveDate + '\n' + reserveTime.toString() + '\n' + '氏名：' + username + '\n' + '生年月日：' + birthday;
            sendText(msg);
        }
        return false;
    })
})

// 予約確認
function reserve_confirm() {
    location.href = '/confirm.html';
}

