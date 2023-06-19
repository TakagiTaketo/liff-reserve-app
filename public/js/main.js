function sendText(msg) {
    liff.sendMessages([
        {
            'type': 'text',
            'text': msg
        }
    ]).then(function () {
        liff.closeWindow();
    }).catch(function (err) {
        alert('メッセージの送信に失敗しました。\n ' + err);
    });
}
