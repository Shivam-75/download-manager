# Streamix Browser Extension

This Chrome Extension adds a floating **Download** button on top of every video thumbnail on the YouTube website, as well as a primary **Download** button next to the actions bar on video watch pages. Tapping the button queues the download directly onto your local Streamix server.

## Installation Instructions

### 1. Build the Extension
Before loading the extension into Chrome, you need to install the dependencies and compile the React code:

```bash
# Navigate to the extension folder
cd extension

# Install dependencies
npm install

# Build the production bundle
npm run build
```

This compiles all React components and packages them into the `extension/dist` folder.

### 2. Load the Extension into Google Chrome / Brave
1. Open your browser and navigate to the extensions management page:
   - Chrome: Go to [chrome://extensions](chrome://extensions)
   - Brave: Go to [brave://extensions](brave://extensions)
2. Toggle on the **Developer mode** switch in the top right corner.
3. Click the **Load unpacked** button in the top left corner.
4. Select the **`dist`** folder inside the `extension` directory (e.g. `c:/Users/shiva/OneDrive/Desktop/internet/extension/dist`).
5. Open YouTube, hover over any video thumbnail, and see the purple Streamix download overlay button in action!
