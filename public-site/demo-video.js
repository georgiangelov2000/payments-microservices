const scenes = [
  {
    title: "Introduction",
    caption: "One platform. Multiple payment providers.",
    narration: "Modern businesses need smarter payment infrastructure.",
  },
  {
    title: "Merchant Dashboard",
    caption: "Unified visibility across payments, providers, and analytics.",
    narration: "Manage all payment providers from one unified dashboard.",
  },
  {
    title: "Payment Workflow",
    caption: "Create intelligent payment routing workflows without complexity.",
    narration: "Create intelligent payment routing workflows without complexity.",
  },
  {
    title: "API Developer Experience",
    caption: "Integrate once using a developer-first API platform.",
    narration: "Integrate once using our developer-first API platform.",
  },
  {
    title: "Payment Timeline",
    caption: "Every provider event becomes a readable workflow step.",
    narration: "Track every payment event through a clean provider workflow timeline.",
  },
  {
    title: "Multi-Provider Orchestration",
    caption: "Optimize approvals with smart provider fallback.",
    narration: "Optimize approvals with intelligent multi-provider orchestration.",
  },
  {
    title: "Mobile & Responsive",
    caption: "Access payment infrastructure anywhere.",
    narration: "Access your payment infrastructure anywhere.",
  },
  {
    title: "Final CTA",
    caption: "Build scalable payment experiences with modern orchestration infrastructure.",
    narration: "Build scalable payment experiences with modern orchestration infrastructure.",
  },
];

const sceneNodes = [...document.querySelectorAll("[data-scene]")];
const titleNode = document.querySelector("[data-scene-title]");
const captionNode = document.querySelector("[data-caption]");
const progressNode = document.querySelector("[data-progress]");
const toggleButton = document.querySelector("[data-toggle]");
const sceneDuration = 6200;
let current = 0;
let paused = false;
let started = Date.now();

function showScene(index) {
  current = index % scenes.length;
  sceneNodes.forEach(node => node.classList.toggle("active", Number(node.dataset.scene) === current));
  titleNode.textContent = scenes[current].title;
  captionNode.textContent = scenes[current].caption;
  started = Date.now();
}

function tick() {
  if (!paused) {
    const elapsed = Date.now() - started;
    const sceneProgress = Math.min(elapsed / sceneDuration, 1);
    const totalProgress = ((current + sceneProgress) / scenes.length) * 100;
    progressNode.style.width = `${totalProgress}%`;

    if (elapsed >= sceneDuration) {
      showScene(current + 1);
    }
  }

  requestAnimationFrame(tick);
}

toggleButton.addEventListener("click", () => {
  paused = !paused;
  toggleButton.textContent = paused ? "Play" : "Pause";
  started = Date.now();
});

document.addEventListener("keydown", event => {
  if (event.key === "ArrowRight") showScene(current + 1);
  if (event.key === "ArrowLeft") showScene((current + scenes.length - 1) % scenes.length);
  if (event.key === " ") {
    event.preventDefault();
    toggleButton.click();
  }
});

showScene(0);
tick();
