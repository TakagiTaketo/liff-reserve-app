
//const api_url = 'https://script.google.com/macros/s/AKfycbyXtqPI5N7mt44QlEVz6H--NxljrVMnJF8ANNV1u55G6RVGt5NAGTP6WRgZfyLZvs8KIw/exec'; //生成したAPIのURLを指定




let result = [];
document.addEventListener("DOMContentLoaded", function (event) {
    // 予約管理DBから予約情報を取得
    select_reserves();
});

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
        let date = new Date(reserve_date + 'T' + reserve_time + ':00');
        dateList.push(date);
    }
    console.log('dataList:' + dateList);
    // dataListを日付順にソート
    let result = dateList.sort(function (a, b) {
        return (a < b) ? -1 : 1;
    });
    console.log('result:' + result);
    // resultの数文テーブルを生成する。
    for (var i in result) {
        let table = document.getElementById('reserve_table');

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
        input.type = "radio";
        input.value = i;
        p.appendChild(input);
        // テーブル作成
        let tr = document.createElement('tr');
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
}

/*
fetch(api_url)
    .then(function (fetch_data) {
        return fetch_data.json();
    })
    .then(function (json) {
        let dateList = [];
        for (var i in json) {
            let userID = json[i].userId;
            if (decordIdToken.sub == userID) {
                let date = new Date(json[i].startDate + 'T' + json[i].startTime + ':00');
                dateList.push(date);
            }
        }
        // 日付ソート
        let result = dateList.sort(function (a, b) {
            return (a < b) ? -1 : 1;
        });

        for (var i in result) {
            let table = document.getElementById('reserve_table');

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
            input.type = "radio";
            input.value = i;
            p.appendChild(input);
            // テーブル作成
            let tr = document.createElement('tr');
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
    })
    .catch((err) => console.error(`予約情報が取得できませんでした：${err}`));
*/
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
