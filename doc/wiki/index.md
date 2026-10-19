---
layout: home

hero:
  name: Just Because
  text: Project docs, ready to host.
  tagline: Start with a private preview on your home network. Move the same static site to a VPS or AWS EC2 when you are ready.
  actions:
    - theme: brand
      text: Preview on your network
      link: /hosting/home-network
    - theme: alt
      text: Choose a hosting path
      link: /hosting/

features:
  - icon: 🏡
    title: Try it on your LAN
    details: Build the docs once, copy the static files to THEPC, and share the private network address.
    link: /hosting/home-network
  - icon: 📦
    title: Ship with Docker
    details: Use the included Nginx image and Caddy for HTTPS on a Linux VPS.
    link: /hosting/vps-docker
  - icon: ☁️
    title: Move to EC2
    details: Follow the same container setup with AWS networking and access controls.
    link: /hosting/aws-ec2
---

## A small site with a clear path

This portal is a static documentation site maintained in `doc/wiki/`. Node is used to build it; visitors only need a web server. That keeps the home-network preview simple and makes a later Docker deployment portable.

Start with the [hosting overview](/hosting/) to understand the options, or go straight to the [home-network preview](/hosting/home-network).
