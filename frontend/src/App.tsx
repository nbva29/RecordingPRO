import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { routes } from "./router";
import { useAuthSessionLifecycle } from "./auth/useAuthSessionLifecycle";
import "./App.css";

const router = createBrowserRouter(routes);

export default function App() {
  useAuthSessionLifecycle();
  return <RouterProvider router={router} />;
}
