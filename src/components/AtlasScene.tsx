import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as THREE from "three";
import { findLessonMeta } from "../data/manifest";
import type { GeneratedPlan } from "../lib/atlasPlan";

export default function AtlasScene({ plan, done }: { plan: GeneratedPlan; done: ReadonlySet<string> }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState(0);
  // The stable string prevents rebuilding the scene on unrelated form changes.
  const completed = [...done].sort().join("|");

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let renderer: THREE.WebGLRenderer | undefined;
    let observer: ResizeObserver | undefined;
    const meshes: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>[] = [];
    let disposeListeners = () => {};
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.domElement.setAttribute("aria-hidden", "true");
      mount.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
      const columns = Math.max(1, Math.ceil(Math.sqrt(plan.steps.length)));
      const rows = Math.ceil(plan.steps.length / columns);
      const finished = new Set(completed.split("|"));
      plan.steps.forEach((step, i) => {
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.25 + step.minutes / 160, 16, 12),
          new THREE.MeshStandardMaterial({ color: finished.has(step.key) ? 0x34d399 : 0x67e8f9, roughness: 0.35 }),
        );
        mesh.position.set((i % columns - (columns - 1) / 2) * 1.7, ((rows - 1) / 2 - Math.floor(i / columns)) * 1.7, Math.sin(i) * 0.3);
        scene.add(mesh);
        meshes.push(mesh);
      });
      const light = new THREE.DirectionalLight(0xffffff, 1.5);
      light.position.set(3, 4, 6);
      scene.add(light, new THREE.AmbientLight(0xffffff, 1));
      const draw = () => {
        if (!renderer) return;
        const width = mount.clientWidth || 640;
        const height = 420;
        renderer.setSize(width, height);
        camera.aspect = width / height;
        const halfFov = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        camera.position.z = Math.max((rows * 1.7) / (2 * halfFov), (columns * 1.7) / (2 * halfFov * camera.aspect)) + 2;
        camera.updateProjectionMatrix();
        renderer.render(scene, camera);
      };
      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      const hitIndex = (event: MouseEvent) => {
        const rect = renderer!.domElement.getBoundingClientRect();
        pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
        raycaster.setFromCamera(pointer, camera);
        return meshes.indexOf(raycaster.intersectObjects(meshes)[0]?.object as typeof meshes[number]);
      };
      const click = (event: MouseEvent) => {
        const index = hitIndex(event);
        if (index >= 0) navigate(`/learn/${plan.steps[index].key}`);
      };
      const hover = (event: MouseEvent) => {
        const index = hitIndex(event);
        if (index >= 0) setSelected(index);
        renderer!.domElement.style.cursor = index >= 0 ? "pointer" : "default";
      };
      const lost = (event: Event) => { event.preventDefault(); setFailed(true); };
      const canvas = renderer.domElement;
      canvas.addEventListener("click", click);
      canvas.addEventListener("mousemove", hover);
      canvas.addEventListener("webglcontextlost", lost);
      disposeListeners = () => {
        canvas.removeEventListener("click", click);
        canvas.removeEventListener("mousemove", hover);
        canvas.removeEventListener("webglcontextlost", lost);
      };
      observer = new ResizeObserver(draw);
      observer.observe(mount);
      draw();
    } catch (error) {
      observer?.disconnect();
      disposeListeners();
      meshes.forEach((mesh) => { mesh.geometry.dispose(); mesh.material.dispose(); });
      renderer?.dispose();
      renderer?.domElement.remove();
      throw error; // The map's boundary shows a fallback, leaving the outline usable.
    }
    return () => {
      observer?.disconnect();
      disposeListeners();
      meshes.forEach((mesh) => { mesh.geometry.dispose(); mesh.material.dispose(); });
      renderer?.dispose();
      renderer?.forceContextLoss();
      renderer?.domElement.remove();
    };
  }, [plan, completed, navigate]);

  const step = plan.steps[selected] ?? plan.steps[0];
  return <section aria-label="3D atlas">
    {failed ? <p role="status">3D could not load. Use 2.5D or the outline below.</p> : <>
      <p className="text-sm text-ink-600">Hover over a node for its lesson. Click to open it. Keyboard links are in the outline below.</p>
      <div ref={mountRef} className="mt-3 overflow-hidden rounded-2xl border border-paper-200 bg-ink-950" />
      {step && <p className="mt-3"><Link className="underline focus-visible:ring-2 focus-visible:ring-gold-500" to={`/learn/${step.key}`}>
        {findLessonMeta(step.trackId, step.lessonId)?.title} · {step.minutes} min · {done.has(step.key) ? "Done" : "To do"}
      </Link></p>}
    </>}
  </section>;
}
