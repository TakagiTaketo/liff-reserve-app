let displayStartDate = [];
let noReserveList = [];

document.addEventListener("DOMContentLoaded", () => {
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
/*
function sleep(waitMsec) {
    var startMsec = new Date();

    // 指定ミリ秒間だけループさせる
    while (new Date() - startMsec < waitMsec);
}
*/
/*
//今日の日時を表示
window.onload = function () {
    // 1秒間カレンダーの生成を待つ。
    sleep(1000);
}
*/
// 予約日リストを取得
async function selectWeekReserve(displayStartDate, startTime, endTime, startDate, endDate) {
    // jsonDataを作成
    const jsonData = JSON.stringify({
        startDate: startDate,
        endDate: endDate
    });
    console.log('selectWeekReserve()のjsonDataのstartTime:' + startDate);
    console.log('selectWeekReserve()のjsonDataのendTime:' + endDate);
    const res = await fetch('/selectWeekReserve', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: jsonData,
        credentials: 'same-origin'

    });
    console.log('selectWeekReserveのresponse:' + res);
    const json = await res.json();
    console.log('selectWeekReserveのjson' + json);

    for (var i in json) {
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
    console.log('selectNoReserve()のjsonDataのstartTime:' + jsonData.startDate);
    console.log('selectNoReserve()のjsonDataのendTime:' + jsonData.endDate);
    const res = await fetch('/selectNoReserve', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'same-origin',
        body: jsonData
    });
    console.log('selectNoReserveのresponse:' + res);
    const json = await res.json();
    console.log('selectNoReserveのjson' + json);

    for (var i in json) {
        noReserveList.push((json[i].no_reserve_date).toString().slice(0, 10) + 'T' + json[i].no_reserve_time);
    }
    return true;
}

// カレンダー
async function reserveDB_access() {
    // GASからカレンダーの値を取得
    //const api_url = 'https://script.google.com/macros/s/AKfycbyXtqPI5N7mt44QlEVz6H--NxljrVMnJF8ANNV1u55G6RVGt5NAGTP6WRgZfyLZvs8KIw/exec'; //生成したAPIのURLを指定
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
    let calendar = document.getElementById("calendar");
    while (calendar.lastChild) {
        calendar.removeChild(calendar.lastChild);
    }
    console.log(displayStartDate);
    let BUSY = [];
    let HAIHUN = [];
    for (let i = 0; i < displayStartDate.length; i++) {
        BUSY.push(displayStartDate[i]);
    }
    for (let i = 0; i < noReserveList.length; i++) {
        HAIHUN.push(noReserveList[i]);
    }
    console.log('BUSY' + BUSY);
    const
        TABLE = document.getElementById('calendar'),
        DATE_SPAN = 7,
        TIME_BEGIN = 10,
        TIME_END = 16,

        WEEK_NAME = ['日', '月', '火', '水', '木', '金', '土'],
        date_th = d => [d.getMonth() + 1, d.getDate()].join('/'),
        //date_th = d => [d.getDate()],
        date_th2 = d => [date_th(d), '\n(', WEEK_NAME[d.getDay()], ')'].join(''),
        date_add = (d, o = 1) => { let r = new Date(d); r.setDate(r.getDate() + o); return r },
        date_same = (a, b) => ['getFullYear', 'getMonth', 'getDate'].every((c, d) => a[c]() === b[c]()),
        date_sun = d => (date_add(d, - ((7 - d.getDay()) % 7))),

        date_num = d => {
            let m = d.getMonth();
            console.log([0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334][m] + d.getDate() - 1 +
                (new Date(d.getFullYear(), m + 1, 0) === 29 && 0 < m));
            return [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334][m] + d.getDate() - 1 +
                (new Date(d.getFullYear(), m + 1, 0) === 29 && 0 < m);
        };
    let
        a = BUSY.map(d => new Date(d + ':00.000+09:00')).sort((a, b) => +a > +b),
        b = date_sun(new Date(a[0])),
        c = [[date_th(b), date_th(date_add(b, DATE_SPAN - 1))].join('-')],
        d = date_num(b),
        e = [],
        f = TABLE.insertRow(-1),
        g = HAIHUN.map(d => new Date(d + ':00.000+09:00')),
        n = [];

    for (let i = 0; i < DATE_SPAN; i++) {
        c.push(date_th2(date_add(b, i)));
    }
    c.forEach(s => f.insertCell(-1).textContent = s);
    // 予約リストから'〇','×'を判断する配列を作成
    for (let f of a) {
        let h = f.getHours();
        if ('undefined' === typeof e[h]) {
            e[h] = [];
            e[h][date_num(f) - d] = true;
        }
    }
    // 予約不可日リストから'-'を判断する配列を作成
    for (let f of g) {
        let h = f.getHours();
        if ('undefined' === typeof n[h]) {
            n[h] = [];
            n[h][date_num(f) - d] = true;
        }
    }
    // 時間部
    for (let i = TIME_BEGIN; i <= TIME_END; i++) {
        if (i == 12) continue;
        let a = TABLE.insertRow(-1);
        a.appendChild(document.createElement('th')).textContent = i + ':00';

        for (j = 0; j < DATE_SPAN; j++) {
            let cell = a.insertCell(-1);
            cell.textContent = (e[i] || [])[j] ? '×' : '◎';
            // 予約不可日の場合は'-'
            if ((n[i] || [])[j]) {
                cell.textContent = '-';
            }
            // 土日はハイフン
            if (j == 0 || j == 6) cell.textContent = '-';
            if (cell.textContent == "◎") {
                cell.style.color = "red";
            } else if (cell.textContent == "×") {
                cell.style.color = "blue";
            } else if (cell.textContent == "-") {
                cell.style.color = "black";
            }
        }
    }
}