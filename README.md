# Trading Signal App

A responsive web application that provides trading signals and technical analysis summaries for various cryptocurrency pairs. The app is built with React and styled using CSS modules for a modern, mobile-friendly experience.

## Features

- **Trading Signal Summaries**: Generates clear, English-language trading summaries using technical indicators such as RSI, MACD, and Bollinger Bands.
- **Responsive Design**: Fully responsive UI optimized for mobile, tablet, and desktop devices.
- **Modern Tech Stack**: Built with React, TypeScript, and Vite for fast development and performance.
- **Customizable**: Easily extendable to support additional coins or indicators.

## Getting Started

### Prerequisites
- Node.js (v16 or later recommended)
- npm or yarn

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/vinhvo2010/moneyflow.git
   cd moneyflow
   ```
2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

### Running the App Locally
```bash
npm run dev
# or
yarn dev
```
The app will be available at `http://localhost:5173` by default.

## Project Structure
```
├── public/                 # Static assets
├── src/                    # Source code
│   ├── TradingSignal.tsx   # Main trading signal component
│   ├── TradingSignal.module.css # Component styles (responsive)
│   └── ...                 # Other components and utilities
├── package.json            # Project metadata and scripts
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite configuration
└── README.md               # Project documentation
```

## Deployment
You can deploy this app to any static hosting service (e.g., Vercel, Netlify, GitHub Pages). After building:
```bash
npm run build
# or
yarn build
```
The production-ready files will be in the `dist/` directory.

## Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## License
This project is licensed under the MIT License.

## Author
- Quang Vinh Vo (vinhvo2010)
