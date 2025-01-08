// src/index.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import StickyOrganizer from './StickyOrganizer';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<StickyOrganizer />);