import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Github, Instagram, Linkedin, Twitter } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const SpikeBlastFooter = () => {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const particlesRef = useRef(null);

  useEffect(() => {
    sceneRef.current = new THREE.Scene();
    sceneRef.current.background = null;

    cameraRef.current = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    cameraRef.current.position.z = 15;

    rendererRef.current = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current, 
      alpha: true,
      antialias: true 
    });
    const footer = canvasRef.current.parentElement;
    const { width, height } = footer.getBoundingClientRect();
    rendererRef.current.setSize(width, height);


    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 10000;
    const posArray = new Float32Array(particlesCount * 3);
    const sizeArray = new Float32Array(particlesCount);
    const velocityArray = new Float32Array(particlesCount * 3);
    const colorArray = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount; i++) {
      posArray[i * 3] = (Math.random() - 0.5) * window.innerWidth / 100;
      posArray[i * 3 + 1] = (Math.random() - 0.5) * window.innerHeight / 100;
      posArray[i * 3 + 2] = (Math.random() - 0.5) * 10;

      sizeArray[i] = Math.random() * 0.15;

      velocityArray[i * 3] = (Math.random() - 0.5) * 0.05;
      velocityArray[i * 3 + 1] = (Math.random() - 0.5) * 0.05;
      velocityArray[i * 3 + 2] = (Math.random() - 0.5) * 0.02;

      colorArray[i * 3] = 1;
      colorArray[i * 3 + 1] = 1;
      colorArray[i * 3 + 2] = 1;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    particlesGeometry.setAttribute('size', new THREE.BufferAttribute(sizeArray, 1));
    particlesGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocityArray, 3));
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));

    const particlesMaterial = new THREE.PointsMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      size: 0.08
    });

    particlesRef.current = new THREE.Points(particlesGeometry, particlesMaterial);
    sceneRef.current.add(particlesRef.current);

    const animate = () => {
      requestAnimationFrame(animate);
      
      const positions = particlesRef.current.geometry.attributes.position.array;
      const velocities = particlesRef.current.geometry.attributes.velocity.array;

      for (let i = 0; i < positions.length; i += 3) {
        positions[i] += velocities[i];
        positions[i + 1] += velocities[i + 1];
        positions[i + 2] += velocities[i + 2];

        if (Math.abs(positions[i]) > window.innerWidth / 100) velocities[i] *= -1;
        if (Math.abs(positions[i + 1]) > window.innerHeight / 100) velocities[i + 1] *= -1;
        if (Math.abs(positions[i + 2]) > 5) velocities[i + 2] *= -1;
      }

      particlesRef.current.geometry.attributes.position.needsUpdate = true;
      
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };
    animate();

    return () => {
      rendererRef.current.dispose();
      sceneRef.current.remove(particlesRef.current);
    };
  }, []);

  return (
    <footer className="w-full bg-black text-white relative h-[300px]">
      <canvas ref={canvasRef} className="w-full h-full absolute top-0 left-0 z-0" style={{ width: "100%", height: "100%" }} />
      <div className="relative z-10 container mx-auto px-4 flex items-center h-full">
        <div className="w-full flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold">B'on'ES</h3>
            <p className="text-gray-300">Predict, Compete, Conquer the Valorant Betting Arena</p>
          </div>
          <div className="text-center">
            <h3 className="text-xl font-bold">Our Team</h3>
            <p className="text-gray-300">Legend Spryzenn</p>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-4">Connect</h3>
            <div className="flex space-x-4 mb-2">
              <a href="#" className="hover:text-[#FF4655]"><Github size={24} /></a>
              <a href="#" className="hover:text-[#FF4655]"><Instagram size={24} /></a>
              <a href="#" className="hover:text-[#FF4655]"><Linkedin size={24} /></a>
              <a href="#" className="hover:text-[#FF4655]"><Twitter size={24} /></a>
            </div>
            <p className="text-gray-400 text-sm">© 2025 B'on'ES. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default SpikeBlastFooter;