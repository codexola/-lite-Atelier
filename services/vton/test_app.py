import base64
import io
import os
import threading
import time
import unittest
from types import SimpleNamespace
from unittest.mock import patch
from fastapi.testclient import TestClient
from PIL import Image
from app import create_app


def photo():
    with io.BytesIO() as stream:
        Image.new("RGB", (32, 48), "white").save(stream, "JPEG")
        return "data:image/jpeg;base64," + base64.b64encode(stream.getvalue()).decode()


class WorkerTests(unittest.TestCase):
    def setUp(self):
        self.calls = []
        def pipeline(**kwargs):
            self.calls.append(kwargs)
            return SimpleNamespace(images=[kwargs["person_image"].copy()])
        self.env = patch.dict(os.environ, {"VTON_SERVICE_KEY": "test-only-worker-secret-1234567890123456789"})
        self.env.start()
        self.client = TestClient(create_app(lambda: pipeline))
        self.client.__enter__()
        self.headers = {"Authorization": "Bearer " + os.environ["VTON_SERVICE_KEY"]}
        self.payload = {"model_name": "fashn-vton-1.5", "inputs": {"model_image": photo(), "product_image": photo(), "category": "tops"}}

    def tearDown(self):
        self.client.__exit__(None, None, None)
        self.env.stop()

    def test_auth_validation_and_no_remote_image_fetch(self):
        self.assertEqual(self.client.post("/v1/run", json=self.payload).status_code, 401)
        self.payload["inputs"]["model_image"] = "https://example.com/private.jpg"
        self.assertEqual(self.client.post("/v1/run", headers=self.headers, json=self.payload).status_code, 400)
        self.assertFalse(self.calls)

    def test_actual_pipeline_contract_private_output_and_delete(self):
        self.payload["inputs"]["category"] = "bottoms"
        response = self.client.post("/v1/run", headers=self.headers, json=self.payload)
        self.assertEqual(response.status_code, 202)
        id = response.json()["id"]
        for _ in range(100):
            response = self.client.get("/v1/status/"+id, headers=self.headers)
            if response.json()["status"] == "completed": break
            time.sleep(.01)
        self.assertEqual(response.json()["status"], "completed")
        self.assertTrue(response.json()["output"][0].startswith("data:image/jpeg;base64,"))
        self.assertEqual(response.headers["cache-control"], "no-store")
        self.assertEqual(self.calls[0]["category"], "bottoms")
        self.assertEqual(self.calls[0]["num_timesteps"], 30)
        self.assertEqual(self.client.get("/v1/status/"+id).status_code, 401)
        self.assertEqual(self.client.delete("/v1/jobs/"+id, headers=self.headers).status_code, 200)
        self.assertEqual(self.client.get("/v1/status/"+id, headers=self.headers).status_code, 404)

    def test_bad_category_and_payload_limit(self):
        self.payload["inputs"]["category"] = "unsupported"
        self.assertEqual(self.client.post("/v1/run", headers=self.headers, json=self.payload).status_code, 400)
        self.assertEqual(self.client.post("/v1/run", headers=self.headers, content=b'x'*9_000_001).status_code, 413)

    def test_queue_is_bounded_and_deleted_running_output_is_discarded(self):
        release = threading.Event()
        started = threading.Event()
        def slow(**kwargs):
            started.set()
            release.wait(3)
            return SimpleNamespace(images=[kwargs["person_image"].copy()])
        with TestClient(create_app(lambda: slow)) as client:
            first = client.post("/v1/run", headers=self.headers, json=self.payload).json()["id"]
            self.assertTrue(started.wait(1))
            self.assertEqual(client.post("/v1/run", headers=self.headers, json=self.payload).status_code, 202)
            self.assertEqual(client.post("/v1/run", headers=self.headers, json=self.payload).status_code, 429)
            client.delete("/v1/jobs/"+first, headers=self.headers)
            release.set()
            self.assertEqual(client.get("/v1/status/"+first, headers=self.headers).status_code, 404)

    def test_failed_pipeline_does_not_return_fake_success(self):
        def broken(**kwargs):
            raise RuntimeError("private internal test error")
        with TestClient(create_app(lambda: broken)) as client:
            id = client.post("/v1/run", headers=self.headers, json=self.payload).json()["id"]
            for _ in range(100):
                response = client.get("/v1/status/"+id, headers=self.headers)
                if response.json()["status"] == "failed": break
                time.sleep(.01)
            self.assertEqual(response.json()["status"], "failed")
            self.assertIsNone(response.json()["output"])
            self.assertNotIn("private internal", response.text)

if __name__ == "__main__": unittest.main()

