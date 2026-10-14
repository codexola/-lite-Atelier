# FASHN VTON 1.5: verified feasibility and deployment

## What can run where

The supplied [FASHN VTON 1.5 repository](https://github.com/fashn-AI/fashn-vton-1.5) contains genuine inference code. The application now includes an optional worker that imports and calls its actual `TryOnPipeline`; there is no compositing substitute in that production loader. The upstream source is pinned to `7c0f10af3f91ad4048fe9729c470a13ef905d25a`.

The model is a Python/PyTorch workload with about 2 GB of try-on/pose weights plus a roughly 244 MB parser download. Upstream supports CPU float32 and GPU inference, recommending bf16-capable Ampere or newer hardware. This worker requires CUDA for practical serving, serializes inference and bounds its queue. Vercel's Next.js serverless runtime cannot host the CUDA model. Self-hosting needs a separate GPU machine, cached model weights and an HTTPS endpoint; entering an API key alone cannot supply that infrastructure. GPU capacity, output quality and latency must be measured on that machine. No GPU is available in the current cloud workspace, so actual model inference and the GPU Docker image have not been executed here.

## Licensing finding

The main VTON repository is Apache-2.0, but its mandatory `fashn-human-parser` dependency states that it inherits the [NVIDIA SegFormer license](https://github.com/NVlabs/SegFormer/blob/master/LICENSE). Section 3.3 says the work “only may be used or intended for use non-commercially,” defined as research/evaluation. The upstream pipeline initializes that parser even in segmentation-free mode. The Apache badge alone does not establish rights to use the complete stack commercially. Obtain appropriate rights or an independently licensed replacement before connecting this worker to commercial operations. The optional worker is prepared for evaluation; it has not been activated for the live shop. Hosted FASHN remains the default integration, subject to the provider account's terms.

## Key-only activation on the current live site

No new source edit is needed:

1. In Vercel project `lite_atelier_demo`, add the valid `FASHN_API_KEY` to Production using secure environment settings. Keep `TRY_ON_PROVIDER` unset or `fashn`. Do not set `FASHN_BASE_URL` in Production; it is an automated-test fixture setting.
2. Redeploy. `/api/try-on/config` must report `provider:"FASHN"`, `model:"tryon-max"`, `configured:true`. This reports binding presence; actual validity/credits are checked by inference.
3. Sign in as a customer, open `/probador-virtual`, use a consented photo/camera capture, select the garment/color, authorize transmission and generate. The existing flow handles progress, resumable status polling, before/after comparison, download and clearing. Real quality/latency verification remains pending the key and provider credits.

If `TRY_ON_PROVIDER` is absent, no GPU settings are required. Missing or invalid provider selection fails closed. Neither credentials nor private photos/results enter the JavaScript bundle or application database.

## Optional GPU deployment after resolving usage rights

The worker supplies `/v1/run`, `/v1/status/{id}`, `/v1/jobs/{id}` (DELETE), and `/health`. Its private protocol is adapted through the existing server-side SDK transport. It selects `tops`, `bottoms` or `one-pieces`, uses flat-lay cutouts where available and handles worn reference galleries. It calls `TryOnPipeline(..., num_samples=1, num_timesteps=30, seed=42)`.

Build from the repository root on a CUDA-capable host with Docker/NVIDIA Container Toolkit:

```bash
docker build -f services/vton/Dockerfile -t atelier-vton:1.5 .
docker volume create atelier-vton-models
docker run --rm -v atelier-vton-models:/models atelier-vton:1.5 \
  python upstream/scripts/download_weights.py --weights-dir /models/weights
```

The weight command uses the pinned upstream downloader and its trusted HTTPS Hugging Face destinations; it also caches the parser. Retain `/models` between restarts. Keep all downloaded license/attribution files. The Docker base and inference dependency pins require validation on the deployment GPU; the lightweight HTTP requirements are tested independently here.

Securely supply a random `VTON_SERVICE_KEY` of at least 32 characters to that machine, then start one worker process behind an HTTPS reverse proxy (example binds only to the host loopback):

```bash
docker run --rm --gpus all -p 127.0.0.1:8000:8000 \
  --env VTON_SERVICE_KEY -v atelier-vton-models:/models atelier-vton:1.5
```

Do not put the key in a Dockerfile, Git, a URL, or public command arguments. Configure the reverse proxy to limit JSON request size to 9 MB, disable request-body/header logging, and avoid public caching. A deployment health check must return `ready:true` after weights load. Use a single replica and one Uvicorn process: queued jobs/results are private bounded RAM state, not a shared durable queue. Restarting loses them. Horizontal scaling requires a separate private job store and queue implementation.

Set the following securely in Vercel Production and redeploy:

- `TRY_ON_PROVIDER=self-hosted`
- `VTON_SERVICE_URL=https://your-gpu-host.example` (the real root HTTPS origin, no credentials/query/path)
- `VTON_SERVICE_KEY` (the same private worker key)

The merchant FASHN API key is not used in this mode. The UI identifies the selected private service and consent destination. Switching providers invalidates previous provider job references instead of polling the wrong system. Missing matching garment-color photography is rejected before inference.

## Privacy, load and failure behavior

The worker accepts inline JPG/PNG/WebP only, with up to 3 MB and 24 megapixels per image. It never fetches customer-supplied URLs. Authentication precedes body decoding; the request stream is bounded. One GPU inference runs at a time, with at most one queued job and 32 recent job records. Saturation returns 429. Images/results are held in RAM, inaccessible without the service key; the application additionally enforces per-customer job ownership. Results expire after an hour and a background cleaner removes expired finished records. Private responses use `Cache-Control:no-store`.

Delete clears the result and discards a queued/running job's eventual output. It cannot interrupt an already executing diffusion call. Inputs are closed after execution. Restarts clear all RAM state; persistent weights contain no customer images. The service uses generic failures and disables HTTP access logging. A failed job never returns a placeholder image as a generated success.

## Executed checks

The HTTP service tests run with an explicitly injected test pipeline, exercising real image decoding, authorization, accepted categories, private output encoding, deletion and request limits. SDK tests verify hosted-key activation, HTTPS/private-token configuration, private transport, provider-switch isolation and garment category mapping. The existing browser suite exercises capture, consent, submission, progress, comparison, download and cleanup with a simulated HTTP inference provider. These checks establish integration behavior; they do not establish real GPU model output or provider-account validity.

```bash
python -m venv /tmp/atelier-vton-tests
/tmp/atelier-vton-tests/bin/python -m pip install -r services/vton/requirements.lock
/tmp/atelier-vton-tests/bin/python -m unittest discover -s services/vton -p 'test_*.py' -v
npm run test:unit
npm run build
npm test
```
