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

// Firebaseの初期化（二重初期化を防ぐ安全設計）
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// ========================================================
// 2. Tripo3D AI設定（★ご自身のAPIキーをここに貼り付け！★）
// ========================================================
const TRIPO_API_KEY = "tsk_DsvEMDOKmX-cJHcztnrtp3g9bTZuL9pqafaim92Yiie"; 

// ========================================================
// 3. Three.js 3D空間のセットアップ
// ========================================================
let scene, camera, renderer, gltfLoader;
const animals = []; // 生成された動物たちをストックする配列

function init3D() {
  const container = document.getElementById('canvas-container');
  if (!container) return;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x121212); // カッコレースな黒背景

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 3, 8);
  camera.lookAt(0, 1, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  // AIモデルが綺麗に見えるように光（ライト）を当てる
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 10, 5);
  scene.add(directionalLight);

  // GLTF (.glb) 読み込み用のマシーンを準備
  gltfLoader = new THREE.GLTFLoader();

  window.addEventListener('resize', onWindowResize);
  animate();
}

function animate() {
  requestAnimationFrame(animate);
  // 登場した動物たちをゆっくり回転させる
  animals.forEach(animal => {
      animal.rotation.y += 0.01;
  });
  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ========================================================
// 4. Firebase監視 ＆ Tripo3D AIによる自動3D化システム
// ========================================================
function startListeningForAnimals() {
  const logDiv = document.getElementById('status-log');

  // データベースの「zoo_animals」に新しいデータ（pending）が入るのをリアルタイム監視
  db.collection('zoo_animals').where('status', '==', 'pending')
  .onSnapshot((snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
          if (change.type === 'added') {
              const docId = change.doc.id;
              const animalData = change.doc.data();
              
              if (logDiv) logDiv.innerText = "🐾 新しい写真を受信！AIで3Dモデルを生成中...";
              
              // データベースのステータスを「processing（処理中）」に更新して重複を防ぐ
              db.collection('zoo_animals').doc(docId).update({ status: 'processing' });

              try {
                  // Tripo3Dの画像変換モード（image_to_model）でタスクを送信
                  const response = await fetch('https://api.tripo3d.ai/v2/task', {
                      method: 'POST',
                      headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${TRIPO_API_KEY}`
                      },
                      body: JSON.stringify({
                          type: 'image_to_model', 
                          file: {
                              type: 'jpg',
                              url: animalData.imageUrl
                          }
                      })
                  });
                  const resData = await response.json();
                  
                  if (!resData.data || !resData.data.task_id) {
                      throw new Error(resData.message || "タスクIDの取得に失敗しました。APIキーを確認してください。");
                  }
                  
                  const taskId = resData.data.task_id;

                  // AIの生成が終わるまで数秒おきにチェックする（ポーリング開始）
                  checkAiTaskStatus(taskId, docId, logDiv);

              } catch (err) {
                  console.error("AIタスク作成失敗:", err);
                  if (logDiv) logDiv.innerText = "❌ AIタスクの作成に失敗しました: " + err.message;
              }
          }
      });
  });
}

// AIの進捗を何度も確認する関数
async function checkAiTaskStatus(taskId, docId, logDiv) {
  const checkInterval = setInterval(async () => {
      try {
          const checkRes = await fetch(`https://api.tripo3d.ai/v2/task/${taskId}`, {
              headers: { 'Authorization': `Bearer ${TRIPO_API_KEY}` }
          });
          const checkData = await checkRes.json();
          
          if (!checkData.data) return;
          const status = checkData.data.status;

          if (status === 'success') {
              clearInterval(checkInterval);
              if (logDiv) logDiv.innerText = "✨ 3Dモデル完成！動物園に配置します！";
              
              // AIが生成してくれた本物の3Dデータ(.glb)のURLを取得
              const glbUrl = checkData.data.output.glb;

              // 完成した.glbファイルをThree.jsの空間に召喚する！
              gltfLoader.load(glbUrl, (gltf) => {
                  const model = gltf.scene;
                  // 出現位置をランダムにばらす（横並びになるように）
                  model.position.set((Math.random() - 0.5) * 4, 0, (Math.random() - 0.5) * 2);
                  model.scale.set(1.5, 1.5, 1.5); // モデルの大きさ調整
                  scene.add(model);
                  animals.push(model); // 回転アニメーション対象に入れる
                  
                  // データベースのステータスを「completed（完了）」にする
                  db.collection('zoo_animals').doc(docId).update({ status: 'completed', glbUrl: glbUrl });
              });

          } else if (status === 'failed') {
              clearInterval(checkInterval);
              if (logDiv) logDiv.innerText = "❌ AIによる3Dモデル生成に失敗しました";
              db.collection('zoo_animals').doc(docId).update({ status: 'failed' });
          } else {
              if (logDiv) logDiv.innerText = "⏳ AIが絶賛モデリング中... (約10〜15秒かかります)";
          }
      } catch (err) {
          console.error("ステータス確認エラー:", err);
      }
  }, 3000); // 3秒おきに確認
}

// ========================================================
// 5. QRコード自動生成
// ========================================================
function generateQRCode() {
  const mobileUrl = window.location.origin + window.location.pathname.replace('index.html', '') + 'mobile.html';
  const qrContainer = document.getElementById('qrcode-container');
  if (qrContainer) {
      qrContainer.innerHTML = '';
      new QRCode(qrContainer, {
          text: mobileUrl,
          width: 160,
          height: 160,
          colorDark: "#ffffff",
          colorLight: "#121212"
      });
  }
}

// ========================================================
// 6. 実行トリガー（安全第一の順序）
// ========================================================
window.addEventListener('DOMContentLoaded', () => {
  // ① まず何よりも先にQRコードを絶対に表示する！
  generateQRCode();
  
  // ② そのあとにThree.jsの3D空間を作る
  init3D();
  
  // ③ 最後にエラーが起きやすいFirebaseの監視を安全にスタート
  try {
      startListeningForAnimals();
  } catch (e) {
      console.error("Firebaseの監視開始でエラー:", e);
  }
});