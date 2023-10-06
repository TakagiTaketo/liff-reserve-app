let displayStartDate = [];
let noReserveList = [];
let dialog_error = document.getElementById('dialog_error');
let dialog_error_msg = document.getElementById('dialog_error_msg');

window.addEventListener("DOMContentLoaded", () => {
    //今日の日時を表示
    var date = new Date()
    var year = date.getFullYear()
    var month = date.getMonth() + 1
    var day = date.getDate()

    var toTwoDigits = function (num, digit) {
        num += ''
        if (num.length < digit) {
            num = '0' + num
        }
        return num
    }

    var yyyy = toTwoDigits(year, 4)
    var mm = toTwoDigits(month, 2)
    var dd = toTwoDigits(day, 2)
    var ymd = yyyy + "-" + mm + "-" + dd;

    document.getElementById("displayDate").value = ymd;
    // 予約管理DBからカレンダーを生成
    reserveDB_access();
});
// 予約日リストを取得
async function selectWeekReserve(displayStartDate, startTime, endTime, startDate, endDate) {
    // jsonDataを作成
    const jsonData = JSON.stringify({
        startDate: startDate,
        endDate: endDate
    });
    const res = await fetch('/selectWeekReserve', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: jsonData,
        credentials: 'same-origin'

    });
    // エラー時処理
    if(!res.ok){
        const error = await res.json();
        dialog_error_msg.innerText = error.error;
        await dialog_error.showModal();
        throw new Error(error.error);
    }

    const json = await res.json();
    
    for (let i in json) {
        // 選択した週の予定の場合、配列に格納する。
        let excelDate = new Date(json[i].reserve_date);
        if (startTime <= excelDate && excelDate <= endTime) {
            displayStartDate.push((json[i].reserve_date).toString().slice(0, 10) + 'T' + json[i].reserve_time);
        }
    }
    return displayStartDate;
}

// 予約不可日リストを取得
async function selectNoReserve(noReserveList, startDate, endDate) {
    // jsonDataを作成
    const jsonData = JSON.stringify({
        startDate: startDate,
        endDate: endDate
    });
    const res = await fetch('/selectNoReserve', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: jsonData,
        credentials: 'same-origin'
    });
    // エラー時処理
    if(!res.ok){
        const error = await res.json();
        dialog_error_msg.innerText = error.error;
        await dialog_error.showModal();
        throw new Error(error.error);
    }
    const json = await res.json();
    for (var i in json) {
        noReserveList.push((json[i].no_reserve_date).toString().slice(0, 10) + 'T' + json[i].no_reserve_time);
    }
    return true;
}

// カレンダー
async function reserveDB_access() {
    // 選択した日付を取得
    let selectDate = new Date(document.getElementById("displayDate").value); // ex)2023-05-01
    // 年を取得
    let thisYear = selectDate.getFullYear();
    // 月を取得
    let thisMonth = selectDate.getMonth();
    // 日にちを取得
    let thisDate = selectDate.getDate();
    // 選択した日付の曜日を取得
    let thisDayNum = selectDate.getDay();   // ex)日曜日なら0
    // 今週の日曜日
    let thisSunday = thisDate - thisDayNum;
    // 今週の土曜日
    let thisSaturday = thisSunday + 6;
    // 今週日曜日の0:00
    let startTime = new Date(thisYear, thisMonth, thisSunday);
    // 今週土曜日の23:59
    let endTime = new Date(thisYear, thisMonth, thisSaturday, 23, 59, 59, 999);

    // 整形
    let startDate = startTime.getFullYear() + '-' + (startTime.getMonth() + 1).toString().padStart(2, '0') + '-' + startTime.getDate().toString().padStart(2, '0');
    let endDate = endTime.getFullYear() + '-' + (endTime.getMonth() + 1).toString().padStart(2, '0') + '-' + endTime.getDate().toString().padStart(2, '0');
    console.log('startTime:' + startTime);
    console.log('endTime:' + endTime);
    console.log('startDate:' + startDate);
    console.log('endDate:' + endDate);

    displayStartDate = [];
    noReserveList = [];
    displayStartDate.push(startDate + 'T00:00');

    await selectWeekReserve(displayStartDate, startTime, endTime, startDate, endDate);
    await selectNoReserve(noReserveList, startDate, endDate);
    setCalendar(displayStartDate, noReserveList);
}
// 予約日・予約不可日リストからカレンダーを生成する。
function setCalendar(displayStartDate, noReserveList) {
    // カレンダーを取得し、内容をクリア
    let calendar = document.getElementById("calendar");
    while (calendar.lastChild) {
        calendar.removeChild(calendar.lastChild);
    }
    console.log(displayStartDate);
    // 予約日と予約不可日のリストをクローンする。
    let busyDates = displayStartDate;
    let noReserveDates = noReserveList;
    
    console.log('busyDates' + busyDates);
    // 定数設定
    const
        table = document.getElementById('calendar'),
        date_span = 7,
        time_begin = 10,
        time_end = 16,
        week_name = ['日', '月', '火', '水', '木', '金', '土'],
        // 日付操作用の関数
        date_th = d => [d.getMonth() + 1, d.getDate()].join('/'),
        date_th2 = d => [date_th(d), '\n(', week_name[d.getDay()], ')'].join(''),
        date_add = (d, o = 1) => { let r = new Date(d); r.setDate(r.getDate() + o); return r },
        date_same = (a, b) => ['getFullYear', 'getMonth', 'getDate'].every((c, d) => a[c]() === b[c]()),
        date_sun = d => (date_add(d, - ((7 - d.getDay()) % 7))),
        date_num = d => {
            let m = d.getMonth();
            return [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334][m] + d.getDate() - 1 +
                (new Date(d.getFullYear(), m + 1, 0) === 29 && 0 < m);
        };
    // カレンダー表示の範囲を決定するための日付を処理
    let
        a = busyDates.map(d => new Date(d + ':00.000+09:00')).sort((a, b) => +a > +b),
        b = date_sun(new Date(a[0])),
        c = [[date_th(b), date_th(date_add(b, date_span - 1))].join('-')],
        d = date_num(b),
        e = [], // 予約の有無を判断するための配列
        f = table.insertRow(-1),
        g = noReserveDates.map(d => new Date(d + ':00.000+09:00')),
        n = []; // 予約不可日を判断するための配列

    // カレンダーのヘッダーを埋める
    for (let i = 0; i < date_span; i++) {
        c.push(date_th2(date_add(b, i)));
    }
    c.forEach(s => f.insertCell(-1).textContent = s);
    // 予約リストから'〇','×'を判断する配列を作成
    for (let f of a) {
        let h = f.getHours();
        if (e[h] == undefined) {
            e[h] = [];
        }
        e[h][date_num(f) - d] = true;
    }
    // 予約不可日リストから'-'を判断する配列を作成
    for (let f of g) {
        let h = f.getHours();
        if (n[h] == undefined) {
            n[h] = [];
        }
        n[h][date_num(f) - d] = true;

    }
    // 時間部
    for (let i = time_begin; i <= time_end; i++) {
        if (i == 12) continue;
        let row = table.insertRow(-1);
        row.appendChild(document.createElement('th')).textContent = i + ':00';
        for (j = 0; j < date_span; j++) {
            let cell = row.insertCell(-1);
            cell.setAttribute('name', 'calendar_cell');
            // 日付の最適化
            let day = new Date(b);
            day.setDate(b.getDate() + j);
            let formattedDate = `${day.getFullYear()}-${(day.getMonth() + 1).toString().padStart(2, '0')}-${day.getDate().toString().padStart(2, '0')}`;

            // 予約情報に基づくテキストと色の設定
            if (n[i] && n[i][j]) { // 予約不可日の場合
                cell.textContent = '-';
                cell.style.color = "black";
            } else if (e[i] && e[i][j]) { // 予約済みの場合
                cell.textContent = '×';
                cell.style.color = "blue";
            } else { // 予約可能な場合
                cell.textContent = '◎';
                cell.style.color = "red";
            }

            cell.setAttribute('onclick', `changeClickColor(this);clickReserve('${i}:00', '${formattedDate}', '${cell.textContent}')`);
        }
    }
}

// クリックしたtd要素の色を変える
function changeClickColor(table_cell) {

    let calendar_cell = document.getElementsByName('calendar_cell');

    for (let item of calendar_cell) {
        item.style.background = 'none';
    }

    table_cell.style.background = 'orange';

};

// 予定がクリックされた時の処理
function clickReserve(time, date, status) {
    // 予約できない日時をクリックした場合のチェック
    if (status === "-" || status === "×") {
        dialog_error_msg.innerText = '選択していただいた日時は満席（予約不可）か休診のため、予約出来ません。';
        dialog_error.showModal();
    }
    
    let dateElement = document.getElementById('date');
    dateElement.value = date;
    let timeElement = document.getElementById('time');
    timeElement.value = time;
}