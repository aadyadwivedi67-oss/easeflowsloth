
import { pipeline, env } from
  "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2";

// EaseFlow: browser-side AI task organizer.
// No Ollama, API key, or separate AI backend.

env.allowLocalModels = false;
env.useBrowserCache = true;

const $ = (selector) => document.querySelector(selector);

const dumpInput = $("#brainDump");
const organizeBtn = $("#organizeBtn");
const errorMessage = $("#errorMessage");
const taskList = $("#taskList");
const taskDialog = $("#taskDialog");
const taskForm = $("#taskForm");

let tasks = loadTasks();
let activeFilter = "all";
let activeView = "all";
let aiPipeline = null;
let aiLoading = false;

const originalButtonText = organizeBtn.innerHTML;

function loadTasks() {
  try {
    const saved = JSON.parse(
      localStorage.getItem("easeflow-tasks") || "[]"
    );

    if (!Array.isArray(saved)) return [];

    return saved.filter(task =>
      task &&
      typeof task.id === "string" &&
      typeof task.title === "string" &&
      ["high", "medium", "low"].includes(task.priority) &&
      typeof task.done === "boolean"
    );
  } catch {
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem("easeflow-tasks", JSON.stringify(tasks));
  } catch {
    showError("Browser storage is unavailable. Your current tasks may not persist after refreshing.");
  }
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.hidden = !message;
}

function setAIStatus(message) {
  $("#aiStatus").textContent = message;
}

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createTask(title, priority = "medium", category = "Personal", description = "") {
  return {
    id: crypto.randomUUID(),
    title: title.slice(0, 180),
    priority,
    category,
    description: description.slice(0, 280),
    done: false,
    createdAt: Date.now(),
    date: getLocalDateKey()
  };
}

function addTask(task) {
  tasks.unshift(task);
  saveTasks();
  render();
}

function classifyPriority(text) {
  if (/\b(urgent|asap|important|deadline|tomorrow|exam|due today)\b/i.test(text)) {
    return "high";
  }

  if (/\b(soon|prepare|finish|submit|meeting)\b/i.test(text)) {
    return "medium";
  }

  return "low";
}

function classifyCategory(text) {
  if (/\b(study|exam|test|homework|assignment|revision|class|school|college)\b/i.test(text)) {
    return "Study";
  }

  if (/\b(email|meeting|client|project|work|report|office)\b/i.test(text)) {
    return "Work";
  }

  if (/\b(grocery|groceries|buy|shopping|pick up|store|errand)\b/i.test(text)) {
    return "Errands";
  }

  if (/\b(home|family|personal|room|laundry|clean)\b/i.test(text)) {
    return "Personal";
  }

  return "Other";
}

function splitBrainDump(text) {
  return text
    .replace(/\r/g, "\n")
    .split(/\n+|[;]+|(?<=[.!?])\s+/)
    .map(line =>
      line
        .replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "")
        .trim()
    )
    .filter(line => line.length >= 3)
    .map(line => line.slice(0, 180))
    .slice(0, 30);
}

function getAI() {
  if (!aiPipeline) {
    aiLoading = true;
    setAIStatus("Loading open-weight AI model...");

    aiPipeline = pipeline(
      "text2text-generation",
      "Xenova/flan-t5-small"
    ).then(model => {
      aiLoading = false;
      setAIStatus("Browser AI is ready");
      return model;
    }).catch(error => {
      aiPipeline = null;
      aiLoading = false;
      setAIStatus("Local task organizer available");
      throw error;
    });
  }

  return aiPipeline;
}

async function organizeWithAI(lines) {
  const model = await getAI();
  const input = lines.join("\n");

  const prompt = `
Organize these personal tasks.
Rewrite each as one short, clear action.
Keep the original meaning.
Do not invent new tasks or deadlines.
Return one task per line.
Tasks:
${input}
`.trim();

  const output = await model(prompt, {
    max_new_tokens: 180,
    num_beams: 2
  });

  const generated = output?.[0]?.generated_text || "";

  const cleaned = generated
    .split("\n")
    .map(line => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
    .filter(line => line.length >= 3)
    .map(line => line.slice(0, 180))
    .slice(0, 30);

  if (!cleaned.length) {
    throw new Error("The model returned no usable tasks.");
  }

  return cleaned;
}

function makeTaskObjects(lines) {
  const seen = new Set();

  return lines
    .map(line => line.trim())
    .filter(line => {
      const key = line.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(line =>
      createTask(
        line,
        classifyPriority(line),
        classifyCategory(line)
      )
    );
}

async function organizeTasks() {
  showError("");

  const text = dumpInput.value.trim();

  if (!text) {
    showError("Write down a few things first. They don't need to be organized.");
    dumpInput.focus();
    return;
  }

  if (text.length > 6000) {
    showError("Please keep each brain dump under 6,000 characters.");
    return;
  }

  const lines = splitBrainDump(text);

  if (!lines.length) {
    showError("I couldn't find any tasks. Try writing a short action or reminder.");
    return;
  }

  organizeBtn.disabled = true;
  organizeBtn.textContent = "Organizing your thoughts...";
  setAIStatus("Working on your task list");

  let organizedLines;
  let usedAI = false;

  try {
    organizedLines = await organizeWithAI(lines);
    usedAI = true;
  } catch (error) {
    console.warn("AI unavailable; using local task parsing.", error);
    organizedLines = lines;
  }

  const newTasks = makeTaskObjects(organizedLines);

  if (!newTasks.length) {
    showError("No tasks could be created. Please try a simpler brain dump.");
    organizeBtn.disabled = false;
    organizeBtn.innerHTML = originalButtonText;
    setAIStatus("Ready when you are");
    return;
  }

  tasks = [...newTasks, ...tasks];
  saveTasks();

  dumpInput.value = "";
  activeView = "all";
  activeFilter = "all";

  document.querySelectorAll(".nav-item").forEach(button => {
    button.classList.toggle("active", button.dataset.view === "all");
  });

  document.querySelectorAll(".filter-chip").forEach(button => {
    button.classList.toggle("selected", button.dataset.filter === "all");
  });

  render();

  setAIStatus(
    usedAI
      ? "Organized with browser-based AI"
      : "Organized with local fallback"
  );

  if (!usedAI) {
    showError(
      "The AI model could not load. Your tasks were still organized using the built-in local parser. Check your internet connection to download the model."
    );
  }

  organizeBtn.disabled = false;
  organizeBtn.innerHTML = originalButtonText;
}

function getVisibleTasks() {
  let visible = [...tasks];

  if (activeView === "today") {
    visible = visible.filter(task => task.date === getLocalDateKey());
  }

  if (activeView === "completed") {
    visible = visible.filter(task => task.done);
  } else {
    visible = visible.filter(task => !task.done || activeView !== "today");
  }

  if (activeFilter !== "all") {
    visible = visible.filter(task => task.priority === activeFilter);
  }

  return visible;
}

function renderTasks() {
  const visible = getVisibleTasks();

  if (!visible.length) {
    taskList.innerHTML = `
      <div class="empty-state">
        <div class="empty-illustration">
          <span class="empty-sun">✳</span>
          <div class="empty-paper">
            <span>✓</span><span>—</span>
            <span>○</span><span>—</span>
            <span>○</span><span>—</span>
          </div>
        </div>
        <h3>${activeView === "completed" ? "Nothing completed yet." : "Nothing on this list."}</h3>
        <p>Your list is clear for now. Add a task or try another filter.</p>
      </div>
    `;
    return;
  }

  taskList.innerHTML = visible.map(task => `
    <article class="task-card ${task.done ? "done" : ""}">
      <button
        class="task-check"
        data-action="toggle"
        data-id="${escapeHTML(task.id)}"
        aria-label="${task.done ? "Mark incomplete" : "Mark complete"}: ${escapeHTML(task.title)}"
        aria-pressed="${task.done}"
      >${task.done ? "✓" : ""}</button>

      <div class="task-body">
        <p class="task-title">${escapeHTML(task.title)}</p>
        ${task.description ? `<p class="task-description">${escapeHTML(task.description)}</p>` : ""}
        <div class="task-meta">
          <span class="priority ${task.priority}">${task.priority[0].toUpperCase() + task.priority.slice(1)} priority</span>
          <span class="category">${escapeHTML(task.category)}</span>
        </div>
      </div>

      <button
        class="delete-task"
        data-action="delete"
        data-id="${escapeHTML(task.id)}"
        aria-label="Delete ${escapeHTML(task.title)}"
        title="Delete task"
      >×</button>
    </article>
  `).join("");
}

function renderProgress() {
  const completed = tasks.filter(task => task.done).length;
  const total = tasks.length;
  const percentage = total ? Math.round(completed / total * 100) : 0;

  $("#navCount").textContent = total;
  $("#headingCount").textContent = total;
  $("#progressNumber").textContent = `${percentage}%`;
  $("#progressFill").style.width = `${percentage}%`;

  if (!total) {
    $("#progressText").textContent = "You're just getting started.";
  } else if (percentage === 100) {
    $("#progressText").textContent = "Everything on your list is done. Well done!";
  } else if (percentage >= 60) {
    $("#progressText").textContent = "Look at you go. You're nearly there.";
  } else if (percentage > 0) {
    $("#progressText").textContent = "Every completed task is progress.";
  } else {
    $("#progressText").textContent = "Start small. One thing at a time.";
  }
}

function render() {
  renderTasks();
  renderProgress();
}

organizeBtn.addEventListener("click", organizeTasks);

dumpInput.addEventListener("keydown", event => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    organizeTasks();
  }
});

$("#addTaskBtn").addEventListener("click", () => {
  taskForm.reset();
  taskDialog.showModal();
  $("#taskTitle").focus();
});

$("#closeDialogBtn").addEventListener("click", () => {
  taskDialog.close();
});

taskDialog.addEventListener("click", event => {
  if (event.target === taskDialog) taskDialog.close();
});

taskForm.addEventListener("submit", event => {
  event.preventDefault();

  const title = $("#taskTitle").value.trim();
  if (!title) return;

  addTask(createTask(
    title,
    $("#taskPriority").value,
    $("#taskCategory").value
  ));

  taskDialog.close();
});

taskList.addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const { action, id } = button.dataset;

  if (action === "toggle") {
    tasks = tasks.map(task =>
      task.id === id ? { ...task, done: !task.done } : task
    );
  }

  if (action === "delete") {
    tasks = tasks.filter(task => task.id !== id);
  }

  saveTasks();
  render();
});

document.querySelectorAll(".filter-chip").forEach(button => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;

    document.querySelectorAll(".filter-chip").forEach(chip => {
      chip.classList.toggle("selected", chip === button);
    });

    renderTasks();
  });
});

document.querySelectorAll(".nav-item").forEach(button => {
  button.addEventListener("click", () => {
    activeView = button.dataset.view;

    document.querySelectorAll(".nav-item").forEach(item => {
      item.classList.toggle("active", item === button);
    });

    $("#listHeading").firstChild.textContent = {
      all: "Your tasks ",
      today: "Today's tasks ",
      completed: "Completed tasks "
    }[activeView];

    renderTasks();
  });
});

$("#clearCompletedBtn").addEventListener("click", () => {
  tasks = tasks.filter(task => !task.done);
  saveTasks();
  render();
});

$("#dateLabel").textContent = new Intl.DateTimeFormat("en", {
  weekday: "long",
  month: "long",
  day: "numeric"
}).format(new Date()).toUpperCase();

render();

// Model loading is lazy: the browser downloads it only when the
// user requests AI organization for the first time.
setAIStatus("AI loads when first needed");
