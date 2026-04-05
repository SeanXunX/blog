---
title: Dev Containers
author: Sean Xu
pubDatetime: 2026-04-05T12:15:07.264+08:00
featured: true
draft: false
tags:
  - docker
  - tech
description: Notes about Dev Containers
---
# Stop Polluting Your Mac: The Ultimate Guide to C++ GUI Development with VS Code Dev Containers

If you’re taking a Computer Graphics course, chances are you’ve run into this classic developer dilemma: **The assignment requires compiling on Ubuntu, but you use a Mac.** 

You could install a heavy Virtual Machine, dual-boot (if that's even possible for you), or spend hours wrestling with Homebrew to natively install `freeglut` and OpenGL—only to inevitably mess up your local system environment. And let's not even talk about the nightmare of forwarding Linux graphical interfaces to a Mac using XQuartz. 

What if I told you there’s a way to get a perfectly pure Ubuntu environment, complete with visual GUI support and flawless VS Code auto-completion, **without installing a single C++ library on your Mac?**

Enter [**VS Code Dev Containers**](https://containers.dev/). Let's dive into what makes this tech feel like magic, starting from the basic concepts to setting up a fully functional OpenGL development environment.

---

## 🧠 The Secret Sauce: How Dev Containers Work

If you've used standard Docker before, you might be thinking: *"Can't I just use a Docker container to compile?"* 

You can, but it leads to the dreaded **"Red Squiggly Line Hell"**. If you write code on your Mac but compile in Docker, your local VS Code can't find Linux-specific header files (like `<GL/glut.h>`). You lose auto-completion, and your editor yells at you with syntax errors.

Dev Containers solve this with a brilliant **Client-Server Architecture**:
1. **The Orchestrator:** It acts like `docker-compose`, automatically building the image, mounting your local code, and forwarding ports.
2. **The Backend Server:** VS Code silently injects a lightweight `vscode-server` *inside* the running Docker container. 

Your Mac only handles the UI (the Frontend). The container handles the file system, the terminal, and the **Language Server**. Because the C++ Language Server is running *inside* the Ubuntu container, it knows exactly where your OpenGL headers are. You get perfect IntelliSense locally, while your Mac remains completely untouched.

---

## 🐍 Part 1: The Missing From-scratch Quickstart

Before we tackle C++ and GUI forwarding, let’s look at the absolute bare minimum to see Dev Containers in action. 

### 1. The Setup
Make sure you have **Docker Desktop** running and the **Dev Containers extension** installed in VS Code. Create a new project folder and set up this exact structure:

```text
my-python-project/
├── .devcontainer/
│   └── devcontainer.json   👈 The magic config file
└── app.py
```

### 2. The Configuration
We don't even need a Dockerfile for this. Drop this into `devcontainer.json`:

```json
{
    "name": "My Simple Python Env",
    "image": "mcr.microsoft.com/devcontainers/python:3.11",
    "customizations": {
        "vscode": {
            "extensions":["ms-python.python"]
        }
    },
    "postCreateCommand": "pip install requests"
}
```

### 3. The Test Code
Drop this into `app.py`:
```python
import requests
import sys

print("Hello from the Dev Container!")
print(f"Python Version: {sys.version.split()[0]}")
print(f"GitHub API Status Code: {requests.get('https://api.github.com').status_code}")
```

### 4. Run It!
Press `Cmd + Shift + P` in VS Code, type `Reopen`, and hit **`Dev Containers: Reopen in Container`**. 

VS Code will download the Python image, install the `requests` library, and attach itself. Open the terminal, run `python app.py`, and boom! You are coding in an isolated Python 3.11 environment. 

> **💡 Pro Tip:** To clean up, just close VS Code. If you want to delete the environment entirely, go to Docker Desktop and trash the container. Your code safely remains on your Mac!

---

## 🎮 Part 2: The Final Boss (C++ & OpenGL GUI)

Now, let's tackle the actual homework. We need Ubuntu build tools, OpenGL libraries, and a way to view graphical windows. 

Instead of dealing with buggy native X11 forwarding, we are going to use a Dev Container "Feature" that spins up a **web-based Linux desktop**.

### 1. Project Structure
Create your homework directory:
```text
CG_Homework/
├── .devcontainer/
│   ├── devcontainer.json
│   └── Dockerfile
├── main.cpp
└── CMakeLists.txt
```

### 2. The Dockerfile
Here, we define our pure Ubuntu environment and install the required CG libraries.

```dockerfile
FROM mcr.microsoft.com/devcontainers/cpp:ubuntu-22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get -y install --no-install-recommends \
    build-essential \
    cmake \
    freeglut3-dev \
    xorg-dev \
    libxrandr-dev \
    libsdl2-dev \
    && apt-get clean && rm -rf /var/lib/apt/lists/*
```

### 3. The Orchestration (`devcontainer.json`)
This config is the heavy lifter. Notice the `desktop-lite` feature—this automatically installs a lightweight window manager (Fluxbox) and a noVNC server.

```json
{
    "name": "Ubuntu-CG-Env",
    "build": {
        "dockerfile": "Dockerfile"
    },
    "features": {
        // 🪄 The Magic: Installs a lightweight desktop and web-based VNC
        "ghcr.io/devcontainers/features/desktop-lite:1": {} 
    },
    "customizations": {
        "vscode": {
            // Installs C++ extensions INSIDE the container for perfect IntelliSense
            "extensions":[
                "ms-vscode.cpptools",
                "ms-vscode.cmake-tools",
                "twxs.cmake"
            ]
        }
    },
    "forwardPorts":[6080], // Tunnels the web desktop to your Mac
    "portsAttributes": {
        "6080": {
            "label": "Desktop GUI",
            "onAutoForward": "notify"
        }
    },
    "remoteUser": "vscode" // Prevents root permission issues with your Mac files
}
```

### 4. The OpenGL Code
Let's write a quick triangle test in `main.cpp`:

```cpp
#include <GL/glut.h>

void display() {
    glClear(GL_COLOR_BUFFER_BIT);
    glBegin(GL_TRIANGLES);
        glColor3f(1.0, 1.0, 1.0);
        glVertex2f(-0.5, -0.5);
        glVertex2f(0.5, -0.5);
        glVertex2f(0.0, 0.5);
    glEnd();
    glFlush();
}

int main(int argc, char** argv) {
    glutInit(&argc, argv);
    glutInitDisplayMode(GLUT_SINGLE | GLUT_RGB);
    glutInitWindowSize(500, 500);
    glutCreateWindow("My Dev Container Window");
    glutDisplayFunc(display);
    glClearColor(0.2, 0.3, 0.3, 1.0);
    glutMainLoop();
    return 0;
}
```

And a simple `CMakeLists.txt`:
```cmake
cmake_minimum_required(VERSION 3.10)
project(CG_Homework)

find_package(OpenGL REQUIRED)
find_package(GLUT REQUIRED)

add_executable(my_cg_app main.cpp)
target_link_libraries(my_cg_app OpenGL::GL GLUT::GLUT)
```

### 5. Seeing is Believing
1. Fire up the command palette (`Cmd + Shift + P`) and select **`Dev Containers: Rebuild and Reopen in Container`**.
2. Open your Mac's browser and navigate to **`http://localhost:6080`**. You'll be greeted by a slick, virtual Linux desktop.
3. Back in VS Code, open the integrated terminal and run:
   ```bash
   cmake -B build
   cmake --build build
   ./build/my_cg_app
   ```
4. Look at your browser—your OpenGL application will instantly pop up inside the web-based desktop!

---

## 🎯 Wrap Up

By adopting this workflow, you achieve the holy grail of cross-platform development: 
* **Zero local pollution** (your Mac stays pristine).
* **Flawless editor support** (no false-positive syntax errors).
* **Guaranteed reproducibility** (it works exactly the same on your professor's Ubuntu machine).

Whether you are working on a quick Python script or a complex C++ graphical application, Dev Containers offer a modern, elegant, and robust solution. Happy coding!