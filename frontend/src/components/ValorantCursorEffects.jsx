import { useEffect, useRef } from "react";
import * as THREE from "three";
import gsap from "gsap";

const ValorantCursorEffects = () => {
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const trailPointsRef = useRef([]);
  const crosshairRef = useRef(null);

  useEffect(() => {
    sceneRef.current = new THREE.Scene();
    const aspectRatio = window.innerWidth / window.innerHeight;
    cameraRef.current = new THREE.OrthographicCamera(
      -aspectRatio, aspectRatio,
      1, -1,
      0.1, 1000
    );
    cameraRef.current.position.z = 5;

    rendererRef.current = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true
    });
    rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    rendererRef.current.setClearColor(0x000000, 0);
    
    const canvas = rendererRef.current.domElement;
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.zIndex = '9999';
    canvas.style.pointerEvents = 'none';
    document.body.appendChild(canvas);

    const createCrosshair = () => {
      const group = new THREE.Group();
      const lineLength = 0.02;
      const lineWidth = 0.002;
      const dotSize = 0;
      
      // Center dot 
      const dotGeometry = new THREE.CircleGeometry(dotSize, 16);
      const dotMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const dot = new THREE.Mesh(dotGeometry, dotMaterial);
      group.add(dot);
      
      // Crosshair lines 
      const lines = [
        { pos: new THREE.Vector2(0, lineLength * 1.2), rot: 0 },
        { pos: new THREE.Vector2(0, -lineLength * 1.2), rot: 0 },
        { pos: new THREE.Vector2(lineLength * 1.2, 0), rot: Math.PI / 2 },
        { pos: new THREE.Vector2(-lineLength * 1.2, 0), rot: Math.PI / 2 }
      ];

      lines.forEach(line => {
        const geometry = new THREE.PlaneGeometry(lineWidth, lineLength);
        const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(line.pos.x, line.pos.y, 0);
        mesh.rotation.z = line.rot;
        group.add(mesh);
      });

      sceneRef.current.add(group);
      crosshairRef.current = group;
      
      // Hide default cursor
      document.body.style.cursor = 'none';
    };

    const createTrailPoint = (x, y) => {
      const geometry = new THREE.CircleGeometry(0.008, 12); // Larger size
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0xffffff),
        transparent: true,
        opacity: 1
      });

      const point = new THREE.Mesh(geometry, material);
      point.position.set(x, y, -0.1);
      sceneRef.current.add(point);
      
      trailPointsRef.current.push({ mesh: point, createdAt: Date.now() });

      gsap.to(material, {
        opacity: 0.8,
        duration: 0.6,
        ease: "power2.out"
      });

      gsap.to(point.scale, {
        x: 0,
        y: 0,
        duration: 0.8,
        ease: "power2.out",
        onComplete: () => {
          sceneRef.current.remove(point);
          geometry.dispose();
          material.dispose();
          trailPointsRef.current = trailPointsRef.current.filter(tp => tp.mesh !== point);
        }
      });

      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          const offsetX = (Math.random() - 0.5) * 0.02;
          const offsetY = (Math.random() - 0.5) * 0.02;
          createSingleTrailPoint(x + offsetX, y + offsetY);
        }, i * 50);
      }
    };

    const createSingleTrailPoint = (x, y) => {
      const geometry = new THREE.CircleGeometry(0.005, 8);
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0xffffff),
        transparent: true,
        opacity: 1
      });

      const point = new THREE.Mesh(geometry, material);
      point.position.set(x, y, -0.1);
      sceneRef.current.add(point);

      gsap.to(material, {
        opacity: 0,
        duration: 0.6,
        ease: "power2.out"
      });

      gsap.to(point.scale, {
        x: 0,
        y: 0,
        duration: 0.6,
        ease: "power2.out",
        onComplete: () => {
          sceneRef.current.remove(point);
          geometry.dispose();
          material.dispose();
        }
      });
    };

    const getScenePosition = (clientX, clientY) => {
      const x = (clientX / window.innerWidth) * 2 * aspectRatio - aspectRatio;
      const y = -(clientY / window.innerHeight) * 2 + 1;
      return { x, y };
    };

    createCrosshair();

    const handleMouseMove = (event) => {
      const { x, y } = getScenePosition(event.clientX, event.clientY);
      
      if (crosshairRef.current) {
        crosshairRef.current.position.set(x, y, 0);
      }
      
      createTrailPoint(x, y);
    };

    const handleClick = () => {
      if (crosshairRef.current) {
        gsap.to(crosshairRef.current.scale, {
          x: 1.2,
          y: 1.2,
          duration: 0.1,
          yoyo: true,
          repeat: 1,
          ease: "power2.out"
        });
      }
    };

    const handleResize = () => {
      const newAspectRatio = window.innerWidth / window.innerHeight;
      cameraRef.current.left = -newAspectRatio;
      cameraRef.current.right = newAspectRatio;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick);

    const animate = () => {
      if (!rendererRef.current) return;
      requestAnimationFrame(animate);
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick);
      document.body.style.cursor = 'auto';
      
      if (rendererRef.current) {
        document.body.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }

      if (crosshairRef.current) {
        crosshairRef.current.children.forEach(child => {
          child.geometry.dispose();
          child.material.dispose();
        });
      }

      trailPointsRef.current.forEach(point => {
        point.mesh.geometry.dispose();
        point.mesh.material.dispose();
      });
    };
  }, []);

  return null;
};

export default ValorantCursorEffects;
