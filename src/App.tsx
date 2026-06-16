import React from 'react';
import { ProjectArchitect } from './components/ProjectArchitect';
import './App.css'; // Although we are using tailwind now, we can keep or delete this

function App() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">MajorHelp</h1>
          <p className="mt-2 text-lg text-gray-600">TrackMind Collaborative AI Academic Project Manager</p>
        </header>
        
        <main>
          <ProjectArchitect />
        </main>
      </div>
    </div>
  );
}

export default App;
