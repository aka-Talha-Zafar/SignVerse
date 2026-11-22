# Updated project
# HuggingFace Spaces — Docker space
# app.py imports learning_backend + text_to_sign_backend — copy all into the image.
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

# Copy API modules. database.json is loaded at runtime.
COPY app.py learning_backend.py text_to_sign_backend.py /home/user/
#

# Easy-mode refs are provided by the frontend from Wikimedia ASL reference SVGs.
RUN mkdir -p /home/user/static/alphabet_refs

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
