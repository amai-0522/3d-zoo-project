document.addEventListener('DOMContentLoaded', () => {
  const imageInput = document.getElementById('image-input');
  const uploadText = document.getElementById('upload-text');
  const previewContainer = document.getElementById('preview-container');
  const imagePreview = document.getElementById('image-preview');
  const sendButton = document.getElementById('send-button');
  const dropZone = document.getElementById('drop-zone');

  // スマホで写真が選択されたときの処理
  imageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      
      if (file && file.type.startsWith('image/')) {
          const reader = new FileReader();

          // 画像の読み込みが完了したらプレビューにセット
          reader.onload = (event) => {
              imagePreview.src = event.target.result;
              
              // 見た目の切り替え（文字を隠して、画像を表示）
              uploadText.style.display = 'none';
              previewContainer.style.display = 'block';
              
              // 送信ボタンを押せるようにする！
              sendButton.disabled = false;
          };

          reader.readAsDataURL(file);
      }
  });
});