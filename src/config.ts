export const SITE = {
    website: "https://seanxunx.netlify.app/", // replace this with your deployed domain
    author: "Sean Xu",
    profile: "https://satnaing.dev/",
    desc: "A minimal, responsive and SEO-friendly Astro blog theme.",
    title: "勉強 | Study & Work",
    ogImage: "astropaper-og.jpg",
    lightAndDarkMode: true,
    postPerIndex: 4,
    postPerPage: 6,
    scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
    showArchives: true,
    showBackButton: true, // show back button in post detail
    editPost: {
        enabled: true,
        text: "Edit page",
        url: "https://github.com/satnaing/astro-paper/edit/main/",
    },
    dynamicOgImage: true,
    dir: "ltr", // "rtl" | "auto"
    lang: "zh-CN", // html lang code. Set this empty and default will be "en"
    timezone: "Asia/Shanghai", // Default global timezone (IANA format) https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
} as const;
