import React, { useState, useEffect } from 'react';

const createPeerConnection = () => {
 const pc = new RTCPeerConnection({
   iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
 });
 return pc;
};

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
 const width = 800;
 const height = 800;
 const padding = 40;
 const quadrantWidth = width / 2 - padding;

 const getNotesForCategory = (category) => {
   return items.filter(t => t.categories.includes(category));
 };

 const layoutNotesInQuadrant = (notes, quadrant) => {
   const STICKY_WIDTH = 100;
   const STICKY_HEIGHT = 60;
   const MARGIN = 10;
   const ITEMS_PER_ROW = Math.floor(quadrantWidth / (STICKY_WIDTH + MARGIN));
   
   return notes.map((note, index) => {
     const row = Math.floor(index / ITEMS_PER_ROW);
     const col = index % ITEMS_PER_ROW;
     
     let baseX = col * (STICKY_WIDTH + MARGIN);
     let baseY = row * (STICKY_HEIGHT + MARGIN);
     
     switch(quadrant) {
       case 0:
         baseX += padding;
         baseY += padding;
         break;
       case 1:
         baseX += width/2 + padding;
         baseY += padding;
         break;
       case 2:
         baseX += padding;
         baseY += height/2 + padding;
         break;
       case 3:
         baseX += width/2 + padding;
         baseY += height/2 + padding;
         break;
     }
     
     return { ...note, x: baseX, y: baseY };
   });
 };

 return (
   <div className="w-full overflow-x-auto p-4">
     <svg width={width} height={height} className="bg-white">
       <line x1={width/2} y1={0} x2={width/2} y2={height} stroke="#666" strokeWidth="2"/>
       <line x1={0} y1={height/2} x2={width} y2={height/2} stroke="#666" strokeWidth="2"/>

       {categories.map((category, index) => {
         const x = index % 2 === 0 ? padding : width/2 + padding;
         const y = index < 2 ? padding : height/2 + padding;
         return (
           <text key={category} x={x} y={y - 10} className="font-bold" textAnchor="start">
             {category}
           </text>
         );
       })}

       {categories.map((category, quadrant) => {
         const notes = getNotesForCategory(category);
         const layoutedNotes = layoutNotesInQuadrant(notes, quadrant);
         
         return layoutedNotes.map((note, i) => (
           <g key={`${note.id}-${i}`} transform={`translate(${note.x},${note.y})`}>
             <rect width="100" height="60" rx="4" fill="#FFEB3B" stroke="#FBC02D"/>
             <text x="50" y="35" textAnchor="middle" style={{ fontSize: '12px' }}>
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

 const [templates, setTemplates] = useState([]);
 const [newNote, setNewNote] = useState('');
 const [categorizedNotes, setCategorizedNotes] = useState({});
 const [roomId, setRoomId] = useState('');
 const [isHost, setIsHost] = useState(false);
 const [connections, setConnections] = useState(new Map());

 useEffect(() => {
   const urlRoomId = new URLSearchParams(window.location.search).get('room');
   
   if (urlRoomId) {
     // Join existing room
     setRoomId(urlRoomId);
     joinRoom(urlRoomId);
   } else {
     // Create new room
     const newRoomId = Math.random().toString(36).substring(7);
     setRoomId(newRoomId);
     setIsHost(true);
     
     // Update URL without refreshing
     const newUrl = `${window.location.pathname}?room=${newRoomId}`;
     window.history.pushState({ path: newUrl }, '', newUrl);
   }
 }, []);

 const joinRoom = async (roomId) => {
   const pc = createPeerConnection();
   
   pc.onicecandidate = (event) => {
     if (event.candidate) {
       // Send candidate to host
       broadcastToRoom({
         type: 'candidate',
         candidate: event.candidate
       });
     }
   };

   const channel = pc.createDataChannel(`room-${roomId}`);
   setupDataChannel(channel, (data) => {
     if (data.type === 'state') {
       setTemplates(data.templates);
       setCategorizedNotes(data.categorizedNotes);
     }
   });

   // Request initial state from host
   channel.onopen = () => {
     channel.send(JSON.stringify({ type: 'requestState' }));
   };

   setConnections(prev => new Map(prev).set(roomId, { pc, channel }));
 };

 const broadcastToRoom = (data) => {
   connections.forEach(({ channel }) => {
     if (channel.readyState === 'open') {
       channel.send(JSON.stringify(data));
     }
   });
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
     broadcastToRoom({
       type: 'state',
       templates: newTemplates,
       categorizedNotes
     });
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
   broadcastToRoom({
     type: 'state',
     templates: newTemplates,
     categorizedNotes: newCategorizedNotes
   });
 };

 return (
   <div className="p-4">
     <div className="mb-4 p-4 bg-blue-100 rounded flex flex-col gap-3">
       <div className="flex justify-between items-center">
         <div>
           <p className="text-sm font-medium">Room ID: {roomId}</p>
           <p className="text-sm">Role: {isHost ? 'Host' : 'Participant'}</p>
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