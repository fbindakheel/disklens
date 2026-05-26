/**
 * @type {import('electron-builder').Configuration}
 * @see https://www.electron.build/configuration/configuration
 */
module.exports = {
  appId: "com.disklens.app",
  productName: "DiskLens",
  copyright: "Copyright © 2026 DiskLens team",
  asar: true,
  directories: {
    output: "dist_electron",
    buildResources: "assets"
  },
  files: [
    "dist/**/*"
  ],
  win: {
    target: [{
      target: "nsis",
      arch: ["x64", "ia32"]
    }]
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true
  }
};
