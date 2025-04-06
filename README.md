# MedTracker

A simple web application built with React and Vite to help track medication schedules and doses. It utilizes Tailwind CSS and shadcn/ui for styling and provides a clean interface for managing medications, logging doses, and visualizing time remaining until the next dose.

## Features

* **Medication Management:** Add, edit, and delete medications with custom names and dosage intervals (in hours).
* **Dose Logging:** Easily log when a medication is taken.
* **Next Dose Tracking:** Visualizes time remaining until the next dose with a circular progress indicator.
* **Overdue Alerts:** Clearly indicates when a medication dose is overdue ("TAKE NOW").
* **Local Storage:** Persists medication lists, logs, and due times in the browser's local storage.
* **Responsive Design:** Adapts to different screen sizes.
* **User Feedback:** Provides toast notifications for key actions (taking, adding, editing, deleting meds).

## Tech Stack

* [React 19](https://react.dev/)
* [Vite](https://vitejs.dev/)
* [Tailwind CSS 4](https://tailwindcss.com/)
* [shadcn/ui](https://ui.shadcn.com/)
* [Lucide React](https://lucide.dev/) (Icons)

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development purposes.

### Prerequisites

* **Node.js:** Make sure you have Node.js installed. Version 18 or higher is recommended. You can download it from [https://nodejs.org/](https://nodejs.org/).
* **npm:** npm (Node Package Manager) comes bundled with Node.js.

### Installation & Running

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    ```
    *(Replace `<your-repository-url>` with the actual URL of your Git repository)*

2.  **Navigate to the project directory:**
    ```bash
    cd MedTracker
    ```

3.  **Install dependencies:**
    This command installs all the necessary libraries listed in `package.json`.
    ```bash
    npm install
    ```

4.  **Run the development server:**
    This starts the Vite development server, usually on `http://localhost:5173`.
    ```bash
    npm run dev
    ```

5.  **Open the application:**
    Open your web browser and navigate to the local URL provided in your terminal (e.g., `http://localhost:5173`).

## Available Scripts

In the project directory, you can run:

* `npm run dev`: Runs the app in development mode with hot reloading.
* `npm run build`: Builds the app for production to the `dist` folder.
* `npm run lint`: Lints the project files using ESLint based on the configuration.
* `npm run preview`: Serves the production build locally to preview it.

