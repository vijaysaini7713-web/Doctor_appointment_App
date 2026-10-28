'use client';
import { useEffect, useRef, useState } from 'react';
export default function Hero3D() {
 const mount=useRef<HTMLDivElement>(null);const [ready,setReady]=useState(false);
 useEffect(()=>{let dead=false;let cleanup=()=>{};let frame=0;
 (async()=>{const T=await import('three');if(dead||!mount.current)return;
 const host=mount.current;const scene=new T.Scene();const camera=new T.PerspectiveCamera(35,1,0.1,100);camera.position.set(0,0,9);
 const renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));renderer.setSize(host.clientWidth,host.clientHeight);renderer.outputColorSpace=T.SRGBColorSpace;host.appendChild(renderer.domElement);
 const group=new T.Group();scene.add(group);
 const teal=new T.MeshPhysicalMaterial({color:0x00bfa6,metalness:.18,roughness:.28,clearcoat:.75});
 const light=new T.MeshPhysicalMaterial({color:0xf8ffff,metalness:.05,roughness:.3,clearcoat:.4});
 const sphere=new T.Mesh(new T.SphereGeometry(1.8,48,48),new T.MeshPhysicalMaterial({color:0xcff5ed,transparent:true,opacity:.45,roughness:.1,metalness:.1}));group.add(sphere);
 const vertical=new T.Mesh(new T.BoxGeometry(.58,2.4,.55),teal);vertical.geometry.translate(0,0,0);vertical.rotation.z=.05;group.add(vertical);
 const horizontal=new T.Mesh(new T.BoxGeometry(2.4,.58,.55),teal);horizontal.rotation.z=.05;group.add(horizontal);
 const inner=new T.Mesh(new T.SphereGeometry(.63,32,32),light);inner.position.z=.38;inner.material.transparent=true;inner.material.opacity=.12;group.add(inner);
 const orbit=new T.Mesh(new T.TorusGeometry(2.65,.018,8,120),new T.MeshBasicMaterial({color:0x65cbbb,transparent:true,opacity:.6}));orbit.rotation.x=1.1;scene.add(orbit);
 const orbit2=new T.Mesh(new T.TorusGeometry(2.9,.014,8,120),new T.MeshBasicMaterial({color:0x80abe7,transparent:true,opacity:.45}));orbit2.rotation.y=.8;scene.add(orbit2);
 const orbGeo=new T.SphereGeometry(.15,20,20);
 const dot1=new T.Mesh(orbGeo,new T.MeshStandardMaterial({color:0x3b82f6,emissive:0x2768af,emissiveIntensity:.22}));dot1.position.set(2.4,.8,.2);scene.add(dot1);
 const dot2=new T.Mesh(orbGeo,new T.MeshStandardMaterial({color:0x14b8a6,emissive:0x0b8b72,emissiveIntensity:.3}));dot2.position.set(-2.15,-1.2,.4);scene.add(dot2);
 scene.add(new T.AmbientLight(0xffffff,2));const key=new T.DirectionalLight(0xffffff,4);key.position.set(3,5,7);scene.add(key);const fill=new T.PointLight(0x8be5d6,32);fill.position.set(-4,-2,4);scene.add(fill);
 const observer=new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(w&&h){camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);}});observer.observe(host);
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;let t=0;
 function animate(){if(dead)return;frame=requestAnimationFrame(animate);if(!reduced){t+=.008;group.rotation.y=Math.sin(t*.7)*.3;group.rotation.z=Math.sin(t*.4)*.09;group.position.y=Math.sin(t)*.13;orbit.rotation.z=t*.18;orbit2.rotation.x=t*.12;dot1.position.x=Math.cos(t*.8)*2.55;dot1.position.y=Math.sin(t*.8)*1.2;}renderer.render(scene,camera);}animate();setReady(true);
 cleanup=()=>{observer.disconnect();cancelAnimationFrame(frame);renderer.dispose();scene.traverse(obj=>{if(obj instanceof T.Mesh){obj.geometry.dispose();const materials=Array.isArray(obj.material)?obj.material:[obj.material];materials.forEach(m=>m.dispose());}});renderer.domElement.remove();};
 })().catch(()=>setReady(false));return()=>{dead=true;cleanup();};},[]);
 return <div className="hero-visual" aria-hidden="true"><div ref={mount} className="hero-canvas"/>{!ready&&<div className="hero-fallback"><span>+</span></div>}<div className="visual-chip chip-left">✦ Expert care</div><div className="visual-chip chip-right">● Live queue</div><div className="visual-glow"/></div>;
}
