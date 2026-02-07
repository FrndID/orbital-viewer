import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import TWEEN from '@tweenjs/tween.js';

// --- KONSTANTA FISIKA ---
const R_EARTH_KM = 6371; 
const GM = 398600; 
const MOON_DIST_KM = 384400;
const MOON_RADIUS_KM = 1737;
const toUnits = (km) => km / R_EARTH_KM;

// --- SETUP SCENE ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x00050a);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(15, 12, 15);

// --- PERBAIKAN WEBGL COMPATIBILITY ---
let renderer;
try {
    // Memaksa penggunaan WebGL 1 (Legacy) untuk kompatibilitas Windows 7
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!context) {
        throw new Error("Browser/GPU tidak mendukung WebGL sama sekali.");
    }

    renderer = new THREE.WebGLRenderer({ 
        canvas: canvas,
        antialias: false, // Matikan antialias untuk performa di GPU tua
        precision: "mediump", // Gunakan presisi medium agar lebih ringan
        powerPreference: "high-performance"
    });
} catch (e) {
    alert("Error: Perangkat Anda tidak mendukung WebGL. Harap perbarui driver GPU Anda.");
    console.error(e);
}

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// --- OPTIMASI GEOMETRY UNTUK DEVICE LAMA ---
// Gunakan jumlah segmen yang lebih sedikit agar beban GPU berkurang
const earthGeo = new THREE.SphereGeometry(toUnits(R_EARTH_KM), 32, 32); 
const earthMat = new THREE.MeshPhongMaterial({ color: 0x2233ff, emissive: 0x000011 });
const earth = new THREE.Mesh(earthGeo, earthMat);
scene.add(earth);

const moonGeo = new THREE.SphereGeometry(toUnits(MOON_RADIUS_KM), 16, 16);
const moonMat = new THREE.MeshPhongMaterial({ color: 0xaaaaaa });
const moon = new THREE.Mesh(moonGeo, moonMat);
moon.position.set(toUnits(MOON_DIST_KM), 0, 0);
scene.add(moon);

const satellite = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffff00 })
);
scene.add(satellite);

// Light
const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
sunLight.position.set(100, 50, 100);
scene.add(sunLight, new THREE.AmbientLight(0x404040, 0.8));

// --- LOGIKA FOKUS & TELEMETRY ---
let focusedObject = null;
let satState = { altitude: 35786, angle: 0, omega: 0 };

function setFocus(target) {
    focusedObject = target;
    let targetPos = new THREE.Vector3(0, 0, 0);
    if (target === 'satellite') targetPos.copy(satellite.position);
    else if (target === 'moon') targetPos.copy(moon.position);

    new TWEEN.Tween(controls.target)
        .to({ x: targetPos.x, y: targetPos.y, z: targetPos.z }, 800)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();
}

function updateTelemetry(altitude) {
    const r = R_EARTH_KM + altitude;
    const v = Math.sqrt(GM / r);
    satState.omega = v / r;
    $('#data-velocity').text(v.toFixed(3));
    $('#data-period').text(((2 * Math.PI * Math.sqrt(Math.pow(r, 3) / GM)) / 60).toFixed(1));
}

// --- INITIALIZATION ---
$(document).ready(function() {
    const $container = $('#simulation-container');
    renderer.setSize($container.width(), $container.height());
    $container.append(renderer.domElement);

    updateTelemetry(satState.altitude);

    $('#btn-update').click(() => {
        satState.altitude = parseFloat($('#altitude-input').val()) || 0;
        updateTelemetry(satState.altitude);
    });

    $('#focus-earth').click(() => setFocus(null));
    $('#focus-sat').click(() => setFocus('satellite'));
    $('#focus-moon').click(() => setFocus('moon'));

    $('#btn-view-top').click(() => { setFocus(null); camera.position.set(0, 100, 0); });
    $('#time-scale').on('input', function() { $('#time-val').text($(this).val() + 'x'); });
});

const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const tScale = parseFloat($('#time-scale').val()) || 1;
    TWEEN.update();

    satState.angle += satState.omega * delta * tScale;
    const rUnits = toUnits(R_EARTH_KM + satState.altitude);
    satellite.position.set(Math.cos(satState.angle) * rUnits, 0, Math.sin(satState.angle) * rUnits);

    if (focusedObject === 'satellite') controls.target.copy(satellite.position);
    else if (focusedObject === 'moon') controls.target.copy(moon.position);

    controls.update();
    renderer.render(scene, camera);
}
animate();
