// ==========================================
// 1. Three.js で3D空間の土台を作る
// ==========================================
let scene, camera, renderer, cube;

function init3D() {
    const container = document.getElementById('canvas-container');
    if (!container) return;

    // 空間（シーン）を作成
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a); // 背景を暗めのグレーに

    // カメラを設定（視野角、アスペクト比、手前、奥）
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    // レンダラー（描画マシン）を設定して画面に追加
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    // 【仮のオブジェクト】真ん中に立方体をひとつ浮かべる
    const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff88, wireframe: true });
    cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    // 画面サイズが変更されたときのレスポンシブ対応
    window.addEventListener('resize', onWindowResize);

    // アニメーションループ開始
    animate();
}

// 毎フレーム実行されるループ関数（ここで立方体を回す）
function animate() {
    requestAnimationFrame(animate);

    if (cube) {
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
    }

    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ==========================================
// 2. スマホ接続用のQRコードを自動生成する
// ==========================================
function generateQRCode() {
    // 現在のGitHub PagesのURLから、自動でmobile.htmlへのパスを計算
    const mobileUrl = window.location.origin + window.location.pathname.replace('index.html', '') + 'mobile.html';
    const qrContainer = document.getElementById('qrcode-container');
    
    if (qrContainer) {
        qrContainer.innerHTML = '';
        new QRCode(qrContainer, {
            text: mobileUrl,
            width: 160,
            height: 160,
            colorDark: "#ffffff",  // スタイリッシュに白黒反転
            colorLight: "#1a1a1a"
        });
    }
}

// 画面が読み込まれたら両方を実行
window.addEventListener('DOMContentLoaded', () => {
    init3D();
    generateQRCode();
});