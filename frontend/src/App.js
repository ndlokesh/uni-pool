import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';

import AnimatedRoutes from './components/AnimatedRoutes';

import GridBackground from './components/GridBackground';

function App() {
  return (
    <Router>
      <GridBackground className="App font-sans text-gray-900 selection:bg-indigo-500 selection:text-white">
        <div className="relative z-10 w-full h-full">
          <AnimatedRoutes />
        </div>
      </GridBackground>
    </Router>
  );
}

export default App;
