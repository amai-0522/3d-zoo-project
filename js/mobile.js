const firebaseConfig = {
  apiKey: "AIzaSyDMO7JZ7LPyvox8Q7SG_hFyODNZs-8Z9HI",
  authDomain: "d-zoo-project.firebaseapp.com",
  projectId: "d-zoo-project",
  storageBucket: "d-zoo-project.firebasestorage.app",
  messagingSenderId: "961516224972",
  appId: "1:961516224972:web:59439f07ea7b4456dd5d69",
  measurementId: "G-1DC2PMC8X1"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();

document.addEventListener('DOMContentLoaded', () => {
  const imageInput = document.getElementById('image-input');
  const uploadText = document.getElementById('upload-text');
  const previewContainer = document.getElementById('preview-container');
  const imagePreview = document.getElementById('image-preview');
  const sendButton = document.getElementById('send-button');

  let selectedFile = null;

  imageInput.addEventListener('change', (e) => {
      selectedFile = e.target.files[0];
      if (selectedFile && selectedFile.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (event) => {
              imagePreview.src = event.target.result;
              uploadText.style.display = 'none';
              previewContainer.style.display = 'block';
              sendButton.disabled = false;
          };
          reader.readAsDataURL(selectedFile);
      }
  });

  sendButton.addEventListener('click', async () => {
      if (!selectedFile) return;

      sendButton.disabled = true;
      sendButton.innerText = "送信中...";

      try {
          // ① 画像をFirebase Storageへ送信
          const storageRef = storage.ref(`zoo_images/${Date.now()}_${selectedFile.name}`);
          const snapshot = await storageRef.put(selectedFile);
          const imageUrl = await snapshot.ref.getDownloadURL();

          // ② Firestoreにリクエストを追記
          await db.collection('zoo_animals').add({
              imageUrl: imageUrl,
              status: 'pending',
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });

          alert("動物園に写真を送信しました！PC画面のAI生成をお楽しみに！");
          location.reload();

      } catch (error) {
          console.error("送信エラー:", error);
          // 🌟 エラー内容をそのまま画面に出すようにしました
          alert("エラー詳細: " + error.message);
          sendButton.disabled = false;
          sendButton.innerText = "動物園に送り込む！";
      }
  });
});