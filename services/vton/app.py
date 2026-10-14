"""Private, single-GPU FASHN VTON 1.5 worker. Images remain in bounded RAM."""
import base64
import binascii
import hmac
import io
import json
import os
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
from typing import Literal

from fastapi import FastAPI, Header, HTTPException, Request
from PIL import Image, ImageOps
from pydantic import BaseModel, ConfigDict

Image.MAX_IMAGE_PIXELS = 24_000_000
MAX_BODY = 9_000_000
TTL = 3600


class Inputs(BaseModel):
    model_config = ConfigDict(extra="ignore")
    model_image: str
    product_image: str
    category: Literal["tops", "bottoms", "one-pieces"]
    garment_photo_type: Literal["model", "flat-lay"] = "flat-lay"
    num_images: Literal[1] = 1
    return_base64: Literal[True] = True


class Run(BaseModel):
    model_name: Literal["fashn-vton-1.5"]
    inputs: Inputs


def decode_image(value):
    try:
        prefix, data = value.split(",", 1)
        if prefix not in ("data:image/jpeg;base64", "data:image/png;base64", "data:image/webp;base64"):
            raise ValueError("Unsupported image")
        raw = base64.b64decode(data, validate=True)
        if len(raw) > 3_000_000:
            raise ValueError("Image too large")
        with Image.open(io.BytesIO(raw)) as image:
            if image.width * image.height > Image.MAX_IMAGE_PIXELS or image.format not in ("JPEG", "PNG", "WEBP"):
                raise ValueError("Unsupported image")
            image.load()
            result = ImageOps.exif_transpose(image).convert("RGB")
            result.thumbnail((1600, 2000))
            return result
    except (ValueError, OSError, binascii.Error, Image.DecompressionBombError) as exc:
        raise HTTPException(400, "Use a valid JPG, PNG or WebP up to 3 MB and 24 megapixels.") from exc


def load_pipeline():
    # Imports stay inside the production loader: HTTP contract tests need no weights/GPU.
    import torch
    from fashn_vton import TryOnPipeline
    if not torch.cuda.is_available():
        raise RuntimeError("This worker requires a CUDA GPU; it cannot run inside Vercel.")
    return TryOnPipeline(weights_dir=os.environ.get("VTON_WEIGHTS_DIR", "/models/weights"), device="cuda")


def create_app(pipeline_loader=load_pipeline):
    jobs = {}
    lock = threading.Lock()
    state = {}

    def purge():
        now = time.monotonic()
        for key in list(jobs):
            # Active jobs keep their slot until inference ends; never oversubscribe the GPU.
            if jobs[key]["expires"] < now and jobs[key]["status"] not in ("starting", "processing"):
                del jobs[key]

    @asynccontextmanager
    async def lifespan(app):
        key = os.environ.get("VTON_SERVICE_KEY", "")
        if len(key) < 32:
            raise RuntimeError("Provide VTON_SERVICE_KEY with at least 32 characters.")
        state["key"] = key
        state["pipeline"] = pipeline_loader()
        state["executor"] = ThreadPoolExecutor(max_workers=1)
        stop = threading.Event()
        def expire_jobs():
            while not stop.wait(30):
                with lock:
                    purge()
        cleaner = threading.Thread(target=expire_jobs, daemon=True)
        cleaner.start()
        yield
        stop.set()
        cleaner.join(timeout=2)
        state["executor"].shutdown(wait=True, cancel_futures=True)
        jobs.clear()
        state.clear()

    app = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)

    @app.middleware("http")
    async def private_headers(request, call_next):
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response

    def authorize(authorization):
        expected = "Bearer " + state.get("key", "")
        if not state.get("key") or not hmac.compare_digest((authorization or "").encode(), expected.encode()):
            raise HTTPException(401, "Unauthorized")

    @app.get("/health")
    def health():
        return {"ready": "pipeline" in state, "model": "fashn-vton-1.5"}

    def infer(id, person, garment, inputs):
        try:
            with lock:
                if jobs[id]["deleted"]:
                    jobs[id]["status"] = "canceled"
                    return
                jobs[id]["status"] = "processing"
            result = state["pipeline"](
                person_image=person, garment_image=garment,
                category=inputs.category, garment_photo_type=inputs.garment_photo_type,
                num_samples=1, num_timesteps=30, seed=42,
            )
            try:
                with io.BytesIO() as stream:
                    image = result.images[0].convert("RGB")
                    image.thumbnail((1600, 2000))
                    image.save(stream, "JPEG", quality=88)
                    if stream.tell() > 3_000_000:
                        raise ValueError("Output too large")
                    encoded = "data:image/jpeg;base64," + base64.b64encode(stream.getvalue()).decode()
                    image.close()
            finally:
                for image in result.images:
                    image.close()
            with lock:
                jobs[id]["status"] = "canceled" if jobs[id]["deleted"] else "completed"
                if not jobs[id]["deleted"] and jobs[id]["expires"] > time.monotonic():
                    jobs[id]["output"] = [encoded]
        except Exception:
            # Never log photos, request bodies, tokens or underlying model exception data.
            with lock:
                jobs[id]["status"] = "canceled" if jobs[id]["deleted"] else "failed"
        finally:
            person.close()
            garment.close()
            with lock:
                if jobs.get(id, {}).get("deleted"):
                    jobs.pop(id, None)

    @app.post("/v1/run", status_code=202)
    async def run(request: Request, authorization: str | None = Header(default=None)):
        authorize(authorization)
        body = bytearray()
        async for chunk in request.stream():
            if len(body) + len(chunk) > MAX_BODY:
                raise HTTPException(413, "Request too large")
            body.extend(chunk)
        try:
            payload = Run.model_validate(json.loads(body))
        except (ValueError, TypeError):
            raise HTTPException(400, "Invalid try-on input")
        person = decode_image(payload.inputs.model_image)
        try:
            garment = decode_image(payload.inputs.product_image)
        except Exception:
            person.close()
            raise
        with lock:
            purge()
            active = sum(j["status"] in ("starting", "processing") for j in jobs.values())
            if active >= 2 or len(jobs) >= 32:
                person.close()
                garment.close()
                raise HTTPException(429, "Worker busy; try again later")
            id = str(uuid.uuid4())
            jobs[id] = {"status": "starting", "expires": time.monotonic() + TTL, "deleted": False}
            state["executor"].submit(infer, id, person, garment, payload.inputs)
        return {"id": id, "error": None}

    @app.get("/v1/status/{id}")
    def status(id: str, authorization: str | None = Header(default=None)):
        authorize(authorization)
        with lock:
            purge()
            job = jobs.get(id)
            if not job or job["deleted"] or job["expires"] <= time.monotonic():
                raise HTTPException(404, "Job unavailable")
            return {"id": id, "status": job["status"], "output": job.get("output"), "error": None}

    @app.delete("/v1/jobs/{id}")
    def delete(id: str, authorization: str | None = Header(default=None)):
        authorize(authorization)
        with lock:
            job = jobs.get(id)
            if job:
                job["deleted"] = True
                job.pop("output", None)
        return {"deleted": True, "running_inference_cancelled": False}

    return app


app = create_app()
