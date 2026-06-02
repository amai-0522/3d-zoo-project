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

// ========================================================
// ★ご自身のTripo3D APIキー（tsk_...）をここに貼り付け！★
// ========================================================
const TRIPO_API_KEY = "YOUR_TRIPO_API_KEY"; 

let scene, camera, renderer, gltfLoader;
const animals = [];

function init3D() {
  const container = document.getElementById('canvas-container');
  if (!container) return;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x121212);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 3, 8);
  camera.lookAt(0, 1, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 10, 5);
  scene.add(directionalLight);

  gltfLoader = new THREE.GLTFLoader();

  window.addEventListener('resize', onWindowResize);
  animate();
}

function animate() {
  requestAnimationFrame(animate);
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

function startListeningForAnimals() {
  const logDiv = document.getElementById('status-log');

  db.collection('zoo_animals').where('status', '==', 'pending')
  .onSnapshot((snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
          if (change.type === 'added') {
              const docId = change.doc.id;
              const animalData = change.doc.data();
              
              logDiv.innerText = "🐾 新しい写真を受信！AIで3Dモデルを生成中...";
              db.collection('zoo_animals').doc(docId).update({ status: 'processing' });

              try {
                  // 🌟 Tripo3Dの画像変換モード（image_to_model）に修正しました
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
                  const taskId = resData.data.task_id;

                  checkAiTaskStatus(taskId, docId, logDiv);

              } catch (err) {
                  console.error("AIタスク作成失敗:", err);
                  logDiv.innerText = "❌ AIタスクの作成に失敗しました";
              }
          }
      });
  });
}

async function checkAiTaskStatus(taskId, docId, logDiv) {
  const checkInterval = setInterval(async () => {
      try {
          const checkRes = await fetch(`https://api.tripo3d.ai/v2/task/${taskId}`, {
              headers: { 'Authorization': `Bearer ${TRIPO_API_KEY}` }
          });
          const checkData = await checkRes.json();
          const status = checkData.data.status;

          if (status === 'success') {
              clearInterval(checkInterval);
              logDiv.innerText = "✨ 3Dモデル完成！動物園に配置します！";
              
              const glbUrl = checkData.data.output.glb;

              gltfLoader.load(glbUrl, (gltf) => {
                  const model = gltf.scene;
                  model.position.set((Math.random() - 0.5) * 4, 0, (Math.random() - 0.5) * 2);
                  model.scale.set(1.5, 1.5, 1.5);
                  scene.add(model);
                  animals.push(model);
                  
                  db.collection('zoo_animals').doc(docId).update({ status: 'completed', glbUrl: glbUrl });
              });

          } else if (status === 'failed') {
              clearInterval(checkInterval);
              logDiv.innerText = "❌ AIによる3Dモデル生成に失敗しました";
              db.collection('zoo_animals').doc(docId).update({ status: 'failed' });
          } else {
              logDiv.innerText = "⏳ AIが絶賛モデリング中... (約10〜15秒かかります)";
          }
      } catch (err) {
          console.error("ステータス確認エラー:", err);
      }
  }, 3000);
}

window.addEventListener('DOMContentLoaded', () => {
  init3D();
  startListeningForAnimals();
  generateQRCode();
});