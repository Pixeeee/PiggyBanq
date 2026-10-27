'use client';
import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Group, MathUtils, Shape } from 'three';
import { goals, type GoalId, type SceneMode } from './content';

export type PocketSceneProps={selected:GoalId;mode:SceneMode;percent:number;depositPulse:number;inspect:boolean;active:boolean;scrollProgress:number;onSelect:(goal:GoalId)=>void;onFailure:()=>void};

function Coin({position=[0,0,0],scale=1}:{position?:[number,number,number];scale?:number}) {
 return <group position={position} scale={scale} rotation={[Math.PI/2,0,0]}><mesh castShadow><cylinderGeometry args={[.22,.22,.065,24]}/><meshStandardMaterial color="#f2ce81" metalness={.55} roughness={.3}/></mesh><mesh position={[0,.038,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.17,.012,6,24]}/><meshStandardMaterial color="#ffe7ac" metalness={.45} roughness={.3}/></mesh></group>;
}

function Piggy() {
 return <group position={[0,.35,-.35]}>
  <mesh castShadow scale={[1,.83,.78]}><sphereGeometry args={[1,40,28]}/><meshPhysicalMaterial color="#edacc1" roughness={.3} metalness={.04} clearcoat={.3}/></mesh>
  <mesh position={[0,-.02,.72]} rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[.34,.3,.16,32]}/><meshStandardMaterial color="#dc85a4" roughness={.4}/></mesh>
  {[-1,1].map(side=><group key={side}>
   <mesh position={[side*.12,-.01,.819]} scale={[.035,.07,.015]}><sphereGeometry args={[1,12,8]}/><meshStandardMaterial color="#a75276"/></mesh>
   <mesh position={[side*.43,.25,.65]}><sphereGeometry args={[.065,16,12]}/><meshStandardMaterial color="#583643" roughness={.25}/></mesh>
   <mesh position={[side*.42,.27,.705]}><sphereGeometry args={[.018,8,8]}/><meshBasicMaterial color="#fff8e9"/></mesh>
   <mesh position={[side*.6,.07,.63]} scale={[.13,.07,.03]}><sphereGeometry args={[1,16,12]}/><meshStandardMaterial color="#e88caa"/></mesh>
   <group position={[side*.61,.72,.04]} rotation={[0,0,side*-.3]}><mesh scale={[.24,.37,.17]} castShadow><sphereGeometry args={[1,24,16]}/><meshStandardMaterial color="#eeafc4" roughness={.4}/></mesh><mesh position={[0,.02,.115]} scale={[.13,.23,.06]}><sphereGeometry args={[1,16,12]}/><meshStandardMaterial color="#d786a3"/></mesh></group>
   {[-1,1].map(front=><mesh key={front} position={[side*.54,-.72,front*.4]} castShadow><cylinderGeometry args={[.19,.2,.26,20]}/><meshStandardMaterial color="#d88ba7" roughness={.4}/></mesh>)}
  </group>)}
  <mesh position={[0,.833,-.04]}><boxGeometry args={[.45,.025,.075]}/><meshStandardMaterial color="#9e5572"/></mesh>
  <mesh position={[.93,.06,-.3]} rotation={[0,Math.PI/2,0]}><torusGeometry args={[.14,.04,8,20,Math.PI*1.7]}/><meshStandardMaterial color="#e6a1ba"/></mesh>
 </group>;
}

function Model(props:PocketSceneProps) {
 const {selected,mode,percent,depositPulse,inspect,active,scrollProgress,onSelect,onFailure}=props;
 const group=useRef<Group>(null),falling=useRef<Group>(null);
 const {invalidate,gl,camera,pointer}=useThree();
 const start=useRef(0),until=useRef(0);
 const shield=useMemo(()=>{const shape=new Shape();shape.moveTo(0,.5);shape.lineTo(.35,.35);shape.lineTo(.3,-.1);shape.quadraticCurveTo(.2,-.35,0,-.5);shape.quadraticCurveTo(-.2,-.35,-.3,-.1);shape.lineTo(-.35,.35);shape.closePath();return shape;},[]);
 useEffect(()=>{start.current=performance.now();until.current=start.current+1400;invalidate();},[selected,mode,percent,depositPulse,inspect,active,scrollProgress,invalidate]);
 useEffect(()=>{
  const move=()=>{until.current=performance.now()+600;invalidate();};
  const loss=(event:Event)=>{event.preventDefault();onFailure();};
  const canvas=gl.domElement;canvas.addEventListener('pointermove',move);canvas.addEventListener('webglcontextlost',loss);
  return()=>{canvas.removeEventListener('pointermove',move);canvas.removeEventListener('webglcontextlost',loss);canvas.style.cursor='';};
 },[gl,invalidate,onFailure]);
 useFrame((_,delta)=>{
  if(!active)return;
  const now=performance.now(),blend=1-Math.exp(-Math.min(delta,.05)*7);
  if(group.current){group.current.rotation.y=MathUtils.lerp(group.current.rotation.y,inspect?0:pointer.x*.14+(scrollProgress-.5)*.4,blend);group.current.rotation.x=MathUtils.lerp(group.current.rotation.x,inspect?0:pointer.y*-.05,blend);}
  if(!inspect){const z=6.8-scrollProgress*.45;camera.position.x=MathUtils.lerp(camera.position.x,0,blend);camera.position.y=MathUtils.lerp(camera.position.y,2.5,blend);camera.position.z=MathUtils.lerp(camera.position.z,z,blend);camera.lookAt(0,.2,0);}
  if(falling.current){const t=Math.min(1,(now-start.current)/1100);falling.current.visible=depositPulse>0&&t<1;falling.current.position.y=2.1-t*.9;falling.current.rotation.y=t*Math.PI*3;}
  if(now<until.current)invalidate();
 });
 const selectedColor=goals.find(goal=>goal.id===selected)!.color;
 return <>
  <ambientLight intensity={1.5}/><hemisphereLight args={['#fff7ed','#b6c3a8',1.7]}/><directionalLight position={[3,6,4]} intensity={3} castShadow shadow-mapSize={[1024,1024]} shadow-camera-left={-4} shadow-camera-right={4} shadow-camera-top={4} shadow-camera-bottom={-4}/><pointLight position={[-4,2,-2]} color="#f5cadb" intensity={14}/>
  <group ref={group}><Piggy/>
   <group ref={falling} position={[0,2.1,-.35]}><Coin/></group>
   {goals.map((goal,index)=><group key={goal.id} position={[(index-1)*1.45,-.56,1.15]} onClick={event=>{event.stopPropagation();onSelect(goal.id);}} onPointerOver={()=>{gl.domElement.style.cursor='pointer';}} onPointerOut={()=>{gl.domElement.style.cursor='';}}>
    <mesh castShadow><cylinderGeometry args={[.5,.45,.65,32,1,true]}/><meshStandardMaterial color={goal.color} transparent opacity={selected===goal.id ? .66 : .3} roughness={.3} side={2} depthWrite={false}/></mesh>
    <mesh position={[0,-.32,0]}><cylinderGeometry args={[.45,.45,.035,32]}/><meshStandardMaterial color={goal.color} roughness={.5}/></mesh>
    <mesh position={[0,.34,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.5,selected===goal.id ? .045 : .025,8,32]}/><meshStandardMaterial color={selected===goal.id?'#fff4df':goal.color}/></mesh>
    {Array.from({length:Math.max(1,Math.min(5,Math.ceil((selected===goal.id?percent:15)/20)))},(_,i)=><group key={i} position={[0,-.23+i*.085,0]} rotation={[-Math.PI/2,0,0]}><Coin scale={1.55}/></group>)}
   </group>)}
   {mode==='review'&&<group position={[0,1.93,-.3]}><mesh castShadow><extrudeGeometry args={[shield,{depth:.07,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.035,bevelThickness:.03}]}/><meshStandardMaterial color="#ecf0d4" roughness={.3}/></mesh><mesh position={[0,0,.12]}><torusGeometry args={[.13,.025,8,24]}/><meshStandardMaterial color="#8aab86"/></mesh></group>}
   {mode==='grow'&&Array.from({length:6},(_,i)=><Coin key={i} position={[Math.cos(i*Math.PI/3)*1.7,1.1+Math.sin(i*Math.PI/3)*.25,Math.sin(i*Math.PI/3)*.4-.9]} scale={.7}/>)}
   <mesh position={[0,-.94,0]} receiveShadow rotation={[-Math.PI/2,0,0]}><circleGeometry args={[3.3,64]}/><meshStandardMaterial color="#f1e7dc" roughness={1}/></mesh>
   <mesh position={[(goals.findIndex(goal=>goal.id===selected)-1)*1.45,-.916,1.15]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.48,.54,48]}/><meshBasicMaterial color={selectedColor}/></mesh>
  </group>
  <OrbitControls makeDefault enabled={inspect&&active} enableDamping enablePan={false} enableZoom={false} minPolarAngle={Math.PI*.27} maxPolarAngle={Math.PI*.49} minAzimuthAngle={-Math.PI*.4} maxAzimuthAngle={Math.PI*.4} target={[0,.2,0]}/>
 </>;
}

export default function PocketScene(props:PocketSceneProps) {
 return <Canvas className="sunny-pocket-canvas" frameloop={props.active?'demand':'never'} dpr={[1,1.5]} shadows camera={{position:[0,2.5,6.8],fov:40}} gl={{antialias:true,alpha:true,powerPreference:'low-power'}} aria-label="Interactive 3D piggy bank and three savings pockets"><Model {...props}/></Canvas>;
}
