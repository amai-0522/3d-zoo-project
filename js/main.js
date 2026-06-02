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

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// ========================================================
// 2. Tripo3D AI設定
// ========================================================
const TRIPO_API_KEY = "YOUR_API_KEY_HERE";

// ========================================================
// 3. Three.js 空間セットアップ
// ========================================================
let scene, camera, renderer, gltfLoader;
const animals = [];

function init3D() {
  const container = document.getElementById('canvas-container');
  if (!container) return;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x121212);

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  camera.position.set(0, 3, 8);
  camera.lookAt(0, 1, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  const light = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(light);

  gltfLoader = new THREE.GLTFLoader();

  animate();
}

function animate() {
  requestAnimationFrame(animate);

  animals.forEach(a => {
    a.rotation.y += 0.01;
  });

  renderer.render(scene, camera);
}

// ========================================================
// 4. AI連携システム
// ========================================================
function startListeningForAnimals() {
  const logDiv = document.getElementById('status-log');

  db.collection('zoo_animals')
    .where('status', '==', 'pending')
    .onSnapshot((snapshot) => {

      snapshot.docChanges().forEach(async (change) => {

        if (change.type === 'added') {

          const docId = change.doc.id;
          const data = change.doc.data();

          if (logDiv) {
            logDiv.innerText = "🐾 受信！AIに生成を依頼中...";
          }

          db.collection('zoo_animals')
            .doc(docId)
            .update({ status: 'processing' });

          const createWithRetry = async (retries = 5) => {

            for (let i = 0; i < retries; i++) {

              try {

                const res = await fetch(
                  'https://api.tripo3d.ai/v2/task',
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${TRIPO_API_KEY}`
                    },
                    body: JSON.stringify({
                      type: 'image_to_model',
                      file: {
                        type: 'jpg',
                        url: data.imageUrl
                      }
                    })
                  }
                );

                const json = await res.json();

                console.log(json);

                if (json.data && json.data.task_id) {
                  checkAiTaskStatus(
                    json.data.task_id,
                    docId,
                    logDiv
                  );
                  return;
                }

              } catch (e) {
                console.error(e);
                await new Promise(r => setTimeout(r, 2000));
              }
            }

            if (logDiv) {
              logDiv.innerText =
                "❌ 生成失敗。もう一度送信してください。";
            }
          };

          createWithRetry();
        }
      });
    });
}

async function checkAiTaskStatus(taskId, docId, logDiv) {

  const timer = setInterval(async () => {

    try {

      const res = await fetch(
        `https://api.tripo3d.ai/v2/task/${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${TRIPO_API_KEY}`
          }
        }
      );

      const json = await res.json();

      console.log(json);

      if (!json.data) return;

      if (json.data.status === 'success') {

        clearInterval(timer);

        logDiv.innerText = "✨ 生成完了！";

        gltfLoader.load(
          json.data.output.glb,
          (gltf) => {

            const m = gltf.scene;

            m.position.set(
              (Math.random() - 0.5) * 4,
              0,
              (Math.random() - 0.5) * 2
            );

            scene.add(m);
            animals.push(m);

            db.collection('zoo_animals')
              .doc(docId)
              .update({
                status: 'completed'
              });
          }
        );

      } else {

        logDiv.innerText =
          "⏳ AIモデリング中...";
      }

    } catch (e) {
      console.error(e);
    }

  }, 5000);
}

// ========================================================
// 5. 起動
// ========================================================
window.addEventListener('DOMContentLoaded', () => {

  const mobileUrl =
    window.location.origin +
    window.location.pathname.replace(
      'index.html',
      ''
    ) +
    'mobile.html';

  new QRCode(
    document.getElementById('qrcode-container'),
    mobileUrl
  );

  init3D();
  startListeningForAnimals();
});