import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";
import { themes as prismThemes } from "prism-react-renderer";

const rustDocsUrl = "https://github.com/murali-engine/murali-rs/tree/main/docs";

const config: Config = {
  title: "Veena",
  tagline: "Mathematics, beautifully in motion.",
  favicon: "img/favicon_io/favicon.ico",

  headTags: [
    {
      tagName: "link",
      attributes: {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: "/img/favicon_io/favicon-32x32.png",
      },
    },
    {
      tagName: "link",
      attributes: {
        rel: "icon",
        type: "image/png",
        sizes: "16x16",
        href: "/img/favicon_io/favicon-16x16.png",
      },
    },
    {
      tagName: "link",
      attributes: {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href: "/img/favicon_io/apple-touch-icon.png",
      },
    },
    {
      tagName: "link",
      attributes: {
        rel: "manifest",
        href: "/img/favicon_io/site.webmanifest",
      },
    },
    {
      tagName: "meta",
      attributes: {
        name: "theme-color",
        content: "#0b233f",
      },
    },
  ],

  url: "https://veenaengine.com",
  baseUrl: "/",
  trailingSlash: true,

  organizationName: "murali-engine",
  projectName: "veena",

  onBrokenLinks: "throw",
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: "warn",
    },
  },

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          routeBasePath: "docs",
          sidebarPath: "./sidebars.ts",
          editUrl: "https://github.com/murali-engine/veena/tree/main/docs/",
          lastVersion: "current",
          versions: {
            current: {
              label: "Next 🚧",
            },
          },
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: "light",
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: "Veena",
      logo: {
        alt: "Veena logo",
        src: "img/veena-mark.svg",
      },
      items: [
        {
          to: "/docs/",
          label: "Docs",
          position: "left",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Documentation",
          items: [
            { label: "Documentation", to: "/docs/" },
            { label: "The logo", to: "/docs/logo/" },
            { label: "Rust Murali documentation", href: rustDocsUrl },
          ],
        },
        {
          title: "Project",
          items: [
            { label: "Home", to: "/" },
            { label: "GitHub", href: "https://github.com/murali-engine/veena" },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Veena Engine.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ["bash", "rust"],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
