import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- KONSTANTA FISIKA & SKALA ---
const R_EARTH_KM = 6371; 
const GM = 398600; 
const MOON_DIST_KM = 384400;
const MOON_RADIUS_KM = 1737;

// Konversi km ke unit Three.js (1 Unit = 1 Radius Bumi)
const toUnits = (km) => km / R_EARTH_KM;

// --- SETUP SCENE ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x00050a);

// Far plane dinaikkan ke 2000 agar Bulan (60 unit) tidak hilang
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(15, 12, 15);

const renderer = new THREE.WebGLRenderer({ antialias: true });
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// --- LIGHTING ---
const sunLight = new THREE.DirectionalLight(0xffffff, 2.5);
sunLight.position.set(100, 50, 100);
scene.add(sunLight);
scene.add(new THREE.AmbientLight(0x404040, 0.8));

// --- OBJEK: BUMI ---
const earthGeo = new THREE.SphereGeometry(toUnits(R_EARTH_KM), 64, 64);
const earthMat = new THREE.MeshPhongMaterial({ 
    color: 0x2233ff, 
    emissive: 0x000011,
    shininess: 15 
});
const earth = new THREE.Mesh(earthGeo, earthMat);
scene.add(earth);

const earthWire = new THREE.LineSegments(
    new THREE.WireframeGeometry(earthGeo),
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15 })
);
earth.add(earthWire);

// --- OBJEK: BULAN ---
const moonGeo = new THREE.SphereGeometry(toUnits(MOON_RADIUS_KM), 32, 32);
const moonMat = new THREE.MeshPhongMaterial({ color: 0xaaaaaa });
const moon = new THREE.Mesh(moonGeo, moonMat);
// Posisi Bulan sesuai skala real (60.3 R_E)
moon.position.set(toUnits(MOON_DIST_KM), 0, 0);
scene.add(moon);

// --- VISUALISASI ORBIT (GRID) ---
const createOrbitRing = (alt, color, opacity = 0.4) => {
    const radius = toUnits(R_EARTH_KM + alt);
    const geometry = new THREE.RingGeometry(radius - 0.02, radius + 0.02, 128);
    const material = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide, transparent: true, opacity: opacity });
    const ring = new THREE.Mesh(geometry, material);
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);
};

// Render Zona Orbital
createOrbitRing(100, 0xff0000, 0.8);   // Karman Line
createOrbitRing(2000, 0x00ff00, 0.3);  // LEO Boundary
createOrbitRing(35786, 0x00ffff, 0.5); // GEO

// --- OBJEK: SATELIT ---
const satGeo = new THREE.SphereGeometry(0.15, 16, 16); // Ukuran visual agar terlihat
const satMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const satellite = new THREE.Mesh(satGeo, satMat);
scene.add(satellite);

// --- STATE & LOGIKA ---
let satState = {
    altitude: 35786,
    angle: 0,
    omega: 0
};

function calculatePhysics(altitude) {
    const r = R_EARTH_KM + altitude;
    const v = Math.sqrt(GM / r); // Orbital velocity km/s
    const omega = v / r;        // Angular velocity rad/s
    const period = (2 * Math.PI * Math.sqrt(Math.pow(r, 3) / GM)) / 60; // Minutes
    return { v, omega, period };
}

function updateTelemetry(altitude) {
    const physics = calculatePhysics(altitude);
    satState.omega = physics.omega;

    let zone = "Deep Space";
    if (altitude < 100) zone = "Sub-Orbital";
    else if (altitude <= 2000) zone = "LEO";
    else if (altitude < 35786) zone = "MEO";
    else if (altitude <= 35900) zone = "GEO";

    // Update UI via jQuery
    $('#data-zone').text(zone);
    $('#data-velocity').text(physics.v.toFixed(3));
    $('#data-period').text(physics.period.toFixed(1));
}

// --- INITIALIZATION & EVENTS ---
$(document).ready(function() {
    const $container = $('#simulation-container');
    renderer.setSize($container.width(), $container.height());
    $container.append(renderer.domElement);

    updateTelemetry(satState.altitude);

    $('#btn-update').click(() => {
        const val = parseFloat($('#altitude-input').val());
        if (!isNaN(val) && val >= 0) {
            satState.altitude = val;
            updateTelemetry(val);
        }
    });

    $('#btn-view-top').click(() => {
        camera.position.set(0, 80, 0);
        camera.lookAt(0, 0, 0);
    });

    $('#btn-view-iso').click(() => {
        camera.position.set(15, 12, 15);
        camera.lookAt(0, 0, 0);
    });

    $('#time-scale').on('input', function() {
        $('#time-val').text($(this).val() + 'x');
    });
});

// --- RENDER LOOP ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const tScale = parseFloat($('#time-scale').val()) || 1;

    // Gerakan Satelit
    satState.angle += satState.omega * delta * tScale;
    const rUnits = toUnits(R_EARTH_KM + satState.altitude);
    satellite.position.set(
        Math.cos(satState.angle) * rUnits,
        0,
        Math.sin(satState.angle) * rUnits
    );

    // Rotasi Bumi
    earth.rotation.y += 0.0002 * tScale;

    controls.update();
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();