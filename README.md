# Solar System Three.js Simulator

A realistic 3D solar system simulation built with Three.js, featuring flyable spaceship controls, HDR lighting, post-processing effects, and interactive GUI controls.

![Solar System Simulator](https://img.shields.io/badge/Three.js-Interactive%20Simulation-blue)

## 🚀 Features

### Core Simulation
- **Realistic Planetary Orbits**: Accurate orbital mechanics with proper scaling
- **Planet Rotations**: Individual rotation speeds for each celestial body
- **Dynamic Lighting**: Sun-based directional lighting with HDR environment mapping
- **Time Scaling**: Adjustable simulation speed controls

### Interactive Spaceship
- **Full 6DOF Movement**: Move in all directions with WASD + QE + Space controls
- **Mouse Look**: First-person camera controls with pointer lock
- **Boost System**: Hold Shift for increased movement speed
- **Follow Camera**: Smooth camera following with configurable distance
- **Physics-Based Movement**: Realistic acceleration, velocity, and friction

### Visual Effects
- **HDR Environment Mapping**: Realistic space environment lighting
- **Post-Processing Pipeline**: 
  - Unreal Bloom Pass for realistic glow effects
  - FXAA anti-aliasing for smooth edges
- **Quality Presets**: Multiple performance/quality settings
- **Dynamic Labels**: Planet information overlays with distance-based fading
- **Orbital Paths**: Visible orbit rings for better navigation

### User Interface
- **Interactive GUI**: lil-gui based control panel
- **Real-time Controls**: Adjust simulation parameters on-the-fly
- **Quality Settings**: Switch between performance modes
- **Information Display**: Planet data and statistics
- **Help System**: Built-in controls reference

## 🎮 Controls

### Spaceship Navigation
| Key | Action |
|-----|--------|
| `W` | Move Forward |
| `A` | Strafe Left |
| `S` | Move Backward |
| `D` | Strafe Right |
| `Space` | Move Up |
| `Q` | Move Down |
| `Shift` | Boost (hold for faster movement) |
| `Mouse` | Look Around (click to enable) |
| `C` | Enable Mouse Look |

### Camera Controls
- **Click**: Enable pointer lock for mouse look
- **ESC**: Exit pointer lock mode
- **Mouse Movement**: Look around in first-person view

### GUI Controls
- **Time Scale**: Adjust simulation speed (0.1x to 10x)
- **Quality**: Switch between Low/Medium/High/Ultra presets
- **Effects**: Toggle post-processing effects
- **Labels**: Show/hide planet information
- **Orbits**: Display orbital paths
- **Reset**: Return spaceship to starting position

## 🛠 Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/Rohan-Abhilash/solar-system-threejs-sim.git
   cd solar-system-threejs-sim
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   Navigate to `http://localhost:5173` (or the port shown in terminal)

### Build for Production

```bash
npm run build
npm run preview  # Preview production build
```

## 📁 Project Structure

```
solar-system-threejs-sim/
├── public/
│   ├── textures/          # Planet textures and HDR maps
│   └── credits.txt        # Asset credits and attributions
├── src/
│   ├── three/
│   │   ├── assets.ts      # Asset loading and management
│   │   ├── controls.ts    # Orbit controls setup
│   │   ├── labels.ts      # Planet labeling system
│   │   ├── planets.ts     # Planet creation and orbital mechanics
│   │   ├── postprocessing.ts # Visual effects pipeline
│   │   ├── scene.ts       # Main scene setup and management
│   │   └── spaceship.ts   # Flyable spaceship controls
│   ├── main.ts           # Application entry point
│   └── styles.css        # Global styles
├── index.html           # Main HTML file
├── package.json         # Dependencies and scripts
├── vite.config.ts       # Vite configuration
└── README.md           # This file
```

## 🎯 Technical Implementation

### Technologies Used
- **Three.js**: 3D graphics rendering
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and dev server
- **lil-gui**: Real-time GUI controls

### Key Systems

#### Planetary System
- Accurate scale ratios between planets
- Elliptical orbit calculations
- Individual rotation axes and speeds
- Texture mapping with normal maps

#### Spaceship Physics
- 6-degrees-of-freedom movement
- Momentum-based acceleration/deceleration
- Configurable physics parameters
- Smooth camera interpolation

#### Rendering Pipeline
- HDR tone mapping
- Multi-pass post-processing
- Adaptive quality settings
- Efficient LOD management

## 🌌 Assets & Credits

- **Planet Textures**: NASA/JPL public domain imagery
- **HDR Environment Maps**: Open source space HDR images
- **Development**: Built with Three.js ecosystem tools

See `public/credits.txt` for detailed attribution information.

## 🚀 Performance Optimization

### Quality Presets
- **Low**: Basic rendering, minimal effects
- **Medium**: Standard quality with selective effects
- **High**: Enhanced visuals with full post-processing
- **Ultra**: Maximum quality for high-end devices

### Optimization Features
- Frustum culling for off-screen objects
- Automatic LOD adjustment
- Efficient texture streaming
- Adaptive rendering based on performance

## 🔧 Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run type-check` | Run TypeScript type checking |

### Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎓 Educational Purpose

This simulator is designed for educational and demonstration purposes. All astronomical data is simplified and scaled for optimal visualization and interaction.

---

**Developed by**: Rohan Abhilash  
**Framework**: Three.js with TypeScript  
**Year**: 2025

For questions or support, please open an issue on GitHub.
