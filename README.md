# Local Music Player

A desktop music player built with Electron that plays local audio files and dynamically themes the interface based on album artwork colors.

---

## What it does

- Plays music files stored locally on your computer
- Extracts dominant colors from album art to create a dynamic UI theme
- Supports multiple audio formats (primarily tested with MP3)
- Works completely offline — no streaming, accounts, or internet required
- Cross-platform desktop application

---

## Tech Stack

- **Electron** – Desktop app framework
- **Node.js** – Runtime environment
- **JavaScript / HTML / CSS** – Core application logic and interface

---

## Installation & Setup

### Prerequisites
- Node.js (LTS version recommended)
- npm (comes with Node.js)

### Steps

```bash
# Clone the repository
git clone https://github.com/Harshith55072/Local-Music-player.git

# Navigate to project directory
cd Local-Music-player

# Install dependencies
npm install

# Run the application
npm start
```

---

## Future Plans

If the project is revisited, planned improvements include:

- More reliable and stable music library storage format
- Neural network-based automatic song selection that learns listening patterns and selects the next track based on contextual parameters
- Docker support

These features are exploratory and not currently in development.

---

## Important Notes

⚠️ **Audio Format Compatibility:**  
This player has been primarily tested with **MP3 format**. While other audio formats may be supported by Electron's underlying media engine, they have not been thoroughly tested and may behave unexpectedly.

---

## Project Status

**Status:** Maintenance Mode  
**Current Version:** v1.1.0  
**Last Updated:** January 2026

This project is functionally complete and not under active development. Bug fixes or minor updates may be applied as needed.

---

🎵 **Music files are not included** in this repository due to copyright considerations.

---

## License

MIT
