const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round = (value, precision = 1000) => Math.round(value * precision) / precision || 0;
const radians = (degrees) => (degrees * Math.PI) / 180;

const add = (a, b) => a.map((value, index) => value + b[index]);
const subtract = (a, b) => a.map((value, index) => value - b[index]);
const scale = (vector, amount) => vector.map((value) => value * amount);
const dot = (a, b) => a.reduce((total, value, index) => total + value * b[index], 0);
const length = (vector) => Math.hypot(...vector);
const normalize = (vector) => {
  const vectorLength = length(vector);
  return vectorLength ? scale(vector, 1 / vectorLength) : [0, 0, 0];
};
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0]
];
const reflect = (incident, normal) => subtract(incident, scale(normal, 2 * dot(incident, normal)));

function rotateVector([x, y, z], rotateX, rotateY) {
  const xRadians = radians(rotateX);
  const yRadians = radians(rotateY);
  const cosX = Math.cos(xRadians);
  const sinX = Math.sin(xRadians);
  const cosY = Math.cos(yRadians);
  const sinY = Math.sin(yRadians);
  const tiltedY = y * cosX - z * sinX;
  const tiltedZ = y * sinX + z * cosX;

  return [
    x * cosY + tiltedZ * sinY,
    tiltedY,
    -x * sinY + tiltedZ * cosY
  ];
}

const cardSize = { width: 280, height: 460 };
const cameraPosition = [0, 0, 900];
const softbox = {
  center: [650, -290, 700],
  width: 700,
  height: 380
};
const sampleCoordinates = [0.1, 0.3, 0.5, 0.7, 0.9];
const fallbackMaterial = {
  x: 50,
  y: 50,
  offsetX: 0,
  offsetY: 0,
  angle: 135,
  strength: 0.025
};

function softboxFalloff(point, ray) {
  const normal = normalize(scale(softbox.center, -1));
  const denominator = dot(ray, normal);

  if (Math.abs(denominator) <= 0.0001) return 0;

  const distance = dot(subtract(softbox.center, point), normal) / denominator;
  if (distance <= 0) return 0;

  const hit = add(point, scale(ray, distance));
  const right = normalize(cross([0, 1, 0], normal));
  const up = normalize(cross(normal, right));
  const offset = subtract(hit, softbox.center);
  const horizontal = dot(offset, right) / (softbox.width / 2);
  const vertical = dot(offset, up) / (softbox.height / 2);
  const radius = horizontal * horizontal + vertical * vertical;

  return radius < 1 ? (1 - radius) ** 2 : 0;
}

export function restPose(face = 'front') {
  return { rotateX: 0, rotateY: face === 'back' ? 180 : 0, translateZ: 0 };
}

export function clampPose({ rotateX = 0, rotateY = 0, translateZ = 0 }) {
  return {
    rotateX: round(clamp(rotateX, -78, 78)),
    rotateY: round(rotateY),
    translateZ: round(clamp(translateZ, 0, 80))
  };
}

export function snapYaw(yaw) {
  return Math.round(yaw / 180) * 180;
}

export function calculateSpecular(pose, face = 'front') {
  const safePose = clampPose(pose);
  const faceTurn = face === 'back' ? 180 : 0;
  const normal = normalize(rotateVector([0, 0, 1], safePose.rotateX, safePose.rotateY + faceTurn));
  const broadPoint = add(
    rotateVector([0, 0, face === 'back' ? -3 : 3], safePose.rotateX, safePose.rotateY),
    [0, 0, safePose.translateZ]
  );
  const broadLight = normalize(subtract(softbox.center, broadPoint));
  const broadView = normalize(subtract(cameraPosition, broadPoint));
  const broadHalf = normalize(add(broadLight, broadView));
  const broadDiffuse = Math.max(dot(normal, broadLight), 0);
  const broadLobe = Math.pow(Math.max(dot(normal, broadHalf), 0), 18);
  const broadFresnel = 0.04 + 0.96 * Math.pow(1 - Math.max(dot(normal, broadView), 0), 5);
  const broadWeight = broadDiffuse * broadLobe * broadFresnel;
  const broadX = clamp(50 + normal[0] * 180 - normal[1] * 50, 10, 90);
  const broadY = clamp(50 - normal[0] * 110 - normal[1] * 165, 10, 90);
  let totalWeight = 0;
  let weightedX = 0;
  let weightedY = 0;

  for (const u of sampleCoordinates) {
    for (const v of sampleCoordinates) {
      const localPoint = [
        (u - 0.5) * cardSize.width,
        (v - 0.5) * cardSize.height,
        face === 'back' ? -3 : 3
      ];
      const point = add(
        rotateVector(localPoint, safePose.rotateX, safePose.rotateY),
        [0, 0, safePose.translateZ]
      );
      const lightDirection = normalize(subtract(softbox.center, point));
      const viewDirection = normalize(subtract(cameraPosition, point));
      const halfVector = normalize(add(lightDirection, viewDirection));
      const diffuse = Math.max(dot(normal, lightDirection), 0);
      const lobe = Math.pow(Math.max(dot(normal, halfVector), 0), 24);
      const fresnel = 0.04 + 0.96 * Math.pow(1 - Math.max(dot(normal, viewDirection), 0), 5);
      const reflectedView = reflect(scale(viewDirection, -1), normal);
      const coverage = softboxFalloff(point, reflectedView);
      const weight = diffuse * lobe * fresnel * coverage;

      totalWeight += weight;
      weightedX += u * weight;
      weightedY += v * weight;
    }
  }

  const normalizedWeight = totalWeight / (sampleCoordinates.length ** 2);
  const localX = totalWeight < 0.000001 ? broadX : clamp((weightedX / totalWeight) * 100, 0, 100);
  const localY = totalWeight < 0.000001 ? broadY : clamp((weightedY / totalWeight) * 100, 0, 100);
  const localBlend = clamp(totalWeight * 100, 0, 0.75);
  const x = round(broadX + (localX - broadX) * localBlend);
  const y = round(broadY + (localY - broadY) * localBlend);
  return {
    x,
    y,
    offsetX: round(clamp((x - 50) * 0.5, -28, 28)),
    offsetY: round(clamp((y - 50) * 0.42, -24, 24)),
    angle: round(clamp(135 - safePose.rotateY * 0.35 + safePose.rotateX * 0.25, 105, 165)),
    strength: round(clamp(
      0.025 + Math.max(0, broadWeight - 0.006) * 6 + normalizedWeight * 18,
      0.025,
      0.34
    ))
  };
}
