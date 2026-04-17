# 🃏 TCG Label Studio

<p align="center">
  <img src="docs/screenshots/overwiew.png" alt="TCG Label Studio Overview" width="800" />
</p>

<p align="center">
  <em>A professional, browser-based tool for designing, managing, and printing high-quality labels for Trading Card Game (TCG) collections.</em>
</p>

---

**TCG Label Studio** is tailored specifically for TCG collectors, players, and vendors who need precise, customizable labels for their binders, deck boxes, and storage bins. Whether you're organizing *Magic: The Gathering*, *Pokémon*, *Yu-Gi-Oh!*, or any other card game, this application provides an intuitive interface to craft the perfect labels.

## ✨ Features

- 📐 **Advanced Template System**: Create labels for standard and Japanese card sizes. Supports various layouts including single, double (foldable for tabs), and custom-sized parts.
- 🎨 **Rich Customization**:
  - **Backgrounds**: Add custom background colors or insert images via URL (with cover/contain modes, positional alignment, and opacity control).
  - **Image Effects**: Apply artistic effects like purely grayscale outputs for crisp black-and-white printing.
  - **Typography**: Complete control over text alignment, color, bold/italic/underline styles, and auto-sizing text blocks to fit seamlessly.
- 📁 **Project Management**: Work on multiple label sets simultaneously. Save projects to your local browser storage instantly.
- 💾 **Import & Export**: Need to share a label set or back up your designs? Export projects as JSON files and import them anywhere.
- 🖨️ **Print-Ready Output**: 
  - Generates an optimized A4 canvas ready to be sent to any standard printer.
  - Export pages as ultra-high-resolution ZIP-archived PNGs for use in professional printing pipelines.
- ⚡ **Auto-Save & Offline Priority**: Uses reliable local storage to keep your work safe without imposing forced cloud accounts or server delays.

## 🛠 Tech Stack

Built with modern web technologies to ensure a fast, responsive, and reliable experience:

- **Framework**: [React 18](https://react.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Utilities**: `html-to-image` (Canvas rendering), `JSZip` (Client-side archiving)

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm, yarn, or pnpm

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/AleTornesello/tcg-label-studio.git
   cd tcg-label-studio
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   ```

## ⌨️ Keyboard Shortcuts & UX

To speed up your workflow, TCG Label Studio supports several keyboard shortcuts:

- **`Arrow Keys` (`↑` `↓` `←` `→`)**: Navigate swiftly between label cells in the grid workspace.
- **`Escape`**: 
  - While typing: Exits text editing to jump back to grid navigation.
  - While a cell is selected: Clears the selection and minimizes the properties panel.
- **Auto-Focus**: Clicking any label or navigating to it via keyboard automatically focuses the editor—start typing immediately without an extra click!

## 📖 How to Use

1. **Start a Project**: Launch the app and create a new project from the File menu.
2. **Choose a Template**: Select one of the default templates that match your physical label sheet sizes, or create a Custom Template with precise millimeter dimensions.
3. **Design**: Click a cell, type your label content, adjust text properties, and configure background overlays.
4. **Expand**: Add as many A4 pages as you need via the top navigation bar.
5. **Print or Export**: Use the *Print All* button to open your browser's native print dialog, formatted specifically for A4, or use *Export PNGs* to download your work safely.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to contribute to making this tool even better for the TCG community.

## 📄 License

This project is open-source and available for personal and community use.

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/AleTornesello">Alessandro Tornesello</a>
</p>
