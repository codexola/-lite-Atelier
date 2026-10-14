FROM pytorch/pytorch:2.5.1-cuda12.4-cudnn9-runtime
ENV PYTHONUNBUFFERED=1 HF_HOME=/models/cache VTON_WEIGHTS_DIR=/models/weights
RUN apt-get update && apt-get install -y --no-install-recommends git libgl1 libglib2.0-0 && rm -rf /var/lib/apt/lists/*
WORKDIR /opt/vton
RUN git clone https://github.com/fashn-AI/fashn-vton-1.5.git upstream && cd upstream && git checkout --detach 7c0f10af3f91ad4048fe9729c470a13ef905d25a
COPY services/vton/requirements.lock .
RUN printf 'torch==2.5.1\ntorchvision==0.20.1\n' > constraints.txt && pip install --no-cache-dir -c constraints.txt -e ./upstream -r requirements.lock
COPY services/vton/app.py .
EXPOSE 8000
HEALTHCHECK --start-period=300s --interval=30s --timeout=5s CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health', timeout=4)"
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--no-access-log"]
