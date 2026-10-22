
# EaseFlow

EaseFlow is a browser-based productivity application that transforms unstructured task notes into an organized to-do list.

The project explores how open-weight AI can reduce the effort required to plan everyday work without depending on a paid AI API or a dedicated AI backend.

## Features

- Organize a brain dump into actionable tasks
- Generate task suggestions using a browser-based AI model
- Fall back to a built-in local parser when AI is unavailable
- Assign priority and categories to tasks
- Add, complete, filter, and delete tasks
- Track progress through a completion indicator
- Store tasks in browser local storage
- Responsive interface for desktop and mobile devices
- No Ollama installation or AI API key required

## Technology Stack

- HTML5
- CSS3
- JavaScript ES modules
- Transformers.js
- Xenova/flan-t5-small
- Browser localStorage

## Project Structure

```text
easeflow/
├── index.html
├── style.css
├── script.js
└── README.md
```

## Getting Started

### 1. Download or clone the repository

If you publish the project on GitHub, clone it using:

```bash
git clone https://github.com/YOUR_USERNAME/easeflow.git
cd easeflow
```

Replace YOUR_USERNAME with your GitHub username.

Alternatively, create the four files listed above manually.

### 2. Start a local development server

Open the project folder in Visual Studio Code.

Install the Live Server extension if needed, then right-click index.html and select Open with Live Server.

You can also use Python if it is installed:

```bash
python -m http.server 8000
```

Open http://localhost:8000 in your browser.

Do not rely on opening the HTML file directly because browser module loading and caching may behave differently.

### 3. Use EaseFlow

1. Enter tasks, reminders, and other things on your mind.
2. Select Organize my tasks.
3. Wait for the AI model to load on its first use.
4. Review the generated tasks.
5. Mark tasks complete, change filters, or add tasks manually.

If the model fails to load, the built-in parser can still separate and categorize the original task notes.

## How the AI Works

EaseFlow uses Transformers.js to load the open-weight Xenova/flan-t5-small model in the browser.

The application sends the text to the model running in the browser, then turns the generated text into task cards.

No external AI inference API is configured in this project.

The fallback parser uses JavaScript to split text, identify common priority terms, and assign basic categories.

The fallback is rule-based rather than generative AI.

## Why Open Innovation Matters

Open-weight models make it possible to experiment with AI without paying for every inference request to a hosted AI provider.

Running inference in the browser can also reduce the need to transmit personal task notes to an external AI service.

Developers can inspect the application code, modify the task organization logic, and replace the model with another compatible model.

The application can be extended without committing to a single proprietary AI API.

## Privacy

Tasks are stored in the browser's localStorage.

The application does not intentionally upload task text to a separate AI inference API.

However, the initial model download uses an external content delivery network. External fonts and model downloads can reveal ordinary connection metadata to their respective providers.

Do not enter highly sensitive information into a prototype without reviewing its dependencies and deployment configuration.

## Offline Support

The first model download requires an internet connection.

Transformers.js uses browser caching where available, but this project does not guarantee complete offline operation. Offline use depends on browser cache availability, model asset storage, and whether all required resources are accessible.

A production offline-first version should self-host the model files, configure a service worker, and test cold-start and repeat-use behavior without a network connection.

## Limitations

- Small models may rewrite tasks inaccurately or omit details.
- Priority assignment is based on simple keyword rules.
- Task dates are not automatically extracted into deadlines.
- The browser's localStorage is not a synchronized database.
- Clearing browser data can remove saved tasks.
- The project is a prototype, not a substitute for a verified task-management system.

Always review AI-generated task suggestions before relying on them.

## Future Improvements

- Editable task descriptions and deadlines
- Drag-and-drop task ordering
- Export and import of task lists
- Calendar integration
- Better multilingual task extraction
- Optional self-hosted model files for offline use
- Automated tests for task creation and filtering

## License

This project is released under the MIT License. Add a LICENSE file containing the standard MIT License text before publishing a repository under that license.
