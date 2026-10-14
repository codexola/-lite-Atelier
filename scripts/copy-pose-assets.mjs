import { mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const root = path.dirname(require.resolve('@mediapipe/pose/package.json'));
const output = path.resolve('public/models/pose');
mkdirSync(output, { recursive: true });
copyFileSync(
  path.resolve('licenses/mediapipe-LICENSE.txt'),
  path.join(output, 'LICENSE.txt'),
);
for (const file of [
  'pose.js',
  'pose_landmark_lite.tflite',
  'pose_landmark_full.tflite',
  'pose_solution_packed_assets.data',
  'pose_solution_packed_assets_loader.js',
  'pose_solution_simd_wasm_bin.js',
  'pose_solution_simd_wasm_bin.wasm',
  'pose_solution_simd_wasm_bin.data',
  'pose_solution_wasm_bin.js',
  'pose_solution_wasm_bin.wasm',
  'pose_web.binarypb',
])
  copyFileSync(path.join(root, file), path.join(output, file));
writeFileSync(
  path.join(output, 'NOTICE.txt'),
  'Google MediaPipe Pose 0.5.1675469404. Apache License 2.0. Unmodified runtime/model assets copied from the lockfile-verified @mediapipe/pose npm package. https://github.com/google-ai-edge/mediapipe\n',
);
console.log('Self-hosted camera pose assets ready.');
