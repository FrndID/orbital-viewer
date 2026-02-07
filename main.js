import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import TWEEN from '@tweenjs/tween.js';

// --- KONSTANTA ---
const R_EARTH_KM = 6371; 
const GM = 398600; 
const MOON_DIST_KM = 384400;
const toUnits = (km) => km / R_EARTH_KM;

// --- INITIALIZE RENDERER (WEBGL 1 FOR WIN 7) ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000); // Black for high contrast

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 3000);
camera.position.set(20, 15, 20);

const renderer = new THREE.WebGL1Renderer({ antialias: false }); // Disable for performance
renderer.setSize(window.innerWidth, window.innerHeight);

// --- GRID SISTEM (REFERENSI SPASIAL) ---
// Grid utama pada bidang ekuator
const grid = new THREE.GridHelper(200, 50, 0x444444, 0x222222);
scene.add(grid);

// --- OBJEK ---
// Bumi dengan Wireframe kontras tinggi
const earth = new THREE.Mesh(
    new THREE.SphereGeometry(toUnits(R_EARTH_KM), 32, 32),
    new THREE.MeshBasicMaterial({ color: 0x0000ff, wireframe: true }) 
);
scene.add(earth);

// Satelit (Titik Kuning Terang)
const satellite = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffff00 })
);
scene.add(satellite);

// Bulan (Titik Abu-abu)
const moon = new THREE.Mesh(
    new THREE.SphereGeometry(toUnits(1737), 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xaaaaaa, wireframe: true })
);
moon.position.set(toUnits(MOON_DIST_KM), 0, 0);
scene.add(moon);

// --- GARIS ORBIT (KONTRAST TINGGI) ---
function createOrbitLine(altitude, color) {
    const radius = toUnits(R_EARTH_KM + altitude);
    const curve = new THREE.EllipseCurve(0, 0, radius, radius);
    const points = curve.getPoints(128);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: color, linewidth: 2 });
    const orbitLine = new THREE.Line(geometry, material);
    orbitLine.rotation.x = Math.PI / 2;
    scene.add(orbitLine);
}

// Tambahkan Garis Orbit Standar
createOrbitLine(2000, 0x00ff00);  // LEO (Hijau)
createOrbitLine(35786, 0x00ffff); // GEO (Cyan)

// --- LOGIKA KONTROL ---
let focusedObject = null;
let satState = { altitude: 35786, angle: 0, omega: 0 };
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

function setFocus(target) {
    focusedObject = target;
    let targetPos = new THREE.Vector3(0, 0, 0);
    if (target === 'satellite') targetPos.copy(satellite.position);
    else if (target === 'moon') targetPos.copy(moon.position);

    new TWEEN.Tween(controls.target)
        .to({ x: targetPos.x, y: targetPos.y, z: targetPos.z }, 800)
        .start();
}

function updatePhysics(altitude) {
    const r = R_EARTH_KM + altitude;
    satState.omega = Math.sqrt(GM / r) / r;
    $('#data-velocity').text(Math.sqrt(GM / r).toFixed(2));
}

// --- DOM READY ---
$(document).ready(function() {
    $('#simulation-container').append(renderer.domElement);
    updatePhysics(satState.altitude);

    $('#btn-update').click(() => {
        satState.altitude = parseFloat($('#altitude-input').val()) || 0;
        updatePhysics(satState.altitude);
    });

    $('#focus-earth').click(() => setFocus(null));
    $('#focus-sat').click(() => setFocus('satellite'));
    $('#focus-moon').click(() => setFocus('moon'));
    
    $('#btn-view-top').click(() => {
        setFocus(null);
        camera.position.set(0, 150, 0);
    });

    $('#time-scale').on('input', function() {
        $('#time-val').text($(this).val() + 'x');
    });
});

// --- ANIMATION ---
const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const tScale = parseFloat($('#time-scale').val()) || 1;
    TWEEN.update();

    // Orbit Satelit
    satState.angle += satState.omega * delta * tScale;
    const r = toUnits(R_EARTH_KM + satState.altitude);
    satellite.position.set(Math.cos(satState.angle) * r, 0, Math.sin(satState.angle) * r);

    // Camera Tracking
    if (focusedObject === 'satellite') controls.target.copy(satellite.position);
    else if (focusedObject === 'moon') controls.target.copy(moon.position);

    controls.update();
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
