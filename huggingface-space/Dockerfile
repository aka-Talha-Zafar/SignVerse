# HuggingFace Spaces — Docker space
# app.py imports learning_backend — BOTH must be COPY'd into the image.
FROM python:3.11-slim

# System deps for OpenCV + MediaPipe
RUN apt-get update && apt-get install -y \
    libglib2.0-0 libsm6 libxext6 libxrender-dev libgl1 libglib2.0-dev \
    && rm -rf /var/lib/apt/lists/*

# Create user early
RUN useradd -m -u 1000 user

# Install Python deps as root
COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# Copy API — learning_backend.py is required for integrate_learning_into_signverse(app)
COPY app.py learning_backend.py /home/user/

# Give full ownership to user
RUN chown -R user:user /home/user

USER user
WORKDIR /home/user

ENV HOME=/home/user
ENV PATH=/home/user/.local/bin:$PATH
ENV MODEL_DIR=/home/user/models
ENV HF_HOME=/home/user/.cache/huggingface
ENV TMPDIR=/home/user/tmp

# Create writable directories
RUN mkdir -p /home/user/models /home/user/tmp /home/user/.cache/huggingface

EXPOSE 7860

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
