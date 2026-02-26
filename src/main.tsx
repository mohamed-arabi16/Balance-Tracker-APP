import { createRoot } from 'react-dom/client';
import App from './App.tsx'
import './index.css'
import { getMissingClientEnvKeys } from './lib/env.ts'
import { registerServiceWorker } from './lib/pwa/registerServiceWorker.ts'

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error('Root element #root was not found.');
}

const missingEnvKeys = getMissingClientEnvKeys();

if (missingEnvKeys.length > 0) {
  createRoot(rootElement).render(
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-lg border border-slate-700 bg-slate-900 p-6 space-y-4">
        <h1 className="text-xl font-semibold">Configuration Error</h1>
        <p>The app cannot start because required environment variables are missing.</p>
        <ul className="list-disc list-inside text-sm space-y-1">
          {missingEnvKeys.map((key) => (
            <li key={key}>
              <code>{key}</code>
            </li>
          ))}
        </ul>
        <p className="text-sm text-slate-300">
          Create <code>.env</code> from <code>.env.example</code> and set these values.
        </p>
      </div>
    </div>,
  );

  throw new Error(
    `Missing required environment variables: ${missingEnvKeys.join(', ')}`,
  );
}

createRoot(rootElement).render(<App />);

registerServiceWorker();
