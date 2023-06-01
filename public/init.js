//import liff from '@line/liff';
//import LIFFInspectorPlugin from '@line/liff-inspector';

const liffId = '1660856020-lm6XRQgz';
console.log("scriptタグ内の記述が読み込まれました。");
//liff.use(new LIFFInspectorPlugin());

liff.init({
	liffId: liffId,
	withLoginOnExternalBrowser: true, // 外部ブラウザでのLIFFアプリ初期化時にliff.login()を自動で実行する。
}).then(() => {
	console.log("liff.initが読み込まれました。");
	getProfile();
}).catch((err) => {
	alert(err);
})
