import React, { useState, useEffect } from 'react';

// WebRTC PeerConnection setup
const createPeerConnection = () => {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  });
  
  pc.ondatachannel = (event) => {
    const channel = event.channel;
    setupDataChannel(channel);
  };
  
  return pc;
};

// Data channel setup
const setupDataChannel = (channel, onMessage) => {
  channel.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onMessage(data);
  };
  
  channel.onopen = () => console.log('Connection opened');
  channel.onclose = () => console.log('Connection closed');
  
  return channel;
};

const QuadrantCluster = ({ items, categories }) => {
  // [Previous QuadrantCluster code remains exactly the same]
};

const StickyOrganizer = () => {
  const categories = [
    "We know that we know",
    "We didn't know that we knew",
    "We didn't know that we didn't know",
    "We know that we don't know"
  ];

  const [templates, setTemplates] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [categorizedNotes, setCategorizedNotes] = useState({});
  const [peerId, setPeerId] = useState('');
  const [peerConnection, setPeerConnection] = useState(null);
  const [dataChannel, setDataChannel] = useState(null);

  useEffect(() => {
    // Generate a random peer ID
    const id = Math.random().toString(36).substring(7);
    setPeerId(id);
    
    // Create peer connection
    const pc = createPeerConnection();
    setPeerConnection(pc);
    
    // Create data channel
    const channel = pc.createDataChannel('stateSync');
    setupDataChannel(channel, handleStateUpdate);
    setDataChannel(channel);
    
    // Create and share connection offer
    pc.createOffer()
      .then(offer => pc.setLocalDescription(offer))
      .then(() => {
        // Share offer URL
        const offerUrl = `${window.location.href}?offer=${encodeURIComponent(JSON.stringify(pc.localDescription))}`;
        console.log('Share this URL:', offerUrl);
      });
      
    // Handle incoming connections
    const urlParams = new URLSearchParams(window.location.search);
    const offer = urlParams.get('offer');
    if (offer) {
      const remoteDesc = JSON.parse(decodeURIComponent(offer));
      pc.setRemoteDescription(remoteDesc);
      pc.createAnswer()
        .then(answer => pc.setLocalDescription(answer))
        .then(() => {
          // Connect using answer
          const answerUrl = `${window.location.href}?answer=${encodeURIComponent(JSON.stringify(pc.localDescription))}`;
          console.log('Connection established');
        });
    }
    
    const answer = urlParams.get('answer');
    if (answer) {
      const remoteDesc = JSON.parse(decodeURIComponent(answer));
      pc.setRemoteDescription(remoteDesc);
    }
    
    return () => {
      if (pc) pc.close();
      if (channel) channel.close();
    };
  }, []);

  const handleStateUpdate = (data) => {
    if (data.templates) setTemplates(data.templates);
    if (data.categorizedNotes) setCategorizedNotes(data.categorizedNotes);
  };

  const broadcastState = (newTemplates, newCategorizedNotes) => {
    if (dataChannel && dataChannel.readyState === 'open') {
      dataChannel.send(JSON.stringify({
        templates: newTemplates,
        categorizedNotes: newCategorizedNotes
      }));
    }
  };

  const addNote = (e) => {
    e.preventDefault();
    if (newNote.trim()) {
      const newTemplates = [...templates, {
        id: Date.now(),
        text: newNote.trim(),
        categories: []
      }];
      setTemplates(newTemplates);
      broadcastState(newTemplates, categorizedNotes);
      setNewNote('');
    }
  };

  const handleDragStart = (e, note) => {
    e.dataTransfer.setData('text/plain', JSON.stringify(note));
  };

  const handleDrop = (e, category) => {
    e.preventDefault();
    const note = JSON.parse(e.dataTransfer.getData('text/plain'));
    
    const newTemplates = templates.map(t => 
      t.id === note.id 
        ? { ...t, categories: [...new Set([...t.categories, category])] }
        : t
    );

    const newCategorizedNotes = {
      ...categorizedNotes,
      [category]: [...(categorizedNotes[category] || []), { ...note, category }]
    };

    setTemplates(newTemplates);
    setCategorizedNotes(newCategorizedNotes);
    broadcastState(newTemplates, newCategorizedNotes);
  };

  return (
    <div className="p-4">
      {/* Connection Status & Sharing */}
      <div className="mb-4 p-4 bg-blue-100 rounded flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm font-medium">Room ID: {peerId}</p>
            <p className="text-sm">
              Status: {dataChannel?.readyState === 'open' ? 'Connected' : 'Waiting for connection...'}
            </p>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(window.location.href)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2"
          >
            Copy Share Link
          </button>
        </div>
        <div className="flex items-center gap-2 bg-white p-2 rounded">
          <input
            type="text"
            value={window.location.href}
            readOnly
            className="flex-grow p-2 bg-transparent text-sm"
          />
        </div>
      </div>

      {/* Rest of the UI remains the same */}
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

      <div className="grid grid-cols-4 gap-4 mb-8">
        {categories.map(category => (
          <div
            key={category}
            className="min-h-64 p-4 bg-gray-100 rounded"
            onDrop={(e) => handleDrop(e, category)}
            onDragOver={(e) => e.preventDefault()}
          >
            <h3 className="font-bold mb-4 text-center">{category}</h3>
            <div className="space-y-4">
              {(categorizedNotes[category] || []).map(note => (
                <div key={`${note.id}-${category}`} className="p-4 bg-yellow-200 rounded shadow">
                  {note.text}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Knowledge Quadrant Map</h2>
        <QuadrantCluster items={templates} categories={categories} />
      </div>
    </div>
  );
};

export default StickyOrganizer;