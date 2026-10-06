import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GENES } from "../data/genes";

export default function DNABackground({ mouse }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 0, 13);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // ---- group holding the whole helix, offset to the right ----
    const helixGroup = new THREE.Group();
    helixGroup.position.set(2.6, 0, 0);
    scene.add(helixGroup);

    // ---- helix geometry parameters ----
    const turns = 4.2;
    const pointsPerTurn = 26;
    const totalPoints = Math.floor(turns * pointsPerTurn);
    const radius = 1.35;
    const height3d = 9.5;

    const colorA = new THREE.Color(0x1fa5b5); // primary
    const colorB = new THREE.Color(0x3a7bd5); // secondary
    const colorRung = new THREE.Color(0x7ed7c1); // accent

    const strandA = [];
    const strandB = [];

    const sphereGeo = new THREE.SphereGeometry(0.055, 10, 10);
    const matA = new THREE.MeshBasicMaterial({ color: colorA, transparent: true, opacity: 0.95 });
    const matB = new THREE.MeshBasicMaterial({ color: colorB, transparent: true, opacity: 0.95 });

    const nodesA = [];
    const nodesB = [];
    const rungs = [];

    for (let i = 0; i <= totalPoints; i++) {
      const t = i / pointsPerTurn;
      const angle = t * Math.PI * 2;
      const y = height3d / 2 - (i / totalPoints) * height3d;

      const xA = Math.cos(angle) * radius;
      const zA = Math.sin(angle) * radius;
      const xB = Math.cos(angle + Math.PI) * radius;
      const zB = Math.sin(angle + Math.PI) * radius;

      strandA.push(new THREE.Vector3(xA, y, zA));
      strandB.push(new THREE.Vector3(xB, y, zB));

      const nodeA = new THREE.Mesh(sphereGeo, matA);
      nodeA.position.set(xA, y, zA);
      helixGroup.add(nodeA);
      nodesA.push(nodeA);

      const nodeB = new THREE.Mesh(sphereGeo, matB);
      nodeB.position.set(xB, y, zB);
      helixGroup.add(nodeB);
      nodesB.push(nodeB);

      // base-pair rungs every few steps
      if (i % 3 === 0) {
        const rungGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(xA, y, zA),
          new THREE.Vector3(xB, y, zB),
        ]);
        const rungMat = new THREE.LineBasicMaterial({
          color: colorRung,
          transparent: true,
          opacity: 0.28,
        });
        const rung = new THREE.Line(rungGeo, rungMat);
        helixGroup.add(rung);
        rungs.push(rung);
      }
    }

    // backbone lines connecting each strand's nodes
    const curveA = new THREE.CatmullRomCurve3(strandA);
    const curveB = new THREE.CatmullRomCurve3(strandB);
    const backboneGeoA = new THREE.BufferGeometry().setFromPoints(curveA.getPoints(240));
    const backboneGeoB = new THREE.BufferGeometry().setFromPoints(curveB.getPoints(240));
    const backboneMatA = new THREE.LineBasicMaterial({ color: colorA, transparent: true, opacity: 0.5 });
    const backboneMatB = new THREE.LineBasicMaterial({ color: colorB, transparent: true, opacity: 0.5 });
    helixGroup.add(new THREE.Line(backboneGeoA, backboneMatA));
    helixGroup.add(new THREE.Line(backboneGeoB, backboneMatB));

    // ---- traveling glow particles along the strands ----
    const particleCount = 14;
    const particleGeo = new THREE.SphereGeometry(0.09, 10, 10);
    const particles = [];
    for (let i = 0; i < particleCount; i++) {
      const useA = i % 2 === 0;
      const mat = new THREE.MeshBasicMaterial({
        color: useA ? colorA : colorB,
        transparent: true,
        opacity: 0.9,
      });
      const mesh = new THREE.Mesh(particleGeo, mat);
      helixGroup.add(mesh);
      particles.push({
        mesh,
        curve: useA ? curveA : curveB,
        offset: Math.random(),
        speed: 0.035 + Math.random() * 0.02,
      });
    }

    // ---- floating gene symbol sprites ----
    function makeTextSprite(text) {
      const canvas = document.createElement("canvas");
      const size = 256;
      canvas.width = size;
      canvas.height = 128;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, size, 128);
      ctx.font = "600 44px 'Space Grotesk', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "#1FA5B5";
      ctx.shadowBlur = 12;
      ctx.fillStyle = "#EAFBFF";
      ctx.fillText(text, size / 2, 64);
      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(2.4, 1.2, 1);
      return sprite;
    }

    const geneSprites = GENES.map((g, i) => {
      const sprite = makeTextSprite(g);
      const angle = (i / GENES.length) * Math.PI * 2;
      const r = 4.6 + Math.random() * 1.4;
      sprite.position.set(
        Math.cos(angle) * r + 0.5,
        (Math.random() - 0.5) * 7,
        Math.sin(angle) * r - 2
      );
      scene.add(sprite);
      return {
        sprite,
        phase: Math.random() * Math.PI * 2,
        speed: 0.006 + Math.random() * 0.004,
        baseY: sprite.position.y,
      };
    });

    // ---- ambient background particles (very subtle) ----
    const dustCount = 120;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPos[i * 3] = (Math.random() - 0.5) * 22;
      dustPos[i * 3 + 1] = (Math.random() - 0.5) * 14;
      dustPos[i * 3 + 2] = (Math.random() - 0.5) * 12 - 3;
    }
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0x3a7bd5,
      size: 0.035,
      transparent: true,
      opacity: 0.35,
    });
    const dust = new THREE.Points(dustGeo, dustMat);
    scene.add(dust);

    let frameId;
    let t = 0;
    const clock = new THREE.Clock();

    function animate() {
      const delta = clock.getDelta();
      t += delta;

      // slow autonomous rotation
      helixGroup.rotation.y += delta * 0.14;

      // subtle mouse parallax
      const targetRotX = mouse.current.y * 0.15;
      const targetRotY = mouse.current.x * 0.25;
      camera.position.x += (targetRotY * 3 - camera.position.x) * 0.02;
      camera.position.y += (-targetRotX * 2 - camera.position.y) * 0.02;
      camera.lookAt(helixGroup.position);

      // traveling particles
      particles.forEach((p) => {
        p.offset = (p.offset + p.speed * delta) % 1;
        const pos = p.curve.getPointAt(p.offset);
        p.mesh.position.copy(pos);
        p.mesh.position.x += helixGroup.position.x;
      });
      // convert particle world position properly (they're children of helixGroup already via add)

      // gene sprite fade + drift
      geneSprites.forEach((g) => {
        g.phase += g.speed;
        const opacity = Math.max(0, Math.sin(g.phase)) * 0.85;
        g.sprite.material.opacity = opacity;
        g.sprite.position.y = g.baseY + Math.sin(g.phase * 0.5) * 0.3;
      });

      dust.rotation.y += delta * 0.01;

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    }
    animate();

    function handleResize() {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      mount.removeChild(renderer.domElement);
      renderer.dispose();
      sphereGeo.dispose();
      particleGeo.dispose();
      dustGeo.dispose();
    };
  }, [mouse]);

  return <div ref={mountRef} className="canvas-mount" />;
}

