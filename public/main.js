window.addEventListener("DOMContentLoaded", () => {
    const liffId = '1661289930-qLmEmZ8w';
    // LIFF 初期化
    liff.init({
        liffId: liffId
    })
        .then(() => {
            initializeApp();
        })
        .catch((err) => {
            alert(err);
        })
});

function initializeApp() {
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

// LINEのプロフィール情報を取得する。
async function getlineProfile() {
    let json_result = {};
    const idtoken = liff.getIDToken();
    const jsonData = JSON.stringify({
        id_token: idtoken
    });
    // LINEプロフィール取得
    await fetch('/api', {
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
                    json_result = json;
                })
        })
        .catch((err) => {
            alert(err);
        })
        .finally{
        return json_result;
    }
}

function sendText(msg) {
    liff.sendMessages([
        {
            'type': 'text',
            'text': msg
        }
    ]).then(function () {
        liff.closeWindow();
    }).catch(function (err) {
        alert('Failed to send message ' + err);
    });
}
