//import liff from '@line/liff';
//import LIFFInspectorPlugin from '@line/liff-inspector';

const liffId = '1660856020-lm6XRQgz';
console.log("script�^�O���̋L�q���ǂݍ��܂�܂����B");
//liff.use(new LIFFInspectorPlugin());

liff.init({
	liffId: liffId,
	withLoginOnExternalBrowser: true, // �O���u���E�U�ł�LIFF�A�v������������liff.login()�������Ŏ��s����B
}).then(() => {
	console.log("liff.init���ǂݍ��܂�܂����B");
	getProfile();
}).catch((err) => {
	alert(err);
})
