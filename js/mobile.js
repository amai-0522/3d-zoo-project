// ========================================================
// 1. Firebaseの設定
// ========================================================
const firebaseConfig = {
  apiKey: "AIzaSyDMO7JZ7LPyvox8Q7SG_hFyODNZs-8Z9HI",
  authDomain: "d-zoo-project.firebaseapp.com",
  projectId: "d-zoo-project",
  storageBucket: "d-zoo-project.firebasestorage.app",
  messagingSenderId: "961516224972",
  appId: "1:961516224972:web:59439f07ea7b4456dd5d69",
  measurementId: "G-1DC2PMC8X1"
};

// Firebaseの初期化（安全設計）
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const storage = firebase.storage();

// ========================================================
// 2. スマホ画面処理
// ========================================================
document.addEventListener('DOMContentLoaded', () => {
  const imageInput = document.getElementById('image-input');
  const uploadText = document.getElementById('upload-text');
  const previewContainer = document.getElementById('preview-container');
  const imagePreview = document.getElementById('image-preview');
  const sendButton = document.getElementById('send-button');

  let selectedFile = null;

  // 写真が選択された時の処理
  imageInput.addEventListener('change', (e) => {
      selectedFile = e.target.files[0];
      if (selectedFile && selectedFile.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (event) => {
              imagePreview.src = event.target.result;
              uploadText.style.display = 'none';
              previewContainer.style.display = 'block';
              sendButton.disabled = false; // ボタンを押せるようにする
          };
          reader.readAsDataURL(selectedFile);
      }
  });

  // 「動物園に送り込む！」ボタンを押した時の処理
  sendButton.addEventListener('click', async () => {
      if (!selectedFile) {
          alert("写真が選択されていません");
          return;
      }

      // 連打防止・ローディング表示
      sendButton.disabled = true;
      sendButton.innerText = "通信中...";

      try {
          console.log("アップロード開始...", selectedFile.name);

          // ① 画像をFirebase Storageへ送信
          const storageRef = storage.ref().child(`zoo_images/${Date.now()}_${selectedFile.name}`);
          
          // アップロードを実行
          const snapshot = await storageRef.put(selectedFile);
          console.log("Storage保存成功。URLを取得します...");
          
          // 保存された画像のURLを取得
          const imageUrl = await snapshot.ref.getDownloadURL();
          console.log("URL取得成功:", imageUrl);

          // ② Firestoreにリクエストを追記
          await db.collection('zoo_animals').add({
              imageUrl: imageUrl,
              status: 'pending',
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });

          alert("🎉成功：動物園に写真を送信しました！PC画面のAI生成をお楽しみに！");
          location.reload();

      } catch (error) {
          console.error("送信エラー詳細:", error);
          
          // 🌟 どこで止まっても必ずエラー内容をアラートでポップアップさせます
          alert("❌送信失敗エラーが発生しました！\n理由: " + error.message);
          
          // ボタンを元に戻す
          sendButton.disabled = false;
          sendButton.innerText = "動物園に送り込む！";
      }
  });
});