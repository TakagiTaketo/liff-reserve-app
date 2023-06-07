document.addEventListener("DOMContentLoaded", function (event) {
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
    changeCalendar();
});
function sleep(waitMsec) {
    var startMsec = new Date();

    // 指定ミリ秒間だけループさせる
    while (new Date() - startMsec < waitMsec);
}

//今日の日時を表示
window.onload = function () {
    // 1秒間カレンダーの生成を待つ。
    sleep(1000);
}

async function selectWeekReserve(displayStartDate) {
    const res = await fetch('/selectWeekReserve', {
        method: 'POST',
        credentials: 'same-origin'
    });
    console.log('selectWeekReserveのresponse:' + res);
    const json = await res.json();
    console.log('selectWeekReserveのjson' + json);

    for (var i in json) {
        // 選択した週の予定の場合、配列に格納する。
        let excelDate = new Date(json[i].reserve_date);
        if (startTime <= excelDate && excelDate <= endTime) {
            displayStartDate.push((json[i].reserve_date).toString().slice(0, 11) + 'T' + json[i].reserve_time);
        }
    }
    return displayStartDate;
}

async function selectNoReserve(noReserveList) {
    const res = await fetch('/selectNoReserve', {
        method: 'POST',
        credentials: 'same-origin'
    });
    console.log('selectNoReserveのresponse:' + res);
    const json = await res.json();
    console.log('selectNoReserveのjson' + json);

    for (var i in json) {
        noReserveList.push((json[i].no_reserve_date).toString().slice(0, 11) + 'T' + json[i].no_reserve_time);
    }
    return noReserveList;
}


function changeCalendar() {
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
    let startDate = startTime.getFullYear() + '-' + (startTime.getMonth() + 1).toString().padStart(2, '0') + '-' + startTime.getDate().toString().padStart(2, '0') + 'T00:00';
    let endDate = endTime.getFullYear() + '-' + (endTime.getMonth() + 1).toString().padStart(2, '0') + '-' + endTime.getDate().toString().padStart(2, '0') + 'T23:59';
    console.log('startTime:' + startTime);
    console.log('endTime:' + endTime);
    console.log('startDate:' + startDate);
    console.log('endDate:' + endDate);

    let displayStartDate = [];
    displayStartDate.push(startDate);
    let noReserveList = [];
    //let displayEndDate = [];

    displayStartDate = selectWeekReserve(displayStartDate);
    noReserveList = selectNoReserve(noReserveList);

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
        //TABLE = document.querySelector('table'),
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
        g = HAIHUN,
        n = [];

    let busytime = [];
    for (let i = 0; i < DATE_SPAN; i++) {
        c.push(date_th2(date_add(b, i)));
        //busytime.push(i, 10);
    }
    c.forEach(s => f.insertCell(-1).textContent = s);

    for (let f of a) {
        let h = f.getHours();
        //let m = f.getMinutes();
        if ('undefined' === typeof e[h]) {
            e[h] = [];
            e[h][date_num(f) - d] = true;
        }
        /*
        if ('undefined' === typeof e[h] && m == 0) {
            e[h] = [];
            e[h][date_num(f) - d] = true;
        }
        if ('undefined' === typeof e[h] && m == 30) {
            g[h] = [];
            g[h][date_num(f) - d] = true;
        }
        */
    }
    for (let f of g) {
        let h = f.getHours();
        //let m = f.getMinutes();
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

/*
// Googleスプレッドシートから予約データを取得する
fetch(api_url)
.then(function (fetch_data) {
    return fetch_data.json();
})
.then(function (json) {
    for (var i in json) {
        // 選択した週の予定の場合、配列に格納する。
        let excelDate = new Date(json[i].startDate);
        if (startTime <= excelDate && excelDate <= endTime) {
            displayStartDate.push((json[i].startDate).toString().slice(0, 11) + 'T' + json[i].startTime);
        }
    }
    let calendar = document.getElementById("calendar");
    while (calendar.lastChild) {
        calendar.removeChild(calendar.lastChild);
    }
    console.log(displayStartDate);
    let BUSY = [];
    for (let i = 0; i < displayStartDate.length; i++) {
        BUSY.push(displayStartDate[i]);
    }
    console.log('BUSY' + BUSY);

    const
        //TABLE = document.querySelector('table'),
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
        g = [];

    let busytime = [];
    for (let i = 0; i < DATE_SPAN; i++) {
        c.push(date_th2(date_add(b, i)));
        //busytime.push(i, 10);
    }
    c.forEach(s => f.insertCell(-1).textContent = s);

    for (let f of a) {
        let h = f.getHours();
        //let m = f.getMinutes();
        if ('undefined' === typeof e[h]) {
            e[h] = [];
            e[h][date_num(f) - d] = true;
        }
        /*
        if ('undefined' === typeof e[h] && m == 0) {
            e[h] = [];
            e[h][date_num(f) - d] = true;
        }
        if ('undefined' === typeof e[h] && m == 30) {
            g[h] = [];
            g[h][date_num(f) - d] = true;
        }
        */

/*
// 時間部
for (let i = TIME_BEGIN; i <= TIME_END; i++) {
    if (i == 12) continue;
    let a = TABLE.insertRow(-1);
    a.appendChild(document.createElement('th')).textContent = i + ':00';

    for (j = 0; j < DATE_SPAN; j++) {
        let cell = a.insertCell(-1);
        cell.textContent = (e[i] || [])[j] ? '×' : '◎';
        if (j == 0 || j == 6) cell.textContent = '-';
        if (cell.textContent == "◎") {
            cell.style.color = "red";
        } else if (cell.textContent == "×") {
            cell.style.color = "blue";
        } else if (cell.textContent == "-") {
            cell.style.color = "black";
        }

    }
    /*
    if (i != TIME_END) {
        a = TABLE.insertRow(-1);
        a.appendChild(document.createElement('th')).textContent = i + ':30';
        for (j = 0; j < DATE_SPAN; j++) {
            let cell = a.insertCell(-1);
            cell.textContent = (g[i] || [])[j] ? '×' : '◎';
            if (cell.textContent == "◎") {
                cell.style.color = "red";
            } else if (cell.textContent == "×") {
                cell.style.color = "blue";
            }
 
        }
    }
    /
}

})
.catch((err) => console.error(`スケジュールが取得できませんでした：${err}`));


}
*/
