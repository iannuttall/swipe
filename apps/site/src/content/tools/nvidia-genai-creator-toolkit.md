---
name: "NVIDIA GenAI Creator Toolkit"
seoTitle: "NVIDIA GenAI Creator Toolkit for ComfyUI"
headline: "NVIDIA GenAI Creator Toolkit: Local ComfyUI workflows for RTX"
tagline: "Run ready-made image, video, texture, and 3D workflows locally."
description: "NVIDIA's toolkit packages documented ComfyUI graphs for image layers, inpainting, panoramas, video, textures, prompt enhancement, and image-to-3D."
url: "https://github.com/NVIDIA/NVIDIA-GenAI-Creator-Toolkit"
kind: "repository"
platforms: ["Windows", "Linux"]
repository: "https://github.com/NVIDIA/NVIDIA-GenAI-Creator-Toolkit"
category: "Creative AI"
tags: ["ComfyUI", "NVIDIA RTX", "image generation"]
status: "early"
firstSeen: 2026-07-29
lastChecked: 2026-07-29
reviewEveryDays: 30
featuredIssues: []
sources:
  - kind: "repository"
    label: "NVIDIA GenAI Creator Toolkit"
    url: "https://github.com/NVIDIA/NVIDIA-GenAI-Creator-Toolkit"
    checkedAt: 2026-07-29
  - kind: "readme"
    label: "Toolkit requirements and module list"
    url: "https://github.com/NVIDIA/NVIDIA-GenAI-Creator-Toolkit/blob/main/README.md"
    checkedAt: 2026-07-29
  - kind: "docs"
    label: "Linux installation guide"
    url: "https://github.com/NVIDIA/NVIDIA-GenAI-Creator-Toolkit/blob/main/LINUX_COMFYUI_INSTALLATION.md"
    checkedAt: 2026-07-29
  - kind: "other"
    label: "NVIDIA workflow walkthrough"
    url: "https://developer.nvidia.com/blog/how-to-build-run-and-scale-high-quality-creator-workflows-in-comfyui/"
    checkedAt: 2026-07-29
  - kind: "other"
    label: "Image-to-3D requirements and known problems"
    url: "https://github.com/NVIDIA/NVIDIA-GenAI-Creator-Toolkit/blob/main/workflows/08-image-to-3d/README.md"
    checkedAt: 2026-07-29
---

## What is in the toolkit

NVIDIA GenAI Creator Toolkit is a collection of prebuilt ComfyUI workflows for
creative production on an NVIDIA RTX computer. It comes from NVIDIA's GTC 2026
course on generative design and visualisation workflows.

The repository contains eight main modules and two bonus modules:

1. improve a weak image prompt with a local Gemma model
2. split an image into foreground, middle, and background layers
3. edit only a masked part of an image
4. turn an image into a tileable 360-degree panorama
5. turn that panorama into an HDRI
6. control when and where an object moves in a generated video
7. restyle a basic 3D render as video
8. create a textured 3D asset from one image
9. extract a tileable texture from an image
10. turn a texture into a PBR material set

Each module has a ComfyUI graph, required model list, custom node list, example
input, output, and troubleshooting notes. You can install one module rather
than taking the whole collection.

This is a workflow library, not a new image model. Its value is the wiring and
documentation around several models and custom nodes.

## Check the machine before cloning anything

The requirements are much heavier than a normal desktop AI app:

- Windows 11 or Linux x86_64
- an NVIDIA RTX GPU and CUDA 12
- Python 3.10 or newer, with 3.11 or 3.12 recommended
- ComfyUI, Git, and a Hugging Face account
- at least 24 GB of VRAM on Windows or 32 GB on Linux for most modules
- 32 GB on Windows or 48 GB on Linux for the two video modules.

The full set occupies about 450 GB because several modules share models.
Individual modules range from roughly 10 GB to 143 GB. NVIDIA recommends an
RTX 5090 on Windows or RTX PRO 6000 on Linux to cover the collection, but that
headline recommendation has an important exception described below.

If your GPU has 8 GB, 12 GB, or 16 GB of VRAM this is not the right starter
pack. Choose smaller ComfyUI models and workflows built for that limit.

## Install one useful module first

Image deconstruction and targeted inpainting are sensible starting points.
They have clear inputs and outputs, and each needs about 51 to 52 GB of disk
space.

After installing ComfyUI clone the toolkit and select only those modules:

```sh
git clone https://github.com/NVIDIA/NVIDIA-GenAI-Creator-Toolkit
cd NVIDIA-GenAI-Creator-Toolkit
```

On Windows:

```bat
install.bat C:\path\to\ComfyUI --modules 02,03
```

On Linux:

```sh
bash install.sh /path/to/ComfyUI --modules 02,03
```

Read the installer and both module READMEs before running those commands. The
installer does more than copy JSON. It installs Python packages, clones
third-party custom nodes, downloads large model files, and can replace the
current CUDA build of PyTorch. Some modules also patch or downgrade packages
for compatibility.

Use a separate ComfyUI environment rather than an installation that already
supports important work. The `--clean` option removes model and workflow files
for a module, but deliberately leaves custom nodes behind.

## What we could verify safely

We parsed all 11 supplied ComfyUI graph files without installing models or
executing custom nodes. The extra graph belongs to the two-stage motion module.
The image deconstruction graph contains 10 nodes, targeted inpainting contains
22, and image-to-3D contains 13.

That confirms the repository contains structured workflows rather than
screenshots and marketing copy. It does not verify output quality, runtime,
VRAM use, or compatibility with a particular driver. A full run would require
hundreds of gigabytes of untrusted model and node downloads, so it is not a
sensible catalogue smoke test.

## Price and model licences

The toolkit's own code and documentation use the Apache 2.0 licence. ComfyUI is
also free to install. There is no NVIDIA subscription for the repository.

The models and custom nodes have separate terms. Some Hugging Face downloads
require an account and acceptance of a model agreement. FLUX.1-dev has its own
licence with commercial-use conditions. Review the model table for each module
before using output in paid client work.

The real costs are the RTX hardware, disk space, long downloads, electricity,
and time spent keeping CUDA, PyTorch, ComfyUI, custom nodes, and models
compatible.

## Privacy and network exposure

The workflows are designed to run locally. Source images and generated output
stay in the ComfyUI input and output folders by default. Module 01 uses Ollama
for its language model rather than a hosted API.

Installation still contacts GitHub, Hugging Face, PyPI, and model hosts. Every
custom node is code running inside ComfyUI, so review its repository and
permissions. Local generation does not make a third-party node trustworthy.

NVIDIA's Linux guide starts ComfyUI with `--listen` and recommends an SSH
tunnel. Do not expose the ComfyUI port directly to the public internet. Bind it
to a trusted network or keep it behind the documented tunnel.

## Known compatibility traps

Module 08, image-to-3D, is Windows only. It needs Python 3.11 or 3.12 and
prebuilt CUDA extensions tied to PyTorch 2.8. The installer may downgrade
PyTorch to satisfy those extensions.

Its own documentation currently reports that the final decoder stalls on RTX
5090 and RTX 6000 Max-Q hardware because the supplied extensions do not include
the needed Blackwell target. RTX 4090 and RTX 6000 Ada are listed as
unaffected. Check that page before buying hardware or downloading its models.

The repository does not publish tagged releases yet, and model links can
change independently. Pin a working ComfyUI environment and keep a record of
the model and custom-node commits used for finished work.

## Alternatives

Start with ComfyUI's own templates or a small trusted workflow when you want to
learn the graph and use lighter models. Hosted creative tools are easier when
you do not own a high-memory RTX machine. Photoshop and other conventional
editors remain faster for a one-off mask or layer job that does not need a
repeatable generative pipeline.

Choose NVIDIA's toolkit when you have the hardware, want a local repeatable
workflow, and one of its documented production tasks matches the job.
