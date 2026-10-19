import { defineConfig } from "vitepress";

export default defineConfig({
  lang: "en-US",
  title: "Just Because Docs",
  description:
    "Project notes and practical guides for previewing and hosting the Just Because documentation site.",
  cleanUrls: true,
  themeConfig: {
    siteTitle: "Just Because",
    logo: "/favicon.svg",
    nav: [
      { text: "Home", link: "/" },
      { text: "Hosting guide", link: "/hosting/" },
      { text: "Architecture", link: "/hosting/architecture" },
      {
        text: "GitHub",
        link: "https://github.com/janellereonal/just-because",
      },
    ],
    sidebar: {
      "/hosting/": [
        {
          text: "Start here",
          items: [
            { text: "Hosting overview", link: "/hosting/" },
            { text: "Site architecture", link: "/hosting/architecture" },
          ],
        },
        {
          text: "Run it now",
          items: [
            { text: "Home network preview", link: "/hosting/home-network" },
          ],
        },
        {
          text: "Deploy later",
          items: [
            { text: "VPS with Docker", link: "/hosting/vps-docker" },
            { text: "AWS EC2", link: "/hosting/aws-ec2" },
          ],
        },
        {
          text: "Operate",
          items: [
            { text: "Updates and troubleshooting", link: "/hosting/operations" },
          ],
        },
      ],
    },
    search: { provider: "local" },
    socialLinks: [
      { icon: "github", link: "https://github.com/janellereonal/just-because" },
    ],
  },
});
