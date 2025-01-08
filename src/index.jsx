import React from 'react';
import { createRoot } from 'react-dom/client';
import StickyOrganizer from './StickyOrganizer.jsx';
import './index.css'

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<StickyOrganizer />);