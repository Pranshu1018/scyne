/* The man at the automation desk: sitting him in the chair and finishing his pose at load.

   He leans back with his hands behind his head: elbows high and wide, forearms beside his head,
   hands clasped at the back of his neck, the right over the left.

   The pose is described in the chair's own space (the group he sits in: +x his left, +y up, +z
   the way he faces), measured from the first avatar, so it carries over to another character:
   - RIGS names the bones of each skeleton this knows (Rocketbox's Biped, and Unreal's, which
     MetaHumans use), found by name at load
   - a model that arrives standing (a MetaHuman in its A-pose) is turned to face the desk, bent
     into the sitting pose (spine, neck, legs) and set on the seat by its pelvis
   - then the arms: a two-bone reach to each wrist target, the hands turned and the fingers curled
   Lengths are in units of the character's own torso (pelvis to head, seated), so a taller or
   shorter character keeps the same pose. */

import * as THREE from "three";

export const POSE = {
  pelvis: [0, 0.5911, 0], // where the pelvis sits, in the chair's space (metres)
  // the direction of each part, child joint from parent joint
  sit: {
    spine: [0.0003, 0.9893, -0.1459], // pelvis end of the spine → base of the neck (leaning back)
    neck: [-0.0535, 0.9274, 0.3702], // base of the neck → head
    thigh: { L: [-0.0085, -0.384, 0.9233], R: [0.1096, -0.582, 0.8058] },
    calf: { L: [-0.2551, -0.7214, 0.6438], R: [0.1437, -0.7802, 0.6088] },
    foot: { L: [-0.444, -0.1352, 0.8858], R: [0.4461, -0.1895, 0.8747] },
  },
  // each wrist relative to the head joint, in torso lengths (pelvis to head, seated): either side
  // of the back of his neck
  wrist: { L: [0.1243, 0.0177, -0.1252], R: [-0.1136, 0.0252, -0.1475] },
  elbow: { L: [0.7387, 0.6648, 0.1108], R: [-0.7387, 0.6648, 0.1108] }, // which way the elbows point: out, up
  fingers: { L: [-0.9578, -0.2873, 0], R: [0.9578, -0.2873, 0] }, // across, towards the other hand
  palm: [0, 0, 1], // the palms face forward, onto his neck
  curl: [0.4, 0.5, 0.4], // radians at the three finger joints, knuckle to tip
  fan: 0.04, // radians between neighbouring fingers
};

/* Bone names per skeleton. fingers: index, middle, ring, little; three joints each, knuckle out. */
const RIGS = {
  rocketbox: {
    pelvis: "Bip01_Pelvis", spine: ["Bip01_Spine", "Bip01_Spine1", "Bip01_Spine2"], neck: ["Bip01_Neck"], head: "Bip01_Head",
    breathe: ["Bip01_Spine1", "Bip01_Spine2"],
    side: (s) => ({
      upper: `Bip01_${s}_UpperArm`, fore: `Bip01_${s}_Forearm`, hand: `Bip01_${s}_Hand`,
      thigh: `Bip01_${s}_Thigh`, calf: `Bip01_${s}_Calf`, foot: `Bip01_${s}_Foot`, toe: `Bip01_${s}_Toe0`,
      fingers: [1, 2, 3, 4].map((n) => [`Bip01_${s}_Finger${n}`, `Bip01_${s}_Finger${n}1`, `Bip01_${s}_Finger${n}2`]),
    }),
  },
  unreal: {
    pelvis: "pelvis", spine: ["spine_01", "spine_02", "spine_03", "spine_04", "spine_05"], neck: ["neck_01", "neck_02"], head: "head",
    breathe: ["spine_03", "spine_04"],
    side: (s) => {
      const x = s.toLowerCase();
      return {
        upper: `upperarm_${x}`, fore: `lowerarm_${x}`, hand: `hand_${x}`,
        thigh: `thigh_${x}`, calf: `calf_${x}`, foot: `foot_${x}`, toe: `ball_${x}`,
        fingers: ["index", "middle", "ring", "pinky"].map((f) => [1, 2, 3].map((k) => `${f}_0${k}_${x}`)),
      };
    },
  },
};

const v1 = new THREE.Vector3(), q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion(), ID = new THREE.Quaternion();
const wp = (b) => b.getWorldPosition(new THREE.Vector3());

/* turn bone b by world rotation q (b's world orientation becomes q × before) */
function turnWorld(b, q) {
  b.parent.getWorldQuaternion(q2);
  b.quaternion.premultiply(q2.clone().invert().multiply(q).multiply(q2));
  b.updateMatrixWorld(true);
}
/* turn bone b so that point `from` (something it carries) lies in direction `dir` from it */
function aimDir(b, from, dir) {
  turnWorld(b, q1.setFromUnitVectors(wp(from).sub(wp(b)).normalize(), dir.clone().normalize()));
}
/* bend a chain of bones so that `end` lies in direction `dir` from the first, shared out along it */
function bendChain(chain, end, dir) {
  const base = wp(chain[0]);
  const target = base.clone().addScaledVector(dir.clone().normalize(), wp(end).distanceTo(base));
  chain.forEach((b, i) => {
    const q = new THREE.Quaternion().setFromUnitVectors(wp(end).sub(wp(b)).normalize(), target.clone().sub(wp(b)).normalize());
    turnWorld(b, new THREE.Quaternion().slerpQuaternions(ID, q, 1 / (chain.length - i)));
  });
}

function sit(man, rig, frame) {
  const bone = (n) => man.getObjectByName(n);
  const L = rig.side("L"), R = rig.side("R");
  // A model that came seated (the first avatar: its pose is in the file) is left as it is. One that
  // arrives standing, thighs straight down (a MetaHuman in its rest pose), is sat down: first
  // turned to face the desk, his left along +x and up along +y.
  const down = wp(bone(L.calf)).sub(wp(bone(L.thigh))).normalize().dot(frame.dir([0, -1, 0]));
  if (down < 0.8) return;
  const left = wp(bone(L.upper)).sub(wp(bone(R.upper))).normalize();
  const up = wp(bone(rig.head)).sub(wp(bone(rig.pelvis))).normalize();
  const wantLeft = frame.dir([1, 0, 0]), wantUp = frame.dir([0, 1, 0]);
  {
    const q = new THREE.Quaternion().setFromUnitVectors(up, wantUp);
    left.applyQuaternion(q);
    left.addScaledVector(wantUp, -left.dot(wantUp)).normalize();
    q.premultiply(new THREE.Quaternion().setFromUnitVectors(left, wantLeft));
    man.parent.getWorldQuaternion(q2);
    man.quaternion.premultiply(q2.clone().invert().multiply(q).multiply(q2));
    man.updateMatrixWorld(true);
  }
  const P = POSE.sit;
  bendChain(rig.spine.map(bone), bone(rig.neck[0]), frame.dir(P.spine));
  bendChain(rig.neck.map(bone), bone(rig.head), frame.dir(P.neck));
  for (const [s, side] of [["L", L], ["R", R]]) {
    aimDir(bone(side.thigh), bone(side.calf), frame.dir(P.thigh[s]));
    aimDir(bone(side.calf), bone(side.foot), frame.dir(P.calf[s]));
    if (bone(side.toe)) aimDir(bone(side.foot), bone(side.toe), frame.dir(P.foot[s]));
  }
  // on the seat: move him so his pelvis is where it belongs
  const shift = frame.point(POSE.pelvis).sub(wp(bone(rig.pelvis)));
  if (shift.lengthSq() > 1e-8) {
    man.parent.updateMatrixWorld(true);
    man.position.add(man.parent.worldToLocal(wp(man).add(shift)).sub(man.position));
    man.updateMatrixWorld(true);
  }
}

function poseArms(man, rig, frame, P) {
  const bone = (n) => man.getObjectByName(n);
  const head = wp(bone(rig.head));
  const torso = head.distanceTo(wp(bone(rig.pelvis))); // the unit for the wrist targets
  for (const s of ["L", "R"]) {
    const n = rig.side(s), sx = s === "L" ? 1 : -1;
    const b = (k) => bone(n[k]);
    const finger = n.fingers.map((joints) => joints.map(bone));
    if (!b("hand") || !finger[1][1]) continue;
    const fingerDir = () => wp(finger[1][1]).sub(wp(finger[1][0])).normalize();
    // the palm side: index-to-little across the knuckles, crossed with the fingers' direction,
    // mirrored between the hands
    const palmDir = () => new THREE.Vector3().crossVectors(wp(finger[0][0]).sub(wp(finger[3][0])).normalize(), fingerDir()).normalize().multiplyScalar(-sx);

    // arm: a two-bone reach to the wrist target, the elbow pointing the way POSE.elbow says
    const S = wp(b("upper")), H = head.clone().add(frame.dir(P.wrist[s]).multiplyScalar(new THREE.Vector3(...P.wrist[s]).length() * torso));
    const a = wp(b("fore")).distanceTo(S), c = wp(b("hand")).distanceTo(wp(b("fore")));
    const d = Math.min(S.distanceTo(H), a + c - 1e-4), u = H.clone().sub(S).normalize();
    const pole = frame.dir(P.elbow[s]);
    const v = pole.sub(u.clone().multiplyScalar(pole.dot(u))).normalize();
    const cosA = (a * a + d * d - c * c) / (2 * a * d), sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
    aimDir(b("upper"), b("fore"), S.clone().addScaledVector(u, a * cosA).addScaledVector(v, a * sinA).sub(S));
    aimDir(b("fore"), b("hand"), H.clone().sub(wp(b("fore"))));

    // hand: fingers and palm the way POSE says
    turnWorld(b("hand"), q1.setFromUnitVectors(fingerDir(), frame.dir(P.fingers[s])));
    const along = fingerDir(), want = frame.dir(P.palm), have = palmDir();
    want.addScaledVector(along, -want.dot(along)).normalize();
    have.addScaledVector(along, -have.dot(along)).normalize();
    let turn = Math.acos(THREE.MathUtils.clamp(have.dot(want), -1, 1));
    if (v1.crossVectors(have, want).dot(along) < 0) turn = -turn;
    turnWorld(b("hand"), q1.setFromAxisAngle(along, turn));

    // fingers together, then curled: each joint turns about the knuckle line, tips towards the palm
    const dir = fingerDir(), palm = palmDir(), knuckles = new THREE.Vector3().crossVectors(dir, palm).normalize();
    finger.forEach((joints, i) => {
      turnWorld(joints[0], q1.setFromUnitVectors(wp(joints[1]).sub(wp(joints[0])).normalize(), dir.clone().applyAxisAngle(palm, (i - 1.5) * P.fan * sx)));
    });
    for (const joints of finger) {
      let sign = 1;
      joints.forEach((j, k) => {
        if (!j) return;
        const tip = joints[k + 1] || j.children.find((ch) => ch.isBone);
        const before = tip && wp(tip);
        turnWorld(j, q1.setFromAxisAngle(knuckles, P.curl[k] * sign));
        // the knuckle axis can come out either way round: keep the tips curling into the palm
        if (tip && wp(tip).sub(before).dot(palm) < 0) { sign = -sign; turnWorld(j, q1.setFromAxisAngle(knuckles, 2 * P.curl[k] * sign)); }
      });
    }
  }
}

/* Hair cards (Rocketbox): their own normals face every which way, so from most angles the cards
   were lit from behind and showed as dark flat planes on his head. Pointing every normal out from
   the middle of the skull lights them like the hair they sit on, from either side; their edges are
   smoothed with alpha-to-coverage (the scene is drawn with MSAA). */
function fixHair(hair) {
  const g = hair.geometry, pos = g.attributes.position, nor = g.attributes.normal;
  if (!nor) return;
  g.computeBoundingBox();
  const c = g.boundingBox.getCenter(new THREE.Vector3());
  const size = g.boundingBox.getSize(new THREE.Vector3());
  // the hair is a cap: the middle of the head sits below it, along its thinnest axis
  const axis = size.x < size.y && size.x < size.z ? "x" : size.y < size.z ? "y" : "z";
  c[axis] -= size[axis] * 0.7;
  for (let i = 0; i < pos.count; i++) {
    v1.fromBufferAttribute(pos, i).sub(c).normalize();
    nor.setXYZ(i, v1.x, v1.y, v1.z);
  }
  nor.needsUpdate = true;
  const m = hair.material;
  m.alphaToCoverage = true;
  // keep the outward normal on back faces too (three.js flips it for double-sided materials)
  m.onBeforeCompile = (s) => {
    s.fragmentShader = s.fragmentShader.replace("#include <normal_fragment_begin>",
      "#include <normal_fragment_begin>\n#ifdef DOUBLE_SIDED\n  normal *= faceDirection;\n#endif");
  };
  m.customProgramCacheKey = () => "scyne-hair";
  m.needsUpdate = true;
}

/* Pose the man. Call once he is in the group he sits in (its space is the chair's space).
   Returns the bones that breathe ({ spine: [two bones], neck, head }), or null for a skeleton
   this does not know. */
export function prepareMan(man) {
  let top = man;
  while (top.parent) top = top.parent;
  top.updateMatrixWorld(true);
  let skin = null, hair = null;
  man.traverse((o) => {
    if (!o.isSkinnedMesh) return;
    if (!skin || o.skeleton.bones.length > skin.skeleton.bones.length) skin = o;
    if (o.material.name === "hair") hair = o;
  });
  if (!skin) return null;
  const rig = Object.values(RIGS).find((r) => man.getObjectByName(r.pelvis) && man.getObjectByName(r.side("L").hand));
  if (!rig) { console.warn("[scyne] the man's skeleton is not one man.js knows: left as exported"); return null; }
  const chair = man.parent;
  const frame = {
    dir: (d) => new THREE.Vector3(...d).transformDirection(chair.matrixWorld),
    point: (p) => new THREE.Vector3(...p).applyMatrix4(chair.matrixWorld),
  };
  const pose = (P = POSE) => { sit(man, rig, frame); poseArms(man, rig, frame, P); };
  if (import.meta.env.DEV) {
    // dev: man.userData.repose({ ...POSE, wrist: … }) tries other numbers on the live scene
    const exported = new Map(skin.skeleton.bones.map((b) => [b, b.quaternion.clone()]));
    const at = man.position.clone(), turn = man.quaternion.clone();
    man.userData.repose = (P = POSE) => {
      for (const [b, q] of exported) b.quaternion.copy(q);
      man.position.copy(at); man.quaternion.copy(turn); top.updateMatrixWorld(true);
      pose(P);
    };
  }
  pose();
  if (hair && rig === RIGS.rocketbox) fixHair(hair);
  const bone = (n) => man.getObjectByName(n);
  return { spine: rig.breathe.map(bone), neck: bone(rig.neck[0]), head: bone(rig.head) };
}
