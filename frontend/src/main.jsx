import { createRoot } from 'react-dom/client';
import App from './App.jsx';
// Font dibundel (tetap tersedia offline di APK)
import '@fontsource/nunito/500.css';
import '@fontsource/nunito/700.css';
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import './styles.css';

createRoot(document.getElementById('root')).render(<App />);
