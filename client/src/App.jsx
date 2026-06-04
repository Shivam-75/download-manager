import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import History from "./pages/History";
import DownloadPage from "./pages/Download";
import YoutubePage from "./pages/Youtube";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    errorElement: (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-100 p-4">
        <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">404 - Page Not Found</h1>
        <p className="text-slate-400 mb-6">The routing node you are trying to query does not exist.</p>
        <a href="/" className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 rounded-xl font-semibold text-white shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
          Return to Dashboard
        </a>
      </div>
    ),
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: "download",
        element: <DownloadPage />,
      },
      {
        path: "history",
        element: <History />,
      },
      {
        path: "youtube",
        element: <YoutubePage />,
      },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
