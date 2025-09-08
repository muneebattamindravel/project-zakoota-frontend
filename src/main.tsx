import React from 'react'; import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App'; import './index.css'; import { AuthProvider } from './state/auth';
const client=new QueryClient();
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><QueryClientProvider client={client}><AuthProvider><BrowserRouter><App/></BrowserRouter></AuthProvider></QueryClientProvider></React.StrictMode>
);
