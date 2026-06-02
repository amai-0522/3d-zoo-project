function generateQRCode() {
  // 開いているURLから自動でスマホ用のURLを作る
  const mobileUrl = window.location.origin + window.location.pathname.replace('index.html', '') + 'mobile.html';
  const qrContainer = document.getElementById('qrcode-container');
  
  if (qrContainer) {
      qrContainer.innerHTML = '';
      new QRCode(qrContainer, {
          text: mobileUrl,
          width: 200,
          height: 200
      });
  }
}
window.addEventListener('DOMContentLoaded', generateQRCode);