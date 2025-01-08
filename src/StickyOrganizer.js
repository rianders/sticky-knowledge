// src/StickyOrganizer.js
import React, { useState } from 'react';

const QuadrantCluster = ({ items, categories }) => {
  const width = 800;
  const height = 800;
  const padding = 40;

  // Helper to get notes for a specific category
  const getNotesForCategory = (category) => {
    return items.filter(t => t.categories.includes(category));
  };

  // Calculate positions for sticky notes within each quadrant
  const layoutNotesInQuadrant = (notes, quadrant) => {
    const STICKY_WIDTH = 100;
    const STICKY_HEIGHT = 60;
    const MARGIN = 10;
    const ITEMS_PER_ROW = Math.floor((width/2 - padding*2) / (STICKY_WIDTH + MARGIN));
    
    return notes.map((note, index) => {
      const row = Math.floor(index / ITEMS_PER_ROW);
      const col = index % ITEMS_PER_ROW;
      
      let baseX = col * (STICKY_WIDTH + MARGIN);
      let baseY = row * (STICKY_HEIGHT + MARGIN);
      
      // Adjust positions based on quadrant
      switch(quadrant) {
        case 0: // Top Left
          baseX += padding;
          baseY += padding;
          break;
        case 1: // Top Right
          baseX += width/2 + padding;
          baseY += padding;
          break;
        case 2: // Bottom Left
          baseX += padding;
          baseY += height/2 + padding;
          break;
        case 3: // Bottom Right
          baseX += width/2 + padding;
          baseY += height/2 + padding;
          break;
        default:
          break;
      }
      
      return { ...note, x: baseX, y: baseY };
    });
  };

  return (
    <div className="w-full overflow-x-auto p-4">
      <svg width={width} height={height} className="bg-white">
        {/* Draw the plus lines */}
        <line 
          x1={width/2} y1={0} 
          x2={width/2} y2={height} 
          stroke="#666" 
          strokeWidth="2"
        />
        <line 
          x1={0} y1={height/2} 
          x2={width} y2={height/2} 
          stroke="#666" 
          strokeWidth="2"
        />

        {/* Quadrant Labels */}
        {categories.map((category, index) => {
          const x = index % 2 === 0 ? padding : width/2 + padding;
          const y = index < 2 ? padding : height/2 + padding;
          
          return (
            <text
              key={category}
              x={x}
              y={y - 10}
              className="font-bold"
              textAnchor="start"
            >
              {category}
            </text>
          );
        })}

        {/* Render sticky notes in each quadrant */}
        {categories.map((category, quadrant) => {
          const notes = getNotesForCategory(category);
          const layoutedNotes = layoutNotesInQuadrant(notes, quadrant);
          
          return layoutedNotes.map((note, i) => (
            <g key={`${note.id}-${i}`} transform={`translate(${note.x},${note.y})`}>
              <rect
                width="100"
                height="60"
                rx="4"
                fill="#FFEB3B"
                stroke="#FBC02D"
              />
              <text
                x="50"
                y="35"
                textAnchor="middle"
                style={{
                  fontSize: '12px'
                }}
              >
                {note.text.length > 20 ? note.text.substring(0, 17) + '...' : note.text}
              </text>
            </g>
          ));
        })}
      </svg>
    </div>
  );
};

const StickyOrganizer = () => {
  const categories = [
    "We know that we know",
    "We didn't know that we knew",
    "We didn't know that we didn't know",
    "We know that we don't know"
  ];

  const [templates, setTemplates] = useState([
    { id: 1, text: "Technical Skills", categories: [] },
    { id: 2, text: "Soft Skills", categories: [] },
    { id: 3, text: "Domain Knowledge", categories: [] }
  ]);
  const [newNote, setNewNote] = useState('');
  const [categorizedNotes, setCategorizedNotes] = useState({});

  const addNote = (e) => {
    e.preventDefault();
    if (newNote.trim()) {
      const newTemplate = {
        id: Date.now(),
        text: newNote.trim(),
        categories: []
      };
      setTemplates(prev => [...prev, newTemplate]);
      setNewNote('');
    }
  };

  const handleDragStart = (e, note) => {
    e.dataTransfer.setData('text/plain', JSON.stringify(note));
  };

  const handleDrop = (e, category) => {
    e.preventDefault();
    const note = JSON.parse(e.dataTransfer.getData('text/plain'));
    
    // Update template's categories
    setTemplates(prev => prev.map(t => 
      t.id === note.id 
        ? { ...t, categories: [...new Set([...t.categories, category])] }
        : t
    ));

    // Add to category column
    setCategorizedNotes(prev => ({
      ...prev,
      [category]: [...(prev[category] || []), { ...note, category }]
    }));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div className="p-4">
      {/* Template Creation Area */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Knowledge Items</h2>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add new knowledge item..."
            className="p-2 border rounded flex-grow"
          />
          <button 
            onClick={addNote}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Add Item
          </button>
        </div>
        <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded">
          {templates.map(note => (
            <div
              key={note.id}
              draggable
              onDragStart={(e) => handleDragStart(e, note)}
              className={`p-4 ${note.categories.length > 0 ? 'bg-green-100' : 'bg-yellow-200'} 
                         rounded shadow cursor-move transform hover:scale-105 transition-transform`}
            >
              <div>{note.text}</div>
              {note.categories.length > 0 && (
                <div className="text-xs mt-2 text-gray-600">
                  Categories: {note.categories.join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Category Columns */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {categories.map(category => (
          <div
            key={category}
            className="min-h-64 p-4 bg-gray-100 rounded"
            onDrop={(e) => handleDrop(e, category)}
            onDragOver={handleDragOver}
          >
            <h3 className="font-bold mb-4 text-center">{category}</h3>
            <div className="space-y-4">
              {(categorizedNotes[category] || []).map(note => (
                <div
                  key={`${note.id}-${category}`}
                  className="p-4 bg-yellow-200 rounded shadow"
                >
                  {note.text}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Quadrant Cluster View */}
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Knowledge Quadrant Map</h2>
        <QuadrantCluster items={templates} categories={categories} />
      </div>
    </div>
  );
};

export default StickyOrganizer;